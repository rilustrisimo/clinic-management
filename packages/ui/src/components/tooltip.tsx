"use client";
import * as React from 'react';

type TooltipProps = { content: React.ReactNode; children: React.ReactElement };

export function Tooltip({ content, children }: TooltipProps) {
  const [show, setShow] = React.useState(false);
  return (
    <span className="relative inline-flex" onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)}>
      {children}
      {show && (
        <span className="absolute left-1/2 -translate-x-1/2 -top-7 text-xs bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 rounded px-2 py-1 shadow whitespace-nowrap">
          {content}
        </span>
      )}
    </span>
  );
}
