"use client";

type A2HSEvent =
  | { event: 'shown' }
  | { event: 'install_clicked' }
  | { event: 'installed' }
  | { event: 'prompt_dismissed' }
  | { event: 'dismissed' }
  | { event: 'snoozed'; meta?: { ms: number } };

export async function sendA2HSTelemetry(payload: A2HSEvent) {
  try {
    // Fire and forget; ignore failures
    await fetch('/api/telemetry/a2hs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, ts: Date.now() }),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}
