"use client";
import { TopBar } from './TopBar';
import { LeftDock } from './LeftDock';
import dynamic from 'next/dynamic';
const CommandPalette = dynamic(() => import('./CommandPalette').then(m => m.CommandPalette), { ssr: false });
import { useAuth } from '../auth/AuthProvider';
import { useRouter, usePathname } from 'next/navigation';
import { BannerStack } from '../ui/BannerStack';
import type { FC, ReactNode } from 'react';

export const AppShell: FC<{ children: ReactNode }> = ({ children }) => {
  const { session, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Don't guard /login and /register pages
  const isAuthPage = pathname === '/login' || pathname === '/register';

  if (!loading && !session && !isAuthPage) {
    // Client-side redirect to login
    if (typeof window !== 'undefined') router.replace('/login');
  }

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-sm text-neutral-500">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid grid-rows-[3rem_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-neutral-900 text-white px-3 py-1 rounded">Skip to main content</a>
      {!isAuthPage && <TopBar />}
      <div className="min-h-0 flex flex-col">
        {!isAuthPage && <BannerStack />}
        {isAuthPage ? (
          <main id="main" className="min-h-[calc(100vh-3rem)]">
            <div className="mx-auto" role="main">{children}</div>
          </main>
        ) : (
          <div className="grid grid-cols-[14rem_1fr] gap-0">
            <LeftDock />
            <main id="main" className="min-h-[calc(100vh-3rem)]">
              <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4" role="main">{children}</div>
            </main>
          </div>
        )}
        {!isAuthPage && <CommandPalette />}
      </div>
    </div>
  );
};
