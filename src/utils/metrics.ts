import { DayPlan, Exercise, ExerciseCategory } from '../types';
import { addDays, startOfDay, startOfWeek, toISODate } from './date';

/**
 * One finished timer session, appended when the user runs a full workout to
 * the end. Manual round taps never create sessions; days recorded before this
 * log existed have none. Metrics fall back to plan-derived numbers for those.
 */
export type SessionRecord = {
  dateKey: string;
  completedAt: string;
  activeSeconds: number;
  restSeconds: number;
  exerciseCount: number;
};

export type ActivityTotals = {
  totalSeconds: number;
  /** Days where every exercise reached all of its rounds. */
  workoutsCompleted: number;
  /** Exercises that reached all of their rounds, summed across days. */
  exercisesCompleted: number;
  /** Days with at least one completed round. */
  activeDays: number;
};

export type StreakInfo = {
  current: number;
  best: number;
  activeToday: boolean;
};

/** 0 = no activity, 1 = partial, 2 = fully completed day. */
export type DayLevel = 0 | 1 | 2;

export type WeekCells = {
  /** Sunday-first, matching the WeekStrip. */
  days: { dateKey: string; level: DayLevel; inFuture: boolean }[];
};

function allExercises(plan: DayPlan): Exercise[] {
  return [...plan.warmup, ...plan.workout, ...plan.cooldown];
}

export function dayLevel(plan: DayPlan | undefined): DayLevel {
  if (!plan) return 0;
  const list = allExercises(plan);
  if (list.length === 0) return 0;
  const anyDone = list.some((e) => e.completedRounds > 0);
  if (!anyDone) return 0;
  const allDone = list.every((e) => e.completedRounds >= e.totalRounds);
  return allDone ? 2 : 1;
}

function planSeconds(plan: DayPlan): number {
  return allExercises(plan).reduce(
    (sum, e) =>
      sum + Math.min(e.completedRounds, e.totalRounds) * e.durationSeconds,
    0,
  );
}

export function computeTotals(
  plans: Record<string, DayPlan>,
  sessions: SessionRecord[],
): ActivityTotals {
  // Where a real session was recorded, its wall-clock time (including rests)
  // is the truth for that day; otherwise fall back to plan-derived time.
  const sessionSecondsByDate = new Map<string, number>();
  for (const s of sessions) {
    sessionSecondsByDate.set(
      s.dateKey,
      (sessionSecondsByDate.get(s.dateKey) ?? 0) +
        s.activeSeconds +
        s.restSeconds,
    );
  }

  let totalSeconds = 0;
  let workoutsCompleted = 0;
  let exercisesCompleted = 0;
  let activeDays = 0;

  const dates = new Set([
    ...Object.keys(plans),
    ...sessionSecondsByDate.keys(),
  ]);
  for (const dateKey of dates) {
    const plan = plans[dateKey];
    const level = dayLevel(plan);
    if (level > 0) activeDays += 1;
    if (level === 2) workoutsCompleted += 1;
    if (plan) {
      exercisesCompleted += allExercises(plan).filter(
        (e) => e.totalRounds > 0 && e.completedRounds >= e.totalRounds,
      ).length;
    }
    totalSeconds +=
      sessionSecondsByDate.get(dateKey) ?? (plan ? planSeconds(plan) : 0);
  }

  return { totalSeconds, workoutsCompleted, exercisesCompleted, activeDays };
}

export function computeStreaks(
  plans: Record<string, DayPlan>,
  today: Date,
): StreakInfo {
  const activeDates = new Set<string>();
  for (const [dateKey, plan] of Object.entries(plans)) {
    if (dayLevel(plan) > 0) activeDates.add(dateKey);
  }

  const todayKey = toISODate(startOfDay(today));
  const activeToday = activeDates.has(todayKey);

  // Current streak: walk back from today; an inactive today doesn't break
  // the streak until the day is actually over.
  let current = 0;
  let cursor = startOfDay(today);
  if (!activeToday) cursor = addDays(cursor, -1);
  while (activeDates.has(toISODate(cursor))) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  // Best streak: scan sorted active days for the longest consecutive run.
  // ISO date keys sort chronologically as strings.
  const sorted = [...activeDates].sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const key of sorted) {
    const date = startOfDay(new Date(`${key}T00:00:00`));
    run = prev && toISODate(addDays(prev, 1)) === key ? run + 1 : 1;
    best = Math.max(best, run);
    prev = date;
  }

  return { current: Math.max(current, 0), best: Math.max(best, current), activeToday };
}

export function computeWeeklyActivity(
  plans: Record<string, DayPlan>,
  today: Date,
  weeksBack: number,
): WeekCells[] {
  const todayStart = startOfDay(today);
  const thisWeekStart = startOfWeek(todayStart);
  const weeks: WeekCells[] = [];
  for (let w = weeksBack - 1; w >= 0; w--) {
    const weekStart = addDays(thisWeekStart, -7 * w);
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      const dateKey = toISODate(date);
      return {
        dateKey,
        level: dayLevel(plans[dateKey]),
        inFuture: date.getTime() > todayStart.getTime(),
      };
    });
    weeks.push({ days });
  }
  return weeks;
}

export function computeCategorySeconds(
  plans: Record<string, DayPlan>,
): Record<ExerciseCategory, number> {
  const out: Record<ExerciseCategory, number> = {
    warmup: 0,
    workout: 0,
    cooldown: 0,
  };
  for (const plan of Object.values(plans)) {
    for (const e of allExercises(plan)) {
      out[e.category] +=
        Math.min(e.completedRounds, e.totalRounds) * e.durationSeconds;
    }
  }
  return out;
}
