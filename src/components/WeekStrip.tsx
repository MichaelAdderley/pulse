import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { theme } from '../theme';
import {
  addDays,
  buildFullWeek,
  dayLabelShort,
  diffInWeeks,
  isSameDay,
  startOfDay,
  startOfWeek,
  toISODate,
} from '../utils/date';

type Props = {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  /** ISO dates (yyyy-mm-dd) whose plan is fully completed. */
  completedDates?: Set<string>;
};

const WEEKS_BEFORE = 52;
const WEEKS_AFTER = 52;
const TOTAL_WEEKS = WEEKS_BEFORE + 1 + WEEKS_AFTER;

export function WeekStrip({ selectedDate, onSelectDate, completedDates }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const listRef = useRef<FlatList<Date>>(null);

  const todayWeekStart = useMemo(() => startOfWeek(new Date()), []);
  const weeks = useMemo<Date[]>(
    () =>
      Array.from({ length: TOTAL_WEEKS }, (_, i) =>
        addDays(todayWeekStart, (i - WEEKS_BEFORE) * 7),
      ),
    [todayWeekStart],
  );

  const selectedWeekStart = startOfWeek(selectedDate);
  const targetIndex = WEEKS_BEFORE + diffInWeeks(selectedWeekStart, todayWeekStart);
  const lastIndexRef = useRef(targetIndex);

  // selectedDate is a dependency (not just targetIndex) so that when a swipe
  // is rejected by the parent — e.g. the user cancels ending a session — a
  // bumped selectedDate reference scrolls the strip back to the selected week.
  useEffect(() => {
    if (lastIndexRef.current !== targetIndex) {
      lastIndexRef.current = targetIndex;
      listRef.current?.scrollToIndex({ index: targetIndex, animated: true });
    }
  }, [targetIndex, selectedDate]);

  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (screenWidth === 0) return;
      const idx = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
      if (idx === lastIndexRef.current) return;
      lastIndexRef.current = idx;
      const newWeekStart = weeks[idx];
      const newDate = addDays(newWeekStart, selectedDate.getDay());
      onSelectDate(newDate);
    },
    [screenWidth, weeks, selectedDate, onSelectDate],
  );

  const today = startOfDay(new Date());

  const renderItem = useCallback(
    ({ item: weekStart }: { item: Date }) => {
      const days = buildFullWeek(weekStart);
      return (
        <View style={[styles.weekPage, { width: screenWidth }]}>
          {days.map((day) => {
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, today);
            const isComplete = completedDates?.has(toISODate(day)) ?? false;
            return (
              <Pressable
                key={day.toISOString()}
                onPress={() => onSelectDate(day)}
                style={styles.cell}
                hitSlop={6}
              >
                <Text
                  style={[
                    styles.label,
                    isSelected && styles.labelSelected,
                  ]}
                >
                  {dayLabelShort(day)}
                </Text>
                <Text
                  style={[
                    styles.number,
                    isSelected && styles.numberSelected,
                    isComplete && styles.numberComplete,
                  ]}
                >
                  {day.getDate()}
                </Text>
              </Pressable>
            );
          })}
        </View>
      );
    },
    [screenWidth, selectedDate, today, onSelectDate, completedDates],
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<Date> | null | undefined, index: number) => ({
      length: screenWidth,
      offset: screenWidth * index,
      index,
    }),
    [screenWidth],
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={weeks}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={targetIndex}
        keyExtractor={(d) => d.toISOString()}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        onMomentumScrollEnd={handleMomentumEnd}
        onScrollToIndexFailed={({ index, averageItemLength }) => {
          listRef.current?.scrollToOffset({
            offset: index * (averageItemLength || screenWidth),
            animated: false,
          });
        }}
        decelerationRate="fast"
        windowSize={3}
        maxToRenderPerBatch={3}
        initialNumToRender={3}
        removeClippedSubviews
      />
    </View>
  );
}

const STRIP_HEIGHT = 60;

const styles = StyleSheet.create({
  container: {
    height: STRIP_HEIGHT,
  },
  weekPage: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    gap: 14,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  label: {
    ...theme.typography.label,
    color: theme.colors.textTertiary,
    textTransform: 'none',
  },
  labelSelected: {
    color: theme.colors.textPrimary,
  },
  number: {
    ...theme.typography.dayNumber,
    color: theme.colors.textTertiary,
  },
  numberSelected: {
    color: theme.colors.textPrimary,
  },
  numberComplete: {
    color: theme.colors.accent,
  },
});
