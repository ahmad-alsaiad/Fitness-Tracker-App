import React, { useEffect, useState } from 'react';
import { ShieldAlert, CheckCircle, AlertTriangle, Trash2, Moon } from 'lucide-react';
import { db } from '../../db/db';
import type { CancellationType, WorkoutLog } from '../../types';
import { Sheet } from '../common/Sheet';

interface CancellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  workoutTitle: string;
  /** Pass an existing cancelled log to edit it */
  existingLog?: WorkoutLog;
  onSuccess?: () => void;
}

const REASONS: Record<CancellationType, string[]> = {
  justified: [
    'Sickness / Fever / Flu',
    'Injury / Muscle Strain',
    'Unplanned Travel',
    'Work Emergency',
    'Family Emergency',
    'Gym Closed',
  ],
  unjustified: [
    'Low Motivation',
    'Overslept / Stayed Up Late',
    'Poor Time Management',
    'Procrastination',
    'Social Plans',
  ],
};

export const CancellationModal: React.FC<CancellationModalProps> = ({
  isOpen,
  onClose,
  date,
  workoutTitle,
  existingLog,
  onSuccess,
}) => {
  const [type, setType] = useState<CancellationType>('justified');
  const [reason, setReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    if (existingLog?.status === 'cancelled') {
      const t = existingLog.cancellationType || 'justified';
      setType(t);
      setReason(existingLog.cancellationReason || '');
      setNotes(existingLog.cancellationNotes || '');
    } else {
      setType('justified');
      setReason('');
      setNotes('');
    }
  }, [isOpen, existingLog]);

  // Switching category clears any reason from the other category
  const handleTypeChange = (t: CancellationType) => {
    setType(t);
    if (!REASONS[t].includes(reason)) setReason('');
  };

  const canSave = !!reason || notes.trim().length > 0;

  const handleConfirm = async () => {
    if (!canSave) return;
    await db.workoutLogs.put({
      date,
      title: workoutTitle,
      status: 'cancelled',
      cancellationType: type,
      cancellationReason: reason || 'Other',
      cancellationNotes: notes.trim() || undefined,
      exercises: [],
      loggedAt: new Date().toISOString(),
    });
    onSuccess?.();
    onClose();
  };

  const handleRemove = async () => {
    await db.workoutLogs.delete(date);
    onSuccess?.();
    onClose();
  };

  const handleMarkAsRestDay = async () => {
    if (existingLog) {
      await db.workoutLogs.delete(date);
    }
    await db.plannedWorkouts.put({
      date,
      title: 'Rest Day',
      exercises: [],
      isRestDay: true,
    });
    onSuccess?.();
    onClose();
  };

  const isEditing = existingLog?.status === 'cancelled';
  const activeTone = type === 'justified' ? 'success' : 'danger';

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Skipped Session' : 'Skip Session'}
      subtitle={workoutTitle}
      icon={<ShieldAlert className="w-5 h-5" />}
      iconTone="danger"
      footer={
        <div className="flex gap-2">
          {isEditing && (
            <button
              type="button"
              onClick={handleRemove}
              className="px-3 py-3 rounded-xl bg-canvas border border-border-subtle text-textPrimary text-xs font-semibold flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4 text-danger" />
              Undo skip
            </button>
          )}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canSave}
            className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-canvas ${
              activeTone === 'success' ? 'bg-success' : 'bg-danger'
            }`}
          >
            {isEditing ? 'Save Changes' : 'Log Skip'}
          </button>
        </div>
      }
    >
      <div className="p-3 rounded-xl bg-canvas/60 border border-border-subtle/80 flex items-center space-x-2 text-xs">
        <AlertTriangle className="w-4 h-4 text-primary flex-shrink-0" />
        <p className="text-textMuted">Honest tracking builds discipline.</p>
      </div>

      {/* Rest Day Shortcut */}
      <div className="bg-canvas/80 border border-border-subtle rounded-xl p-3 flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2 min-w-0">
          <Moon className="w-4 h-4 text-primary flex-shrink-0" />
          <div className="text-xs">
            <span className="font-semibold text-textPrimary block">Scheduled recovery instead?</span>
            <span className="text-[10px] text-textMuted">Rest days are not counted as skips.</span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleMarkAsRestDay}
          className="px-2.5 py-1.5 rounded-lg bg-surface border border-border-subtle hover:border-primary/50 text-primary text-xs font-bold transition-colors whitespace-nowrap"
        >
          Mark as Rest Day
        </button>
      </div>

      {/* Category */}
      <div>
        <label className="text-[11px] font-bold text-textMuted uppercase tracking-wider block mb-2">Category</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleTypeChange('justified')}
            className={`p-3 rounded-xl border text-center transition-all ${
              type === 'justified'
                ? 'bg-success/15 border-success text-success font-bold'
                : 'bg-canvas border-border-subtle text-textMuted'
            }`}
          >
            <CheckCircle className="w-4 h-4 mx-auto mb-1" />
            <span className="text-xs block">Justified</span>
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('unjustified')}
            className={`p-3 rounded-xl border text-center transition-all ${
              type === 'unjustified'
                ? 'bg-danger/15 border-danger text-danger font-bold'
                : 'bg-canvas border-border-subtle text-textMuted'
            }`}
          >
            <AlertTriangle className="w-4 h-4 mx-auto mb-1" />
            <span className="text-xs block">Unjustified</span>
          </button>
        </div>
      </div>

      {/* Reasons for the selected category only */}
      <div>
        <label className="text-[11px] font-bold text-textMuted uppercase tracking-wider block mb-2">Reason</label>
        <div className="flex flex-wrap gap-1.5">
          {REASONS[type].map((r) => {
            const selected = reason === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setReason(selected ? '' : r)}
                className={`text-xs px-3 py-2 rounded-lg border transition-all ${
                  selected
                    ? type === 'justified'
                      ? 'bg-success text-canvas font-bold border-success'
                      : 'bg-danger text-canvas font-bold border-danger'
                    : 'bg-canvas border-border-subtle text-textMuted hover:text-textPrimary'
                }`}
              >
                {r}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-bold text-textMuted uppercase tracking-wider block mb-1.5">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What happened and how to prevent it next time…"
          rows={3}
          className="w-full bg-canvas border border-border-subtle rounded-xl p-3 text-xs text-textPrimary focus:outline-none focus:border-primary resize-none placeholder:text-textMuted/40"
        />
      </div>
    </Sheet>
  );
};
