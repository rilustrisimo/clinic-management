"use client";
import { Dialog, Button, Input } from '@clinic/packages-ui';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

type Item = { label: string; href: string };
const DEFAULT_ITEMS: Item[] = [
  { label: 'Dashboard', href: '/' },
  { label: 'Patients', href: '/patients' },
  { label: 'Appointments', href: '/appointments' },
  { label: 'Visits', href: '/visits' },
  { label: 'Labs', href: '/labs' },
  { label: 'Billing', href: '/billing' },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      if ((isMac && e.metaKey && e.key.toLowerCase() === 'k') || (!isMac && e.ctrlKey && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  // Close on Escape and trap focus within dialog
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
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
  }, [open]);

  const items = DEFAULT_ITEMS.filter((i) => i.label.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <button
        className="hidden"
        id="cmdk-open"
        onClick={() => setOpen(true)}
        aria-hidden="true"
      />
      <Dialog open={open} onOpenChange={setOpen}>
        {open && (
          <>
            <div className="fixed inset-0 z-50 bg-black/30" onClick={()=>setOpen(false)} />
            <div className="fixed inset-x-0 top-12 z-50 mx-auto w-full max-w-2xl rounded-md shadow-lg overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800" ref={containerRef} role="dialog" aria-modal="true" aria-label="Command palette">
          <div className="border-b px-3 py-2 flex items-center gap-2">
            <Input
              ref={inputRef}
              value={q}
              onChange={(e)=>setQ(e.target.value)}
              placeholder="Type a command or search…"
            />
            <Button variant="outline" size="sm" onClick={()=>setOpen(false)}>Esc</Button>
          </div>
          <ul className="max-h-64 overflow-auto">
              {items.length === 0 && (
              <li className="px-3 py-2 text-sm text-neutral-500">No results</li>
            )}
            {items.map((it) => (
              <li key={it.href}>
                <Link prefetch href={it.href} className="block px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-sm" onClick={()=>setOpen(false)}>
                  {it.label}
                </Link>
              </li>
            ))}
              </ul>
            </div>
          </>
        )}
      </Dialog>
    </>
  );
}
