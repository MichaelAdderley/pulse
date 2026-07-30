import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ExerciseRow } from '../components/ExerciseRow';
import { PauseIcon, PlayIcon, PlusIcon, ResetIcon } from '../components/icons';
import { WeekStrip } from '../components/WeekStrip';
import { getPlanForDate, resetPlanProgress } from '../data/defaultPlan';
import { theme } from '../theme';
import { DayPlan, Exercise, ExerciseCategory } from '../types';
import { isSameDay, startOfDay, toISODate } from '../utils/date';
import { formatDurationLabel } from '../utils/time';
import { AddExerciseScreen, NewExerciseInput } from './AddExerciseScreen';

const STORAGE_KEY = 'pulse.plansByDate.v1';

type SectionDef = {
  key: ExerciseCategory;
  label: string;
};

const SECTIONS: SectionDef[] = [
  { key: 'warmup', label: 'Warmup' },
  { key: 'workout', label: 'Workout' },
  { key: 'cooldown', label: 'Cooldown' },
];

const REST_SECONDS = 30;

type Step =
  | {
      kind: 'exercise';
      exerciseId: string;
      category: ExerciseCategory;
      round: number;
      durationSec: number;
    }
  | { kind: 'rest'; durationSec: number };

function buildSequence(plan: DayPlan): Step[] {
  const steps: Step[] = [];
  let first = true;

  const pushExercise = (e: Exercise, round: number) => {
    if (!first) steps.push({ kind: 'rest', durationSec: REST_SECONDS });
    steps.push({
      kind: 'exercise',
      exerciseId: e.id,
      category: e.category,
      round,
      durationSec: e.durationSeconds,
    });
    first = false;
  };

  // Each category runs as a circuit: as many rounds as its exercises call
  // for, where an exercise only appears in rounds up to its own segment count.
  const pushCategory = (list: Exercise[]) => {
    const maxRounds = list.reduce((max, e) => Math.max(max, e.totalRounds), 0);
    for (let r = 1; r <= maxRounds; r++) {
      list.filter((e) => e.totalRounds >= r).forEach((e) => pushExercise(e, r));
    }
  };

  pushCategory(plan.warmup);
  pushCategory(plan.workout);
  pushCategory(plan.cooldown);

  return steps;
}

function setExerciseRound(plan: DayPlan, id: string, round: number): DayPlan {
  const apply = (list: Exercise[]) =>
    list.map((e) => (e.id === id ? { ...e, completedRounds: round } : e));
  return {
    warmup: apply(plan.warmup),
    workout: apply(plan.workout),
    cooldown: apply(plan.cooldown),
  };
}

const avatarSource = require('../../assets/avatar.png');

