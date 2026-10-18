import Dexie, { type Table } from 'dexie';
import type {
  Exercise,
  PlannedWorkout,
  WorkoutLog,
  WorkoutTemplate,
  DailyBiometrics,
  DailyNutrition,
  DailyHabits,
  PhysiquePhoto,
  UserSettings,
  ScratchpadNote,
} from '../types';

/**
 * Daily tables use the date (YYYY-MM-DD) as their primary key, so every
 * `put()` for a given day overwrites that day's record instead of creating
 * duplicates. (Duplicates were the cause of "only the first value is saved".)
 */
export class DocketDatabase extends Dexie {
  exercises!: Table<Exercise, number>;
  workoutTemplates!: Table<WorkoutTemplate, number>;
  plannedWorkouts!: Table<PlannedWorkout, string>;
  workoutLogs!: Table<WorkoutLog, string>;
  biometrics!: Table<DailyBiometrics, string>;
  nutrition!: Table<DailyNutrition, string>;
  habits!: Table<DailyHabits, string>;
  physiquePhotos!: Table<PhysiquePhoto, number>;
  userSettings!: Table<UserSettings, number>;
  scratchpadNotes!: Table<ScratchpadNote, string>;

  constructor() {
    super('DocketDB');
    this.version(1).stores({
      exercises: '++id, name, type, category',
      workoutTemplates: '++id, name',
      plannedWorkouts: 'date',
      workoutLogs: 'date, status',
      biometrics: 'date',
      nutrition: 'date',
      habits: 'date',
      physiquePhotos: '++id, date, pose',
      userSettings: 'id',
      scratchpadNotes: 'weekStartDate',
    });
  }
}

export const db = new DocketDatabase();

// ---------- Date helpers ----------

/** Format date as YYYY-MM-DD in local time. */
export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: string): Date {
  return new Date(key + 'T00:00:00');
}

export function addDays(key: string, days: number): string {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + days);
  return formatDateKey(d);
}

/** Weeks start on Sunday. Returns the Sunday on or before the given date. */
export function startOfWeek(key: string): string {
  const d = parseDateKey(key);
  return addDays(key, -d.getDay());
}

