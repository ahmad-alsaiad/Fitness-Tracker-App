import React, { useState, useMemo, useRef } from 'react';
import { Plus, Dumbbell, Timer, Trash2, Search, X, Pencil, Check, Clock } from 'lucide-react';
import { db } from '../../db/db';
import type { Exercise, ExerciseType } from '../../types';
import { Sheet } from '../common/Sheet';
import { useConfirm } from '../common/useConfirm';

interface ExerciseLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercises: Exercise[];
  onExerciseAdded: () => void;
}

const CATEGORIES = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Abs', 'Cardio'];

export const ExerciseLibraryModal: React.FC<ExerciseLibraryModalProps> = ({
  isOpen,
  onClose,
  exercises,
  onExerciseAdded,
}) => {
  type TrackingFormat = 'sets_reps' | 'sets_time' | 'continuous_time';

  const [name, setName] = useState('');
  const [format, setFormat] = useState<TrackingFormat>('sets_reps');
  const [type, setType] = useState<ExerciseType>('lifting');
  const [category, setCategory] = useState('Chest');
  const [defaultSets, setDefaultSets] = useState('');
  const [defaultReps, setDefaultReps] = useState('');
  const [defaultSeconds, setDefaultSeconds] = useState('');
  const [defaultMinutes, setDefaultMinutes] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirm, confirmDialog] = useConfirm();

  const resetForm = () => {
    setName('');
    setFormat('sets_reps');
    setType('lifting');
    setCategory('Chest');
    setDefaultSets('');
    setDefaultReps('');
    setDefaultSeconds('');
    setDefaultMinutes('');
    setEditingId(null);
  };

  const startEdit = (ex: Exercise) => {
    setEditingId(ex.id ?? null);
    setName(ex.name);
    setType(ex.type);
    setCategory(ex.category);

    if (ex.type === 'cardio' && ex.hasSets === false) {
      setFormat('continuous_time');
    } else if (ex.setMetric === 'time' || (ex.defaultTargetSeconds && ex.defaultTargetSeconds > 0)) {
      setFormat('sets_time');
    } else {
      setFormat('sets_reps');
    }

    setDefaultSets(ex.defaultTargetSets ? String(ex.defaultTargetSets) : '');
    setDefaultReps(ex.defaultTargetReps || '');
    setDefaultSeconds(ex.defaultTargetSeconds ? String(ex.defaultTargetSeconds) : '');
    setDefaultMinutes(ex.defaultTargetMinutes ? String(ex.defaultTargetMinutes) : '');
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Empty fields fall back to sensible defaults
    const sets = parseInt(defaultSets, 10);
    const minutes = parseInt(defaultMinutes, 10);
    const seconds = parseInt(defaultSeconds, 10);

    const isContinuous = format === 'continuous_time';
    const isTimedSets = format === 'sets_time';

    const payload = {
      name: name.trim(),
      type: isContinuous || (isTimedSets && category === 'Cardio') ? ('cardio' as ExerciseType) : type,
      category: isContinuous ? 'Cardio' : category,
      hasSets: !isContinuous,
      setMetric: (isTimedSets ? 'time' : 'reps') as 'time' | 'reps',
      defaultTargetSets: !isContinuous ? (sets > 0 ? sets : 3) : undefined,
      defaultTargetReps: format === 'sets_reps' ? (defaultReps.trim() || '8-10') : undefined,
      defaultTargetSeconds: isTimedSets ? (seconds > 0 ? seconds : 30) : undefined,
      defaultTargetMinutes: isContinuous ? (minutes > 0 ? minutes : 20) : undefined,
    };

    if (editingId) {
      await db.exercises.update(editingId, payload);
    } else {
      await db.exercises.add({ ...payload, createdAt: new Date().toISOString() });
    }

    resetForm();
    onExerciseAdded();
  };

  const handleDelete = async (id?: number) => {
    if (!id) return;
    const ok = await confirm({
      title: 'Delete this exercise?',
      message: 'It will be removed from your exercise library.',
      confirmLabel: 'Delete',
    });
    if (ok) {
      await db.exercises.delete(id);
      onExerciseAdded();
    }
  };

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return exercises
      .filter((ex) => {
        if (selectedFilter === 'All') return true;
        if (selectedFilter === 'Cardio') return ex.type === 'cardio';
        if (selectedFilter === 'Lifting') return ex.type === 'lifting';
        return ex.category === selectedFilter;
      })
      .filter((ex) => !q || ex.name.toLowerCase().includes(q) || ex.category.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [exercises, selectedFilter, searchQuery]);

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title="Exercise Library"
      subtitle="Create and manage your movement database"
      icon={<Dumbbell className="w-5 h-5" />}
      iconTone="primary"
    >
      {confirmDialog}

      {/* New Exercise Form */}
      <form ref={formRef} onSubmit={handleCreate} className={`bg-canvas/70 rounded-xl p-3 border space-y-3 ${editingId ? 'border-primary/60' : 'border-border-subtle'}`}>
        {editingId && (
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-primary flex items-center gap-1">
              <Pencil className="w-3 h-3" /> Editing exercise
            </span>
            <button type="button" onClick={resetForm} className="text-[11px] text-textMuted hover:text-textPrimary">
              Cancel
            </button>
          </div>
        )}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-surface rounded-xl border border-border-subtle">
          <button
            type="button"
            onClick={() => {
              setFormat('sets_reps');
              setType('lifting');
              if (category === 'Cardio') setCategory('Chest');
            }}
            className={`py-1.5 px-2 rounded-lg text-[11px] font-bold flex flex-col items-center justify-center gap-0.5 transition-all ${
              format === 'sets_reps'
                ? 'bg-primary text-canvas shadow-sm'
                : 'text-textMuted hover:text-textPrimary'
            }`}
          >
            <div className="flex items-center gap-1">
              <Dumbbell className="w-3.5 h-3.5" />
              <span>Sets × Reps</span>
            </div>
            <span className="text-[9px] opacity-75 font-normal">e.g. 3 × 8-10 reps</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFormat('sets_time');
              setCategory('Cardio');
            }}
            className={`py-1.5 px-2 rounded-lg text-[11px] font-bold flex flex-col items-center justify-center gap-0.5 transition-all ${
              format === 'sets_time'
                ? 'bg-primary text-canvas shadow-sm'
                : 'text-textMuted hover:text-textPrimary'
            }`}
          >
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Sets × Time</span>
            </div>
            <span className="text-[9px] opacity-75 font-normal">e.g. 3 × 30 sec</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFormat('continuous_time');
              setType('cardio');
              setCategory('Cardio');
            }}
            className={`py-1.5 px-2 rounded-lg text-[11px] font-bold flex flex-col items-center justify-center gap-0.5 transition-all ${
              format === 'continuous_time'
                ? 'bg-primary text-canvas shadow-sm'
                : 'text-textMuted hover:text-textPrimary'
            }`}
          >
            <div className="flex items-center gap-1">
              <Timer className="w-3.5 h-3.5" />
              <span>Continuous</span>
            </div>
            <span className="text-[9px] opacity-75 font-normal">e.g. 20m cardio</span>
          </button>
        </div>

        <div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={
              format === 'sets_reps'
                ? 'e.g. Incline Dumbbell Curl'
                : format === 'sets_time'
                  ? 'e.g. Jog in Place, Plank, Jumping Jacks'
                  : 'e.g. Treadmill, Stairmaster, Bike'
            }
            className="w-full bg-surface border border-border-subtle rounded-xl px-3 py-2 text-xs font-medium text-textPrimary focus:outline-none focus:border-primary placeholder:text-textMuted/40"
            required
          />
        </div>

        {format === 'sets_reps' && (
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[9px] font-bold text-textMuted uppercase block mb-1">Target Muscle</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-surface border border-border-subtle rounded-lg px-2 py-1 text-xs text-textPrimary focus:outline-none"
              >
                {CATEGORIES.filter((c) => c !== 'Cardio').map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[9px] font-bold text-textMuted uppercase block mb-1">Default Sets</label>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                max="20"
                value={defaultSets}
                onChange={(e) => setDefaultSets(e.target.value)}
                placeholder="3"
                className="w-full bg-surface border border-border-subtle rounded-lg px-2 py-1 text-xs text-textPrimary focus:outline-none text-center placeholder:text-textMuted/40"
              />
            </div>

            <div>
              <label className="text-[9px] font-bold text-textMuted uppercase block mb-1">Rep Range</label>
              <input
                type="text"
                value={defaultReps}
                onChange={(e) => setDefaultReps(e.target.value)}
                placeholder="8-10"
                className="w-full bg-surface border border-border-subtle rounded-lg px-2 py-1 text-xs text-textPrimary focus:outline-none text-center placeholder:text-textMuted/40"
              />
            </div>
          </div>
        )}

        {format === 'sets_time' && (
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[9px] font-bold text-textMuted uppercase block mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-surface border border-border-subtle rounded-lg px-2 py-1 text-xs text-textPrimary focus:outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[9px] font-bold text-textMuted uppercase block mb-1">Default Sets</label>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                max="20"
                value={defaultSets}
                onChange={(e) => setDefaultSets(e.target.value)}
                placeholder="3"
                className="w-full bg-surface border border-border-subtle rounded-lg px-2 py-1 text-xs text-textPrimary focus:outline-none text-center placeholder:text-textMuted/40"
              />
            </div>

            <div>
              <label className="text-[9px] font-bold text-textMuted uppercase block mb-1">Time / Set (sec)</label>
              <input
                type="number"
                inputMode="numeric"
                min="5"
                max="600"
                step="5"
                value={defaultSeconds}
                onChange={(e) => setDefaultSeconds(e.target.value)}
                placeholder="30"
                className="w-full bg-surface border border-border-subtle rounded-lg px-2 py-1 text-xs text-textPrimary focus:outline-none text-center placeholder:text-textMuted/40"
              />
            </div>
          </div>
        )}

        {format === 'continuous_time' && (
          <div>
            <label className="text-[9px] font-bold text-textMuted uppercase block mb-1">Default Duration (mins)</label>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              value={defaultMinutes}
              onChange={(e) => setDefaultMinutes(e.target.value)}
              placeholder="20"
              className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-1.5 text-xs text-textPrimary focus:outline-none placeholder:text-textMuted/40"
            />
          </div>
        )}

        <button
          type="submit"
          className="w-full py-2 rounded-xl bg-primary text-canvas font-bold text-xs flex items-center justify-center space-x-1 hover:bg-primary-hover transition-colors shadow-sm"
        >
          {editingId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{editingId ? 'Save Changes' : 'Add Exercise to Library'}</span>
        </button>
      </form>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-textMuted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search library exercises…"
          className="w-full bg-canvas border border-border-subtle rounded-xl pl-9 pr-8 py-2 text-xs text-textPrimary focus:outline-none focus:border-primary placeholder:text-textMuted/50"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-textMuted hover:text-textPrimary"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter Pills */}
      <div className="flex space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
        {['All', 'Lifting', 'Cardio', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms'].map((pill) => (
          <button
            key={pill}
            type="button"
            onClick={() => setSelectedFilter(pill)}
            className={`text-[10px] px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors ${
              selectedFilter === pill
                ? 'bg-primary text-canvas'
                : 'bg-canvas text-textMuted border border-border-subtle hover:text-textPrimary'
            }`}
          >
            {pill}
          </button>
        ))}
      </div>

      {/* Exercises List */}
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-center text-xs text-textMuted py-6">No exercises found.</p>
        ) : (
          filtered.map((ex) => (
            <div
              key={ex.id}
              className="flex items-center justify-between p-2.5 rounded-xl bg-canvas border border-border-subtle/80 text-xs"
            >
              <div className="flex items-center space-x-2 min-w-0">
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    ex.setMetric === 'time' || (ex.defaultTargetSeconds && ex.defaultTargetSeconds > 0)
                      ? 'bg-amber-400'
                      : ex.type === 'cardio'
                        ? 'bg-primary'
                        : 'bg-success'
                  }`}
                />
                <div className="min-w-0">
                  <span className="font-semibold text-textPrimary block truncate">{ex.name}</span>
                  <span className="text-[10px] text-textMuted font-medium">
                    {ex.category} •{' '}
                    {ex.hasSets === false || (ex.type === 'cardio' && !ex.hasSets && !ex.defaultTargetSeconds)
                      ? `${ex.defaultTargetMinutes || 20}m continuous`
                      : ex.setMetric === 'time' || (ex.defaultTargetSeconds && ex.defaultTargetSeconds > 0)
                        ? `${ex.defaultTargetSets || 3} sets × ${ex.defaultTargetSeconds || 30}s`
                        : `${ex.defaultTargetSets || 3} sets × ${ex.defaultTargetReps || '8-10'}`}
                  </span>
                </div>
              </div>

              <div className="flex items-center flex-shrink-0">
                <button
                  type="button"
                  onClick={() => startEdit(ex)}
                  className="p-1.5 text-textMuted hover:text-primary rounded-lg transition-colors"
                  title="Edit exercise"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(ex.id)}
                  className="p-1.5 text-textMuted hover:text-danger rounded-lg transition-colors"
                  title="Delete exercise"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </Sheet>
  );
};