export function DayScreen() {
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [plansByDate, setPlansByDate] = useState<Record<string, DayPlan>>({});
  const [addVisible, setAddVisible] = useState(false);

  const isoKey = toISODate(selectedDate);
  const plan: DayPlan = useMemo(
    () => plansByDate[isoKey] ?? getPlanForDate(selectedDate),
    [isoKey, selectedDate, plansByDate],
  );

  // Session state
  const [playing, setPlaying] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [justCompleted, setJustCompleted] = useState(false);

  const sequence = useMemo<Step[]>(() => buildSequence(plan), [isoKey, plan]);
  const sequenceRef = useRef(sequence);
  sequenceRef.current = sequence;

  // Wall-clock anchors: the timer derives remaining time from real timestamps,
  // so it stays correct across app backgrounding and interval throttling.
  const stepIndexRef = useRef(0);
  const stepEndsAtRef = useRef(0);
  const pausedRemainingMsRef = useRef(0);
  const completedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore saved plans on launch; persist on every change after that
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          setPlansByDate(parsed as Record<string, DayPlan>);
        }
      })
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(plansByDate)).catch(() => {});
  }, [plansByDate, hydrated]);

  const endSession = () => {
    stepIndexRef.current = 0;
    stepEndsAtRef.current = 0;
    pausedRemainingMsRef.current = 0;
    setPlaying(false);
    setSessionActive(false);
    setStepIndex(0);
    setSecondsLeft(0);
  };

  // Reset session if user switches day
  useEffect(() => {
    endSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isoKey]);

  // Keep the screen on while a session is in progress
  useEffect(() => {
    if (!sessionActive) return;
    activateKeepAwakeAsync().catch(() => {});
    return () => {
      deactivateKeepAwake().catch(() => {});
    };
  }, [sessionActive]);

  useEffect(
    () => () => {
      if (completedTimerRef.current) clearTimeout(completedTimerRef.current);
    },
    [],
  );

  const commitStep = (step: Extract<Step, { kind: 'exercise' }>) => {
    setPlansByDate((prevPlans) => {
      const current = prevPlans[isoKey] ?? getPlanForDate(selectedDate);
      return {
        ...prevPlans,
        [isoKey]: setExerciseRound(current, step.exerciseId, step.round),
      };
    });
  };

  const completeSession = () => {
    endSession();
    setJustCompleted(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {},
    );
    if (completedTimerRef.current) clearTimeout(completedTimerRef.current);
    completedTimerRef.current = setTimeout(() => setJustCompleted(false), 2500);
  };

  // Timer loop: recompute remaining time from the wall clock. If the app was
  // suspended past one or more step boundaries, catch up by committing every
  // finished step before settling on the current one.
  useEffect(() => {
    if (!playing) return;
    const tick = () => {
      const seq = sequenceRef.current;
      const now = Date.now();
      let idx = stepIndexRef.current;
      let endsAt = stepEndsAtRef.current;

      if (now < endsAt) {
        const remaining = Math.ceil((endsAt - now) / 1000);
        setSecondsLeft((prev) => (prev === remaining ? prev : remaining));
        return;
      }

      let advanced = false;
      while (now >= endsAt) {
        const step = seq[idx];
        if (step?.kind === 'exercise') commitStep(step);
        idx += 1;
        advanced = true;
        if (idx >= seq.length) {
          completeSession();
          return;
        }
        endsAt += seq[idx].durationSec * 1000;
      }

      stepIndexRef.current = idx;
      stepEndsAtRef.current = endsAt;
      setStepIndex(idx);
      setSecondsLeft(Math.ceil((endsAt - now) / 1000));
      if (advanced) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, isoKey]);

  // Active exercise info (if current step is exercise)
  // Show the active row whenever a session is in progress — even while paused —
  // so the user can see what's queued up and how much time is left.
  const currentStep = sequence[stepIndex];
  const activeExerciseId =
    sessionActive && currentStep?.kind === 'exercise' ? currentStep.exerciseId : null;
  const activeRound =
    sessionActive && currentStep?.kind === 'exercise' ? currentStep.round : undefined;
  const isResting = sessionActive && currentStep?.kind === 'rest';
  const restClock = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`;

  const handleStart = () => {
    if (sequence.length === 0) return;

    // Resume from pause: re-anchor the current step's deadline to now
    if (sessionActive) {
      stepEndsAtRef.current = Date.now() + pausedRemainingMsRef.current;
      setPlaying(true);
      return;
    }

    // Fresh start: clear progress; completedRounds will be committed at the
    // end of each step by the timer loop, so the first exercise stays at
    // its in-progress visual until it actually finishes.
    const first = sequence[0];
    setPlansByDate((prev) => {
      const current = prev[isoKey] ?? getPlanForDate(selectedDate);
      return { ...prev, [isoKey]: resetPlanProgress(current) };
    });

    setJustCompleted(false);
    stepIndexRef.current = 0;
    stepEndsAtRef.current = Date.now() + first.durationSec * 1000;
    setStepIndex(0);
    setSecondsLeft(first.durationSec);
    setSessionActive(true);
    setPlaying(true);
  };

  const handlePause = () => {
    pausedRemainingMsRef.current = Math.max(
      0,
      stepEndsAtRef.current - Date.now(),
    );
    setPlaying(false);
  };

  const handleReset = () => {
    setPlansByDate((prev) => {
      const current = prev[isoKey] ?? getPlanForDate(selectedDate);
      return { ...prev, [isoKey]: resetPlanProgress(current) };
    });
    endSession();
  };

  const handleSelectDate = (date: Date) => {
    if (sessionActive && !isSameDay(date, selectedDate)) {
      Alert.alert(
        'End workout?',
        'Switching days will end the session in progress.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            // Bump the reference so the week strip scrolls back to the
            // selected week if the user swiped away before cancelling.
            onPress: () => setSelectedDate(new Date(selectedDate)),
          },
          {
            text: 'End workout',
            style: 'destructive',
            onPress: () => setSelectedDate(startOfDay(date)),
          },
        ],
      );
      return;
    }
    setSelectedDate(date);
  };

  const handleAddExercise = (input: NewExerciseInput) => {
    setPlansByDate((prev) => {
      const current: DayPlan = prev[isoKey] ?? getPlanForDate(selectedDate);
      const exercise: Exercise = {
        id: `custom-${Date.now()}`,
        title: input.title,
        category: input.category,
        durationLabel: formatDurationLabel(input.durationSeconds),
        durationSeconds: input.durationSeconds,
        totalRounds: input.segments,
        completedRounds: 0,
      };
      return {
        ...prev,
        [isoKey]: {
          ...current,
          [input.category]: [...current[input.category], exercise],
        },
      };
    });
    setAddVisible(false);
  };

  const handleDeleteExercise = (id: string) => {
    setPlansByDate((prev) => {
      const current: DayPlan = prev[isoKey] ?? getPlanForDate(selectedDate);
      const remove = (list: Exercise[]) => list.filter((e) => e.id !== id);
      return {
        ...prev,
        [isoKey]: {
          warmup: remove(current.warmup),
          workout: remove(current.workout),
          cooldown: remove(current.cooldown),
        },
      };
    });
  };

  const handleTap = (id: string) => {
    if (playing) return;
    setPlansByDate((prev) => {
      const current: DayPlan = prev[isoKey] ?? getPlanForDate(selectedDate);
      const advance = (list: Exercise[]): Exercise[] =>
        list.map((e) => {
          if (e.id !== id) return e;
          const next = e.completedRounds + 1;
          return {
            ...e,
            completedRounds: next > e.totalRounds ? 0 : next,
          };
        });
      const updated: DayPlan = {
        warmup: advance(current.warmup),
        workout: advance(current.workout),
        cooldown: advance(current.cooldown),
      };
      return { ...prev, [isoKey]: updated };
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.titleRow}>
        <View style={styles.titleGroup}>
          <Image source={avatarSource} style={styles.avatar} />
          <Text style={styles.title}>Workouts</Text>
        </View>
        <Pressable
          onPress={() => setAddVisible(true)}
          disabled={sessionActive}
          accessibilityRole="button"
          accessibilityLabel="Add exercise"
          style={({ pressed }) => [
            styles.plusButton,
            sessionActive && styles.plusButtonDisabled,
            pressed && styles.pressed,
          ]}
          hitSlop={8}
        >
          <PlusIcon size={15} color={theme.colors.textPrimary} />
        </Pressable>
      </View>

      <WeekStrip selectedDate={selectedDate} onSelectDate={handleSelectDate} />

      <View style={styles.controlsRow}>
        {!sessionActive ? (
          justCompleted ? (
            <View style={[styles.primaryButton, styles.doneButton]}>
              <Text style={[styles.primaryButtonText, styles.doneButtonText]}>
                Done
              </Text>
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
              onPress={handleStart}
            >
              <PlayIcon size={14} color={theme.colors.addButtonText} />
              <Text style={styles.primaryButtonText}>Start</Text>
            </Pressable>
          )
        ) : (
          <>
            {playing ? (
              <Pressable
                style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
                onPress={handlePause}
              >
                <PauseIcon size={14} color={theme.colors.addButtonText} />
                <Text style={styles.primaryButtonText}>
                  {isResting ? `Rest · ${restClock}` : 'Pause'}
                </Text>
              </Pressable>
            ) : (
              <Pressable
                style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
                onPress={handleStart}
              >
                <PlayIcon size={14} color={theme.colors.addButtonText} />
                <Text style={styles.primaryButtonText}>Resume</Text>
              </Pressable>
            )}
            <Pressable
              style={({ pressed }) => [styles.resetButton, pressed && styles.pressed]}
              onPress={handleReset}
              accessibilityRole="button"
              accessibilityLabel="Reset workout"
            >
              <ResetIcon size={16} color={theme.colors.textPrimary} />
            </Pressable>
          </>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {SECTIONS.map((section) => {
          const exercises = plan[section.key];
          if (exercises.length === 0) return null;
          return (
            <View key={section.key} style={styles.section}>
              <Text style={styles.sectionLabel}>{section.label}</Text>
              {exercises.map((exercise) => {
                const isActive = exercise.id === activeExerciseId;
                return (
                  <ExerciseRow
                    key={exercise.id}
                    exercise={exercise}
                    active={isActive}
                    activeRound={isActive ? activeRound : undefined}
                    secondsRemaining={isActive ? secondsLeft : undefined}
                    running={playing}
                    disabled={sessionActive}
                    onTap={handleTap}
                    onDelete={handleDeleteExercise}
                  />
                );
              })}
            </View>
          );
        })}
      </ScrollView>

      <AddExerciseScreen
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onAdd={handleAddExercise}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  plusButton: {
    width: 33,
    height: 33,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.buttonMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusButtonDisabled: {
    opacity: 0.4,
  },
  avatar: {
    width: 33,
    height: 33,
    borderRadius: theme.radius.pill,
  },
  title: {
    ...theme.typography.pageTitle,
    color: theme.colors.textPrimary,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  primaryButton: {
    flex: 1,
    height: 48,
    backgroundColor: theme.colors.addButtonBg,
    borderRadius: theme.radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  resetButton: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.buttonMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  primaryButtonText: {
    ...theme.typography.addButton,
    color: theme.colors.addButtonText,
    fontVariant: ['tabular-nums'],
  },
  doneButton: {
    backgroundColor: theme.colors.accent,
  },
  doneButtonText: {
    color: theme.colors.accentForeground,
  },
  list: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xxl,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionLabel: {
    ...theme.typography.sectionLabel,
    color: theme.colors.textTertiary,
    marginBottom: theme.spacing.sm,
  },
});
