import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  SharedValue,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { theme } from '../theme';
import { Exercise } from '../types';

export const ROW_HEIGHT = 44;
const LONG_PRESS_MS = 250;
const SETTLE_MS = 150;

type Props = {
  label: string;
  exercises: Exercise[];
  /** Long-press drag reordering; disable while a session is active. */
  reorderEnabled: boolean;
  onReorder: (fromIndex: number, toIndex: number) => void;
  renderExercise: (exercise: Exercise) => React.ReactNode;
};

type DraggableRowProps = {
  index: number;
  count: number;
  activeIndex: SharedValue<number>;
  dragOffset: SharedValue<number>;
  enabled: boolean;
  onDrop: (fromIndex: number, toIndex: number) => void;
  children: React.ReactNode;
};

function pickupHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/**
 * Rows are absolutely positioned and placed exclusively through the animated
 * `position` value — never through layout. That makes the React reorder after
 * a drop visually inert: the drop handoff (bake offset, settle to slot) runs
 * atomically in one UI-thread frame, so there is no release jump.
 */
function DraggableRow({
  index,
  count,
  activeIndex,
  dragOffset,
  enabled,
  onDrop,
  children,
}: DraggableRowProps) {
  const position = useSharedValue(index * ROW_HEIGHT);
  const prevIndexRef = useRef(index);

  // Slot changes coming from React state (drop commits, adds, deletes)
  useEffect(() => {
    if (prevIndexRef.current !== index) {
      prevIndexRef.current = index;
      position.value = withTiming(index * ROW_HEIGHT, { duration: SETTLE_MS });
    }
  }, [index, position]);

  // Make room while another row in this section is being dragged
  useAnimatedReaction(
    () => {
      if (activeIndex.value === -1 || activeIndex.value === index) return null;
      const target = Math.max(
        0,
        Math.min(
          count - 1,
          activeIndex.value + Math.round(dragOffset.value / ROW_HEIGHT),
        ),
      );
      let slot = index;
      if (activeIndex.value < index && index <= target) slot = index - 1;
      else if (target <= index && index < activeIndex.value) slot = index + 1;
      return slot * ROW_HEIGHT;
    },
    (dest, prev) => {
      if (dest === null || dest === prev) return;
      position.value = withTiming(dest, { duration: SETTLE_MS });
    },
    [index, count],
  );

  const settle = (target: number) => {
    'worklet';
    // Bake the finger offset into position, clear drag state, then glide to
    // the destination slot — one frame, no intermediate states visible.
    position.value = position.value + dragOffset.value;
    dragOffset.value = 0;
    activeIndex.value = -1;
    position.value = withTiming(target * ROW_HEIGHT, { duration: SETTLE_MS });
  };

  const pan = Gesture.Pan()
    .enabled(enabled)
    .activateAfterLongPress(LONG_PRESS_MS)
    .onStart(() => {
      activeIndex.value = index;
      dragOffset.value = 0;
      runOnJS(pickupHaptic)();
    })
    .onUpdate((e) => {
      // Clamp to the section bounds so a row can never leave its category
      const min = -index * ROW_HEIGHT;
      const max = (count - 1 - index) * ROW_HEIGHT;
      dragOffset.value = Math.min(max, Math.max(min, e.translationY));
    })
    .onEnd(() => {
      const target = Math.max(
        0,
        Math.min(count - 1, index + Math.round(dragOffset.value / ROW_HEIGHT)),
      );
      settle(target);
      if (target !== index) runOnJS(onDrop)(index, target);
    })
    .onFinalize((_e, success) => {
      if (!success && activeIndex.value === index) {
        settle(index);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    const isActive = activeIndex.value === index;
    return {
      zIndex: isActive ? 10 : 0,
      transform: [
        { translateY: position.value + (isActive ? dragOffset.value : 0) },
        { scale: withTiming(isActive ? 1.04 : 1, { duration: 120 }) },
      ],
    };
  });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.rowWrap, animatedStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

export function ReorderableSection({
  label,
  exercises,
  reorderEnabled,
  onReorder,
  renderExercise,
}: Props) {
  const activeIndex = useSharedValue(-1);
  const dragOffset = useSharedValue(0);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={{ height: exercises.length * ROW_HEIGHT }}>
        {exercises.map((exercise, index) => (
          <DraggableRow
            key={exercise.id}
            index={index}
            count={exercises.length}
            activeIndex={activeIndex}
            dragOffset={dragOffset}
            enabled={reorderEnabled}
            onDrop={onReorder}
          >
            {renderExercise(exercise)}
          </DraggableRow>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionLabel: {
    ...theme.typography.sectionLabel,
    color: theme.colors.textTertiary,
    marginBottom: theme.spacing.sm,
  },
  rowWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: ROW_HEIGHT,
  },
});
