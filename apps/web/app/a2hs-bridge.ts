// Handle Add to Home Screen prompt UX
"use client";
import { useEffect, useState } from 'react';

type A2HSOutcome = 'accepted' | 'dismissed';
interface BeforeInstallPromptEvent extends Event {
  readonly platforms?: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: A2HSOutcome; platform?: string }>;
}

function isBeforeInstallPromptEvent(e: Event): e is BeforeInstallPromptEvent {
  return 'prompt' in (e as object) && 'userChoice' in (e as object);
}

export function useA2HS() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [canPrompt, setCanPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      if (!isBeforeInstallPromptEvent(e)) return;
      e.preventDefault();
      setPromptEvent(e);
      setCanPrompt(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function promptInstall() {
    if (!promptEvent) return false;
    await promptEvent.prompt();
  const choice = await promptEvent.userChoice.catch(() => ({ outcome: 'dismissed' as const }));
    setCanPrompt(false);
    return choice.outcome === 'accepted';
  }

  return { canPrompt, promptInstall };
}
