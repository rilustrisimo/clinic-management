"use client";
import * as React from 'react';

export type DrawerProps = {
  open: boolean;
  onOpenChange(open: boolean): void;
  side?: 'left' | 'right' | 'bottom';
  children: React.ReactNode;
};

export function Drawer({ open, onOpenChange, side = 'right', children }: DrawerProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
      if (e.key === 'Tab') {
        const el = containerRef.current;
        if (!el) return;
        const focusables = el.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey) {
          if (active === first || !el.contains(active)) {
            last.focus();
            e.preventDefault();
          }
        } else {
          if (active === last) {
            first.focus();
            e.preventDefault();
          }
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  if (!open) return null;
  const pos = side === 'bottom' ? 'inset-x-0 bottom-0 w-full max-h-[80vh]' : (side === 'left' ? 'left-0 top-0 h-full max-w-md' : 'right-0 top-0 h-full max-w-md');
  return (
    <div className="fixed inset-0 z-50" onClick={() => onOpenChange(false)}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className={["absolute bg-white dark:bg-neutral-900 border shadow-xl", pos].join(' ')}
        onClick={(e)=>e.stopPropagation()}
        ref={containerRef}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
}
