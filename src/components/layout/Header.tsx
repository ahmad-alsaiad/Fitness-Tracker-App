import React from 'react';
import { SlidersHorizontal, CalendarDays } from 'lucide-react';
import { todayKey } from '../../db/db';

interface HeaderProps {
  selectedDate: string;
  onOpenSettings: () => void;
  onJumpToday: () => void;
}

export const Header: React.FC<HeaderProps> = ({ selectedDate, onOpenSettings, onJumpToday }) => {
  const isToday = selectedDate === todayKey();

  return (
    <header className="sticky top-0 z-30 bg-canvas/90 backdrop-blur-md border-b border-border-subtle pt-safe">
      <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
        <img
          src="/logo-full.png"
          alt="Docket"
          className="h-12 w-auto select-none"
          draggable={false}
        />

        <div className="flex items-center space-x-2">
          {!isToday && (
            <button
              type="button"
              onClick={onJumpToday}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 transition-colors"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Today</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2.5 rounded-xl text-textMuted hover:text-textPrimary bg-surface border border-border-subtle transition-colors"
            title="Targets & Settings"
            aria-label="Open Targets and Settings"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
