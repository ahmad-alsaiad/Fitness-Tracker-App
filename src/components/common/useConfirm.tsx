import React, { useCallback, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
}

/**
 * In-app replacement for window.confirm() (which some mobile/embedded
 * browsers block silently). Usage:
 *   const [confirm, confirmDialog] = useConfirm();
 *   if (await confirm({ title: 'Delete?' })) { ... }
 *   ...render {confirmDialog}
 */
export function useConfirm(): [(opts: ConfirmOptions) => Promise<boolean>, React.ReactNode] {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((o: ConfirmOptions) => {
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOpts(null);
  };

  const tone = opts?.tone || 'danger';

  const dialog = opts ? (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-6 bg-canvas/80 backdrop-blur-sm animate-fade-in"
      onClick={() => close(false)}
    >
      <div
        className="w-full max-w-xs bg-surface border border-border-subtle rounded-2xl p-5 shadow-2xl space-y-4 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start space-x-3">
          <div
            className={`p-2 rounded-xl flex-shrink-0 ${
              tone === 'danger' ? 'bg-danger/10 text-danger' : 'bg-primary/10 text-primary'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-textPrimary">{opts.title}</h3>
            {opts.message && <p className="text-xs text-textMuted mt-1 leading-relaxed">{opts.message}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => close(false)}
            className="py-2.5 rounded-xl bg-canvas border border-border-subtle text-textPrimary text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => close(true)}
            className={`py-2.5 rounded-xl text-canvas text-xs font-bold ${
              tone === 'danger' ? 'bg-danger' : 'bg-primary'
            }`}
          >
            {opts.confirmLabel || 'Delete'}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return [confirm, dialog];
}
