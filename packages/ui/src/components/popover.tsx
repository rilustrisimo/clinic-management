"use client";
import * as React from 'react';

type PopoverContext = { open: boolean; setOpen(v: boolean): void };
const Ctx = React.createContext<PopoverContext | null>(null);

export function Popover({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return <Ctx.Provider value={{ open, setOpen }}>{children}</Ctx.Provider>;
}

export function PopoverTrigger({ asChild = false, children }: { asChild?: boolean; children: React.ReactElement }) {
  const ctx = React.useContext(Ctx)!;
  const props = {
    onClick: (e: React.MouseEvent) => {
      ctx.setOpen(!ctx.open);
      children.props.onClick?.(e);
    },
    'aria-expanded': ctx.open,
  };
  return asChild ? React.cloneElement(children, props) : <button {...props}>{children}</button>;
}

export function PopoverContent({ className, children }: { className?: string; children: React.ReactNode }) {
  const ctx = React.useContext(Ctx)!;
  if (!ctx.open) return null;
  return (
    <div className={["absolute z-50 mt-2 rounded-md border bg-white dark:bg-neutral-900 shadow p-2", className].filter(Boolean).join(' ')} onClick={(e)=>e.stopPropagation()}>
      {children}
    </div>
  );
}
