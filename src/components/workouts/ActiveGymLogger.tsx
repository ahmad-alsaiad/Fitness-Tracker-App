import React, { useState, useEffect } from 'react';
import { Play, Pause, Check, Plus, Trash2, Award, Clock, Dumbbell, Timer, PlusCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { db } from '../../db/db';
import type { PlannedWorkout, Exercise, LoggedExercise, WorkoutSet, UserSettings } from '../../types';
import { ExercisePicker } from '../common/ExercisePicker';
import { Sheet } from '../common/Sheet';
import { useConfirm } from '../common/useConfirm';

interface ActiveGymLoggerProps {
  date: string;
  plannedWorkout?: PlannedWorkout;
  allExercises: Exercise[];
  settings: UserSettings;
  onFinishWorkout: () => void;
  onCancelSession: () => void;
  onOpenLibrary: () => void;
}

export const ActiveGymLogger: React.FC<ActiveGymLoggerProps> = ({
  date,
  plannedWorkout,
  allExercises,
  settings,
  onFinishWorkout,
  onCancelSession,
  onOpenLibrary,
}) => {
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [loggedExercises, setLoggedExercises] = useState<LoggedExercise[]>([]);
  const [historyMap, setHistoryMap] = useState<Record<number, { lastSessionSets: string[]; maxWeight: number }>>({});
  const [isAddPickerOpen, setIsAddPickerOpen] = useState(false);
  const [confirm, confirmDialog] = useConfirm();
  const lastTickRef = React.useRef<number>(Date.now());
  const timerRunningRef = React.useRef(isTimerRunning);
  timerRunningRef.current = isTimerRunning;

  // Background-resilient elapsed timer using timestamp delta & visibilitychange
  useEffect(() => {
    lastTickRef.current = Date.now();

    const interval = setInterval(() => {
      if (timerRunningRef.current) {
        const now = Date.now();
        const deltaSeconds = Math.round((now - lastTickRef.current) / 1000);
        if (deltaSeconds >= 1) {
          setSecondsElapsed((prev) => prev + deltaSeconds);
          lastTickRef.current = now;
        }
      } else {
        lastTickRef.current = Date.now();
      }
    }, 1000);

    const handleVisibilityOrFocus = () => {
      if (!document.hidden && timerRunningRef.current) {
        const now = Date.now();
        const deltaSeconds = Math.round((now - lastTickRef.current) / 1000);
        if (deltaSeconds > 0) {
          setSecondsElapsed((prev) => prev + deltaSeconds);
          lastTickRef.current = now;
        }
      } else {
        lastTickRef.current = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, []);

  const handleToggleTimer = () => {
    setIsTimerRunning((prev) => {
      const next = !prev;
      timerRunningRef.current = next;
      lastTickRef.current = Date.now();
      return next;
    });
  };

  // Load context
  useEffect(() => {
    async function loadContext() {
      // Load previous logs for overload benchmarks
      const previousLogs = await db.workoutLogs
        .where('status')
        .equals('completed')
        .reverse()
        .toArray();

      const hist: Record<number, { lastSessionSets: string[]; maxWeight: number }> = {};
      for (const log of previousLogs) {
        if (log.date === date) continue;
        for (const ex of log.exercises) {
          if (!hist[ex.exerciseId]) {
            let maxW = 0;
            const setStrings: string[] = [];
            for (const s of ex.sets) {
              setStrings.push(`${s.weightKg}${settings.weightUnit} × ${s.reps}`);
              if (s.weightKg > maxW) maxW = s.weightKg;
            }
            hist[ex.exerciseId] = { lastSessionSets: setStrings, maxWeight: maxW };
          }
        }
      }
      setHistoryMap(hist);

      // Check if already partially logged today
      const existing = await db.workoutLogs.get(date);
      if (existing && existing.exercises.length > 0) {
        setLoggedExercises(existing.exercises);
        if (existing.durationMinutes) setSecondsElapsed(existing.durationMinutes * 60);
        return;
      }

      // Populate from planned workout
      if (plannedWorkout && plannedWorkout.exercises.length > 0) {
        const initial: LoggedExercise[] = plannedWorkout.exercises.map((p) => {
          const ex = allExercises.find((e) => e.id === p.exerciseId);
          if (ex?.type === 'cardio') {
            return {
              exerciseId: p.exerciseId,
              sets: [],
              completedDurationMinutes: p.targetDurationMinutes || 20,
            };
          }
          const count = p.targetSets || 3;
          const sets: WorkoutSet[] = Array.from({ length: count }, (_, idx) => ({
            setNumber: idx + 1,
            weightKg: 0,
            reps: 8,
          }));
          return { exerciseId: p.exerciseId, sets };
        });
        setLoggedExercises(initial);
      }
    }

    loadContext();
  }, [date, plannedWorkout, allExercises, settings.weightUnit]);

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Add exercise to active session
  const handleAddExercise = (ex: Exercise) => {
    const isCardio = ex.type === 'cardio';
    const newEx: LoggedExercise = isCardio
      ? { exerciseId: ex.id!, sets: [], completedDurationMinutes: ex.defaultTargetMinutes || 20 }
      : {
          exerciseId: ex.id!,
          sets: Array.from({ length: ex.defaultTargetSets || 3 }, (_, idx) => ({
            setNumber: idx + 1,
            weightKg: 0,
            reps: 8,
          })),
        };
    setLoggedExercises((prev) => [...prev, newEx]);
    setIsAddPickerOpen(false);
  };

  const handleRemoveExercise = async (exIdx: number) => {
    const ok = await confirm({
      title: 'Remove this exercise from session?',
      confirmLabel: 'Remove',
    });
    if (ok) {
      setLoggedExercises((prev) => prev.filter((_, i) => i !== exIdx));
    }
  };

  const handleUpdateSet = (exIdx: number, setIdx: number, updates: Partial<WorkoutSet>) => {
    setLoggedExercises((prev) => {
      const next = [...prev];
      const targetEx = { ...next[exIdx] };
      const nextSets = [...targetEx.sets];
      const currentSet = { ...nextSets[setIdx], ...updates };

      if (updates.weightKg !== undefined || updates.reps !== undefined) {
        const hist = historyMap[targetEx.exerciseId];
        if (hist && hist.maxWeight > 0 && currentSet.weightKg > hist.maxWeight) {
          currentSet.isPR = true;
          try {
            confetti({
              particleCount: 50,
              spread: 60,
              origin: { y: 0.7 },
              colors: ['#FFAE75', '#34D399', '#F1F5F9'],
            });
          } catch {
            // ignore
          }
        }
      }

      nextSets[setIdx] = currentSet;
      targetEx.sets = nextSets;
      next[exIdx] = targetEx;
      return next;
    });
  };

  const handleAddSet = (exIdx: number) => {
    setLoggedExercises((prev) => {
      const next = [...prev];
      const targetEx = { ...next[exIdx] };
      const lastSet = targetEx.sets[targetEx.sets.length - 1];
      const newSet: WorkoutSet = {
        setNumber: targetEx.sets.length + 1,
        weightKg: lastSet?.weightKg || 0,
        reps: lastSet?.reps || 8,
      };
      targetEx.sets = [...targetEx.sets, newSet];
      next[exIdx] = targetEx;
      return next;
    });
  };

  const handleRemoveSet = (exIdx: number, setIdx: number) => {
    setLoggedExercises((prev) => {
      const next = [...prev];
      const targetEx = { ...next[exIdx] };
      targetEx.sets = targetEx.sets
        .filter((_, i) => i !== setIdx)
        .map((s, idx) => ({ ...s, setNumber: idx + 1 }));
      next[exIdx] = targetEx;
      return next;
    });
  };

  const handleUpdateCardio = (exIdx: number, minutes: number) => {
    setLoggedExercises((prev) => {
      const next = [...prev];
      next[exIdx] = { ...next[exIdx], completedDurationMinutes: minutes };
      return next;
    });
  };

  const handleFinish = async () => {
    const durationMinutes = Math.max(1, Math.round(secondsElapsed / 60));
    await db.workoutLogs.put({
      date,
      title: plannedWorkout?.title || 'Gym Session',
      status: 'completed',
      durationMinutes,
      exercises: loggedExercises,
      loggedAt: new Date().toISOString(),
    });

    try {
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.5 },
        colors: ['#FFAE75', '#34D399', '#F1F5F9'],
      });
    } catch {
      // ignore
    }

    onFinishWorkout();
  };

  return (
    <div className="space-y-4 pb-20">
      {confirmDialog}

      {/* Active Workout Status Bar */}
      <div className="sticky top-16 z-20 bg-surface/95 backdrop-blur-md p-3.5 rounded-2xl border border-primary/30 shadow-lg flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
          <div>
            <h2 className="text-xs font-bold text-textPrimary leading-none truncate max-w-[180px]">
              {plannedWorkout?.title || 'Gym Session'}
            </h2>
            <div className="flex items-center space-x-1.5 text-[11px] text-primary font-bold mt-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTime(secondsElapsed)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleToggleTimer}
            className="p-2 rounded-xl bg-canvas border border-border-subtle text-textPrimary hover:bg-surface transition-colors"
            title={isTimerRunning ? 'Pause' : 'Resume'}
          >
            {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 text-success" />}
          </button>

          <button
            type="button"
            onClick={handleFinish}
            className="px-3.5 py-2 rounded-xl bg-primary text-canvas font-bold text-xs flex items-center space-x-1.5 shadow-glow-primary hover:bg-primary-hover transition-colors"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Finish</span>
          </button>
        </div>
      </div>

      {/* Exercises Cards */}
      {loggedExercises.length === 0 ? (
        <div className="bg-surface rounded-2xl p-8 border border-border-subtle text-center space-y-3">
          <Dumbbell className="w-8 h-8 text-textMuted mx-auto opacity-50" />
          <p className="text-xs text-textMuted">No exercises loaded in this session yet.</p>
          <button
            type="button"
            onClick={() => setIsAddPickerOpen(true)}
            className="px-4 py-2 rounded-xl bg-primary text-canvas text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Exercise
          </button>
        </div>
      ) : (
        loggedExercises.map((loggedEx, exIdx) => {
          const ex = allExercises.find((e) => e.id === loggedEx.exerciseId);
          const isCardio = ex?.type === 'cardio';
          const history = historyMap[loggedEx.exerciseId];

          return (
            <div
              key={exIdx}
              className="bg-surface rounded-2xl p-4 border border-border-subtle shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2 min-w-0">
                  <div
                    className={`p-2 rounded-xl flex-shrink-0 ${
                      isCardio ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success'
                    }`}
                  >
                    {isCardio ? <Timer className="w-4 h-4" /> : <Dumbbell className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-textPrimary truncate">{ex?.name || 'Exercise'}</h3>
                    <span className="text-[10px] text-textMuted font-medium uppercase tracking-wider">
                      {ex?.category}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 flex-shrink-0">
                  {!isCardio && (
                    <button
                      type="button"
                      onClick={() => handleAddSet(exIdx)}
                      className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-canvas border border-border-subtle text-primary hover:bg-surface text-xs font-semibold transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Set</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveExercise(exIdx)}
                    className="p-1.5 text-textMuted hover:text-danger rounded-lg transition-colors"
                    title="Remove exercise from session"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Benchmark */}
              {history && history.lastSessionSets.length > 0 && (
                <div className="bg-canvas/70 rounded-xl p-2.5 border border-border-subtle/80 text-[11px]">
                  <span className="text-textMuted font-semibold block mb-1">⚡ Last Session:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {history.lastSessionSets.map((sStr, sI) => (
                      <span
                        key={sI}
                        className="px-2 py-0.5 rounded-md bg-surface text-textPrimary border border-border-subtle font-mono text-[10px]"
                      >
                        Set {sI + 1}: {sStr}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Set logging */}
              {isCardio ? (
                <div className="bg-canvas/60 rounded-xl p-3 border border-border-subtle flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-textMuted uppercase tracking-wider block">
                      Duration Completed
                    </span>
                    <div className="flex items-baseline space-x-1 mt-1">
                      <input
                        type="number"
                        min="1"
                        value={loggedEx.completedDurationMinutes || 20}
                        onChange={(e) => handleUpdateCardio(exIdx, parseInt(e.target.value, 10) || 0)}
                        className="w-16 bg-surface border border-border-subtle rounded-lg px-2 py-1 text-center font-bold text-textPrimary text-sm focus:outline-none focus:border-primary"
                      />
                      <span className="text-xs text-textMuted">minutes</span>
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-success/10 text-success text-xs font-bold flex items-center space-x-1">
                    <Check className="w-4 h-4" />
                    <span>Cardio Active</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-textMuted uppercase tracking-wider px-1">
                    <span className="col-span-2">Set</span>
                    <span className="col-span-4">Weight ({settings.weightUnit})</span>
                    <span className="col-span-3">Reps</span>
                    <span className="col-span-3 text-right">Status</span>
                  </div>

                  {loggedEx.sets.map((set, setIdx) => (
                    <div
                      key={setIdx}
                      className="grid grid-cols-12 gap-2 items-center bg-canvas/60 p-2 rounded-xl border border-border-subtle/80"
                    >
                      <span className="col-span-2 font-bold text-xs text-textPrimary px-1">
                        #{set.setNumber}
                      </span>

                      <div className="col-span-4">
                        <input
                          type="number"
                          step="0.5"
                          inputMode="decimal"
                          value={set.weightKg || ''}
                          onChange={(e) =>
                            handleUpdateSet(exIdx, setIdx, {
                              weightKg: parseFloat(e.target.value) || 0,
                            })
                          }
                          placeholder="0"
                          className="w-full bg-surface border border-border-subtle rounded-lg px-2 py-1.5 text-xs font-bold text-textPrimary focus:outline-none focus:border-primary text-center"
                        />
                      </div>

                      <div className="col-span-3">
                        <input
                          type="number"
                          min="1"
                          inputMode="numeric"
                          value={set.reps || ''}
                          onChange={(e) =>
                            handleUpdateSet(exIdx, setIdx, {
                              reps: parseInt(e.target.value, 10) || 0,
                            })
                          }
                          placeholder="0"
                          className="w-full bg-surface border border-border-subtle rounded-lg px-2 py-1.5 text-xs font-bold text-textPrimary focus:outline-none focus:border-primary text-center"
                        />
                      </div>

                      <div className="col-span-3 flex items-center justify-end space-x-1.5">
                        {set.isPR ? (
                          <span className="flex items-center space-x-0.5 px-1.5 py-0.5 rounded bg-success/20 text-success text-[10px] font-bold animate-bounce">
                            <Award className="w-3 h-3" />
                            <span>PR!</span>
                          </span>
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-border-subtle" />
                        )}

                        {loggedEx.sets.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSet(exIdx, setIdx)}
                            className="p-1 text-textMuted hover:text-danger rounded transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Button to add an exercise on the fly */}
      <button
        type="button"
        onClick={() => setIsAddPickerOpen(true)}
        className="w-full py-3 rounded-2xl bg-surface border border-dashed border-border-subtle hover:border-primary/50 text-textPrimary text-xs font-bold flex items-center justify-center gap-2 transition-colors"
      >
        <PlusCircle className="w-4 h-4 text-primary" />
        <span>Add Exercise to Running Workout</span>
      </button>

      {/* Cancel Session */}
      <div className="text-center pt-2">
        <button
          type="button"
          onClick={onCancelSession}
          className="text-xs text-textMuted hover:text-danger font-medium transition-colors"
        >
          Can't finish today? Cancel session with accountability tag
        </button>
      </div>

      {/* Searchable Picker to Add Exercises During Session */}
      <Sheet
        isOpen={isAddPickerOpen}
        onClose={() => setIsAddPickerOpen(false)}
        title="Add Exercise to Workout"
        subtitle="Search and add any movement to today's active session"
        icon={<PlusCircle className="w-5 h-5" />}
        iconTone="primary"
      >
        <ExercisePicker
          exercises={allExercises}
          onPick={handleAddExercise}
          listMaxHeight="max-h-80"
          onCreateNew={onOpenLibrary}
        />
      </Sheet>
    </div>
  );
};
