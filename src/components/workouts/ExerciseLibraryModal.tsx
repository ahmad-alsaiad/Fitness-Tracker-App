import React, { useState, useMemo } from 'react';
import { Plus, Dumbbell, Timer, Trash2, Search, X } from 'lucide-react';
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
  const [name, setName] = useState('');
  const [type, setType] = useState<ExerciseType>('lifting');
  const [category, setCategory] = useState('Chest');
  const [defaultSets, setDefaultSets] = useState(3);
  const [defaultReps, setDefaultReps] = useState('8-10');
  const [defaultMinutes, setDefaultMinutes] = useState(25);
  const [selectedFilter, setSelectedFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirm, confirmDialog] = useConfirm();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await db.exercises.add({
      name: name.trim(),
      type,
      category: type === 'cardio' ? 'Cardio' : category,
      defaultTargetSets: type === 'lifting' ? defaultSets : undefined,
      defaultTargetReps: type === 'lifting' ? defaultReps : undefined,
      defaultTargetMinutes: type === 'cardio' ? defaultMinutes : undefined,
      createdAt: new Date().toISOString(),
    });

    setName('');
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
      <form onSubmit={handleCreate} className="bg-canvas/70 rounded-xl p-3 border border-border-subtle space-y-3">
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => {
              setType('lifting');
              setCategory('Chest');
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center space-x-1 transition-all ${
              type === 'lifting' ? 'bg-primary text-canvas shadow-sm' : 'bg-surface text-textMuted border border-border-subtle'
            }`}
          >
            <Dumbbell className="w-3.5 h-3.5" />
            <span>Lifting (Sets & Reps)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setType('cardio');
              setCategory('Cardio');
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center space-x-1 transition-all ${
              type === 'cardio' ? 'bg-primary text-canvas shadow-sm' : 'bg-surface text-textMuted border border-border-subtle'
            }`}
          >
            <Timer className="w-3.5 h-3.5" />
            <span>Cardio (Time)</span>
          </button>
        </div>

        <div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={type === 'lifting' ? 'e.g. Incline Dumbbell Curl' : 'e.g. Stairmaster Intervals'}
            className="w-full bg-surface border border-border-subtle rounded-xl px-3 py-2 text-xs font-medium text-textPrimary focus:outline-none focus:border-primary placeholder:text-textMuted/40"
            required
          />
        </div>

        {type === 'lifting' ? (
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[9px] font-bold text-textMuted uppercase block mb-1">Muscle</label>
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
                min="1"
                max="10"
                value={defaultSets}
                onChange={(e) => setDefaultSets(parseInt(e.target.value, 10) || 3)}
                className="w-full bg-surface border border-border-subtle rounded-lg px-2 py-1 text-xs text-textPrimary focus:outline-none text-center"
              />
            </div>

            <div>
              <label className="text-[9px] font-bold text-textMuted uppercase block mb-1">Rep Range</label>
              <input
                type="text"
                value={defaultReps}
                onChange={(e) => setDefaultReps(e.target.value)}
                placeholder="8-10"
                className="w-full bg-surface border border-border-subtle rounded-lg px-2 py-1 text-xs text-textPrimary focus:outline-none text-center"
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="text-[9px] font-bold text-textMuted uppercase block mb-1">Default Duration (mins)</label>
            <input
              type="number"
              min="1"
              value={defaultMinutes}
              onChange={(e) => setDefaultMinutes(parseInt(e.target.value, 10) || 20)}
              className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-1 text-xs text-textPrimary focus:outline-none"
            />
          </div>
        )}

        <button
          type="submit"
          className="w-full py-2 rounded-xl bg-primary text-canvas font-bold text-xs flex items-center justify-center space-x-1 hover:bg-primary-hover transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Exercise to Library</span>
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
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ex.type === 'cardio' ? 'bg-primary' : 'bg-success'}`} />
                <div className="min-w-0">
                  <span className="font-semibold text-textPrimary block truncate">{ex.name}</span>
                  <span className="text-[10px] text-textMuted font-medium">
                    {ex.category} •{' '}
                    {ex.type === 'cardio'
                      ? `${ex.defaultTargetMinutes || 20}m`
                      : `${ex.defaultTargetSets || 3} sets × ${ex.defaultTargetReps || '8-10'}`}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDelete(ex.id)}
                className="p-1.5 text-textMuted hover:text-danger rounded-lg transition-colors flex-shrink-0"
                title="Delete exercise"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </Sheet>
  );
};
