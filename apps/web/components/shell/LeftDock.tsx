"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FC } from 'react';
import { useAuth, hasRole } from '../auth/AuthProvider';

export const LeftDock: FC = () => {
  const { session, roles } = useAuth();
  const pathname = usePathname();
  const isLoggedIn = !!session;
  
  const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => {
    const isActive = pathname === href;
    return (
      <Link 
        className={`
          px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
          ${isActive 
            ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' 
            : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
          }
        `}
        href={href}
      >
        {children}
      </Link>
    );
  };
  
  return (
    <aside className="w-56 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 h-[calc(100vh-3rem)] p-3 space-y-6">
      <div>
        <div className="text-[11px] uppercase font-semibold tracking-wider text-neutral-500 dark:text-neutral-400 px-3 mb-2">
          Navigation
        </div>
        <nav className="flex flex-col gap-0.5">
          {isLoggedIn && (
            <>
              <NavLink href="/">Dashboard</NavLink>
              <NavLink href="/patients">Patients</NavLink>
              <NavLink href="/appointments">Appointments</NavLink>
              {hasRole(roles, ['LabTech', 'Provider', 'Admin']) && (
                <NavLink href="/labs">Labs</NavLink>
              )}
              {hasRole(roles, ['Billing', 'Admin']) && (
                <NavLink href="/billing">Billing</NavLink>
              )}
              {hasRole(roles, ['Inventory', 'Admin']) && (
                <NavLink href="/inventory">Inventory</NavLink>
              )}
            </>
          )}
          {!isLoggedIn && (
            <NavLink href="/login">Sign In</NavLink>
          )}
        </nav>
      </div>

      {/* Admin Section */}
      {isLoggedIn && hasRole(roles, 'Admin') && (
        <div>
          <div className="text-[11px] uppercase font-semibold tracking-wider text-neutral-500 dark:text-neutral-400 px-3 mb-2">
            Administration
          </div>
          <nav className="flex flex-col gap-0.5">
            <NavLink href="/admin">Overview</NavLink>
            <NavLink href="/admin/providers">Providers</NavLink>
            <NavLink href="/admin/loyverse-import">Loyverse Import</NavLink>
          </nav>
        </div>
      )}
    </aside>
  );
};
