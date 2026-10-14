import React, { useState } from 'react';
import { X, SlidersHorizontal, Download, Upload, Trash2, Plus, Check, History, Clock } from 'lucide-react';
import { db, formatDateKey } from '../../db/db';
import type { UserSettings, DailyTargetPeriod } from '../../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSettingsUpdated: () => void;
}

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingsUpdated,
}) => {
  const [calorieTarget, setCalorieTarget] = useState(settings.calorieTarget);
  const [proteinTarget, setProteinTarget] = useState(settings.proteinTarget);
  const [carbsTarget, setCarbsTarget] = useState(settings.carbsTarget || 250);
  const [fatsTarget, setFatsTarget] = useState(settings.fatsTarget || 65);
  const [fixedWeighInDay, setFixedWeighInDay] = useState(settings.fixedWeighInDay);
  const [waterTargetMl, setWaterTargetMl] = useState(settings.waterTargetMl);
  const [stepsTarget, setStepsTarget] = useState(settings.stepsTarget);
  const [weightUnit, setWeightUnit] = useState(settings.weightUnit);
  const [habits, setHabits] = useState<string[]>(settings.customHabitNames);
  const [newHabitText, setNewHabitText] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Target History & Effective Date
  const [effectiveStartDate, setEffectiveStartDate] = useState(formatDateKey(new Date()));
  const [phaseNote, setPhaseNote] = useState('');
  const [applyMode, setApplyMode] = useState<'from-date' | 'all-time'>('from-date');
  const [targetHistory, setTargetHistory] = useState<DailyTargetPeriod[]>(settings.targetHistory || []);
  const [showHistoryList, setShowHistoryList] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setCalorieTarget(settings.calorieTarget);
      setProteinTarget(settings.proteinTarget);
      setCarbsTarget(settings.carbsTarget || 250);
      setFatsTarget(settings.fatsTarget || 65);
      setFixedWeighInDay(settings.fixedWeighInDay);
      setWaterTargetMl(settings.waterTargetMl);
      setStepsTarget(settings.stepsTarget);
      setWeightUnit(settings.weightUnit);
      setHabits(settings.customHabitNames || []);
      setTargetHistory(settings.targetHistory || []);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    let updatedHistory = [...targetHistory];
    if (applyMode === 'from-date') {
      const newPeriod: DailyTargetPeriod = {
        startDate: effectiveStartDate,
        calorieTarget,
        proteinTarget,
        carbsTarget,
        fatsTarget,
        waterTargetMl,
        stepsTarget,
        note: phaseNote.trim() || undefined,
      };
      updatedHistory = [
        ...updatedHistory.filter((p) => p.startDate !== effectiveStartDate),
        newPeriod,
      ].sort((a, b) => a.startDate.localeCompare(b.startDate));
    } else {
      updatedHistory = [
        {
          startDate: '2020-01-01',
          calorieTarget,
          proteinTarget,
          carbsTarget,
          fatsTarget,
          waterTargetMl,
          stepsTarget,
          note: 'All-time target',
        },
      ];
    }

    await db.userSettings.put({
      ...settings,
      calorieTarget,
      proteinTarget,
      carbsTarget,
      fatsTarget,
      fixedWeighInDay,
      waterTargetMl,
      stepsTarget,
      weightUnit,
      customHabitNames: habits,
      targetHistory: updatedHistory,
    });

    setSaveSuccess(true);
    onSettingsUpdated();
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 800);
  };

  const handleAddHabit = () => {
    const trimmed = newHabitText.trim();
    if (trimmed && !habits.includes(trimmed)) {
      setHabits([...habits, trimmed]);
      setNewHabitText('');
    }
  };

  const handleRemoveHabit = (index: number) => {
    setHabits(habits.filter((_, i) => i !== index));
  };

  // Export full JSON backup
  const handleExportBackup = async () => {
    const exercises = await db.exercises.toArray();
    const workoutTemplates = await db.workoutTemplates.toArray();
    const plannedWorkouts = await db.plannedWorkouts.toArray();
    const workoutLogs = await db.workoutLogs.toArray();
    const biometrics = await db.biometrics.toArray();
    const nutrition = await db.nutrition.toArray();
    const habitsData = await db.habits.toArray();
    const physiquePhotos = await db.physiquePhotos.toArray();
    const userSettings = await db.userSettings.toArray();
    const scratchpadNotes = await db.scratchpadNotes.toArray();

    const fullBackup = {
      version: 2,
      app: 'docket',
      exportedAt: new Date().toISOString(),
      data: {
        exercises,
        workoutTemplates,
        plannedWorkouts,
        workoutLogs,
        biometrics,
        nutrition,
        habits: habitsData,
        physiquePhotos,
        userSettings,
        scratchpadNotes,
      },
    };

    const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `docket-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.data) throw new Error('Invalid backup file');

        const { data } = json;
        await db.transaction('rw', db.tables, async () => {
          if (data.exercises) {
            await db.exercises.clear();
            await db.exercises.bulkAdd(data.exercises);
          }
          if (data.workoutTemplates) {
            await db.workoutTemplates.clear();
            await db.workoutTemplates.bulkAdd(data.workoutTemplates);
          }
          if (data.plannedWorkouts) {
            await db.plannedWorkouts.clear();
            await db.plannedWorkouts.bulkAdd(data.plannedWorkouts);
          }
          if (data.workoutLogs) {
            await db.workoutLogs.clear();
            await db.workoutLogs.bulkAdd(data.workoutLogs);
          }
          if (data.biometrics) {
            await db.biometrics.clear();
            await db.biometrics.bulkAdd(data.biometrics);
          }
          if (data.nutrition) {
            await db.nutrition.clear();
            await db.nutrition.bulkAdd(data.nutrition);
          }
          if (data.habits) {
            await db.habits.clear();
            await db.habits.bulkAdd(data.habits);
          }
          if (data.physiquePhotos) {
            await db.physiquePhotos.clear();
            await db.physiquePhotos.bulkAdd(data.physiquePhotos);
          }
          if (data.userSettings) {
            await db.userSettings.clear();
            await db.userSettings.bulkAdd(data.userSettings);
          }
          if (data.scratchpadNotes) {
            await db.scratchpadNotes.clear();
            await db.scratchpadNotes.bulkAdd(data.scratchpadNotes);
          }
        });

        alert('Docket backup imported successfully!');
        window.location.reload();
      } catch (err) {
        alert('Failed to import backup: ' + (err as Error).message);
      }
    };
    reader.readAsText(file);
  };

  const handleResetAllData = async () => {
    const confirmReset = window.confirm(
      'Clean all logged data and reset to untouched app state? This will clear all weights, workouts, nutrition, habits, photos, and notes.'
    );
    if (!confirmReset) return;

    await db.transaction('rw', [
      db.plannedWorkouts,
      db.workoutLogs,
      db.biometrics,
      db.nutrition,
      db.habits,
      db.physiquePhotos,
      db.scratchpadNotes,
    ], async () => {
      await db.plannedWorkouts.clear();
      await db.workoutLogs.clear();
      await db.biometrics.clear();
      await db.nutrition.clear();
      await db.habits.clear();
      await db.physiquePhotos.clear();
      await db.scratchpadNotes.clear();
    });

    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-canvas/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-surface border border-border-subtle rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-textPrimary">Targets & Settings</h2>
              <p className="text-xs text-textMuted">Customize your daily metrics & habits</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-textMuted hover:text-textPrimary hover:bg-canvas transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Calorie & Protein Targets */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-textMuted uppercase tracking-wider block mb-1">
                Daily Calories (kcal)
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={calorieTarget}
                onChange={(e) => setCalorieTarget(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-canvas border border-border-subtle rounded-xl px-3 py-2 text-sm font-bold text-textPrimary focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-textMuted uppercase tracking-wider block mb-1">
                Daily Protein (grams)
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={proteinTarget}
                onChange={(e) => setProteinTarget(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-canvas border border-border-subtle rounded-xl px-3 py-2 text-sm font-bold text-textPrimary focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Carbs & Fats Targets */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-textMuted uppercase tracking-wider block mb-1">
                Daily Carbs (grams)
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={carbsTarget}
                onChange={(e) => setCarbsTarget(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-canvas border border-border-subtle rounded-xl px-3 py-2 text-sm font-bold text-textPrimary focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-textMuted uppercase tracking-wider block mb-1">
                Daily Fats (grams)
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={fatsTarget}
                onChange={(e) => setFatsTarget(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-canvas border border-border-subtle rounded-xl px-3 py-2 text-sm font-bold text-textPrimary focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Phase & Historical Target Versioning */}
          <div className="bg-canvas/70 rounded-2xl p-3.5 border border-border-subtle space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span className="text-[11px] font-bold text-textPrimary">Effective Date & Phase</span>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryList(!showHistoryList)}
                className="text-[10px] text-primary hover:underline flex items-center space-x-1"
              >
                <History className="w-3 h-3" />
                <span>{showHistoryList ? 'Hide Log' : `Phases (${targetHistory.length})`}</span>
              </button>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-textMuted block mb-1">Effective Starting</label>
                  <input
                    type="date"
                    value={effectiveStartDate}
                    onChange={(e) => setEffectiveStartDate(e.target.value)}
                    className="w-full bg-surface border border-border-subtle rounded-xl px-2.5 py-1.5 text-xs text-textPrimary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-textMuted block mb-1">Phase Label (Optional)</label>
                  <input
                    type="text"
                    value={phaseNote}
                    onChange={(e) => setPhaseNote(e.target.value)}
                    placeholder="e.g. Cut, Bulk, Maintenance"
                    className="w-full bg-surface border border-border-subtle rounded-xl px-2.5 py-1.5 text-xs text-textPrimary focus:outline-none placeholder:text-textMuted/40"
                  />
                </div>
              </div>

              <div className="flex bg-surface border border-border-subtle rounded-xl p-0.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => setApplyMode('from-date')}
                  className={`flex-1 py-1 rounded-lg font-bold transition-all ${
                    applyMode === 'from-date' ? 'bg-primary text-canvas' : 'text-textMuted'
                  }`}
                >
                  Protect Historical Months (From Date)
                </button>
                <button
                  type="button"
                  onClick={() => setApplyMode('all-time')}
                  className={`flex-1 py-1 rounded-lg font-bold transition-all ${
                    applyMode === 'all-time' ? 'bg-primary text-canvas' : 'text-textMuted'
                  }`}
                >
                  Apply All-Time
                </button>
              </div>
            </div>

            {/* Past Phase History Dropdown/List */}
            {showHistoryList && (
              <div className="pt-2 border-t border-border-subtle space-y-1.5 max-h-40 overflow-y-auto">
                <span className="text-[10px] font-bold text-textMuted uppercase tracking-wider block">
                  Logged Target Phases:
                </span>
                {targetHistory.length === 0 ? (
                  <p className="text-[11px] text-textMuted italic">No past phases recorded.</p>
                ) : (
                  targetHistory.map((phase, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-xl bg-surface border border-border-subtle/80 flex items-center justify-between text-[11px]"
                    >
                      <div>
                        <span className="font-bold text-textPrimary block">
                          From {phase.startDate} {phase.note ? `• ${phase.note}` : ''}
                        </span>
                        <span className="text-[10px] text-textMuted">
                          {phase.calorieTarget} kcal • {phase.proteinTarget}g P • {phase.carbsTarget}g C • {phase.fatsTarget}g F
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTargetHistory(targetHistory.filter((_, i) => i !== idx))}
                        className="p-1 text-textMuted hover:text-danger transition-colors"
                        title="Remove Phase"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Official Weigh-In Day & Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-textMuted uppercase tracking-wider block mb-1">
                Official Weigh-in Day
              </label>
              <select
                value={fixedWeighInDay}
                onChange={(e) => setFixedWeighInDay(parseInt(e.target.value, 10))}
                className="w-full bg-canvas border border-border-subtle rounded-xl px-3 py-2 text-sm font-semibold text-textPrimary focus:outline-none focus:border-primary"
              >
                {DAYS_OF_WEEK.map((day, idx) => (
                  <option key={day} value={idx}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-textMuted uppercase tracking-wider block mb-1">
                Weight Unit
              </label>
              <div className="flex bg-canvas border border-border-subtle rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setWeightUnit('kg')}
                  className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${
                    weightUnit === 'kg' ? 'bg-primary text-canvas' : 'text-textMuted'
                  }`}
                >
                  KG
                </button>
                <button
                  type="button"
                  onClick={() => setWeightUnit('lbs')}
                  className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${
                    weightUnit === 'lbs' ? 'bg-primary text-canvas' : 'text-textMuted'
                  }`}
                >
                  LBS
                </button>
              </div>
            </div>
          </div>

          {/* Water & Steps Targets */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-textMuted uppercase tracking-wider block mb-1">
                Water Target (ml)
              </label>
              <input
                type="number"
                step="250"
                inputMode="numeric"
                value={waterTargetMl}
                onChange={(e) => setWaterTargetMl(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-canvas border border-border-subtle rounded-xl px-3 py-2 text-sm font-bold text-textPrimary focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-textMuted uppercase tracking-wider block mb-1">
                Steps Target
              </label>
              <input
                type="number"
                step="500"
                inputMode="numeric"
                value={stepsTarget}
                onChange={(e) => setStepsTarget(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-canvas border border-border-subtle rounded-xl px-3 py-2 text-sm font-bold text-textPrimary focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Custom Non-Negotiables Checklist Editor */}
          <div>
            <label className="text-[10px] font-bold text-textMuted uppercase tracking-wider block mb-2">
              Daily Non-Negotiable Habits
            </label>
            <div className="space-y-1.5 mb-2">
              {habits.map((h, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 rounded-xl bg-canvas border border-border-subtle text-xs"
                >
                  <span className="text-textPrimary font-medium">{h}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveHabit(i)}
                    className="p-1 text-textMuted hover:text-danger transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex space-x-2">
              <input
                type="text"
                value={newHabitText}
                onChange={(e) => setNewHabitText(e.target.value)}
                placeholder="New habit (e.g. 10m Reading)"
                className="flex-1 bg-canvas border border-border-subtle rounded-xl px-3 py-1.5 text-xs text-textPrimary focus:outline-none focus:border-primary placeholder:text-textMuted/40"
              />
              <button
                type="button"
                onClick={handleAddHabit}
                className="px-3 py-1.5 rounded-xl bg-surface border border-border-subtle text-primary font-bold text-xs flex items-center space-x-1 hover:bg-canvas transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-primary text-canvas font-bold text-xs uppercase tracking-wider hover:bg-primary-hover transition-colors shadow-glow-primary flex items-center justify-center space-x-1.5"
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Saved Successfully!</span>
              </>
            ) : (
              <span>Save Targets</span>
            )}
          </button>
        </form>

        {/* Local Data Backup & Restore */}
        <div className="pt-3 border-t border-border-subtle space-y-2">
          <span className="text-[10px] font-bold text-textMuted uppercase tracking-wider block">
            Offline Storage & Device Sync
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleExportBackup}
              className="p-2.5 rounded-xl bg-canvas border border-border-subtle text-textPrimary font-semibold text-xs flex items-center justify-center space-x-1.5 hover:bg-surface transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-primary" />
              <span>Export Backup</span>
            </button>

            <label className="p-2.5 rounded-xl bg-canvas border border-border-subtle text-textPrimary font-semibold text-xs flex items-center justify-center space-x-1.5 hover:bg-surface transition-colors cursor-pointer text-center">
              <Upload className="w-3.5 h-3.5 text-success" />
              <span>Import Backup</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={handleResetAllData}
            className="w-full mt-1 p-2 rounded-xl bg-danger/10 border border-danger/25 text-danger font-semibold text-xs flex items-center justify-center space-x-1.5 hover:bg-danger/15 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset All Data to Untouched State</span>
          </button>
        </div>
      </div>
    </div>
  );
};
