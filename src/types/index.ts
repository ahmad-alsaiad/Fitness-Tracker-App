export type ExerciseType = 'lifting' | 'cardio';

export interface Exercise {
  id?: number;
  name: string;
  type: ExerciseType;
  category: string; // e.g., 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Cardio', 'Abs'
  defaultTargetSets?: number;
  defaultTargetReps?: string; // e.g., '8-10' or '10-12'
  defaultTargetMinutes?: number;
  notes?: string;
  createdAt?: string;
}

export interface PlannedExercise {
  exerciseId: number;
  targetSets?: number;
  targetReps?: string; // for lifting
  targetDurationMinutes?: number; // for cardio
  notes?: string;
}

/** A reusable custom workout (e.g. "Push Day") that can be applied to any date. */
export interface WorkoutTemplate {
  id?: number;
  name: string;
  exercises: PlannedExercise[];
  createdAt?: string;
}

export interface PlannedWorkout {
  date: string; // YYYY-MM-DD (primary key)
  title: string;
  exercises: PlannedExercise[];
  templateId?: number;
  notes?: string;
  isRestDay?: boolean;
}

export interface WorkoutSet {
  setNumber: number;
  weightKg: number;
  reps: number;
  rpe?: number;
  isPR?: boolean;
}

export interface LoggedExercise {
  exerciseId: number;
  sets: WorkoutSet[];
  completedDurationMinutes?: number; // for cardio
  notes?: string;
}

export type WorkoutStatus = 'completed' | 'cancelled';
export type CancellationType = 'justified' | 'unjustified';

export interface WorkoutLog {
  date: string; // YYYY-MM-DD (primary key)
  title: string;
  status: WorkoutStatus;
  cancellationReason?: string;
  cancellationNotes?: string;
  cancellationType?: CancellationType;
  exercises: LoggedExercise[];
  durationMinutes?: number;
  notes?: string;
  loggedAt?: string;
  isRestDay?: boolean;
}

export interface DailyBiometrics {
  date: string; // YYYY-MM-DD (primary key)
  weightKg?: number;
  isOfficialWeighIn?: boolean;
  notes?: string;
}

export interface DailyNutrition {
  date: string; // YYYY-MM-DD (primary key)
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatsGrams: number;
}

export interface DailyHabits {
  date: string; // YYYY-MM-DD (primary key)
  waterMl: number;
  steps: number;
  customHabits: Record<string, boolean>; // e.g., { 'Supplements': true }
}

export type PhotoPose = 'front' | 'back' | 'side';

export interface PhysiquePhoto {
  id?: number;
  date: string; // YYYY-MM-DD
  pose: PhotoPose;
  photoDataUrl: string; // base64
  notes?: string;
  createdAt?: string;
}

export interface DailyTargetPeriod {
  startDate: string; // YYYY-MM-DD
  calorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatsTarget: number;
  waterTargetMl?: number;
  stepsTarget?: number;
  note?: string; // e.g. "Cut phase" or "Lean bulk"
}

export interface UserSettings {
  id: number;
  userName: string;
  calorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatsTarget: number;
  fixedWeighInDay: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  waterTargetMl: number;
  stepsTarget: number;
  customHabitNames: string[];
  weightUnit: 'kg' | 'lbs';
  targetHistory?: DailyTargetPeriod[];
}

export interface NoteEntry {
  id: string;
  content: string;
  timestamp: string;
}

export interface ScratchpadNote {
  weekStartDate: string; // YYYY-MM-DD (primary key)
  content?: string;
  entries?: NoteEntry[];
  updatedAt: string;
}

export type NavigationTab = 'overview' | 'workouts' | 'progress' | 'photos' | 'review';
