import React, { useState } from 'react';
import { Layers, Plus, Trash2, Edit2, ArrowRight } from 'lucide-react';
import { db } from '../../db/db';
import type { WorkoutTemplate, Exercise, PlannedExercise } from '../../types';
import { Sheet } from '../common/Sheet';
import { ExercisePicker } from '../common/ExercisePicker';
import { useConfirm } from '../common/useConfirm';

interface CustomWorkoutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: WorkoutTemplate[];
  allExercises: Exercise[];
  /** If provided, user can 1-click apply a template to this date */
  targetDate?: string;
  onApplyTemplate?: (template: WorkoutTemplate) => void;
  onTemplatesChanged: () => void;
  onOpenExerciseLibrary: () => void;
}

export const CustomWorkoutsModal: React.FC<CustomWorkoutsModalProps> = ({
  isOpen,
  onClose,
  templates,
  allExercises,
  targetDate,
  onApplyTemplate,
  onTemplatesChanged,
  onOpenExerciseLibrary,
}) => {
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null);
  const [name, setName] = useState('');
  const [exercises, setExercises] = useState<PlannedExercise[]>([]);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [confirm, confirmDialog] = useConfirm();

  const handleStartCreate = () => {
    setEditingTemplate(null);
    setName('');
    setExercises([]);
    setIsCreatingNew(true);
  };

  const handleStartEdit = (t: WorkoutTemplate) => {
    setEditingTemplate(t);
    setName(t.name);
    setExercises([...t.exercises]);
    setIsCreatingNew(true);
  };

  const handleAddExercise = (ex: Exercise) => {
    const isContinuous = ex.hasSets === false || (ex.type === 'cardio' && !ex.hasSets && !ex.defaultTargetSeconds);
    const isTimed = ex.setMetric === 'time' || (ex.defaultTargetSeconds && ex.defaultTargetSeconds > 0);

    let newItem: PlannedExercise;
    if (isContinuous) {
      newItem = {
        exerciseId: ex.id!,
        targetDurationMinutes: ex.defaultTargetMinutes || 20,
      };
    } else if (isTimed) {
      newItem = {
        exerciseId: ex.id!,
        targetSets: ex.defaultTargetSets || 3,
        targetDurationSeconds: ex.defaultTargetSeconds || 30,
      };
    } else {
      newItem = {
        exerciseId: ex.id!,
        targetSets: ex.defaultTargetSets || 3,
        targetReps: ex.defaultTargetReps || '8-10',
      };
    }
    setExercises((prev) => [...prev, newItem]);
  };

  const handleRemoveExercise = (idx: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateItem = (idx: number, patch: Partial<PlannedExercise>) => {
    setExercises((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const sanitizedExercises: PlannedExercise[] = exercises.map((item) => {
      const ex = allExercises.find((e) => e.id === item.exerciseId);
      const isContinuous =
        ex?.hasSets === false ||
        (ex?.type === 'cardio' && !ex?.hasSets && !ex?.defaultTargetSeconds && !item.targetDurationSeconds);
      const isTimed =
        ex?.setMetric === 'time' ||
        (item.targetDurationSeconds !== undefined && item.targetDurationSeconds > 0) ||
        (ex?.defaultTargetSeconds && ex.defaultTargetSeconds > 0);

      if (isContinuous) {
        return {
          exerciseId: item.exerciseId,
          notes: item.notes,
          targetDurationMinutes:
            item.targetDurationMinutes && item.targetDurationMinutes > 0
              ? item.targetDurationMinutes
              : ex?.defaultTargetMinutes || 20,
        };
      }

      if (isTimed) {
        return {
          exerciseId: item.exerciseId,
          notes: item.notes,
          targetSets: item.targetSets && item.targetSets > 0 ? item.targetSets : ex?.defaultTargetSets || 3,
          targetDurationSeconds:
            item.targetDurationSeconds && item.targetDurationSeconds > 0
              ? item.targetDurationSeconds
              : ex?.defaultTargetSeconds || 30,
        };
      }

      return {
        exerciseId: item.exerciseId,
        notes: item.notes,
        targetSets: item.targetSets && item.targetSets > 0 ? item.targetSets : ex?.defaultTargetSets || 3,
        targetReps:
          item.targetReps && item.targetReps.trim() ? item.targetReps.trim() : ex?.defaultTargetReps || '8-10',
      };
    });

    if (editingTemplate?.id) {
      await db.workoutTemplates.update(editingTemplate.id, {
        name: name.trim(),
        exercises: sanitizedExercises,
      });
    } else {
      await db.workoutTemplates.add({
        name: name.trim(),
        exercises: sanitizedExercises,
        createdAt: new Date().toISOString(),
      });
    }

    setIsCreatingNew(false);
    setEditingTemplate(null);
    onTemplatesChanged();
  };

  const handleDelete = async (id?: number) => {
    if (!id) return;
    const ok = await confirm({
      title: 'Delete this custom workout?',
      message: 'This will not affect workouts already logged.',
      confirmLabel: 'Delete',
    });
    if (ok) {
      await db.workoutTemplates.delete(id);
      onTemplatesChanged();
    }
  };

  const handleApply = (t: WorkoutTemplate) => {
    onApplyTemplate?.(t);
    onClose();
  };

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title={isCreatingNew ? (editingTemplate ? 'Edit Custom Workout' : 'New Custom Workout') : 'Custom Workouts'}
      subtitle={
        isCreatingNew
          ? 'Build your routine template (e.g. Push, Pull, Legs)'
          : targetDate
          ? `Choose a workout to apply to ${targetDate}`
          : 'Your reusable workout templates'
      }
      icon={<Layers className="w-5 h-5" />}
      iconTone="primary"
    >
      {confirmDialog}

      {isCreatingNew ? (
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-textMuted uppercase tracking-wider block mb-1">
              Workout Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Push Day (Chest & Triceps)"
              className="w-full bg-canvas border border-border-subtle rounded-xl px-3 py-2 text-sm font-bold text-textPrimary focus:outline-none focus:border-primary"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-textMuted uppercase tracking-wider block mb-2">
              Add Exercises
            </label>
            <ExercisePicker
              exercises={allExercises}
              onPick={handleAddExercise}
              selectedIds={exercises.map((e) => e.exerciseId)}
              listMaxHeight="max-h-40"
              onCreateNew={onOpenExerciseLibrary}
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-textMuted uppercase tracking-wider block mb-2">
              Exercises in this workout ({exercises.length})
            </label>
            {exercises.length === 0 ? (
              <p className="text-xs text-textMuted text-center py-4 bg-canvas/40 rounded-xl border border-border-subtle">
                Pick exercises from the search above to build this workout.
              </p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {exercises.map((item, idx) => {
                  const ex = allExercises.find((e) => e.id === item.exerciseId);
                  return (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-canvas border border-border-subtle flex items-center justify-between text-xs gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-textPrimary block truncate">
                          {ex?.name || 'Exercise'}
                        </span>
                        <span className="text-[10px] text-textMuted">{ex?.category}</span>
                      </div>

                      {(() => {
                        const isContinuous =
                          ex?.hasSets === false ||
                          (ex?.type === 'cardio' && !ex?.hasSets && !ex?.defaultTargetSeconds && !item.targetDurationSeconds);
                        const isTimed =
                          ex?.setMetric === 'time' ||
                          (item.targetDurationSeconds !== undefined && item.targetDurationSeconds > 0) ||
                          (ex?.defaultTargetSeconds && ex.defaultTargetSeconds > 0);

                        if (isContinuous) {
                          return (
                            <div className="flex items-center space-x-1">
                              <input
                                type="number"
                                inputMode="numeric"
                                min="1"
                                value={item.targetDurationMinutes !== undefined && item.targetDurationMinutes !== null ? item.targetDurationMinutes : ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  handleUpdateItem(idx, {
                                    targetDurationMinutes: val === '' ? undefined : parseInt(val, 10),
                                  });
                                }}
                                placeholder={String(ex?.defaultTargetMinutes || 20)}
                                className="w-14 bg-surface border border-border-subtle rounded-lg py-1 text-center font-bold text-textPrimary focus:outline-none placeholder:text-textMuted/40"
                              />
                              <span className="text-[10px] text-textMuted">m</span>
                            </div>
                          );
                        }

                        if (isTimed) {
                          return (
                            <div className="flex items-center space-x-1">
                              <input
                                type="number"
                                inputMode="numeric"
                                min="1"
                                max="20"
                                value={item.targetSets !== undefined && item.targetSets !== null ? item.targetSets : ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  handleUpdateItem(idx, {
                                    targetSets: val === '' ? undefined : parseInt(val, 10),
                                  });
                                }}
                                placeholder={String(ex?.defaultTargetSets || 3)}
                                className="w-10 bg-surface border border-border-subtle rounded-lg py-1 text-center font-bold text-textPrimary focus:outline-none placeholder:text-textMuted/40"
                              />
                              <span className="text-[10px] text-textMuted">sets</span>
                              <span className="text-textMuted font-bold">×</span>
                              <input
                                type="number"
                                inputMode="numeric"
                                min="5"
                                step="5"
                                value={item.targetDurationSeconds !== undefined && item.targetDurationSeconds !== null ? item.targetDurationSeconds : ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  handleUpdateItem(idx, {
                                    targetDurationSeconds: val === '' ? undefined : parseInt(val, 10),
                                  });
                                }}
                                placeholder={String(ex?.defaultTargetSeconds || 30)}
                                className="w-12 bg-surface border border-border-subtle rounded-lg py-1 text-center font-bold text-textPrimary focus:outline-none placeholder:text-textMuted/40"
                              />
                              <span className="text-[10px] text-textMuted">s</span>
                            </div>
                          );
                        }

                        return (
                          <div className="flex items-center space-x-1">
                            <input
                              type="number"
                              inputMode="numeric"
                              min="1"
                              max="20"
                              value={item.targetSets !== undefined && item.targetSets !== null ? item.targetSets : ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                handleUpdateItem(idx, {
                                  targetSets: val === '' ? undefined : parseInt(val, 10),
                                });
                              }}
                              placeholder={String(ex?.defaultTargetSets || 3)}
                              className="w-10 bg-surface border border-border-subtle rounded-lg py-1 text-center font-bold text-textPrimary focus:outline-none placeholder:text-textMuted/40"
                            />
                            <span className="text-[10px] text-textMuted">sets</span>
                            <span className="text-textMuted font-bold">×</span>
                            <input
                              type="text"
                              value={item.targetReps ?? ''}
                              onChange={(e) => handleUpdateItem(idx, { targetReps: e.target.value })}
                              placeholder={ex?.defaultTargetReps || '8-10'}
                              className="w-14 bg-surface border border-border-subtle rounded-lg py-1 text-center font-bold text-textPrimary focus:outline-none placeholder:text-textMuted/40"
                            />
                          </div>
                        );
                      })()}

                      <button
                        type="button"
                        onClick={() => handleRemoveExercise(idx)}
                        className="p-1.5 text-textMuted hover:text-danger rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreatingNew(false)}
              className="px-4 py-2.5 rounded-xl bg-canvas border border-border-subtle text-textPrimary text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || exercises.length === 0}
              className="flex-1 py-2.5 rounded-xl bg-primary text-canvas font-bold text-xs uppercase tracking-wider hover:bg-primary-hover disabled:opacity-40 transition-colors"
            >
              Save Custom Workout
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleStartCreate}
            className="w-full py-3 rounded-xl bg-primary text-canvas font-bold text-xs flex items-center justify-center space-x-1.5 hover:bg-primary-hover transition-colors shadow-glow-primary"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Custom Workout</span>
          </button>

          {templates.length === 0 ? (
            <p className="text-center text-xs text-textMuted py-8">
              No custom workouts yet. Build your splits (e.g. Push, Pull, Legs) to schedule days in 1 click!
            </p>
          ) : (
            <div className="space-y-2">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="p-3.5 rounded-xl bg-canvas border border-border-subtle flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-textPrimary truncate">{t.name}</h4>
                    <p className="text-[11px] text-textMuted">
                      {t.exercises.length} exercises (
                      {t.exercises
                        .slice(0, 3)
                        .map((te) => allExercises.find((e) => e.id === te.exerciseId)?.name)
                        .filter(Boolean)
                        .join(', ')}
                      {t.exercises.length > 3 ? '…' : ''})
                    </p>
                  </div>

                  <div className="flex items-center space-x-1 flex-shrink-0">
                    {onApplyTemplate && (
                      <button
                        type="button"
                        onClick={() => handleApply(t)}
                        className="px-3 py-1.5 rounded-lg bg-primary text-canvas text-xs font-bold flex items-center space-x-1 hover:bg-primary-hover transition-colors"
                      >
                        <span>Apply</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleStartEdit(t)}
                      className="p-2 text-textMuted hover:text-textPrimary hover:bg-surface rounded-lg transition-colors"
                      title="Edit template"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(t.id)}
                      className="p-2 text-textMuted hover:text-danger hover:bg-surface rounded-lg transition-colors"
                      title="Delete template"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
};
