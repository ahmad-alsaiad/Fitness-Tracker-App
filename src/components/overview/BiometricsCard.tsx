import React, { useState, useEffect } from 'react';
import { Scale, Check, Trash2, Star } from 'lucide-react';
import { db, isOfficialWeighInDay, prettyDate } from '../../db/db';
import type { DailyBiometrics, UserSettings } from '../../types';

interface BiometricsCardProps {
  selectedDate: string;
  settings: UserSettings;
  biometrics?: DailyBiometrics;
  /** The most recent weigh-in logged BEFORE the selected date */
  previousEntry?: DailyBiometrics;
  onDataChanged?: () => void;
}

export const BiometricsCard: React.FC<BiometricsCardProps> = ({
  selectedDate,
  settings,
  biometrics,
  previousEntry,
  onDataChanged,
}) => {
  const [weight, setWeight] = useState<string>('');
  const [savedBadge, setSavedBadge] = useState(false);

  // Sync input with the stored value whenever the date or record changes
  useEffect(() => {
    setWeight(biometrics?.weightKg ? String(biometrics.weightKg) : '');
  }, [biometrics?.weightKg, selectedDate]);

  const isOfficialDay = isOfficialWeighInDay(selectedDate, settings);

  const flashSaved = () => {
    setSavedBadge(true);
    setTimeout(() => setSavedBadge(false), 1500);
  };

  const saveWeight = async () => {
    const parsed = parseFloat(weight);
    if (!weight.trim()) return;
    if (isNaN(parsed) || parsed <= 0) return;
    if (parsed === biometrics?.weightKg) return;
    await db.biometrics.put({
      ...(biometrics || {}),
      date: selectedDate,
      weightKg: parsed,
      isOfficialWeighIn: isOfficialDay,
    });
    flashSaved();
    onDataChanged?.();
  };

  const clearWeight = async () => {
    await db.biometrics.delete(selectedDate);
    setWeight('');
    onDataChanged?.();
  };

  const weightNum = parseFloat(weight);
  const prevWeight = previousEntry?.weightKg;
  const delta = !isNaN(weightNum) && prevWeight ? weightNum - prevWeight : null;
  const isDirty = weight.trim() !== '' && parseFloat(weight) !== biometrics?.weightKg;

  return (
    <div className="bg-surface rounded-2xl p-4 border border-border-subtle shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-textPrimary">Morning Weight</h3>
            <p className="text-[11px] text-textMuted">
              {isOfficialDay ? (
                <span className="text-primary font-medium inline-flex items-center gap-1">
                  <Star className="w-3 h-3 fill-primary" /> Official weekly weigh-in day
                </span>
              ) : (
                'Daily log for your trend line'
              )}
            </p>
          </div>
        </div>

        {savedBadge && (
          <span className="flex items-center space-x-1 text-[11px] text-success font-medium animate-fade-in">
            <Check className="w-3.5 h-3.5" />
            <span>Saved</span>
          </span>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          saveWeight();
          (document.activeElement as HTMLElement)?.blur();
        }}
        className="bg-canvas/70 rounded-xl p-3 border border-border-subtle flex items-center justify-between gap-3"
      >
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-semibold text-textMuted uppercase tracking-wider block">Body weight</span>
          <div className="flex items-baseline space-x-1.5 mt-0.5">
            <input
              type="number"
              step="0.1"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              onBlur={saveWeight}
              placeholder="0.0"
              className="bg-transparent text-2xl font-bold text-textPrimary focus:outline-none w-28 placeholder:text-textMuted/40"
            />
            <span className="text-xs text-textMuted font-medium">{settings.weightUnit}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {delta !== null && previousEntry && (
            <div className="text-right">
              <span className="text-[10px] text-textMuted block">vs {prettyDate(previousEntry.date)}</span>
              <span className={`text-sm font-bold ${delta <= 0 ? 'text-success' : 'text-danger'}`}>
                {delta > 0 ? '+' : ''}
                {delta.toFixed(1)} {settings.weightUnit}
              </span>
            </div>
          )}
          {isDirty ? (
            <button type="submit" className="px-3 py-2 rounded-lg bg-primary text-canvas text-xs font-bold">
              Save
            </button>
          ) : (
            biometrics?.weightKg && (
              <button
                type="button"
                onClick={clearWeight}
                className="p-2 rounded-lg text-textMuted hover:text-danger hover:bg-danger/10 transition-colors"
                aria-label="Remove weight entry"
                title="Remove entry"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )
          )}
        </div>
      </form>

      {!previousEntry && biometrics?.weightKg && (
        <p className="text-[10px] text-textMuted mt-2">This is your first logged weight — nothing to compare yet.</p>
      )}
    </div>
  );
};
