"use client";
import * as React from 'react';

export type DialogProps = {
  open: boolean;
  onOpenChange(open: boolean): void;
  children: React.ReactNode;
  className?: string;
};

export function Dialog({ open, onOpenChange, children, className }: DialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40" onClick={() => onOpenChange(false)}>
      <div className={["bg-white dark:bg-neutral-900 border rounded-lg shadow-xl w-full max-w-lg", className].filter(Boolean).join(" ")}
           onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
