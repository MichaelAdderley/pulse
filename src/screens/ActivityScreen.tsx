import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ProgressRing } from '../components/ProgressRing';
import { XIcon } from '../components/icons';
import { theme } from '../theme';
import { DayPlan, ExerciseCategory } from '../types';
import {
  computeCategorySeconds,
  computeStreaks,
  computeTotals,
  computeWeeklyActivity,
  DayLevel,
  SessionRecord,
} from '../utils/metrics';
import { formatTotalDuration } from '../utils/time';

const WEEKS_SHOWN = 12;
const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const CATEGORY_LABELS: { key: ExerciseCategory; label: string }[] = [
  { key: 'warmup', label: 'Warmup' },
  { key: 'workout', label: 'Workout' },
  { key: 'cooldown', label: 'Cooldown' },
];

type Props = {
  visible: boolean;
  plansByDate: Record<string, DayPlan>;
  sessions: SessionRecord[];
  onClose: () => void;
};

function dotStyleForLevel(level: DayLevel) {
  if (level === 2) return styles.dotComplete;
  if (level === 1) return styles.dotPartial;
  return styles.dotEmpty;
}

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

export function ActivityScreen({ visible, plansByDate, sessions, onClose }: Props) {
  const metrics = useMemo(() => {
    const today = new Date();
    return {
      totals: computeTotals(plansByDate, sessions),
      streaks: computeStreaks(plansByDate, today),
      weeks: computeWeeklyActivity(plansByDate, today, WEEKS_SHOWN),
      categorySeconds: computeCategorySeconds(plansByDate),
    };
    // Recompute each open so "today" is always current
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plansByDate, sessions, visible]);

  const { totals, streaks, weeks, categorySeconds } = metrics;
  const thisWeek = weeks[weeks.length - 1];
  const thisWeekActive = thisWeek.days.filter((d) => d.level > 0).length;
  const maxCategorySeconds = Math.max(
    1,
    ...CATEGORY_LABELS.map(({ key }) => categorySeconds[key]),
  );
  const hasAnyActivity = totals.activeDays > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Activity</Text>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
            hitSlop={8}
          >
            <XIcon size={14} color={theme.colors.textPrimary} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            entering={FadeInDown.duration(350)}
            style={styles.hero}
          >
            <View style={styles.heroRing}>
              <ProgressRing
                size={148}
                strokeWidth={3}
                segments={7}
                completed={Math.min(streaks.current, 7)}
              />
              <View style={styles.heroCenter}>
                <Text style={styles.heroNumber}>{streaks.current}</Text>
                <Text style={styles.heroCaption}>day streak</Text>
              </View>
            </View>
            {!hasAnyActivity && (
              <Text style={styles.emptyHint}>
                Complete your first workout to start your streak
              </Text>
            )}
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(350).delay(60)}
            style={styles.tileGrid}
          >
            <StatTile
              value={formatTotalDuration(totals.totalSeconds)}
              label="Total time"
            />
            <StatTile
              value={String(totals.workoutsCompleted)}
              label="Workouts completed"
            />
            <StatTile
              value={String(totals.exercisesCompleted)}
              label="Exercises done"
            />
            <StatTile value={String(streaks.best)} label="Best streak" />
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(350).delay(120)}>
            <Text style={styles.sectionLabel}>This week</Text>
            <View style={styles.card}>
              <View style={styles.weekRow}>
                {thisWeek.days.map((day, i) => (
                  <View key={day.dateKey} style={styles.weekDayCell}>
                    <Text style={styles.dayLetter}>{DAY_LETTERS[i]}</Text>
                    <View
                      style={[
                        styles.weekDot,
                        dotStyleForLevel(day.level),
                        day.inFuture && styles.dotFuture,
                      ]}
                    />
                  </View>
                ))}
              </View>
              <Text style={styles.weekSummary}>
                {thisWeekActive} of 7 days active
              </Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(350).delay(180)}>
            <Text style={styles.sectionLabel}>Last {WEEKS_SHOWN} weeks</Text>
            <View style={styles.card}>
              {weeks.map((week) => (
                <View key={week.days[0].dateKey} style={styles.gridRow}>
                  {week.days.map((day) => (
                    <View
                      key={day.dateKey}
                      style={[
                        styles.gridDot,
                        dotStyleForLevel(day.level),
                        day.inFuture && styles.dotFuture,
                      ]}
                    />
                  ))}
                </View>
              ))}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(350).delay(240)}>
            <Text style={styles.sectionLabel}>Time by section</Text>
            <View style={styles.card}>
              {CATEGORY_LABELS.map(({ key, label }) => {
                const seconds = categorySeconds[key];
                return (
                  <View key={key} style={styles.categoryRow}>
                    <View style={styles.categoryHeader}>
                      <Text style={styles.categoryLabel}>{label}</Text>
                      <Text style={styles.categoryValue}>
                        {formatTotalDuration(seconds)}
                      </Text>
                    </View>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          { width: `${(seconds / maxCategorySeconds) * 100}%` },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </Animated.View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
  },
  headerTitle: {
    ...theme.typography.pageTitle,
    color: theme.colors.textPrimary,
  },
  closeButton: {
    width: 33,
    height: 33,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.buttonMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.xl,
  },
  hero: {
    alignItems: 'center',
    paddingTop: theme.spacing.md,
    gap: theme.spacing.lg,
  },
  heroRing: {
    width: 148,
    height: 148,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  heroNumber: {
    fontSize: 44,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  heroCaption: {
    ...theme.typography.label,
    color: theme.colors.textSecondary,
  },
  emptyHint: {
    ...theme.typography.body,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  tileValue: {
    ...theme.typography.headline,
    color: theme.colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  tileLabel: {
    ...theme.typography.sectionLabel,
    color: theme.colors.textSecondary,
  },
  sectionLabel: {
    ...theme.typography.sectionLabel,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekDayCell: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  dayLetter: {
    ...theme.typography.sectionLabel,
    color: theme.colors.textTertiary,
  },
  weekDot: {
    width: 14,
    height: 14,
    borderRadius: theme.radius.pill,
  },
  weekSummary: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridDot: {
    width: 10,
    height: 10,
    borderRadius: theme.radius.pill,
  },
  dotEmpty: {
    backgroundColor: theme.colors.borderSubtle,
  },
  dotPartial: {
    backgroundColor: theme.colors.accent,
    opacity: 0.4,
  },
  dotComplete: {
    backgroundColor: theme.colors.accent,
  },
  dotFuture: {
    opacity: 0,
  },
  categoryRow: {
    gap: theme.spacing.sm,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryLabel: {
    ...theme.typography.exerciseName,
    color: theme.colors.textPrimary,
  },
  categoryValue: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  barTrack: {
    height: 4,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.borderSubtle,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.accent,
  },
});
