"use client";
import * as React from 'react';

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

export const Label = ({ className, ...props }: LabelProps) => (
  <label
    className={['text-sm text-neutral-700 dark:text-neutral-300', className].filter(Boolean).join(' ')}
    {...props}
  />
);
