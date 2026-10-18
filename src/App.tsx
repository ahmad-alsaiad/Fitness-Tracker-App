import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/layout/Header';
import { Navbar } from './components/layout/Navbar';
import { DateScroller } from './components/common/DateScroller';
import { BiometricsCard } from './components/overview/BiometricsCard';
import { NutritionCard } from './components/overview/NutritionCard';
import { HabitsCard } from './components/overview/HabitsCard';
import { WorkoutPreviewCard } from './components/overview/WorkoutPreviewCard';
import { WorkoutsView } from './components/workouts/WorkoutsView';
import { ProgressView } from './components/progress/ProgressView';
import { PhotosView } from './components/photos/PhotosView';
import { ReviewView } from './components/review/ReviewView';
import { SettingsModal } from './components/settings/SettingsModal';
import { CancellationModal } from './components/workouts/CancellationModal';
import { WorkoutPlannerModal } from './components/workouts/WorkoutPlannerModal';
import { ExerciseLibraryModal } from './components/workouts/ExerciseLibraryModal';
import { CustomWorkoutsModal } from './components/workouts/CustomWorkoutsModal';
import {
  db,
  formatDateKey,
  initializeDatabase,
  DEFAULT_SETTINGS,
} from './db/db';
import type {
  NavigationTab,
  UserSettings,
  Exercise,
  WorkoutTemplate,
  DailyBiometrics,
  DailyNutrition,
  DailyHabits,
  PlannedWorkout,
  WorkoutLog,
} from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('overview');
  const [selectedDate, setSelectedDate] = useState<string>(formatDateKey(new Date()));
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);

  // Daily records for selected date
  const [biometrics, setBiometrics] = useState<DailyBiometrics | undefined>();
  const [previousEntry, setPreviousEntry] = useState<DailyBiometrics | undefined>();
  const [nutrition, setNutrition] = useState<DailyNutrition | undefined>();
  const [habits, setHabits] = useState<DailyHabits | undefined>();
  const [plannedWorkout, setPlannedWorkout] = useState<PlannedWorkout | undefined>();
  const [workoutLog, setWorkoutLog] = useState<WorkoutLog | undefined>();

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPlannerOpen, setIsPlannerOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  // Initial DB Bootstrap
  useEffect(() => {
    async function init() {
      await initializeDatabase();
      loadSettingsAndExercises();
    }
    init();
  }, []);

  const loadSettingsAndExercises = async () => {
    const s = await db.userSettings.get(1);
    if (s) setSettings(s);

    const exs = await db.exercises.toArray();
    setAllExercises(exs);

    const tmps = await db.workoutTemplates.toArray();
    setTemplates(tmps);
  };

  // Load date-specific data
  const loadDateData = useCallback(async () => {
    const bio = await db.biometrics.where('date').equals(selectedDate).first();
    setBiometrics(bio);

    // Fetch the most recent logged weight strictly BEFORE selectedDate
    const prior = await db.biometrics.where('date').below(selectedDate).toArray();
    prior.sort((a, b) => b.date.localeCompare(a.date));
    const lastLogged = prior.find((b) => typeof b.weightKg === 'number' && b.weightKg > 0);
    setPreviousEntry(lastLogged);

    const nut = await db.nutrition.where('date').equals(selectedDate).first();
    setNutrition(nut);

    const hab = await db.habits.where('date').equals(selectedDate).first();
    setHabits(hab);

    const pw = await db.plannedWorkouts.where('date').equals(selectedDate).first();
    setPlannedWorkout(pw);

    const wl = await db.workoutLogs.where('date').equals(selectedDate).first();
    setWorkoutLog(wl);
  }, [selectedDate]);

  useEffect(() => {
    loadDateData();
  }, [selectedDate, loadDateData]);

  // Map of exercises by ID for quick lookups
  const exercisesMap = React.useMemo(() => {
    const map: Record<number, Exercise> = {};
    for (const ex of allExercises) {
      if (ex.id) map[ex.id] = ex;
    }
    return map;
  }, [allExercises]);

  return (
    <div className="min-h-screen bg-canvas text-textPrimary flex flex-col selection:bg-primary selection:text-canvas">
      {/* Sticky App Header */}
      <Header
        selectedDate={selectedDate}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onJumpToday={() => setSelectedDate(formatDateKey(new Date()))}
      />

      {/* Date Scroller: Completely hidden during active workout sessions so user cannot change dates accidentally */}
      {!isWorkoutActive && (activeTab === 'overview' || activeTab === 'workouts') && (
        <DateScroller
          selectedDate={selectedDate}
          onSelectDate={(date) => setSelectedDate(date)}
        />
      )}

      {/* Tab Content Shell */}
      <main className="flex-1 max-w-md w-full mx-auto p-4">
        {activeTab === 'overview' && (
          <div className="space-y-4 pb-20">
            {/* Workout Preview Card with Direct Gym Logger CTA */}
            <WorkoutPreviewCard
              plannedWorkout={plannedWorkout}
              workoutLog={workoutLog}
              exercisesMap={exercisesMap}
              onStartWorkout={() => setActiveTab('workouts')}
              onPlanWorkout={() => setIsPlannerOpen(true)}
              onCancelWorkout={() => setIsCancelModalOpen(true)}
            />

            {/* Morning Biometrics (with comparison to last logged day) */}
            <BiometricsCard
              selectedDate={selectedDate}
              settings={settings}
              biometrics={biometrics}
              previousEntry={previousEntry}
              onDataChanged={loadDateData}
            />

            {/* Nutrition Adherence (Calories, Protein, Carbs, Fats) */}
            <NutritionCard
              selectedDate={selectedDate}
              settings={settings}
              nutrition={nutrition}
              onDataChanged={loadDateData}
            />

            {/* Daily Habits Checklist */}
            <HabitsCard
              selectedDate={selectedDate}
              settings={settings}
              habits={habits}
              onDataChanged={loadDateData}
              onSettingsChanged={loadSettingsAndExercises}
            />
          </div>
        )}

        {activeTab === 'workouts' && (
          <WorkoutsView
            selectedDate={selectedDate}
            onSelectDate={(date) => setSelectedDate(date)}
            plannedWorkout={plannedWorkout}
            workoutLog={workoutLog}
            allExercises={allExercises}
            templates={templates}
            settings={settings}
            onDataChanged={() => {
              loadDateData();
              loadSettingsAndExercises();
            }}
            onActiveSessionChange={setIsWorkoutActive}
          />
        )}

        {activeTab === 'progress' && (
          <ProgressView settings={settings} allExercises={allExercises} />
        )}

        {activeTab === 'photos' && <PhotosView selectedDate={selectedDate} />}

        {activeTab === 'review' && (
          <ReviewView selectedDate={selectedDate} settings={settings} />
        )}
      </main>

      {/* Bottom Navigation */}
      <Navbar activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab)} />

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSettingsUpdated={loadSettingsAndExercises}
      />

      <WorkoutPlannerModal
        isOpen={isPlannerOpen}
        onClose={() => setIsPlannerOpen(false)}
        date={selectedDate}
        plannedWorkout={plannedWorkout}
        allExercises={allExercises}
        templates={templates}
        onSaved={loadDateData}
        onOpenLibrary={() => setIsLibraryOpen(true)}
        onOpenTemplates={() => setIsTemplatesOpen(true)}
      />

      <ExerciseLibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        exercises={allExercises}
        onExerciseAdded={loadSettingsAndExercises}
      />

      <CustomWorkoutsModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        templates={templates}
        allExercises={allExercises}
        targetDate={selectedDate}
        onApplyTemplate={async (template) => {
          await db.plannedWorkouts.put({
            date: selectedDate,
            title: template.name,
            exercises: template.exercises,
            templateId: template.id,
          });
          loadDateData();
          setIsTemplatesOpen(false);
        }}
        onTemplatesChanged={loadSettingsAndExercises}
        onOpenExerciseLibrary={() => setIsLibraryOpen(true)}
      />

      <CancellationModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        date={selectedDate}
        workoutTitle={plannedWorkout?.title || 'Gym Session'}
        onSuccess={loadDateData}
      />
    </div>
  );
}

export default App;
