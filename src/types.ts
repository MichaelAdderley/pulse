export type ExerciseCategory = 'warmup' | 'workout' | 'cooldown';

export type Exercise = {
  id: string;
  title: string;
  category: ExerciseCategory;
  durationLabel: string;
  durationSeconds: number;
  totalRounds: number;
  completedRounds: number;
};

export type DayPlan = {
  warmup: Exercise[];
  workout: Exercise[];
  cooldown: Exercise[];
};
