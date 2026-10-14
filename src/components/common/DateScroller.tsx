import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, startOfWeek, weekDays, parseDateKey, todayKey } from '../../db/db';

interface DateScrollerProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  /** Optional per-day dot indicator (e.g. day has data) */
  markedDates?: Set<string>;
}

export const DateScroller: React.FC<DateScrollerProps> = ({ selectedDate, onSelectDate, markedDates }) => {
  const days = weekDays(selectedDate); // Sunday → Saturday
  const today = todayKey();

  // Right arrow → first day (Sunday) of next week
  const handleNextWeek = () => onSelectDate(addDays(startOfWeek(selectedDate), 7));
  // Left arrow → last day (Saturday) of previous week
  const handlePrevWeek = () => onSelectDate(addDays(startOfWeek(selectedDate), -1));

  const first = parseDateKey(days[0]);
  const last = parseDateKey(days[6]);
  const sameMonth = first.getMonth() === last.getMonth();
  const label = sameMonth
    ? first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : `${first.toLocaleDateString('en-US', { month: 'short' })} – ${last.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })}`;

  return (
    <div className="bg-surface/80 border-b border-border-subtle py-2 px-3">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={handlePrevWeek}
            className="p-1.5 rounded-lg text-textMuted hover:text-textPrimary hover:bg-canvas transition-colors"
            aria-label="Previous week"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <span className="text-xs font-semibold text-textPrimary uppercase tracking-wider">{label}</span>

          <button
            type="button"
            onClick={handleNextWeek}
            className="p-1.5 rounded-lg text-textMuted hover:text-textPrimary hover:bg-canvas transition-colors"
            aria-label="Next week"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {days.map((key) => {
            const d = parseDateKey(key);
            const isSelected = key === selectedDate;
            const isToday = key === today;
            const marked = markedDates?.has(key);
            return (
              <button
                type="button"
                key={key}
                onClick={() => onSelectDate(key)}
                className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all duration-150 ${
                  isSelected
                    ? 'bg-primary text-canvas font-bold shadow-glow-primary'
                    : 'bg-canvas/60 text-textMuted hover:text-textPrimary border border-border-subtle/60'
                }`}
              >
                <span className={`text-[10px] font-medium ${isSelected ? 'text-canvas' : 'text-textMuted'}`}>
                  {d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
                </span>
                <span className="text-sm font-semibold mt-0.5">{d.getDate()}</span>
                <span
                  className={`w-1 h-1 rounded-full mt-0.5 ${
                    isToday ? (isSelected ? 'bg-canvas' : 'bg-primary') : marked ? 'bg-success/70' : 'bg-transparent'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
