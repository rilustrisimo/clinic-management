"use client";
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, type Session } from '../../lib/supabaseClient';

type Role = 'Admin' | 'Provider' | 'Frontdesk' | 'Billing' | 'Inventory' | 'LabTech' | string;

type AuthState = {
  session: Session | null;
  userId: string | null;
  roles: Role[];
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    const userId = session?.user?.id;
    (async () => {
      if (!userId) { setRoles([]); return; }
      // Fetch roles via RLS-safe RPC or view; here we assume a view user_roles_view(user_id, role_name)
      try {
        const { data, error } = await supabase
          .from('user_roles_view')
          .select('role_name')
          .eq('user_id', userId);
        if (error) throw error;
        if (!active) return;
        setRoles((data || []).map((r: any) => r.role_name as Role));
      } catch {
        if (!active) return;
        setRoles([]);
      }
    })();
    return () => { active = false; };
  }, [session?.user?.id]);

  const value = useMemo<AuthState>(() => ({
    session,
    userId: session?.user?.id ?? null,
    roles,
    loading,
    signOut: async () => { await supabase.auth.signOut(); },
  }), [session, roles, loading]);

  return (
    <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function hasRole(roles: Role[], target: Role | Role[]) {
  const t = Array.isArray(target) ? target : [target];
  return roles.some(r => t.includes(r));
}
