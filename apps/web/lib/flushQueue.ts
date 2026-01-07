import { BACKOFF, nextDelay } from './backoff';

export async function flushMutations(dequeue: ()=> Promise<any>) {
  let tries = 0;
  let hadError = false;
  while (navigator.onLine) {
    const job = await dequeue();
    if (!job) break;
    try {
      const res = await fetch(job.url, {
        method: job.method || 'POST',
        headers: { 'Content-Type': 'application/json', ...(job.headers || {}) },
        body: job.body ? JSON.stringify(job.body) : undefined,
      });
      if (res.status === 409) {
        // Conflict detected: notify UI for a review banner/panel
        try {
          const reg = await navigator.serviceWorker?.getRegistration();
          reg?.active?.postMessage({ type: 'CONFLICT_DETECTED' });
        } catch {}
      }
      tries = 0;
    } catch {
      tries++;
      hadError = true;
      const wait = nextDelay(tries);
      await new Promise((r) => setTimeout(r, wait));
      if (tries > BACKOFF.maxTries) break;
    }
  }
  // Notify pages via SW postMessage channel (if active)
  try {
    const result = hadError ? 'partial' : 'success';
    const reg = await navigator.serviceWorker?.getRegistration();
    reg?.active?.postMessage({ type: 'FLUSH_RESULT', result });
  } catch {}
}
