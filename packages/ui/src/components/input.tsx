"use client";
import * as React from 'react';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={['w-full h-9 px-3 py-2 rounded-md border border-neutral-300 bg-white dark:bg-neutral-900 dark:border-neutral-700 text-sm outline-none focus:ring-2 focus:ring-brand-500 transition-shadow', className].filter(Boolean).join(' ')}
      {...props}
    />
  )
);
Input.displayName = 'Input';