export function weekDays(key: string): string[] {
  const start = startOfWeek(key);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function prettyDate(key: string, opts?: Intl.DateTimeFormatOptions): string {
  return parseDateKey(key).toLocaleDateString(
    'en-US',
    opts || { weekday: 'short', month: 'short', day: 'numeric' }
  );
}

export function todayKey(): string {
  return formatDateKey(new Date());
}

export function isOfficialWeighInDay(key: string, settings: UserSettings): boolean {
  return parseDateKey(key).getDay() === settings.fixedWeighInDay;
}

/**
 * Resolves the effective targets (Calories, Protein, Carbs, Fats, Water, Steps)
 * for a specific date based on historical target periods.
 * This guarantees that changing targets in a new phase (e.g. cutting to 2000 kcal)
 * does NOT rewrite or invalidate historical months where a 2400 kcal target was in effect.
 */
export function getTargetsForDate(date: string, settings?: UserSettings): {
  calorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatsTarget: number;
  waterTargetMl: number;
  stepsTarget: number;
} {
  const history = settings?.targetHistory || [];
  if (history.length > 0) {
    // Sort descending by startDate
    const sorted = [...history].sort((a, b) => b.startDate.localeCompare(a.startDate));
    // Find the newest target starting on or before `date`
    const active = sorted.find((p) => p.startDate <= date);
    if (active) {
      return {
        calorieTarget: active.calorieTarget,
        proteinTarget: active.proteinTarget,
        carbsTarget: active.carbsTarget,
        fatsTarget: active.fatsTarget,
        waterTargetMl: active.waterTargetMl ?? settings?.waterTargetMl ?? 3000,
        stepsTarget: active.stepsTarget ?? settings?.stepsTarget ?? 10000,
      };
    }
    // If date is before all historical entries, use earliest recorded period
    const earliest = sorted[sorted.length - 1];
    return {
      calorieTarget: earliest.calorieTarget,
      proteinTarget: earliest.proteinTarget,
      carbsTarget: earliest.carbsTarget,
      fatsTarget: earliest.fatsTarget,
      waterTargetMl: earliest.waterTargetMl ?? settings?.waterTargetMl ?? 3000,
      stepsTarget: earliest.stepsTarget ?? settings?.stepsTarget ?? 10000,
    };
  }

  return {
    calorieTarget: settings?.calorieTarget ?? 2400,
    proteinTarget: settings?.proteinTarget ?? 180,
    carbsTarget: settings?.carbsTarget ?? 250,
    fatsTarget: settings?.fatsTarget ?? 70,
    waterTargetMl: settings?.waterTargetMl ?? 3000,
    stepsTarget: settings?.stepsTarget ?? 10000,
  };
}

// ---------- Defaults ----------

export const DEFAULT_SETTINGS: UserSettings = {
  id: 1,
  userName: 'Ahmad',
  calorieTarget: 2400,
  proteinTarget: 180,
  carbsTarget: 250,
  fatsTarget: 70,
  fixedWeighInDay: 0, // Sunday
  waterTargetMl: 3000,
  stepsTarget: 10000,
  customHabitNames: ['Creatine & Omega-3', '10m Mobility & Stretching'],
  weightUnit: 'kg',
  targetHistory: [
    {
      startDate: '2026-01-01',
      calorieTarget: 2400,
      proteinTarget: 180,
      carbsTarget: 250,
      fatsTarget: 70,
      waterTargetMl: 3000,
      stepsTarget: 10000,
      note: 'Initial Baseline',
    },
  ],
};

export const DEFAULT_EXERCISES: Omit<Exercise, 'id'>[] = [
  // Lifting
  { name: 'Barbell Bench Press', type: 'lifting', category: 'Chest', defaultTargetSets: 4, defaultTargetReps: '6-8' },
  { name: 'Incline Dumbbell Press', type: 'lifting', category: 'Chest', defaultTargetSets: 3, defaultTargetReps: '8-10' },
  { name: 'Cable Chest Fly', type: 'lifting', category: 'Chest', defaultTargetSets: 3, defaultTargetReps: '12-15' },
  { name: 'Barbell Squat', type: 'lifting', category: 'Legs', defaultTargetSets: 4, defaultTargetReps: '6-8' },
  { name: 'Romanian Deadlift', type: 'lifting', category: 'Legs', defaultTargetSets: 3, defaultTargetReps: '8-10' },
  { name: 'Leg Press', type: 'lifting', category: 'Legs', defaultTargetSets: 3, defaultTargetReps: '10-12' },
  { name: 'Lat Pulldown', type: 'lifting', category: 'Back', defaultTargetSets: 4, defaultTargetReps: '8-10' },
  { name: 'Seated Cable Row', type: 'lifting', category: 'Back', defaultTargetSets: 3, defaultTargetReps: '10-12' },
  { name: 'Standing Overhead Press', type: 'lifting', category: 'Shoulders', defaultTargetSets: 3, defaultTargetReps: '8-10' },
  { name: 'Dumbbell Lateral Raise', type: 'lifting', category: 'Shoulders', defaultTargetSets: 4, defaultTargetReps: '12-15' },
  { name: 'Dumbbell Bicep Curl', type: 'lifting', category: 'Arms', defaultTargetSets: 3, defaultTargetReps: '10-12' },
  { name: 'Tricep Rope Pushdown', type: 'lifting', category: 'Arms', defaultTargetSets: 3, defaultTargetReps: '12-15' },
  // Cardio
  { name: 'Incline Treadmill Walk', type: 'cardio', category: 'Cardio', defaultTargetMinutes: 25 },
  { name: 'Stairmaster Intervals', type: 'cardio', category: 'Cardio', defaultTargetMinutes: 20 },
  { name: 'Stationary Bike', type: 'cardio', category: 'Cardio', defaultTargetMinutes: 30 },
];

/** Build a PlannedExercise from an exercise using its defaults. */
export function plannedFromExercise(ex: Exercise): {
  exerciseId: number;
  targetSets?: number;
  targetReps?: string;
  targetDurationSeconds?: number;
  targetDurationMinutes?: number;
} {
  // If continuous cardio (e.g. treadmill without sets)
  if (ex.type === 'cardio' && ex.hasSets === false) {
    return {
      exerciseId: ex.id!,
      targetDurationMinutes: ex.defaultTargetMinutes || 20,
    };
  }

  // If timed sets (e.g. jog in place: 3 sets of 30s)
  if (ex.setMetric === 'time' || (ex.defaultTargetSeconds && ex.defaultTargetSeconds > 0)) {
    return {
      exerciseId: ex.id!,
      targetSets: ex.defaultTargetSets || 3,
      targetDurationSeconds: ex.defaultTargetSeconds || 30,
    };
  }

  // Reps-based sets
  return {
    exerciseId: ex.id!,
    targetSets: ex.defaultTargetSets || 3,
    targetReps: ex.defaultTargetReps || '8-10',
  };
}

/**
 * Initialize DB with seed data if empty
 */
export async function initializeDatabase() {
  const settingsCount = await db.userSettings.count();
  if (settingsCount === 0) {
    await db.userSettings.put(DEFAULT_SETTINGS);
  } else {
    // Backfill new settings fields for older records
    const s = await db.userSettings.get(1);
    if (s) await db.userSettings.put({ ...DEFAULT_SETTINGS, ...s });
  }

  const exerciseCount = await db.exercises.count();
  if (exerciseCount > 0) return;

  const ids: number[] = [];
  for (const ex of DEFAULT_EXERCISES) {
    ids.push(await db.exercises.add(ex as Exercise));
  }
  const exById = (i: number) => ({ ...DEFAULT_EXERCISES[i], id: ids[i] } as Exercise);

  // Sample starter workout routines (PPL)
  await db.workoutTemplates.bulkAdd([
    {
      name: 'Push Day',
      exercises: [0, 1, 8, 9, 11].map((i) => plannedFromExercise(exById(i))),
      createdAt: new Date().toISOString(),
    },
    {
      name: 'Pull Day',
      exercises: [6, 7, 10, 12].map((i) => plannedFromExercise(exById(i))),
      createdAt: new Date().toISOString(),
    },
    {
      name: 'Leg Day',
      exercises: [3, 4, 5, 13].map((i) => plannedFromExercise(exById(i))),
      createdAt: new Date().toISOString(),
    },
  ]);
}
