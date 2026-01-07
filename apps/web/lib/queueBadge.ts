"use client";
import { useEffect, useState } from 'react';

type QueueSizeMsg = { type: 'QUEUE_SIZE'; size: number };

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function isQueueSizeMsg(v: unknown): v is QueueSizeMsg {
  return isObject(v) && v['type'] === 'QUEUE_SIZE' && typeof v['size'] === 'number';
}

export function useQueuedCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    const handler = (ev: MessageEvent) => {
      const data: unknown = ev.data;
      if (isQueueSizeMsg(data) && mounted) {
        setCount(Number(data.size) || 0);
      }
    };
    navigator.serviceWorker?.addEventListener('message', handler);
    // request initial
    navigator.serviceWorker?.ready
      .then((reg) => reg.active?.postMessage({ type: 'QUEUE_SIZE_REQUEST' }))
      .catch(() => {});
    return () => {
      mounted = false;
      navigator.serviceWorker?.removeEventListener('message', handler);
    };
  }, []);

  return count;
}
