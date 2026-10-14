import React, { useState, useEffect } from 'react';
import { Utensils, Edit3, Check, Trash2 } from 'lucide-react';
import { db, getTargetsForDate } from '../../db/db';
import type { DailyNutrition, UserSettings } from '../../types';

interface NutritionCardProps {
  selectedDate: string;
  settings: UserSettings;
  nutrition?: DailyNutrition;
  onDataChanged?: () => void;
}

type MacroKey = 'calories' | 'proteinGrams' | 'carbsGrams' | 'fatsGrams';
type TargetKey = 'calorieTarget' | 'proteinTarget' | 'carbsTarget' | 'fatsTarget';

const MACROS: { key: MacroKey; label: string; unit: string; targetKey: TargetKey; color: string }[] = [
  { key: 'calories', label: 'Calories', unit: 'kcal', targetKey: 'calorieTarget', color: 'bg-primary' },
  { key: 'proteinGrams', label: 'Protein', unit: 'g', targetKey: 'proteinTarget', color: 'bg-success' },
  { key: 'carbsGrams', label: 'Carbs', unit: 'g', targetKey: 'carbsTarget', color: 'bg-sky-400' },
  { key: 'fatsGrams', label: 'Fats', unit: 'g', targetKey: 'fatsTarget', color: 'bg-violet-400' },
];

export const NutritionCard: React.FC<NutritionCardProps> = ({ selectedDate, settings, nutrition, onDataChanged }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [values, setValues] = useState<Record<MacroKey, string>>({
    calories: '',
    proteinGrams: '',
    carbsGrams: '',
    fatsGrams: '',
  });
  const [savedBadge, setSavedBadge] = useState(false);

  const syncFromProps = () =>
    setValues({
      calories: nutrition?.calories ? String(nutrition.calories) : '',
      proteinGrams: nutrition?.proteinGrams ? String(nutrition.proteinGrams) : '',
      carbsGrams: nutrition?.carbsGrams ? String(nutrition.carbsGrams) : '',
      fatsGrams: nutrition?.fatsGrams ? String(nutrition.fatsGrams) : '',
    });

  useEffect(() => {
    syncFromProps();
    setIsEditing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nutrition, selectedDate]);

  const num = (v: string) => {
    const n = parseInt(v, 10);
    return isNaN(n) ? 0 : n;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await db.nutrition.put({
      date: selectedDate,
      calories: num(values.calories),
      proteinGrams: num(values.proteinGrams),
      carbsGrams: num(values.carbsGrams),
      fatsGrams: num(values.fatsGrams),
    });
    setIsEditing(false);
    setSavedBadge(true);
    onDataChanged?.();
    setTimeout(() => setSavedBadge(false), 1500);
  };

  const handleClear = async () => {
    await db.nutrition.delete(selectedDate);
    setIsEditing(false);
    onDataChanged?.();
  };

  const hasData = !!nutrition;

  const targets = getTargetsForDate(selectedDate, settings);

  return (
    <div className="bg-surface rounded-2xl p-4 border border-border-subtle shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Utensils className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-textPrimary">Nutrition</h3>
            <p className="text-[11px] text-textMuted">Daily totals vs target phase</p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          {savedBadge && (
            <span className="flex items-center space-x-1 text-[11px] text-success font-medium mr-1">
              <Check className="w-3.5 h-3.5" />
              <span>Saved</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              if (isEditing) syncFromProps();
              setIsEditing(!isEditing);
            }}
            className="px-2.5 py-1.5 rounded-lg text-textMuted hover:text-textPrimary bg-canvas border border-border-subtle text-xs flex items-center space-x-1 font-medium"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Cancel' : hasData ? 'Edit' : 'Log'}</span>
          </button>
        </div>
      </div>

      {isEditing ? (
        <form onSubmit={handleSave} className="bg-canvas/70 rounded-xl p-3 border border-border-subtle space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {MACROS.map((m) => (
              <div key={m.key}>
                <label className="text-[10px] font-semibold text-textMuted uppercase tracking-wider block mb-1">
                  {m.label} ({m.unit})
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={values[m.key]}
                  onChange={(e) => setValues({ ...values, [m.key]: e.target.value })}
                  placeholder={String(targets[m.targetKey])}
                  className="w-full bg-surface border border-border-subtle rounded-xl px-3 py-2 text-sm font-bold text-textPrimary focus:outline-none focus:border-primary placeholder:text-textMuted/40"
                />
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            {hasData && (
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-2.5 rounded-xl bg-surface border border-border-subtle text-danger text-xs font-semibold flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </button>
            )}
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-primary text-canvas font-bold text-xs hover:bg-primary-hover transition-colors"
            >
              Save Daily Intake
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-3">
          {MACROS.map((m) => {
            const actual = nutrition ? (nutrition[m.key] as number) || 0 : 0;
            const target = targets[m.targetKey];
            const pct = target ? Math.min(Math.round((actual / target) * 100), 100) : 0;
            const over = target && actual > target * 1.05;
            return (
              <div key={m.key}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-textPrimary">{m.label}</span>
                  <span className="font-bold">
                    <span className={over ? 'text-danger' : 'text-textPrimary'}>{actual.toLocaleString()}</span>{' '}
                    <span className="text-textMuted font-normal">
                      / {target.toLocaleString()} {m.unit}
                    </span>
                  </span>
                </div>
                <div className="h-2 w-full bg-canvas rounded-full overflow-hidden border border-border-subtle/50">
                  <div className={`h-full ${m.color} rounded-full transition-all duration-300`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
