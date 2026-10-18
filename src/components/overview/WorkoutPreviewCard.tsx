import React from 'react';
import { Dumbbell, Play, CalendarPlus, CheckCircle, XCircle, RotateCcw, Edit2, Moon } from 'lucide-react';
import type { PlannedWorkout, WorkoutLog, Exercise } from '../../types';

interface WorkoutPreviewCardProps {
  plannedWorkout?: PlannedWorkout;
  workoutLog?: WorkoutLog;
  exercisesMap: Record<number, Exercise>;
  onStartWorkout: () => void;
  onPlanWorkout: () => void;
  onCancelWorkout: () => void;
}

export const WorkoutPreviewCard: React.FC<WorkoutPreviewCardProps> = ({
  plannedWorkout,
  workoutLog,
  exercisesMap,
  onStartWorkout,
  onPlanWorkout,
  onCancelWorkout,
}) => {
  const isCompleted = workoutLog?.status === 'completed';
  const isCancelled = workoutLog?.status === 'cancelled';
  const isRestDay = !isCompleted && !isCancelled && !!plannedWorkout?.isRestDay;

  return (
    <div className="bg-surface rounded-2xl p-4 border border-border-subtle shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            {isRestDay ? <Moon className="w-4 h-4" /> : <Dumbbell className="w-4 h-4" />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-textPrimary">
              {isCompleted
                ? workoutLog.title
                : isCancelled
                ? workoutLog.title || 'Scheduled Session'
                : isRestDay
                ? plannedWorkout?.title || 'Rest Day'
                : plannedWorkout
                ? plannedWorkout.title
                : 'No Workout Planned'}
            </h3>
            <p className="text-[11px] text-textMuted">
              {isCompleted
                ? `Completed session • ${workoutLog.durationMinutes || 45} mins`
                : isCancelled
                ? 'Session Skipped'
                : isRestDay
                ? 'Scheduled recovery day • Rest & Grow'
                : plannedWorkout
                ? `${plannedWorkout.exercises.length} prescribed exercises`
                : 'Rest or plan your routine'}
            </p>
          </div>
        </div>

        {/* Status Badges */}
        {isCompleted && (
          <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-success/15 text-success border border-success/30">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Completed</span>
          </span>
        )}

        {isCancelled && (
          <span
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
              workoutLog.cancellationType === 'justified'
                ? 'bg-success/15 text-success border-success/30'
                : 'bg-danger/15 text-danger border-danger/30'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>{workoutLog.cancellationType === 'justified' ? 'Justified Skip' : 'Unjustified Skip'}</span>
          </span>
        )}

        {isRestDay && (
          <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-primary/15 text-primary border border-primary/30">
            <Moon className="w-3.5 h-3.5" />
            <span>Rest Day</span>
          </span>
        )}
      </div>

      {/* Cancellation Notice if Cancelled */}
      {isCancelled && (
        <div
          className={`p-2.5 rounded-xl text-xs mb-3 border flex items-center justify-between gap-2 ${
            workoutLog.cancellationType === 'justified'
              ? 'bg-success/5 border-success/20 text-success'
              : 'bg-danger/5 border-danger/20 text-danger'
          }`}
        >
          <div>
            <span className="font-semibold block mb-0.5">Reason:</span>
            <p className="text-textPrimary">{workoutLog.cancellationReason}</p>
            {workoutLog.cancellationNotes && (
              <p className="text-textMuted text-[10px] italic mt-0.5">{workoutLog.cancellationNotes}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onCancelWorkout}
            className="px-2 py-1 rounded-lg bg-surface border border-border-subtle text-textPrimary hover:bg-canvas text-[11px] font-semibold flex items-center gap-1 flex-shrink-0"
          >
            <Edit2 className="w-3 h-3 text-primary" />
            <span>Edit</span>
          </button>
        </div>
      )}

      {/* Planned Exercises List */}
      {plannedWorkout && !isRestDay && plannedWorkout.exercises.length > 0 && (
        <div className="bg-canvas/60 rounded-xl p-3 border border-border-subtle/70 mb-3 space-y-2">
          {plannedWorkout.exercises.slice(0, 4).map((item, idx) => {
            const ex = exercisesMap[item.exerciseId];
            const name = ex?.name || 'Custom Exercise';
            const isCardio = ex?.type === 'cardio';

            return (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-textPrimary font-medium">{name}</span>
                </div>
                <span className="text-textMuted font-medium">
                  {isCardio
                    ? `${item.targetDurationMinutes || 20}m`
                    : `${item.targetSets} sets × ${item.targetReps || '8-10'}`}
                </span>
              </div>
            );
          })}

          {plannedWorkout.exercises.length > 4 && (
            <p className="text-[10px] text-textMuted text-center pt-1 font-medium">
              +{plannedWorkout.exercises.length - 4} more exercises in routine
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center space-x-2 pt-1">
        {isRestDay ? (
          <>
            <button
              type="button"
              onClick={onPlanWorkout}
              className="flex-1 py-2.5 px-4 rounded-xl bg-canvas border border-border-subtle text-textPrimary font-semibold text-xs flex items-center justify-center space-x-1.5 hover:bg-surface transition-colors"
            >
              <CalendarPlus className="w-3.5 h-3.5 text-primary" />
              <span>Plan Workout Instead</span>
            </button>
            <button
              type="button"
              onClick={onStartWorkout}
              className="py-2.5 px-3 rounded-xl bg-canvas border border-border-subtle text-textMuted hover:text-textPrimary text-xs font-semibold flex items-center justify-center space-x-1"
            >
              <Play className="w-3.5 h-3.5 text-primary" />
              <span>Train</span>
            </button>
          </>
        ) : !isCompleted && !isCancelled ? (
          <>
            <button
              type="button"
              onClick={onStartWorkout}
              className="flex-1 py-2.5 px-4 rounded-xl bg-primary text-canvas font-bold text-xs flex items-center justify-center space-x-2 hover:bg-primary-hover transition-colors shadow-glow-primary active:scale-[0.98]"
            >
              <Play className="w-4 h-4 fill-canvas" />
              <span>{plannedWorkout ? 'Execute Workout' : 'Start Session'}</span>
            </button>

            <button
              type="button"
              onClick={onPlanWorkout}
              className="py-2.5 px-3 rounded-xl bg-canvas border border-border-subtle text-textPrimary hover:bg-surface text-xs font-semibold flex items-center justify-center space-x-1"
            >
              <CalendarPlus className="w-3.5 h-3.5 text-primary" />
              <span>Plan</span>
            </button>

            {plannedWorkout && (
              <button
                type="button"
                onClick={onCancelWorkout}
                className="py-2.5 px-3 rounded-xl bg-canvas border border-border-subtle text-danger font-semibold text-xs hover:bg-danger/10 transition-colors"
              >
                Skip
              </button>
            )}
          </>
        ) : isCancelled ? (
          <>
            <button
              type="button"
              onClick={onPlanWorkout}
              className="flex-1 py-2.5 px-4 rounded-xl bg-canvas border border-border-subtle text-textPrimary font-semibold text-xs flex items-center justify-center space-x-1.5 hover:bg-surface transition-colors"
            >
              <CalendarPlus className="w-4 h-4 text-primary" />
              <span>Edit Routine</span>
            </button>
            <button
              type="button"
              onClick={onCancelWorkout}
              className="py-2.5 px-3 rounded-xl bg-canvas border border-border-subtle text-textPrimary font-semibold text-xs flex items-center justify-center space-x-1 hover:bg-surface transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-primary" />
              <span>Undo Skip</span>
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onPlanWorkout}
            className="flex-1 py-2.5 px-4 rounded-xl bg-canvas border border-border-subtle text-textPrimary font-semibold text-xs flex items-center justify-center space-x-1.5 hover:bg-surface transition-colors"
          >
            <CalendarPlus className="w-4 h-4 text-primary" />
            <span>Edit Routine</span>
          </button>
        )}
      </div>
    </div>
  );
};
