"use client";
import type { FC, ReactNode } from 'react';

type Props = { title: string; actions?: ReactNode; children?: ReactNode };

export const ContentHeader: FC<Props> = ({ title, actions, children }) => {
  return (
    <div className="border-b bg-white dark:bg-neutral-900 px-4 py-3 flex items-center gap-3">
      <h1 className="text-lg font-semibold flex-1">{title}</h1>
      <div className="flex items-center gap-2">{actions}</div>
      {children}
    </div>
  );
};
