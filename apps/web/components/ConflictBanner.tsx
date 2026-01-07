"use client";
import { useEffect, useState } from 'react';
import { Button } from '@clinic/packages-ui';

export function ConflictBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data && e.data.type === 'CONFLICT_DETECTED') setShow(true);
    };
    navigator.serviceWorker?.addEventListener('message', handler);
    return () => navigator.serviceWorker?.removeEventListener('message', handler);
  }, []);

  if (!show) return null;

  return (
    <div role="status" aria-live="polite" className="w-full bg-red-500/10 text-red-900 dark:text-red-200 border-b border-red-500/30 px-3 py-2 text-sm flex items-center gap-2">
      <span>We detected a conflict while syncing changes.</span>
      <div className="flex-1" />
      <Button size="sm" variant="outline" onClick={()=>setShow(false)}>Dismiss</Button>
  <Button size="sm" variant="default" onClick={()=>{
        // For now, manual retry simply triggers a flush; later this can open a full review panel.
        import('../app/clientside-sw-bridge').then(m=>m.triggerFlushNow()).catch(()=>{});
      }}>Retry</Button>
    </div>
  );
}
