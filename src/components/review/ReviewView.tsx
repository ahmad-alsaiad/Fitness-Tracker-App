import React, { useState, useEffect } from 'react';
import { CalendarCheck2, ShieldAlert, CheckCircle2, XCircle, FileText, Scale, Dumbbell, Utensils, Check, Archive, Clock, Copy, CheckCheck, Trash2, Moon } from 'lucide-react';
import { db, weekDays, getTargetsForDate, isOfficialWeighInDay } from '../../db/db';
import type { DailyBiometrics, DailyNutrition, DailyHabits, WorkoutLog, UserSettings, NoteEntry, PlannedWorkout } from '../../types';
import { useConfirm } from '../common/useConfirm';

interface ReviewViewProps {
  selectedDate: string;
  settings: UserSettings;
}

export const ReviewView: React.FC<ReviewViewProps> = ({ selectedDate, settings }) => {
  const [biometricsList, setBiometricsList] = useState<DailyBiometrics[]>([]);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [plannedList, setPlannedList] = useState<PlannedWorkout[]>([]);
  const [nutritionList, setNutritionList] = useState<DailyNutrition[]>([]);
  const [habitsList, setHabitsList] = useState<DailyHabits[]>([]);
  const [scratchpadText, setScratchpadText] = useState<string>('');
  const [savedNotes, setSavedNotes] = useState<NoteEntry[]>([]);
  const [isSavedBadge, setIsSavedBadge] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirm, confirmDialog] = useConfirm();

  // Compute Sunday-to-Saturday days for selected week
  const past7DaysKeys = weekDays(selectedDate);
  const weekStartKey = past7DaysKeys[0];

  useEffect(() => {
    async function loadWeeklyData() {
      const bios = await db.biometrics.where('date').anyOf(past7DaysKeys).toArray();
      const logs = await db.workoutLogs.where('date').anyOf(past7DaysKeys).toArray();
      const plans = await db.plannedWorkouts.where('date').anyOf(past7DaysKeys).toArray();
      const nuts = await db.nutrition.where('date').anyOf(past7DaysKeys).toArray();
      const habs = await db.habits.where('date').anyOf(past7DaysKeys).toArray();
      const note = await db.scratchpadNotes.where('weekStartDate').equals(weekStartKey).first();

      setBiometricsList(bios);
      setWorkoutLogs(logs);
      setPlannedList(plans);
      setNutritionList(nuts);
      setHabitsList(habs);

      if (note) {
        if (Array.isArray(note.entries) && note.entries.length > 0) {
          setSavedNotes(note.entries);
        } else if (note.content && note.content.trim()) {
          setSavedNotes([
            {
              id: 'legacy-1',
              content: note.content,
              timestamp: note.updatedAt || new Date().toISOString(),
            },
          ]);
        } else {
          setSavedNotes([]);
        }
      } else {
        setSavedNotes([]);
      }
      // Keep textarea blank for writing new notes
      setScratchpadText('');
    }

    loadWeeklyData();
  }, [selectedDate, weekStartKey]);

  // Calculations for past 7 days
  const validWeights = biometricsList.filter((b) => b.weightKg && b.weightKg > 0);
  const avgWeight = validWeights.length
    ? (validWeights.reduce((s, b) => s + b.weightKg!, 0) / validWeights.length).toFixed(1)
    : '--';

  const officialWeights = validWeights.filter((b) => b.isOfficialWeighIn || isOfficialWeighInDay(b.date, settings));
  const latestOfficial = officialWeights.length
    ? officialWeights[officialWeights.length - 1].weightKg
    : validWeights.length
    ? validWeights[validWeights.length - 1].weightKg
    : null;

  // Nutrition Adherence based on target phase active during this week
  const targets = getTargetsForDate(selectedDate, settings);

  const avgCalories = nutritionList.length
    ? Math.round(nutritionList.reduce((s, n) => s + n.calories, 0) / nutritionList.length)
    : 0;
  const calAdherence = avgCalories && targets.calorieTarget ? Math.round((avgCalories / targets.calorieTarget) * 100) : 0;

  const avgProtein = nutritionList.length
    ? Math.round(nutritionList.reduce((s, n) => s + n.proteinGrams, 0) / nutritionList.length)
    : 0;
  const protAdherence = avgProtein && targets.proteinTarget ? Math.round((avgProtein / targets.proteinTarget) * 100) : 0;

  const avgCarbs = nutritionList.length
    ? Math.round(nutritionList.reduce((s, n) => s + (n.carbsGrams || 0), 0) / nutritionList.length)
    : 0;
  const carbsAdherence = avgCarbs && targets.carbsTarget ? Math.round((avgCarbs / targets.carbsTarget) * 100) : 0;

  const avgFats = nutritionList.length
    ? Math.round(nutritionList.reduce((s, n) => s + (n.fatsGrams || 0), 0) / nutritionList.length)
    : 0;
  const fatsAdherence = avgFats && targets.fatsTarget ? Math.round((avgFats / targets.fatsTarget) * 100) : 0;

  // Workouts Completion, Rest Days & Accountability
  const completedSessions = workoutLogs.filter((w) => w.status === 'completed');
  const justifiedSkips = workoutLogs.filter(
    (w) => w.status === 'cancelled' && w.cancellationType === 'justified'
  );
  const unjustifiedSkips = workoutLogs.filter(
    (w) => w.status === 'cancelled' && w.cancellationType === 'unjustified'
  );
  const restDays = plannedList.filter(
    (p) => p.isRestDay && !workoutLogs.some((l) => l.date === p.date && l.status === 'completed')
  );

  // Scratchpad save to Archive
  const handleSaveScratchpad = async () => {
    const trimmed = scratchpadText.trim();
    if (!trimmed) return;

    const newEntry: NoteEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    const nextList = [newEntry, ...savedNotes];
    setSavedNotes(nextList);
    setScratchpadText(''); // Clears input box to blank

    await db.scratchpadNotes.put({
      weekStartDate: weekStartKey,
      content: '',
      entries: nextList,
      updatedAt: new Date().toISOString(),
    });

    setIsSavedBadge(true);
    setTimeout(() => setIsSavedBadge(false), 2000);
  };

  const handleDeleteSavedNote = async (id: string) => {
    const ok = await confirm({
      title: 'Delete this saved note?',
      message: 'This note will be permanently removed from this week\'s archive.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;

    const nextList = savedNotes.filter((n) => n.id !== id);
    setSavedNotes(nextList);

    await db.scratchpadNotes.put({
      weekStartDate: weekStartKey,
      content: '',
      entries: nextList,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleCopyNote = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const formatNoteTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-textPrimary flex items-center space-x-2">
          <CalendarCheck2 className="w-5 h-5 text-primary" />
          <span>Weekly Retrospective & Review</span>
        </h2>
        <span className="text-[11px] font-semibold text-textMuted px-2.5 py-1 rounded-lg bg-surface border border-border-subtle">
          Sunday – Saturday
        </span>
      </div>

      {/* 7-Day Performance Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Weight Trend Card */}
        <div className="bg-surface rounded-2xl p-4 border border-border-subtle shadow-sm space-y-1">
          <div className="flex items-center space-x-1.5 text-textMuted text-[10px] font-bold uppercase tracking-wider">
            <Scale className="w-3.5 h-3.5 text-primary" />
            <span>7-Day Avg Weight</span>
          </div>
          <span className="text-xl font-bold text-textPrimary block">
            {avgWeight} <span className="text-xs text-textMuted font-normal">{settings.weightUnit}</span>
          </span>
          <span className="text-[10px] text-textMuted block">
            {latestOfficial ? `Official Lock: ${latestOfficial} ${settings.weightUnit}` : 'No official lock'}
          </span>
        </div>

        {/* Workout Adherence Card */}
        <div className="bg-surface rounded-2xl p-4 border border-border-subtle shadow-sm space-y-1">
          <div className="flex items-center space-x-1.5 text-textMuted text-[10px] font-bold uppercase tracking-wider">
            <Dumbbell className="w-3.5 h-3.5 text-success" />
            <span>Completed Lifts</span>
          </div>
          <span className="text-xl font-bold text-success block">
            {completedSessions.length} <span className="text-xs text-textMuted font-normal">sessions</span>
          </span>
          <span className="text-[10px] text-textMuted block">
            {restDays.length > 0 && (
              <span className="text-primary font-semibold mr-1">{restDays.length} Rest {restDays.length === 1 ? 'Day' : 'Days'} • </span>
            )}
            {unjustifiedSkips.length > 0 ? (
              <span className="text-danger font-semibold">{unjustifiedSkips.length} Unjustified Skip</span>
            ) : justifiedSkips.length > 0 ? (
              <span className="text-success font-semibold">{justifiedSkips.length} Justified Skip</span>
            ) : (
              `100% Commitment (${habitsList.length} days logged)`
            )}
          </span>
        </div>
      </div>

      {/* 4-Stat Nutrition Adherence */}
      <div className="bg-surface rounded-2xl p-4 border border-border-subtle shadow-sm space-y-3">
        <div className="flex items-center space-x-1.5 text-textMuted text-[10px] font-bold uppercase tracking-wider">
          <Utensils className="w-3.5 h-3.5 text-primary" />
          <span>Weekly Macro Averages</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-xl bg-canvas border border-border-subtle/80 space-y-0.5">
            <span className="text-[10px] font-bold text-textMuted uppercase tracking-wider block">Calories</span>
            <span className="text-base font-bold text-textPrimary block">{avgCalories.toLocaleString()} <span className="text-[11px] font-normal text-textMuted">kcal</span></span>
            <span className="text-[10px] text-textMuted">{calAdherence}% of target</span>
          </div>
          <div className="p-3 rounded-xl bg-canvas border border-border-subtle/80 space-y-0.5">
            <span className="text-[10px] font-bold text-textMuted uppercase tracking-wider block">Protein</span>
            <span className="text-base font-bold text-primary block">{avgProtein} <span className="text-[11px] font-normal text-textMuted">g</span></span>
            <span className="text-[10px] text-textMuted">{protAdherence}% of target</span>
          </div>
          <div className="p-3 rounded-xl bg-canvas border border-border-subtle/80 space-y-0.5">
            <span className="text-[10px] font-bold text-textMuted uppercase tracking-wider block">Carbs</span>
            <span className="text-base font-bold text-amber-400 block">{avgCarbs} <span className="text-[11px] font-normal text-textMuted">g</span></span>
            <span className="text-[10px] text-textMuted">{carbsAdherence}% of target</span>
          </div>
          <div className="p-3 rounded-xl bg-canvas border border-border-subtle/80 space-y-0.5">
            <span className="text-[10px] font-bold text-textMuted uppercase tracking-wider block">Fats</span>
            <span className="text-base font-bold text-rose-400 block">{avgFats} <span className="text-[11px] font-normal text-textMuted">g</span></span>
            <span className="text-[10px] text-textMuted">{fatsAdherence}% of target</span>
          </div>
        </div>
      </div>

      {/* Accountability Audit Trail (Justified vs Unjustified) */}
      <div className="bg-surface rounded-2xl p-4 border border-border-subtle shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-textPrimary">Accountability Audit Trail</h3>
              <p className="text-[11px] text-textMuted">Controllable slips vs external exceptions</p>
            </div>
          </div>
        </div>

        {workoutLogs.length === 0 && restDays.length === 0 ? (
          <p className="text-center text-xs text-textMuted py-4 bg-canvas/60 rounded-xl border border-border-subtle">
            No workout events recorded during these 7 days.
          </p>
        ) : (
          <div className="space-y-2">
            {[
              ...workoutLogs.map((log) => ({ kind: 'log' as const, log, date: log.date })),
              ...restDays.map((r) => ({ kind: 'rest' as const, rest: r, date: r.date })),
            ]
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((item, idx) => {
                if (item.kind === 'rest') {
                  return (
                    <div
                      key={`rest-${idx}`}
                      className="p-3 rounded-xl bg-canvas border border-border-subtle/80 flex items-start justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-1.5">
                          <Moon className="w-4 h-4 text-primary flex-shrink-0" />
                          <span className="font-bold text-textPrimary">{item.rest.title || 'Rest Day'}</span>
                        </div>
                        <span className="text-[10px] text-textMuted block pl-5.5">{item.date}</span>
                        <p className="text-[11px] text-textMuted pl-5.5 italic">Scheduled recovery day</p>
                      </div>
                      <div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/15 text-primary border border-primary/30">
                          Rest Day
                        </span>
                      </div>
                    </div>
                  );
                }

                const log = item.log;
                return (
                  <div
                    key={`log-${idx}`}
                    className="p-3 rounded-xl bg-canvas border border-border-subtle/80 flex items-start justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-1.5">
                        {log.status === 'completed' ? (
                          <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                        ) : (
                          <XCircle
                            className={`w-4 h-4 flex-shrink-0 ${
                              log.cancellationType === 'justified' ? 'text-success' : 'text-danger'
                            }`}
                          />
                        )}
                        <span className="font-bold text-textPrimary">{log.title}</span>
                      </div>
                      <span className="text-[10px] text-textMuted block pl-5.5">{log.date}</span>
                      {log.cancellationReason && (
                        <p className="text-[11px] text-textMuted pl-5.5 italic">
                          "{log.cancellationReason}"
                        </p>
                      )}
                    </div>

                    <div>
                      {log.status === 'completed' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-success/15 text-success border border-success/30">
                          Completed
                        </span>
                      ) : log.cancellationType === 'justified' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-success/15 text-success border border-success/30">
                          Justified
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-danger/15 text-danger border border-danger/30">
                          Unjustified
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {confirmDialog}

      {/* Running Weekly Scratchpad */}
      <div className="bg-surface rounded-2xl p-4 border border-border-subtle shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-textPrimary">Weekly Scratchpad & Reflections</h3>
              <p className="text-[11px] text-textMuted">Drop takeaways, energy levels & adjustments</p>
            </div>
          </div>

          {isSavedBadge && (
            <span className="flex items-center space-x-1 text-[11px] text-success font-medium animate-fade-in">
              <Check className="w-3.5 h-3.5" />
              <span>Saved to Archive</span>
            </span>
          )}
        </div>

        <textarea
          value={scratchpadText}
          onChange={(e) => setScratchpadText(e.target.value)}
          rows={3}
          placeholder="How did this week feel? Note any strength plateaus, recovery needs, or diet adjustments..."
          className="w-full bg-canvas border border-border-subtle rounded-xl p-3 text-xs text-textPrimary focus:outline-none focus:border-primary resize-none placeholder:text-textMuted/40 leading-relaxed"
        />

        <div className="flex items-center justify-between">
          <span className="text-[10px] text-textMuted">
            Click Save Note to archive this reflection below
          </span>
          <button
            type="button"
            onClick={handleSaveScratchpad}
            disabled={!scratchpadText.trim()}
            className="px-4 py-2 rounded-xl bg-primary text-canvas font-bold text-xs hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center space-x-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save Note</span>
          </button>
        </div>
      </div>

      {/* Saved Messages Archive Section */}
      <div className="bg-surface rounded-2xl p-4 border border-border-subtle shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Archive className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-textPrimary">Saved Messages & Notes</h3>
              <p className="text-[11px] text-textMuted">Archived reflections for this week</p>
            </div>
          </div>

          <span className="text-[11px] font-semibold text-textMuted px-2 py-0.5 rounded-lg bg-canvas border border-border-subtle">
            {savedNotes.length} {savedNotes.length === 1 ? 'Note' : 'Notes'}
          </span>
        </div>

        {savedNotes.length === 0 ? (
          <div className="p-6 rounded-xl bg-canvas/40 border border-border-subtle/60 text-center">
            <Archive className="w-6 h-6 text-textMuted/40 mx-auto mb-1.5" />
            <p className="text-xs text-textMuted font-medium">No saved messages yet for this week.</p>
            <p className="text-[10px] text-textMuted/60 mt-0.5">
              Write a reflection above and click "Save Note" to archive it here.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {savedNotes.map((note) => (
              <div
                key={note.id}
                className="p-3.5 rounded-xl bg-canvas border border-border-subtle/80 space-y-2 text-xs transition-all hover:border-border-subtle group"
              >
                <div className="flex items-center justify-between text-[10px] text-textMuted border-b border-border-subtle/40 pb-1.5">
                  <div className="flex items-center space-x-1.5">
                    <Clock className="w-3 h-3 text-primary/70" />
                    <span>{formatNoteTime(note.timestamp)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => handleCopyNote(note.id, note.content)}
                      className="p-1 rounded-lg text-textMuted hover:text-textPrimary hover:bg-surface transition-colors"
                      title="Copy note text"
                    >
                      {copiedId === note.id ? (
                        <CheckCheck className="w-3.5 h-3.5 text-success" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSavedNote(note.id)}
                      className="p-1 rounded-lg text-textMuted hover:text-danger hover:bg-danger/10 transition-colors"
                      title="Delete note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-textPrimary leading-relaxed whitespace-pre-wrap text-xs">
                  {note.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
