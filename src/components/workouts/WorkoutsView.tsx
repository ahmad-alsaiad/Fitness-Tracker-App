import React, { useState } from 'react';
import { Play, CalendarPlus, Dumbbell, CheckCircle2, XCircle, Library, Layers, RotateCcw, Moon } from 'lucide-react';
import { ActiveGymLogger } from './ActiveGymLogger';
import { WorkoutPlannerModal } from './WorkoutPlannerModal';
import { ExerciseLibraryModal } from './ExerciseLibraryModal';
import { CancellationModal } from './CancellationModal';
import { CustomWorkoutsModal } from './CustomWorkoutsModal';
import { weekDays, parseDateKey, db } from '../../db/db';
import type { PlannedWorkout, WorkoutLog, Exercise, UserSettings, WorkoutTemplate } from '../../types';

interface WorkoutsViewProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  plannedWorkout?: PlannedWorkout;
  workoutLog?: WorkoutLog;
  allExercises: Exercise[];
  templates: WorkoutTemplate[];
  settings: UserSettings;
  onDataChanged: () => void;
  onActiveSessionChange?: (isActive: boolean) => void;
}

export const WorkoutsView: React.FC<WorkoutsViewProps> = ({
  selectedDate,
  onSelectDate,
  plannedWorkout,
  workoutLog,
  allExercises,
  templates,
  settings,
  onDataChanged,
  onActiveSessionChange,
}) => {
  const [isActiveSession, setIsActiveSession] = useState(false);
  const [isPlannerOpen, setIsPlannerOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const setSessionActive = (active: boolean) => {
    setIsActiveSession(active);
    onActiveSessionChange?.(active);
  };

  const isCompleted = workoutLog?.status === 'completed';
  const isCancelled = workoutLog?.status === 'cancelled';
  const isRestDay = !isCompleted && !isCancelled && !!plannedWorkout?.isRestDay;

  // 7 days of the currently selected week (Sunday through Saturday)
  const currentWeekDays = weekDays(selectedDate);

  const handleApplyTemplateToDate = async (template: WorkoutTemplate) => {
    await db.plannedWorkouts.put({
      date: selectedDate,
      title: template.name,
      exercises: template.exercises,
      templateId: template.id,
      isRestDay: false,
    });
    onDataChanged();
  };

  const handleMarkRestDay = async () => {
    await db.plannedWorkouts.put({
      date: selectedDate,
      title: 'Rest Day',
      exercises: [],
      isRestDay: true,
    });
    const existing = await db.workoutLogs.get(selectedDate);
    if (existing?.status === 'cancelled') {
      await db.workoutLogs.delete(selectedDate);
    }
    onDataChanged();
  };

  const handleClearRestDay = async () => {
    await db.plannedWorkouts.delete(selectedDate);
    onDataChanged();
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Top Controls: Hidden when an active gym session is running to prevent distractions or accidental date changes */}
      {!isActiveSession && (
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-bold text-textPrimary flex items-center space-x-2">
            <Dumbbell className="w-5 h-5 text-primary" />
            <span>Workouts</span>
          </h2>

          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => setIsTemplatesOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-surface border border-border-subtle text-primary hover:bg-canvas text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Custom Workouts</span>
            </button>
            <button
              type="button"
              onClick={() => setIsLibraryOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-surface border border-border-subtle text-textMuted hover:text-textPrimary hover:bg-canvas text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
              title="Exercise Library"
            >
              <Library className="w-3.5 h-3.5 text-primary" />
              <span>Exercise Library</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Mode: Active Gym Session vs Pre-Workout / Planner */}
      {isActiveSession ? (
        <ActiveGymLogger
          date={selectedDate}
          plannedWorkout={plannedWorkout}
          allExercises={allExercises}
          settings={settings}
          onFinishWorkout={() => {
            setSessionActive(false);
            onDataChanged();
          }}
          onCancelSession={() => {
            setSessionActive(false);
            setIsCancelModalOpen(true);
          }}
          onOpenLibrary={() => setIsLibraryOpen(true)}
        />
      ) : (
        <div className="space-y-4">
          {/* Selected Session Card */}
          <div className="bg-surface rounded-2xl p-5 border border-border-subtle shadow-sm space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider block mb-1">
                  {isRestDay ? `Recovery • ${selectedDate}` : `Session • ${selectedDate}`}
                </span>
                <h3 className="text-lg font-bold text-textPrimary leading-tight truncate">
                  {isCompleted
                    ? workoutLog.title
                    : isCancelled
                    ? workoutLog.title || 'Scheduled Session'
                    : isRestDay
                    ? plannedWorkout?.title || 'Rest Day'
                    : plannedWorkout
                    ? plannedWorkout.title
                    : 'No Routine Scheduled'}
                </h3>
                <p className="text-xs text-textMuted mt-1">
                  {isCompleted
                    ? `Session completed in ${workoutLog.durationMinutes || 45} minutes`
                    : isCancelled
                    ? `Skipped (${workoutLog.cancellationType === 'justified' ? 'Justified' : 'Unjustified'}: ${
                        workoutLog.cancellationReason || 'No reason'
                      })`
                    : isRestDay
                    ? 'Scheduled recovery day. Focus on nutrition, hydration, and sleep.'
                    : plannedWorkout
                    ? `${plannedWorkout.exercises.length} prescribed exercises waiting`
                    : 'Plan your lifts and cardio, pick a custom workout, or schedule rest'}
                </p>
              </div>

              {isCompleted && (
                <div className="p-2.5 rounded-2xl bg-success/15 text-success border border-success/30 flex-shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              )}

              {isCancelled && (
                <div
                  className={`p-2.5 rounded-2xl border flex-shrink-0 ${
                    workoutLog.cancellationType === 'justified'
                      ? 'bg-success/15 text-success border-success/30'
                      : 'bg-danger/15 text-danger border-danger/30'
                  }`}
                >
                  <XCircle className="w-6 h-6" />
                </div>
              )}

              {isRestDay && (
                <div className="p-2.5 rounded-2xl bg-primary/15 text-primary border border-primary/30 flex-shrink-0">
                  <Moon className="w-6 h-6" />
                </div>
              )}
            </div>

            {/* If completed, show summary breakdown */}
            {isCompleted && workoutLog.exercises.length > 0 && (
              <div className="bg-canvas/60 rounded-xl p-3 border border-border-subtle/80 space-y-2">
                <span className="text-[10px] font-bold text-textMuted uppercase tracking-wider block">
                  Logged Sets & PRs
                </span>
                <div className="space-y-1.5">
                  {workoutLog.exercises.map((le, idx) => {
                    const ex = allExercises.find((e) => e.id === le.exerciseId);
                    const isContinuous =
                      ex?.hasSets === false ||
                      (ex?.type === 'cardio' && !ex?.hasSets && !ex?.defaultTargetSeconds && le.completedDurationMinutes !== undefined);
                    const isTimed =
                      ex?.setMetric === 'time' ||
                      (ex?.defaultTargetSeconds && ex.defaultTargetSeconds > 0) ||
                      le.sets.some((s) => s.durationSeconds !== undefined);

                    return (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <span className="text-textPrimary font-medium truncate">{ex?.name || 'Exercise'}</span>
                        <span className="text-textMuted font-mono text-[11px] flex-shrink-0 ml-2">
                          {isContinuous
                            ? `${le.completedDurationMinutes || 20}m cardio`
                            : isTimed
                            ? `${le.sets.length} sets (${le.sets.map((s) => (s.durationSeconds || ex?.defaultTargetSeconds || 30) + 's').join(', ')})`
                            : `${le.sets.length} sets logged`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              {isRestDay ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsPlannerOpen(true)}
                    className="py-2.5 px-3 rounded-xl bg-canvas border border-border-subtle text-textPrimary hover:bg-surface text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <CalendarPlus className="w-4 h-4 text-primary" />
                    <span>Plan Workout Instead</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearRestDay}
                    className="py-2.5 px-3 rounded-xl bg-canvas border border-border-subtle text-danger hover:bg-danger/10 text-xs font-semibold transition-colors"
                  >
                    Clear Rest Day
                  </button>

                  <button
                    type="button"
                    onClick={() => setSessionActive(true)}
                    className="col-span-2 py-2.5 px-4 rounded-xl bg-canvas border border-border-subtle text-textMuted hover:text-textPrimary hover:bg-surface text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 text-primary" />
                    <span>Train Anyway (Start Session)</span>
                  </button>
                </>
              ) : !isCompleted && !isCancelled ? (
                <>
                  <button
                    type="button"
                    onClick={() => setSessionActive(true)}
                    className="col-span-2 py-3.5 px-4 rounded-xl bg-primary text-canvas font-bold text-xs flex items-center justify-center space-x-2 shadow-glow-primary hover:bg-primary-hover transition-colors active:scale-[0.99]"
                  >
                    <Play className="w-4 h-4 fill-canvas" />
                    <span>START GYM SESSION</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPlannerOpen(true)}
                    className="py-2.5 px-3 rounded-xl bg-canvas border border-border-subtle text-textPrimary hover:bg-surface text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <CalendarPlus className="w-4 h-4 text-primary" />
                    <span>{plannedWorkout ? 'Edit Routine' : 'Plan Routine'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleMarkRestDay}
                    className="py-2.5 px-3 rounded-xl bg-canvas border border-border-subtle text-textMuted hover:text-primary hover:bg-surface text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <Moon className="w-4 h-4 text-primary" />
                    <span>Mark Rest Day</span>
                  </button>

                  {plannedWorkout && (
                    <button
                      type="button"
                      onClick={() => setIsCancelModalOpen(true)}
                      className="col-span-2 py-2 px-3 rounded-xl bg-canvas border border-border-subtle text-danger hover:bg-danger/10 text-xs font-semibold transition-colors"
                    >
                      Skip Session
                    </button>
                  )}
                </>
              ) : isCancelled ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsPlannerOpen(true)}
                    className="py-2.5 px-4 rounded-xl bg-canvas border border-border-subtle text-textPrimary hover:bg-surface text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <CalendarPlus className="w-4 h-4 text-primary" />
                    <span>Edit Routine</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCancelModalOpen(true)}
                    className="py-2.5 px-4 rounded-xl bg-canvas border border-border-subtle text-textPrimary hover:bg-surface text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4 text-primary" />
                    <span>Edit / Undo Skip</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setSessionActive(true)}
                  className="col-span-2 py-2.5 px-4 rounded-xl bg-canvas border border-border-subtle text-textPrimary hover:bg-surface text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <Play className="w-3.5 h-3.5 text-primary" />
                  <span>Review / Edit Today's Logged Sets</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Apply Custom Workouts Strip */}
          {templates.length > 0 && (
            <div className="bg-surface rounded-2xl p-4 border border-border-subtle shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-textPrimary flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-primary" />
                  <span>Apply a Custom Workout to {selectedDate}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsTemplatesOpen(true)}
                  className="text-[11px] text-primary font-semibold hover:underline"
                >
                  Manage All
                </button>
              </div>
              <div className="flex space-x-2 overflow-x-auto no-scrollbar py-1">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleApplyTemplateToDate(t)}
                    className="px-3.5 py-2 rounded-xl bg-canvas border border-border-subtle hover:border-primary/50 text-left whitespace-nowrap transition-colors flex-shrink-0"
                  >
                    <span className="text-xs font-bold text-textPrimary block">{t.name}</span>
                    <span className="text-[10px] text-textMuted">{t.exercises.length} exercises</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Weekly Split Planning Overview (Sunday to Saturday) */}
          <div className="bg-surface rounded-2xl p-4 border border-border-subtle shadow-sm space-y-3">
            <div>
              <h3 className="text-sm font-bold text-textPrimary">Weekly Split Overview</h3>
              <p className="text-[11px] text-textMuted">Tap any day to plan or adjust its exercises</p>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {currentWeekDays.map((dateKey) => {
                const d = parseDateKey(dateKey);
                const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                const isSelected = dateKey === selectedDate;
                return (
                  <button
                    key={dateKey}
                    type="button"
                    onClick={() => {
                      onSelectDate(dateKey);
                      setIsPlannerOpen(true);
                    }}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'bg-primary/15 border-primary text-primary font-bold'
                        : 'bg-canvas/50 border-border-subtle/60 text-textMuted hover:text-textPrimary hover:bg-canvas'
                    }`}
                  >
                    <span className="text-[10px] block font-medium uppercase">{dayName}</span>
                    <span className="text-xs font-bold block mt-0.5">{d.getDate()}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <WorkoutPlannerModal
        isOpen={isPlannerOpen}
        onClose={() => setIsPlannerOpen(false)}
        date={selectedDate}
        plannedWorkout={plannedWorkout}
        allExercises={allExercises}
        templates={templates}
        onSaved={onDataChanged}
        onOpenLibrary={() => setIsLibraryOpen(true)}
        onOpenTemplates={() => setIsTemplatesOpen(true)}
      />

      <CustomWorkoutsModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        templates={templates}
        allExercises={allExercises}
        targetDate={selectedDate}
        onApplyTemplate={handleApplyTemplateToDate}
        onTemplatesChanged={onDataChanged}
        onOpenExerciseLibrary={() => setIsLibraryOpen(true)}
      />

      <ExerciseLibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        exercises={allExercises}
        onExerciseAdded={onDataChanged}
      />

      <CancellationModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        date={selectedDate}
        workoutTitle={plannedWorkout?.title || 'Gym Session'}
        existingLog={workoutLog}
        onSuccess={onDataChanged}
      />
    </div>
  );
};
