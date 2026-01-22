'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { QuickPicks } from '../catalog/QuickPicks';
import { TestCatalog } from '../catalog/TestCatalog';

interface LabOrderFormProps {
  patientId: string;
  patientName?: string;
  appointmentId?: string;
  visitId?: string;
  onSuccess?: (order: any) => void;
  onCancel?: () => void;
}

interface SelectedTest {
  id: string; // Loyverse option ID
  code: string;
  name: string;
  section: string;
  sectionId: string;
  price: number;
  specimenType: string;
  loyverseModifierId: string;
  loyverseOptionId: string;
}

export function LabOrderForm({
  patientId,
  patientName,
  appointmentId,
  visitId,
  onSuccess,
  onCancel,
}: LabOrderFormProps) {
  const queryClient = useQueryClient();
  const [selectedTests, setSelectedTests] = useState<SelectedTest[]>([]);
  const [priority, setPriority] = useState<'routine' | 'urgent' | 'stat'>('routine');
  const [notes, setNotes] = useState('');
  const [showCatalog, setShowCatalog] = useState(false);

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      // Send Loyverse test info to the API
      const items = selectedTests.map((test) => ({
        loyverseOptionId: test.loyverseOptionId,
        loyverseModifierId: test.loyverseModifierId,
        code: test.code,
        name: test.name,
        section: test.section,
        price: test.price,
        specimenType: test.specimenType,
      }));

      const res = await fetch('/api/labs/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          appointmentId: appointmentId || null,
          visitId: visitId || null,
          priority,
          notes: notes || null,
          items,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create order');
      }

      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lab-orders'] });
      queryClient.invalidateQueries({ queryKey: ['lab-queue'] });
      onSuccess?.(data.data);
    },
  });

  const handleSelectTest = (test: any) => {
    const exists = selectedTests.find((t) => t.id === test.id);
    if (exists) {
      setSelectedTests(selectedTests.filter((t) => t.id !== test.id));
    } else {
      setSelectedTests([
        ...selectedTests,
        {
          id: test.id,
          code: test.code,
          name: test.name,
          section: test.section,
          sectionId: test.sectionId,
          price: test.price,
          specimenType: test.specimenType,
          loyverseModifierId: test.loyverseModifierId,
          loyverseOptionId: test.loyverseOptionId,
        },
      ]);
    }
  };

  const removeTest = (testId: string) => {
    setSelectedTests(selectedTests.filter((t) => t.id !== testId));
  };

  const totalAmount = selectedTests.reduce((sum, test) => sum + test.price, 0);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(price);

  const selectedTestIds = selectedTests.map((t) => t.id);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-white px-6 py-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">New Lab Order</h2>
        {patientName && (
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Patient: {patientName}
          </p>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Test Selection */}
        <div className="flex w-2/3 flex-col border-r border-neutral-200 dark:border-neutral-800">
          {/* Quick Picks */}
          {!showCatalog && (
            <div className="border-b border-neutral-200 p-4 dark:border-neutral-800">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                  Quick Picks
                </h3>
                <button
                  onClick={() => setShowCatalog(true)}
                  className="text-[11px] font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  Browse Full Catalog
                </button>
              </div>
              <QuickPicks onSelectTest={handleSelectTest} selectedTestIds={selectedTestIds} />
            </div>
          )}

          {/* Full Catalog */}
          {showCatalog && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-2 dark:border-neutral-800">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                  Test Catalog
                </h3>
                <button
                  onClick={() => setShowCatalog(false)}
                  className="text-[11px] font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  Back to Quick Picks
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <TestCatalog onSelectTest={handleSelectTest} selectedTestIds={selectedTestIds} />
              </div>
            </div>
          )}
        </div>

        {/* Right: Order Summary */}
        <div className="flex w-1/3 flex-col bg-neutral-50 dark:bg-neutral-950">
          <div className="flex-1 overflow-auto p-4">
            <h3 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-white">
              Order Summary
            </h3>

            {/* Selected Tests */}
            {selectedTests.length === 0 ? (
              <div className="rounded-lg border border-dashed border-neutral-300 p-4 text-center dark:border-neutral-700">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">No tests selected</p>
                <p className="mt-1 text-[11px] text-neutral-400 dark:text-neutral-500">
                  Select tests from Quick Picks or browse the catalog
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedTests.map((test) => (
                  <div
                    key={test.id}
                    className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm dark:bg-neutral-900"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-neutral-900 dark:text-white">
                          {test.name}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                          {test.section}
                        </span>
                        <span className="text-[10px] text-neutral-500 capitalize">
                          {test.specimenType}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-neutral-900 dark:text-white">
                        {formatPrice(test.price)}
                      </span>
                      <button
                        onClick={() => removeTest(test.id)}
                        className="text-neutral-400 hover:text-red-500"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Priority */}
            <div className="mt-6">
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Priority
              </label>
              <div className="flex gap-2">
                {(['routine', 'urgent', 'stat'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={cn(
                      'flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all',
                      priority === p
                        ? p === 'stat'
                          ? 'bg-red-500 text-white'
                          : p === 'urgent'
                            ? 'bg-orange-500 text-white'
                            : 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400',
                    )}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="mt-4">
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any special instructions..."
                rows={3}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            {/* Total */}
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                Total Amount
              </span>
              <span className="text-xl font-semibold text-neutral-900 dark:text-white">
                {formatPrice(totalAmount)}
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                onClick={() => createOrderMutation.mutate()}
                disabled={selectedTests.length === 0 || createOrderMutation.isPending}
                className="flex-1 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
              >
                {createOrderMutation.isPending ? 'Creating...' : 'Create Order'}
              </button>
            </div>

            {createOrderMutation.isError && (
              <p className="mt-2 text-center text-sm text-red-500">
                {(createOrderMutation.error as Error).message}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
