"use client";
import { Button, useToast } from '@clinic/packages-ui';

import { useEffect, useState } from 'react';
import { ContentHeader } from '../components/shell/ContentHeader';
import { enqueue } from '../lib/mutationQueue';
import { cacheQuery, getCachedQuery } from '../lib/queryCache';

export default function Home() {
  const { push } = useToast();
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((err) => console.error('SW registration failed', err));
    }
  }, []);

  async function fetchWithCache() {
    const key = 'time:now';
    const cached = await getCachedQuery<{ now: string }>(key);
    if (cached) {
      setNow(cached.now);
    }
    try {
      const res = await fetch('/api/time');
      const data = (await res.json()) as { now: string };
      setNow(data.now);
      await cacheQuery(key, data, 60_000);
      if (!cached) push({ title: 'Cached', description: 'Stored time in query cache' });
    } catch (e) {
      push({ title: 'Network error', description: 'Using cached value if available' });
    }
  }

  async function simulateOfflineMutation() {
    await enqueue({ url: '/api/echo', method: 'POST', body: { at: Date.now() } });
    push({ title: 'Queued', description: 'Mutation enqueued; will flush when online' });
  }

  return (
    <main className="min-h-[calc(100vh-3rem)] flex flex-col">
      <ContentHeader title="Home" />
      <div className="flex-1 p-4">
        <div className="max-w-xl">
          <h2 className="text-xl font-medium mb-2">Clinic Management</h2>
          <p className="text-neutral-600 dark:text-neutral-400">Next.js App Router + Tailwind + PWA</p>
          <div className="mt-4 flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchWithCache}>Fetch time (cache)</Button>
            <Button variant="outline" size="sm" onClick={simulateOfflineMutation}>Enqueue mutation</Button>
          </div>
          {now && (
            <div className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">Server time: {now}</div>
          )}
        </div>
      </div>
    </main>
  );
}
