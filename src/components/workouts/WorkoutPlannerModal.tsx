import React, { useState, useEffect } from 'react';
import { Trash2, CalendarPlus, Check, Copy, Layers, BookmarkPlus, Moon } from 'lucide-react';
import { db, addDays } from '../../db/db';
import type { PlannedWorkout, PlannedExercise, Exercise, WorkoutTemplate } from '../../types';
import { Sheet } from '../common/Sheet';
import { ExercisePicker } from '../common/ExercisePicker';
import { useConfirm } from '../common/useConfirm';

interface WorkoutPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  plannedWorkout?: PlannedWorkout;
  allExercises: Exercise[];
  templates?: WorkoutTemplate[];
  onSaved: () => void;
  onOpenLibrary: () => void;
  onOpenTemplates: () => void;
}

export const WorkoutPlannerModal: React.FC<WorkoutPlannerModalProps> = ({
  isOpen,
  onClose,
  date,
  plannedWorkout,
  allExercises,
  templates = [],
  onSaved,
  onOpenLibrary,
  onOpenTemplates,
}) => {
  const [title, setTitle] = useState('');
  const [items, setItems] = useState<PlannedExercise[]>([]);
  const [isRestDay, setIsRestDay] = useState(false);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [confirm, confirmDialog] = useConfirm();

  useEffect(() => {
    if (!isOpen) return;
    const isRest = !!plannedWorkout?.isRestDay;
    setIsRestDay(isRest);
    setTitle(plannedWorkout?.title || (isRest ? 'Rest Day' : 'Workout Session'));
    setItems(plannedWorkout?.exercises ? [...plannedWorkout.exercises] : []);
    setShowAddPicker(false);
  }, [isOpen, plannedWorkout, date]);

  const handleAddExercise = (ex: Exercise) => {
    const isCardio = ex.type === 'cardio';
    const newItem: PlannedExercise = {
      exerciseId: ex.id!,
      targetSets: ex.defaultTargetSets || 3,
      targetReps: isCardio ? undefined : ex.defaultTargetReps || '8-10',
      targetDurationMinutes: isCardio ? ex.defaultTargetMinutes || 20 : undefined,
    };
    setIsRestDay(false);
    setItems((prev) => [...prev, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, updates: Partial<PlannedExercise>) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...updates } : it)));
  };

  // Apply a custom workout template
  const handleApplyTemplate = (t: WorkoutTemplate) => {
    setIsRestDay(false);
    setTitle(t.name);
    setItems([...t.exercises]);
  };

  // Save current routine as a new custom workout template
  const handleSaveAsTemplate = async () => {
    const tName = prompt('Enter a name for this custom workout template:', title);
    if (!tName?.trim() || items.length === 0) return;
    await db.workoutTemplates.add({
      name: tName.trim(),
      exercises: items,
      createdAt: new Date().toISOString(),
    });
    alert(`Saved "${tName.trim()}" to Custom Workouts!`);
  };

  // Duplicate from 7 days ago
  const handleCopyLastWeek = async () => {
    const lastWeekKey = addDays(date, -7);
    const lastWeekPlan = await db.plannedWorkouts.get(lastWeekKey);
    if (lastWeekPlan && lastWeekPlan.exercises.length > 0) {
      setIsRestDay(false);
      setTitle(lastWeekPlan.title);
      setItems([...lastWeekPlan.exercises]);
    } else {
      alert('No routine was found on this day last week.');
    }
  };

  const handleMarkAsRestDay = async () => {
    await db.plannedWorkouts.put({
      date,
      title: 'Rest Day',
      exercises: [],
      isRestDay: true,
    });
    // Clear any skip logged on this date
    const existing = await db.workoutLogs.get(date);
    if (existing?.status === 'cancelled') {
      await db.workoutLogs.delete(date);
    }
    onSaved();
    onClose();
  };

  const handleSave = async () => {
    if (isRestDay) {
      await handleMarkAsRestDay();
      return;
    }

    if (items.length === 0) {
      await db.plannedWorkouts.delete(date);
    } else {
      const sanitizedItems: PlannedExercise[] = items.map((it) => {
        const ex = allExercises.find((e) => e.id === it.exerciseId);
        const isCardio = ex?.type === 'cardio';
        return {
          ...it,
          targetSets: isCardio
            ? undefined
            : it.targetSets && it.targetSets > 0
            ? it.targetSets
            : ex?.defaultTargetSets || 3,
          targetReps: isCardio
            ? undefined
            : it.targetReps && it.targetReps.trim()
            ? it.targetReps.trim()
            : ex?.defaultTargetReps || '8-10',
          targetDurationMinutes: isCardio
            ? it.targetDurationMinutes && it.targetDurationMinutes > 0
              ? it.targetDurationMinutes
              : ex?.defaultTargetMinutes || 20
            : undefined,
        };
      });

      await db.plannedWorkouts.put({
        date,
        title: title.trim() || 'Workout Session',
        exercises: sanitizedItems,
        isRestDay: false,
      });
    }
    onSaved();
    onClose();
  };

  const handleClearRoutine = async () => {
    const ok = await confirm({
      title: 'Clear this plan?',
      message: `Scheduled workout/rest day for ${date} will be removed.`,
      confirmLabel: 'Clear',
    });
    if (ok) {
      await db.plannedWorkouts.delete(date);
      onSaved();
      onClose();
    }
  };

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title="Plan Routine"
      subtitle={`Schedule exercises for ${date}`}
      icon={<CalendarPlus className="w-5 h-5" />}
      iconTone="primary"
      footer={
        <div className="flex gap-2">
          {plannedWorkout && (
            <button
              type="button"
              onClick={handleClearRoutine}
              className="px-3 py-3 rounded-xl bg-canvas border border-border-subtle text-danger text-xs font-semibold flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-3 rounded-xl bg-primary text-canvas font-bold text-xs uppercase tracking-wider hover:bg-primary-hover transition-colors shadow-glow-primary flex items-center justify-center space-x-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Save Planned Routine</span>
          </button>
        </div>
      }
    >
      {confirmDialog}

      {/* Rest Day Banner / Toggle */}
      {isRestDay ? (
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Moon className="w-5 h-5 text-primary" />
            <div>
              <span className="text-xs font-bold text-textPrimary block">Scheduled Rest Day</span>
              <span className="text-[10px] text-textMuted">Focus on recovery, nutrition & sleep</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsRestDay(false);
              setTitle('Workout Session');
            }}
            className="px-2.5 py-1 rounded-lg bg-surface border border-border-subtle text-primary text-xs font-semibold hover:bg-canvas"
          >
            Plan Workout Instead
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleMarkAsRestDay}
          className="w-full py-2 px-3 rounded-xl bg-canvas border border-border-subtle hover:border-primary/50 text-textMuted hover:text-primary text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
        >
          <Moon className="w-4 h-4 text-primary" />
          <span>Plan as Rest Day</span>
        </button>
      )}

      {/* Title Input + Quick Action Buttons */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-textMuted uppercase tracking-wider block">Routine Name</label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Routine Title (e.g. Push Day)"
            className="flex-1 bg-canvas border border-border-subtle rounded-xl px-3 py-2 text-xs font-bold text-textPrimary focus:outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={handleCopyLastWeek}
            className="px-3 py-2 rounded-xl bg-canvas border border-border-subtle text-textMuted hover:text-textPrimary text-xs font-semibold flex items-center space-x-1 flex-shrink-0"
            title="Duplicate from last week"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Prev</span>
          </button>
        </div>
      </div>

      {/* Templates Selector */}
      {templates.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-textMuted uppercase tracking-wider">
              Apply a Custom Workout
            </span>
            <button
              type="button"
              onClick={onOpenTemplates}
              className="text-[10px] text-primary font-semibold hover:underline"
            >
              Manage Workouts
            </button>
          </div>
          <div className="flex space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleApplyTemplate(t)}
                className="px-3 py-1.5 rounded-xl bg-canvas border border-border-subtle text-xs font-semibold text-textPrimary hover:border-primary/50 flex items-center space-x-1 whitespace-nowrap transition-colors"
              >
                <Layers className="w-3.5 h-3.5 text-primary" />
                <span>{t.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Searchable Exercise Picker Section */}
      <div className="bg-canvas/60 rounded-xl p-3 border border-border-subtle space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-textPrimary">Search & Add Exercises</span>
          <button
            type="button"
            onClick={() => setShowAddPicker(!showAddPicker)}
            className="text-xs text-primary font-semibold hover:underline"
          >
            {showAddPicker ? 'Hide Picker' : '+ Add More'}
          </button>
        </div>

        {showAddPicker && (
          <div className="pt-1">
            <ExercisePicker
              exercises={allExercises}
              onPick={handleAddExercise}
              selectedIds={items.map((i) => i.exerciseId)}
              listMaxHeight="max-h-48"
              onCreateNew={onOpenLibrary}
            />
          </div>
        )}
      </div>

      {/* Planned Exercises List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-textMuted uppercase tracking-wider">
            Exercises in this day ({items.length})
          </label>
          {items.length > 0 && (
            <button
              type="button"
              onClick={handleSaveAsTemplate}
              className="text-[11px] text-primary font-semibold flex items-center gap-1 hover:underline"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              <span>Save as Custom Workout</span>
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="text-center py-8 text-textMuted text-xs bg-canvas/40 rounded-xl border border-border-subtle space-y-2">
            <p>{isRestDay ? 'Rest day scheduled. No exercises needed.' : 'No exercises scheduled yet.'}</p>
            <button
              type="button"
              onClick={() => setShowAddPicker(true)}
              className="text-primary font-semibold underline"
            >
              Search & add exercises
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item, index) => {
              const ex = allExercises.find((e) => e.id === item.exerciseId);
              const isCardio = ex?.type === 'cardio';

              return (
                <div
                  key={index}
                  className="p-3 rounded-xl bg-canvas border border-border-subtle/80 flex items-center justify-between text-xs gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-textPrimary block truncate">{ex?.name || 'Exercise'}</span>
                    <span className="text-[10px] text-textMuted font-medium uppercase">{ex?.category}</span>
                  </div>

                  {isCardio ? (
                    <div className="flex items-center space-x-1.5 flex-shrink-0">
                      <input
                        type="number"
                        inputMode="numeric"
                        min="1"
                        value={item.targetDurationMinutes !== undefined && item.targetDurationMinutes !== null ? item.targetDurationMinutes : ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleUpdateItem(index, {
                            targetDurationMinutes: val === '' ? undefined : parseInt(val, 10),
                          });
                        }}
                        placeholder={String(ex?.defaultTargetMinutes || 20)}
                        className="w-14 bg-surface border border-border-subtle rounded-lg px-2 py-1 text-center font-bold text-textPrimary focus:outline-none placeholder:text-textMuted/40"
                      />
                      <span className="text-[10px] text-textMuted">m</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1.5 flex-shrink-0">
                      <div className="flex items-center space-x-1">
                        <input
                          type="number"
                          inputMode="numeric"
                          min="1"
                          max="20"
                          value={item.targetSets !== undefined && item.targetSets !== null ? item.targetSets : ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleUpdateItem(index, {
                              targetSets: val === '' ? undefined : parseInt(val, 10),
                            });
                          }}
                          placeholder={String(ex?.defaultTargetSets || 3)}
                          className="w-10 bg-surface border border-border-subtle rounded-lg py-1 text-center font-bold text-textPrimary focus:outline-none placeholder:text-textMuted/40"
                        />
                        <span className="text-[10px] text-textMuted">sets</span>
                      </div>
                      <span className="text-textMuted font-bold">×</span>
                      <input
                        type="text"
                        value={item.targetReps ?? ''}
                        onChange={(e) => handleUpdateItem(index, { targetReps: e.target.value })}
                        className="w-14 bg-surface border border-border-subtle rounded-lg px-1 py-1 text-center font-bold text-textPrimary focus:outline-none placeholder:text-textMuted/40"
                        placeholder={ex?.defaultTargetReps || '8-10'}
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="p-1.5 text-textMuted hover:text-danger rounded-lg transition-colors flex-shrink-0"
                    title="Remove from routine"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Sheet>
  );
};
