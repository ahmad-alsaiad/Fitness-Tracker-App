import React, { useState } from 'react';
import { CheckCircle2, Circle, Droplets, Footprints, Minus, RotateCcw, Trash2, Plus } from 'lucide-react';
import { db } from '../../db/db';
import type { DailyHabits, UserSettings } from '../../types';
import { useConfirm } from '../common/useConfirm';

interface HabitsCardProps {
  selectedDate: string;
  settings: UserSettings;
  habits?: DailyHabits;
  onDataChanged?: () => void;
  onSettingsChanged?: () => void;
}

export const HabitsCard: React.FC<HabitsCardProps> = ({
  selectedDate,
  settings,
  habits,
  onDataChanged,
  onSettingsChanged,
}) => {
  const [isEditingSteps, setIsEditingSteps] = useState(false);
  const [stepsInput, setStepsInput] = useState('');
  const [confirm, confirmDialog] = useConfirm();

  // Local state for immediate snappy UI feedback
  const [localWater, setLocalWater] = useState(habits?.waterMl || 0);
  const [localSteps, setLocalSteps] = useState(habits?.steps || 0);
  const [localCustomHabits, setLocalCustomHabits] = useState<Record<string, boolean>>(habits?.customHabits || {});
  const [localHabitNames, setLocalHabitNames] = useState<string[]>(settings.customHabitNames || []);

  // Sync from props whenever habits or date changes
  React.useEffect(() => {
    setLocalWater(habits?.waterMl || 0);
    setLocalSteps(habits?.steps || 0);
    setLocalCustomHabits(habits?.customHabits || {});
  }, [habits, selectedDate]);

  // Sync habit names from settings prop
  React.useEffect(() => {
    setLocalHabitNames(settings.customHabitNames || []);
  }, [settings.customHabitNames]);

  const waterMl = localWater;
  const steps = localSteps;
  const customHabits = localCustomHabits;

  const save = async (patch: Partial<DailyHabits>) => {
    if (patch.waterMl !== undefined) setLocalWater(patch.waterMl);
    if (patch.steps !== undefined) setLocalSteps(patch.steps);
    if (patch.customHabits !== undefined) setLocalCustomHabits(patch.customHabits);

    const current = await db.habits.get(selectedDate);
    await db.habits.put({
      date: selectedDate,
      waterMl: current?.waterMl || 0,
      steps: current?.steps || 0,
      customHabits: current?.customHabits || {},
      ...patch,
    });
    onDataChanged?.();
  };

  const addWater = (amount: number) => save({ waterMl: Math.max(0, waterMl + amount) });
  const addSteps = (amount: number) => save({ steps: Math.max(0, steps + amount) });
  const toggleHabit = (name: string) => save({ customHabits: { ...customHabits, [name]: !customHabits[name] } });

  const saveSteps = () => {
    const parsed = parseInt(stepsInput, 10);
    if (!isNaN(parsed) && parsed >= 0) save({ steps: parsed });
    setIsEditingSteps(false);
  };

  const resetDay = async () => {
    const ok = await confirm({
      title: 'Reset habits for this day?',
      message: 'Water, steps and checklist for this day will be cleared.',
      confirmLabel: 'Reset',
    });
    if (ok) {
      await db.habits.delete(selectedDate);
      setLocalWater(0);
      setLocalSteps(0);
      setLocalCustomHabits({});
      onDataChanged?.();
    }
  };

  const [newHabitName, setNewHabitName] = useState('');
  const [isAddingHabit, setIsAddingHabit] = useState(false);

  const handleDeleteHabit = async (habitName: string) => {
    const ok = await confirm({
      title: `Delete "${habitName}"?`,
      message: 'This habit will be removed from your routine.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;

    // 1. Immediate UI update
    const updatedNames = localHabitNames.filter((h) => h !== habitName);
    setLocalHabitNames(updatedNames);

    // 2. Remove from settings in DB
    const freshSettings = (await db.userSettings.get(1)) || settings;
    await db.userSettings.put({ ...freshSettings, customHabitNames: updatedNames });

    // 3. Remove from today's checklist
    const nextCustom = { ...customHabits };
    delete nextCustom[habitName];
    setLocalCustomHabits(nextCustom);

    const current = await db.habits.get(selectedDate);
    if (current && current.customHabits) {
      delete current.customHabits[habitName];
      await db.habits.put(current);
    }

    onSettingsChanged?.();
    onDataChanged?.();
  };

  const handleAddNewHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newHabitName.trim();
    if (!trimmed) return;
    if (localHabitNames.includes(trimmed)) {
      setNewHabitName('');
      setIsAddingHabit(false);
      return;
    }

    const updatedNames = [...localHabitNames, trimmed];
    // 1. Immediate UI update
    setLocalHabitNames(updatedNames);
    setNewHabitName('');
    setIsAddingHabit(false);

    // 2. Fetch fresh user settings from DB and persist
    const freshSettings = (await db.userSettings.get(1)) || settings;
    await db.userSettings.put({ ...freshSettings, customHabitNames: updatedNames });

    // 3. Initialize uncompleted state in current day's record
    const nextCustom = { ...customHabits, [trimmed]: false };
    setLocalCustomHabits(nextCustom);

    const currentDay = await db.habits.get(selectedDate);
    await db.habits.put({
      date: selectedDate,
      waterMl: currentDay?.waterMl || localWater || 0,
      steps: currentDay?.steps || localSteps || 0,
      customHabits: { ...(currentDay?.customHabits || {}), [trimmed]: false },
    });

    onSettingsChanged?.();
    onDataChanged?.();
  };

  const waterPercent = Math.min(Math.round((waterMl / settings.waterTargetMl) * 100), 100);
  const stepsPercent = Math.min(Math.round((steps / settings.stepsTarget) * 100), 100);

  const smallBtn =
    'px-2 py-1.5 rounded-lg bg-surface border border-border-subtle text-[11px] font-semibold text-textPrimary hover:bg-canvas transition-colors';

  return (
    <div className="bg-surface rounded-2xl p-4 border border-border-subtle shadow-sm">
      {confirmDialog}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-textPrimary">Daily Habits</h3>
            <p className="text-[11px] text-textMuted">Your non-negotiables</p>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={() => setIsAddingHabit(!isAddingHabit)}
            className="px-2 py-1 rounded-lg text-primary hover:bg-primary/10 transition-colors text-xs font-semibold flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Habit</span>
          </button>
          {habits && (
            <button
              type="button"
              onClick={resetDay}
              className="p-1.5 rounded-lg text-textMuted hover:text-danger hover:bg-danger/10 transition-colors"
              title="Reset this day"
              aria-label="Reset habits for this day"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {/* Inline Add Habit */}
        {isAddingHabit && (
          <form onSubmit={handleAddNewHabit} className="flex gap-1.5 p-1 bg-canvas rounded-xl border border-border-subtle">
            <input
              type="text"
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              placeholder="Habit name (e.g. 10m Reading)…"
              autoFocus
              className="flex-1 bg-transparent px-2.5 py-1 text-xs text-textPrimary focus:outline-none placeholder:text-textMuted/40"
            />
            <button
              type="submit"
              className="px-3 py-1 bg-primary text-canvas text-xs font-bold rounded-lg hover:bg-primary-hover transition-colors"
            >
              Add
            </button>
          </form>
        )}
        {/* Water */}
        <div className="bg-canvas/60 rounded-xl p-3 border border-border-subtle/70">
          <div className="flex items-center justify-between mb-2 gap-2">
            <div className="flex items-center space-x-2 min-w-0">
              <Droplets className="w-4 h-4 text-primary flex-shrink-0" />
              <div className="min-w-0">
                <span className="text-xs font-semibold text-textPrimary block leading-none">Water</span>
                <span className="text-[10px] text-textMuted">
                  {(waterMl / 1000).toFixed(2)}L / {(settings.waterTargetMl / 1000).toFixed(1)}L
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <button type="button" onClick={() => addWater(-250)} className={smallBtn} aria-label="Remove 250ml">
                <Minus className="w-3 h-3" />
              </button>
              <button type="button" onClick={() => addWater(250)} className={smallBtn}>
                +250ml
              </button>
              <button
                type="button"
                onClick={() => addWater(500)}
                className="px-2 py-1.5 rounded-lg bg-primary/15 text-primary border border-primary/30 text-[11px] font-semibold"
              >
                +500ml
              </button>
            </div>
          </div>
          <div className="h-1.5 w-full bg-surface rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${waterPercent}%` }} />
          </div>
        </div>

        {/* Steps */}
        <div className="bg-canvas/60 rounded-xl p-3 border border-border-subtle/70">
          <div className="flex items-center justify-between mb-2 gap-2">
            <div className="flex items-center space-x-2 min-w-0">
              <Footprints className="w-4 h-4 text-success flex-shrink-0" />
              <div className="min-w-0">
                <span className="text-xs font-semibold text-textPrimary block leading-none">Steps</span>
                <span className="text-[10px] text-textMuted">
                  {steps.toLocaleString()} / {settings.stepsTarget.toLocaleString()}
                </span>
              </div>
            </div>

            {isEditingSteps ? (
              <form
                className="flex items-center space-x-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  saveSteps();
                }}
              >
                <input
                  type="number"
                  inputMode="numeric"
                  value={stepsInput}
                  onChange={(e) => setStepsInput(e.target.value)}
                  className="w-24 bg-surface border border-border-subtle rounded-lg px-2 py-1 text-xs font-bold text-textPrimary focus:outline-none focus:border-primary"
                  autoFocus
                />
                <button type="submit" className="px-2 py-1.5 rounded-lg bg-primary text-canvas text-xs font-bold">
                  Save
                </button>
              </form>
            ) : (
              <div className="flex items-center space-x-1">
                <button type="button" onClick={() => addSteps(-1000)} className={smallBtn} aria-label="Remove 1000 steps">
                  <Minus className="w-3 h-3" />
                </button>
                <button type="button" onClick={() => addSteps(1000)} className={smallBtn}>
                  +1k
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStepsInput(steps ? String(steps) : '');
                    setIsEditingSteps(true);
                  }}
                  className={smallBtn}
                >
                  Edit
                </button>
              </div>
            )}
          </div>
          <div className="h-1.5 w-full bg-surface rounded-full overflow-hidden">
            <div className="h-full bg-success rounded-full transition-all duration-300" style={{ width: `${stepsPercent}%` }} />
          </div>
        </div>

        {/* Checklist */}
        {localHabitNames.length > 0 && (
          <div className="space-y-1.5 pt-1">
            {localHabitNames.map((habitName) => {
              const isChecked = !!customHabits[habitName];
              return (
                <div
                  key={habitName}
                  className={`group flex items-center justify-between p-2 rounded-xl border transition-all ${
                    isChecked
                      ? 'bg-success/10 border-success/30 text-textPrimary'
                      : 'bg-canvas/40 border-border-subtle/50 text-textMuted hover:text-textPrimary'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleHabit(habitName)}
                    className="flex-1 flex items-center space-x-2.5 text-left py-0.5"
                  >
                    {isChecked ? (
                      <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-textMuted flex-shrink-0" />
                    )}
                    <span className={`text-xs ${isChecked ? 'font-semibold text-textPrimary' : 'font-medium'}`}>
                      {habitName}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteHabit(habitName);
                    }}
                    className="p-1.5 rounded-lg text-textMuted/40 hover:text-danger hover:bg-danger/10 transition-colors"
                    title={`Delete habit "${habitName}"`}
                    aria-label={`Delete habit ${habitName}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
