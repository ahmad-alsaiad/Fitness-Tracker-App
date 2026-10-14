import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  iconTone?: 'primary' | 'danger' | 'success';
  children: React.ReactNode;
  footer?: React.ReactNode;
  zIndex?: number;
}

/** Mobile bottom sheet / desktop centered modal with a scrollable body. */
export const Sheet: React.FC<SheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  iconTone = 'primary',
  children,
  footer,
  zIndex = 50,
}) => {
  // Lock background scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const toneClass =
    iconTone === 'danger'
      ? 'bg-danger/10 text-danger'
      : iconTone === 'success'
      ? 'bg-success/10 text-success'
      : 'bg-primary/10 text-primary';

  return (
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center sm:p-4 bg-canvas/80 backdrop-blur-sm animate-fade-in"
      style={{ zIndex }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-surface border border-border-subtle rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[88dvh] animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-3 border-b border-border-subtle flex-shrink-0">
          <div className="flex items-center space-x-2.5 min-w-0">
            {icon && <div className={`p-2 rounded-xl flex-shrink-0 ${toneClass}`}>{icon}</div>}
            <div className="min-w-0">
              <h2 className="text-base font-bold text-textPrimary truncate">{title}</h2>
              {subtitle && <p className="text-xs text-textMuted truncate">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-textMuted hover:text-textPrimary hover:bg-canvas transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto overscroll-contain flex-1 p-5 space-y-4">{children}</div>

        {footer && (
          <div className="p-5 pt-3 border-t border-border-subtle flex-shrink-0 pb-safe-sheet">{footer}</div>
        )}
      </div>
    </div>
  );
};
