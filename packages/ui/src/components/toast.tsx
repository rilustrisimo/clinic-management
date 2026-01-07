"use client";
import * as React from 'react';

type Toast = { id: number; title?: string; description?: string };

const ToastCtx = React.createContext<{
  toasts: Toast[];
  push(t: Omit<Toast, 'id'>): void;
  remove(id: number): void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const idRef = React.useRef(1);
  const push = React.useCallback((t: Omit<Toast, 'id'>) => {
    const id = idRef.current++;
    setToasts((s) => [...s, { id, ...t }]);
    setTimeout(() => remove(id), 4000);
  }, []);
  const remove = React.useCallback((id: number) => setToasts((s) => s.filter((x) => x.id !== id)), []);
  return (
    <ToastCtx.Provider value={{ toasts, push, remove }}>
      {children}
      <div className="fixed bottom-2 right-2 space-y-2 z-50">
        {toasts.map((t) => (
          <div key={t.id} className="bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 rounded-md px-3 py-2 shadow">
            {t.title && <div className="font-medium text-sm">{t.title}</div>}
            {t.description && <div className="text-xs opacity-80">{t.description}</div>}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
