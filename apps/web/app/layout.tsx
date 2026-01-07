import { ToastProvider } from '@clinic/packages-ui';

import './globals.css';
import { AppShell } from '../components/shell/AppShell';
import { AuthProvider } from '../components/auth/AuthProvider';
import { QueryProvider } from '../lib/providers/query-provider';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Clinic Management',
  description: 'Clinic Management System',
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        <ToastProvider>
          <QueryProvider>
            <AuthProvider>
              <AppShell>{children}</AppShell>
            </AuthProvider>
          </QueryProvider>
        </ToastProvider>
        {/* Initialize SW client bridge */}
        <script type="module" dangerouslySetInnerHTML={{__html:`import './clientside-sw-bridge.ts';`}} />
        <script dangerouslySetInnerHTML={{__html:`
          (function(){
            function set(n){var el=document.getElementById('net-status'); if(!el) return; el.textContent=n?'online':'offline'; el.style.color=n?'#16a34a':'#ef4444';}
            window.addEventListener('online', ()=>set(true));
            window.addEventListener('offline', ()=>set(false));
            set(navigator.onLine);
          })();
        `}} />
      </body>
    </html>
  );
}
