import React, { useMemo, useState } from 'react';
import { Search, Dumbbell, Timer, Plus, X } from 'lucide-react';
import type { Exercise } from '../../types';

interface ExercisePickerProps {
  exercises: Exercise[];
  onPick: (exercise: Exercise) => void;
  /** Exercise IDs to visually mark as already added */
  selectedIds?: number[];
  /** Filter to a single exercise type */
  typeFilter?: 'lifting' | 'cardio';
  placeholder?: string;
  /** Max height of the results list (tailwind class) */
  listMaxHeight?: string;
  onCreateNew?: () => void;
}

/** Search box + filterable exercise list. Scales to large libraries. */
export const ExercisePicker: React.FC<ExercisePickerProps> = ({
  exercises,
  onPick,
  selectedIds = [],
  typeFilter,
  placeholder = 'Search exercises…',
  listMaxHeight = 'max-h-56',
  onCreateNew,
}) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('All');

  const categories = useMemo(() => {
    const set = new Set(
      exercises.filter((e) => !typeFilter || e.type === typeFilter).map((e) => e.category)
    );
    return ['All', ...Array.from(set).sort()];
  }, [exercises, typeFilter]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises
      .filter((e) => !typeFilter || e.type === typeFilter)
      .filter((e) => category === 'All' || e.category === category)
      .filter((e) => !q || e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [exercises, query, category, typeFilter]);

  return (
    <div className="space-y-2">
      {/* Search input */}
      <div className="relative">
        <Search className="w-4 h-4 text-textMuted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-canvas border border-border-subtle rounded-xl pl-9 pr-9 py-2.5 text-sm text-textPrimary focus:outline-none focus:border-primary placeholder:text-textMuted/50"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-textMuted hover:text-textPrimary"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Category chips */}
      {categories.length > 2 && (
        <div className="flex space-x-1.5 overflow-x-auto no-scrollbar">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                category === c
                  ? 'bg-primary text-canvas'
                  : 'bg-canvas text-textMuted border border-border-subtle hover:text-textPrimary'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      <div className={`${listMaxHeight} overflow-y-auto overscroll-contain space-y-1 pr-0.5`}>
        {results.length === 0 ? (
          <div className="text-center text-xs text-textMuted py-4 space-y-2">
            <p>No exercises match “{query}”.</p>
            {onCreateNew && (
              <button type="button" onClick={onCreateNew} className="text-primary font-semibold">
                + Create a custom exercise
              </button>
            )}
          </div>
        ) : (
          results.map((ex) => {
            const added = ex.id !== undefined && selectedIds.includes(ex.id);
            return (
              <button
                key={ex.id}
                type="button"
                onClick={() => onPick(ex)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-canvas border border-border-subtle/70 hover:border-primary/50 text-left transition-colors"
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  {ex.type === 'cardio' ? (
                    <Timer className="w-4 h-4 text-primary flex-shrink-0" />
                  ) : (
                    <Dumbbell className="w-4 h-4 text-success flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-textPrimary block truncate">{ex.name}</span>
                    <span className="text-[10px] text-textMuted">{ex.category}</span>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center space-x-0.5 flex-shrink-0 ${
                    added ? 'bg-success/15 text-success' : 'bg-primary/15 text-primary'
                  }`}
                >
                  {added ? (
                    <span>Added</span>
                  ) : (
                    <>
                      <Plus className="w-3 h-3" />
                      <span>Add</span>
                    </>
                  )}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
