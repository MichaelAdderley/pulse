import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';
import { Exercise } from '../types';
import { formatRemaining } from '../utils/time';
import { ActiveBarsIcon } from './icons';
import { ProgressRing } from './ProgressRing';

type Props = {
  exercise: Exercise;
  active?: boolean;
  activeRound?: number;
  secondsRemaining?: number;
  disabled?: boolean;
  onTap?: (id: string) => void;
};

export function ExerciseRow({
  exercise,
  active = false,
  activeRound,
  secondsRemaining,
  disabled = false,
  onTap,
}: Props) {
  const isComplete = exercise.completedRounds >= exercise.totalRounds;
  const filledSegments =
    active && typeof activeRound === 'number'
      ? Math.max(exercise.completedRounds, activeRound)
      : exercise.completedRounds;
  const durationText =
    active && typeof secondsRemaining === 'number'
      ? formatRemaining(secondsRemaining)
      : exercise.durationLabel;

  return (
    <Pressable
      onPress={() => !disabled && onTap?.(exercise.id)}
      style={({ pressed }) => [styles.row, pressed && !disabled && styles.rowPressed]}
      hitSlop={4}
      disabled={disabled}
    >
      <Text
        style={[styles.title, isComplete && styles.titleComplete]}
        numberOfLines={1}
      >
        {exercise.title}
      </Text>
      <View style={styles.right}>
        {active && (
          <View style={styles.activeIconWrap}>
            <ActiveBarsIcon size={14} color={theme.colors.textTertiary} />
          </View>
        )}
        <Text style={styles.duration}>{durationText}</Text>
        <ProgressRing
          segments={exercise.totalRounds}
          completed={filledSegments}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
  },
  rowPressed: {
    opacity: 0.6,
  },
  title: {
    ...theme.typography.exerciseName,
    color: theme.colors.textPrimary,
    flex: 1,
    marginRight: theme.spacing.md,
  },
  titleComplete: {
    textDecorationLine: 'line-through',
    color: theme.colors.textPrimary,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  activeIconWrap: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  duration: {
    ...theme.typography.label,
    color: theme.colors.textTertiary,
    fontVariant: ['tabular-nums'],
  },
});
