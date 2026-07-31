import React, { useRef } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable, {
  SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
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
  /** True while the session timer is actually counting (not paused). */
  running?: boolean;
  disabled?: boolean;
  onTap?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
};

export function ExerciseRow({
  exercise,
  active = false,
  activeRound,
  secondsRemaining,
  running = false,
  disabled = false,
  onTap,
  onEdit,
  onDelete,
}: Props) {
  const swipeableRef = useRef<SwipeableMethods>(null);

  const isComplete = exercise.completedRounds >= exercise.totalRounds;
  const isTimedActive = active && typeof secondsRemaining === 'number';
  // While a round is running, only rounds before it count as filled; the
  // current round's segment fills gradually via activeProgress.
  const filledSegments = isTimedActive
    ? Math.max(exercise.completedRounds, (activeRound ?? 1) - 1)
    : exercise.completedRounds;
  // While running, target the end of the current second so the ring's 1s
  // linear animation tracks real elapsed time and lands on full exactly when
  // the step ends. While paused, target the exact elapsed whole second so the
  // ring snaps back to true progress instead of freezing a second ahead.
  const activeProgress =
    isTimedActive && exercise.durationSeconds > 0
      ? Math.min(
          1,
          Math.max(
            0,
            (exercise.durationSeconds -
              (secondsRemaining ?? 0) +
              (running ? 1 : 0)) /
              exercise.durationSeconds,
          ),
        )
      : undefined;
  const durationText = isTimedActive
    ? formatRemaining(secondsRemaining ?? 0)
    : exercise.durationLabel;

  const confirmDelete = () => {
    Alert.alert(
      `Delete "${exercise.title}"?`,
      'This removes it from today’s plan.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => swipeableRef.current?.close(),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete?.(exercise.id),
        },
      ],
    );
  };

  const renderRightActions = () => (
    <View style={styles.deleteActionWrap}>
      <Pressable
        onPress={confirmDelete}
        accessibilityRole="button"
        accessibilityLabel={`Delete ${exercise.title}`}
        style={({ pressed }) => [styles.deleteAction, pressed && styles.deletePressed]}
      >
        <Text style={styles.actionText}>Delete</Text>
      </Pressable>
    </View>
  );

  const renderLeftActions = () =>
    onEdit ? (
      <View style={styles.editActionWrap}>
        <Pressable
          onPress={() => {
            swipeableRef.current?.close();
            onEdit(exercise.id);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${exercise.title}`}
          style={({ pressed }) => [styles.editAction, pressed && styles.actionPressed]}
        >
          <Text style={styles.actionText}>Edit</Text>
        </Pressable>
      </View>
    ) : null;

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      enabled={!disabled && (!!onDelete || !!onEdit)}
      friction={2}
      rightThreshold={40}
      leftThreshold={40}
      overshootRight={false}
      overshootLeft={false}
      renderRightActions={renderRightActions}
      renderLeftActions={renderLeftActions}
    >
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
          <View style={styles.timing}>
            {active && (
              <View style={styles.activeIconWrap}>
                <ActiveBarsIcon size={14} color={theme.colors.textTertiary} />
              </View>
            )}
            <Text style={styles.duration}>{durationText}</Text>
          </View>
          <ProgressRing
            segments={exercise.totalRounds}
            completed={filledSegments}
            activeProgress={activeProgress}
          />
        </View>
      </Pressable>
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background,
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
  timing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  deleteActionWrap: {
    justifyContent: 'center',
    paddingLeft: theme.spacing.md,
  },
  deleteAction: {
    height: '100%',
    minWidth: 76,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  editActionWrap: {
    justifyContent: 'center',
    paddingRight: theme.spacing.md,
  },
  editAction: {
    height: '100%',
    minWidth: 76,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.edit,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  deletePressed: {
    opacity: 0.85,
  },
  actionPressed: {
    opacity: 0.85,
  },
  actionText: {
    ...theme.typography.label,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
});
