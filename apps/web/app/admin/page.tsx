"use client";
import { useAuth, hasRole } from '@/components/auth/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminOverview() {
  const { roles, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !hasRole(roles, 'Admin')) {
      router.push('/');
    }
  }, [roles, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-neutral-500">Loading...</div>
      </div>
    );
  }

  if (!hasRole(roles, 'Admin')) {
    return null;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Administration</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="p-6 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:shadow-lg transition-shadow">
          <h2 className="text-lg font-semibold mb-2">Providers</h2>
          <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-4">
            Manage healthcare providers and their schedules
          </p>
          <a 
            href="/admin/providers" 
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            View Providers →
          </a>
        </div>

        <div className="p-6 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:shadow-lg transition-shadow">
          <h2 className="text-lg font-semibold mb-2">Loyverse Import</h2>
          <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-4">
            Import and reconcile customers from Loyverse POS
          </p>
          <a 
            href="/admin/loyverse-import" 
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Import Customers →
          </a>
        </div>

        <div className="p-6 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:shadow-lg transition-shadow opacity-50">
          <h2 className="text-lg font-semibold mb-2">Users</h2>
          <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-4">
            Manage system users and access control
          </p>
          <span className="text-neutral-400 text-sm font-medium">
            Coming Soon
          </span>
        </div>
      </div>
    </div>
  );
}
