import { DayPlan, Exercise } from '../types';

function warmup(id: string, title: string): Exercise {
  return {
    id,
    title,
    category: 'warmup',
    durationLabel: '1 min',
    durationSeconds: 60,
    totalRounds: 1,
    completedRounds: 0,
  };
}

function workout(id: string, title: string): Exercise {
  return {
    id,
    title,
    category: 'workout',
    durationLabel: '40 sec',
    durationSeconds: 40,
    totalRounds: 3,
    completedRounds: 0,
  };
}

function cooldown(id: string, title: string): Exercise {
  return {
    id,
    title,
    category: 'cooldown',
    durationLabel: '5 min',
    durationSeconds: 300,
    totalRounds: 1,
    completedRounds: 0,
  };
}

const DEFAULT_PLAN: DayPlan = {
  warmup: [
    warmup('w1', 'March in place'),
    warmup('w2', 'Arm circles'),
    warmup('w3', 'Bodyweight squats'),
    warmup('w4', 'Light stretching'),
  ],
  workout: [
    workout('x1', 'Squats'),
    workout('x2', 'Push ups'),
    workout('x3', 'Bent over rows'),
    workout('x4', 'Reverse lunges'),
    workout('x5', 'Plank shoulder taps'),
    workout('x6', 'Kettlebell deadlifts'),
  ],
  cooldown: [
    cooldown('c1', 'Fast walk'),
  ],
};

export function getPlanForDate(_date: Date): DayPlan {
  return {
    warmup: DEFAULT_PLAN.warmup.map((e) => ({ ...e })),
    workout: DEFAULT_PLAN.workout.map((e) => ({ ...e })),
    cooldown: DEFAULT_PLAN.cooldown.map((e) => ({ ...e })),
  };
}

export function resetPlanProgress(plan: DayPlan): DayPlan {
  return {
    warmup: plan.warmup.map((e) => ({ ...e, completedRounds: 0 })),
    workout: plan.workout.map((e) => ({ ...e, completedRounds: 0 })),
    cooldown: plan.cooldown.map((e) => ({ ...e, completedRounds: 0 })),
  };
}
