"use client";
import { useAuth, hasRole } from '@/components/auth/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function InventoryPage() {
  const { roles, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !hasRole(roles, ['Inventory', 'Admin'])) {
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

  if (!hasRole(roles, ['Inventory', 'Admin'])) {
    return null;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Inventory Management</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Add Item
        </button>
      </div>
      
      <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-8 text-center">
        <div className="text-neutral-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold mb-2 text-neutral-700 dark:text-neutral-300">
          Inventory Module Coming Soon
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
          Track medical supplies, equipment, and medications. Monitor stock levels, 
          expiration dates, and reorder points.
        </p>
      </div>
    </div>
  );
}
