// Client-side bridge for SW <-> app for mutation flush
if (typeof window !== 'undefined') {
  // Register Background Sync to flush mutations when back online (if supported)
  navigator.serviceWorker?.ready.then(async (reg) => {
    // Guard: sync may be undefined on some browsers
    // @ts-expect-error sync is experimental
    if (reg.sync && typeof reg.sync.register === 'function') {
      try {
        // @ts-expect-error sync is experimental
        await reg.sync.register('flush-mutations');
      } catch {}
    }
  }).catch(()=>{});

  navigator.serviceWorker?.addEventListener('message', (event) => {
    if (event.data?.type === 'FLUSH_MUTATIONS') {
      // Lazy import to avoid SSR issues
      import('../lib/mutationQueue').then(async ({ dequeue }) => {
        const { flushMutations } = await import('../lib/flushQueue');
        await flushMutations(dequeue);
      }).catch(()=>{});
    }
  });
}

// Expose a manual flush trigger for UI (retry panel)
export async function triggerFlushNow() {
  const { dequeue } = await import('../lib/mutationQueue');
  const { flushMutations } = await import('../lib/flushQueue');
  await flushMutations(dequeue);
}
