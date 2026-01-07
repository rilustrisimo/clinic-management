"use client";
import { useEffect, useState } from 'react';
import { Button } from '@clinic/packages-ui';
import { useA2HS } from '../app/a2hs-bridge';
import { sendA2HSTelemetry } from '../lib/telemetry';

const DISMISS_KEY = 'a2hs-dismissed';
const SNOOZE_KEY = 'a2hs-snooze-until';
const SNOOZE_MS = 24 * 60 * 60 * 1000; // 24 hours
const SHOWN_SESSION_KEY = 'a2hs-banner-shown-session';

export function InstallBanner() {
  const { canPrompt, promptInstall } = useA2HS();
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [snoozeUntil, setSnoozeUntil] = useState<number | null>(null);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === '1');
      const raw = localStorage.getItem(SNOOZE_KEY);
      if (raw) {
        const n = Number(raw);
        if (!Number.isNaN(n)) setSnoozeUntil(n);
      }
    } catch {}
  }, []);

  const isSnoozed = snoozeUntil != null && Date.now() < snoozeUntil;
  const visible = canPrompt && !dismissed && !isSnoozed;

  // Fire one-time "shown" telemetry per tab session when visible
  useEffect(() => {
    if (!visible) return;
    try {
      const sent = sessionStorage.getItem(SHOWN_SESSION_KEY) === '1';
      if (!sent) {
        sendA2HSTelemetry({ event: 'shown' });
        sessionStorage.setItem(SHOWN_SESSION_KEY, '1');
      }
    } catch {}
  }, [visible]);

  if (!visible) return null;

  return (
    <div role="region" aria-label="Install app" className="w-full bg-blue-600/10 text-blue-900 dark:text-blue-200 border-b border-blue-600/30 px-3 py-2 text-sm flex items-center gap-2">
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" className="text-blue-700 dark:text-blue-300">
        <path fill="currentColor" d="M12 16l4-4h-3V4h-2v8H8l4 4zm8 2H4v2h16v-2z"/>
      </svg>
      <span>Install Clinic for faster access and offline support.</span>
      <div className="flex-1" />
      <Button
        size="sm"
        variant="outline"
        onClick={async () => {
          sendA2HSTelemetry({ event: 'install_clicked' });
          const ok = await promptInstall();
          if (ok) {
            try { localStorage.setItem(DISMISS_KEY, '1'); } catch {}
            setDismissed(true);
            sendA2HSTelemetry({ event: 'installed' });
          } else {
            sendA2HSTelemetry({ event: 'prompt_dismissed' });
          }
        }}
      >Install</Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          try { localStorage.setItem(DISMISS_KEY, '1'); } catch {}
          setDismissed(true);
          sendA2HSTelemetry({ event: 'dismissed' });
        }}
        aria-label="Dismiss install banner"
      >Dismiss</Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          const until = Date.now() + SNOOZE_MS;
          try { localStorage.setItem(SNOOZE_KEY, String(until)); } catch {}
          setSnoozeUntil(until);
          sendA2HSTelemetry({ event: 'snoozed', meta: { ms: SNOOZE_MS } });
        }}
        aria-label="Snooze install banner for 24 hours"
      >Snooze 24h</Button>
    </div>
  );
}
