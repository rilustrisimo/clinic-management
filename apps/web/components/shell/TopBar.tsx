"use client";
import { Button } from '@clinic/packages-ui';
import { useEffect, useState } from 'react';
import { useA2HS } from '../../app/a2hs-bridge';
import { useAuth } from '../auth/AuthProvider';
import { useQueuedCount } from '../../lib/queueBadge';

export function TopBar() {
  const { canPrompt, promptInstall } = useA2HS();
  const { session, signOut } = useAuth();
  const queued = useQueuedCount();
  const [online, setOnline] = useState<boolean>(true);
  const [showQueue, setShowQueue] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  return (
    <header className="h-12 border-b border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md flex items-center px-4 gap-2 sticky top-0 z-40">
      {/* Logo */}
      <div className="font-semibold text-sm text-neutral-900 dark:text-white">Clinic</div>
      
      {/* Spacer */}
      <div className="flex-1" />
      
      {/* Network Status - Only show when offline */}
      {!online && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800">
          <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
          <span className="text-[11px] font-medium text-orange-700 dark:text-orange-300">Offline</span>
        </div>
      )}
      
      {/* Queue Status - Only show when there are queued items */}
      {queued > 0 && (
        <div className="relative">
          <button
            onClick={() => setShowQueue(!showQueue)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span className="text-[11px] font-medium text-blue-700 dark:text-blue-300">{queued} queued</span>
          </button>
          
          {showQueue && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowQueue(false)} />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg p-3 z-50">
                <div className="text-xs space-y-1">
                  <div className="text-neutral-600 dark:text-neutral-400">
                    Queued mutations: <span className="font-medium text-neutral-900 dark:text-white">{queued}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
      
      {/* Install App Button */}
      {canPrompt && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={promptInstall}
          className="text-[11px] h-7 px-2.5"
        >
          Install App
        </Button>
      )}
      
      {/* User Info & Auth */}
      {session ? (
        <>
          <span className="text-[11px] text-neutral-600 dark:text-neutral-400 hidden sm:inline">
            {session.user.email}
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={signOut}
            className="text-[11px] h-7 px-2.5"
          >
            Sign Out
          </Button>
        </>
      ) : (
        <a 
          href="/login" 
          className="text-[11px] text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors px-2.5"
        >
          Sign In
        </a>
      )}
      
      {/* Command Palette Trigger */}
      <button
        title="Command palette (⌘K)"
        aria-label="Command Palette"
        className="flex items-center justify-center h-7 px-2 rounded-md border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
        onClick={() => {
          const btn = document.getElementById('cmdk-open') as HTMLButtonElement | null;
          btn?.click();
        }}
      >
        <span className="text-[11px] font-mono text-neutral-600 dark:text-neutral-400">⌘K</span>
      </button>
      
      {/* Notifications */}
      <div className="relative">
        <button
          aria-label="Notifications"
          onClick={() => setShowNotifications(!showNotifications)}
          className="flex items-center justify-center h-7 w-7 rounded-md border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
        >
          <span className="text-sm">🔔</span>
        </button>
        
        {showNotifications && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
            <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg p-4 z-50">
              <div className="text-xs text-neutral-600 dark:text-neutral-400">
                No new notifications
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
