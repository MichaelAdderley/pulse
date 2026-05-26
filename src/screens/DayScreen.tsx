import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ExerciseRow } from '../components/ExerciseRow';
import { PauseIcon, PlayIcon, ResetIcon } from '../components/icons';
import { WeekStrip } from '../components/WeekStrip';
import { getPlanForDate, resetPlanProgress } from '../data/mockWorkouts';
import { theme } from '../theme';
import { DayPlan, Exercise, ExerciseCategory } from '../types';
import { startOfDay, toISODate } from '../utils/date';

type SectionDef = {
  key: ExerciseCategory;
  label: string;
};

const SECTIONS: SectionDef[] = [
  { key: 'warmup', label: 'Warmup' },
  { key: 'workout', label: 'Workout' },
  { key: 'cooldown', label: 'Cooldown' },
];

const WORKOUT_ROUNDS = 3;
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

  plan.warmup.forEach((e) => pushExercise(e, 1));
  for (let r = 1; r <= WORKOUT_ROUNDS; r++) {
    plan.workout.forEach((e) => pushExercise(e, r));
  }
  plan.cooldown.forEach((e) => pushExercise(e, 1));

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

  const sequence = useMemo<Step[]>(() => buildSequence(plan), [isoKey, plan]);
  const sequenceRef = useRef(sequence);
  sequenceRef.current = sequence;

  // Reset session if user switches day
  useEffect(() => {
    setPlaying(false);
    setSessionActive(false);
    setStepIndex(0);
    setSecondsLeft(0);
  }, [isoKey]);

  const endSession = () => {
    setPlaying(false);
    setSessionActive(false);
    setStepIndex(0);
    setSecondsLeft(0);
  };

  // Per-second tick while playing
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev > 1) return prev - 1;

        // Current step just finished — commit its progress
        const seq = sequenceRef.current;
        const currentStep = seq[stepIndex];
        if (currentStep?.kind === 'exercise') {
          setPlansByDate((prevPlans) => {
            const current = prevPlans[isoKey] ?? getPlanForDate(selectedDate);
            return {
              ...prevPlans,
              [isoKey]: setExerciseRound(
                current,
                currentStep.exerciseId,
                currentStep.round,
              ),
            };
          });
        }

        const nextIdx = stepIndex + 1;
        if (nextIdx >= seq.length) {
          // Session complete
          setPlaying(false);
          setSessionActive(false);
          setStepIndex(0);
          return 0;
        }
        const nextStep = seq[nextIdx];
        setStepIndex(nextIdx);
        return nextStep.durationSec;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [playing, stepIndex, isoKey, selectedDate]);

  // Active exercise info (if current step is exercise)
  // Show the active row whenever a session is in progress — even while paused —
  // so the user can see what's queued up and how much time is left.
  const currentStep = sequence[stepIndex];
  const activeExerciseId =
    sessionActive && currentStep?.kind === 'exercise' ? currentStep.exerciseId : null;
  const activeRound =
    sessionActive && currentStep?.kind === 'exercise' ? currentStep.round : undefined;

  const handleStart = () => {
    if (sequence.length === 0) return;

    // Resume from pause: keep stepIndex and secondsLeft as-is
    if (sessionActive) {
      setPlaying(true);
      return;
    }

    // Fresh start: clear progress; completedRounds will be committed at the
    // end of each step by the timer effect, so the first exercise stays at
    // its in-progress visual until it actually finishes.
    const first = sequence[0];
    setPlansByDate((prev) => {
      const current = prev[isoKey] ?? getPlanForDate(selectedDate);
      return { ...prev, [isoKey]: resetPlanProgress(current) };
    });

    setStepIndex(0);
    setSecondsLeft(first.durationSec);
    setSessionActive(true);
    setPlaying(true);
  };

  const handlePause = () => {
    setPlaying(false);
  };

  const handleReset = () => {
    setPlansByDate((prev) => {
      const current = prev[isoKey] ?? getPlanForDate(selectedDate);
      return { ...prev, [isoKey]: resetPlanProgress(current) };
    });
    endSession();
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
        <Image source={avatarSource} style={styles.avatar} />
        <Text style={styles.title}>Workouts</Text>
      </View>

      <WeekStrip selectedDate={selectedDate} onSelectDate={setSelectedDate} />

      <View style={styles.controlsRow}>
        {!sessionActive ? (
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            onPress={handleStart}
          >
            <PlayIcon size={14} color={theme.colors.addButtonText} />
            <Text style={styles.primaryButtonText}>Start</Text>
          </Pressable>
        ) : (
          <>
            {playing ? (
              <Pressable
                style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
                onPress={handlePause}
              >
                <PauseIcon size={14} color={theme.colors.addButtonText} />
                <Text style={styles.primaryButtonText}>Pause</Text>
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
                    disabled={sessionActive}
                    onTap={handleTap}
                  />
                );
              })}
            </View>
          );
        })}
      </ScrollView>
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
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
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
    backgroundColor: '#2C2C2C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  primaryButtonText: {
    ...theme.typography.addButton,
    color: theme.colors.addButtonText,
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
