'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { QuickPicks } from '../catalog/QuickPicks';
import { TestCatalog } from '../catalog/TestCatalog';
import { DiscountSelector } from '@/components/shared/DiscountSelector';
import { PriceBreakdown } from '@/components/shared/PriceBreakdown';
import type { LoyverseDiscount } from '@/lib/types/discount';
import { calculateDiscountFromLoyverse, getDiscountValue } from '@/lib/utils/discount';

interface LabOrderFormProps {
  patientId: string;
  patientName?: string;
  appointmentId?: string;
  visitId?: string;
  orderId?: string; // For editing existing orders
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
  orderId,
  onSuccess,
  onCancel,
}: LabOrderFormProps) {
  const isEditing = !!orderId;
  const queryClient = useQueryClient();
  const [selectedTests, setSelectedTests] = useState<SelectedTest[]>([]);
  const [priority, setPriority] = useState<'routine' | 'urgent' | 'stat'>('routine');
  const [notes, setNotes] = useState('');
  const [showCatalog, setShowCatalog] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState<LoyverseDiscount | null>(null);

  // Fetch existing order data when editing
  const { data: existingOrder } = useQuery({
    queryKey: ['lab-order', orderId],
    queryFn: async () => {
      const res = await fetch(`/api/labs/orders/${orderId}`);
      if (!res.ok) throw new Error('Failed to fetch order');
      return res.json();
    },
    enabled: isEditing,
  });

  // Pre-populate form when editing
  useEffect(() => {
    if (existingOrder?.data) {
      const order = existingOrder.data;
      setPriority(order.priority || 'routine');
      setNotes(order.notes || '');

      // Map order items to selected tests format
      if (order.items && order.items.length > 0) {
        const tests: SelectedTest[] = order.items.map((item: any) => ({
          id: item.loyverseOptionId,
          code: item.testCode,
          name: item.testName,
          section: item.section,
          sectionId: item.section,
          price: parseFloat(item.priceSnapshot || item.unitPrice || 0),
          specimenType: item.specimenType || 'blood',
          loyverseModifierId: item.loyverseModifierId,
          loyverseOptionId: item.loyverseOptionId,
        }));
        setSelectedTests(tests);
      }

      // Load discount from existing order
      if (
        order.discountId &&
        order.discountName &&
        order.discountType &&
        typeof order.discountValue === 'number'
      ) {
        // Database stores 'PERCENT' but Loyverse type is 'FIXED_PERCENT'
        const loyverseType =
          order.discountType === 'PERCENT' || order.discountType === 'FIXED_PERCENT'
            ? 'FIXED_PERCENT'
            : 'FIXED_AMOUNT';

        console.log('[LabOrderForm] Initializing discount from DB:', {
          discountId: order.discountId,
          discountType: order.discountType,
          discountValue: order.discountValue,
          loyverseType,
        });

        setSelectedDiscount({
          id: order.discountId,
          name: order.discountName,
          type: loyverseType,
          discount_percent: loyverseType === 'FIXED_PERCENT' ? order.discountValue : 0,
          discount_amount: loyverseType === 'FIXED_AMOUNT' ? order.discountValue : 0,
        });
      }
    }
  }, [existingOrder]);

  const saveOrderMutation = useMutation({
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

      const url = isEditing ? `/api/labs/orders/${orderId}` : '/api/labs/orders';
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          appointmentId: appointmentId || null,
          visitId: visitId || null,
          priority,
          notes: notes || null,
          items,
          discount: selectedDiscount
            ? {
                discountId: selectedDiscount.id,
                discountName: selectedDiscount.name,
                discountType: selectedDiscount.type,
                discountValue: getDiscountValue(selectedDiscount),
              }
            : null,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || `Failed to ${isEditing ? 'update' : 'create'} order`);
      }

      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lab-orders'] });
      queryClient.invalidateQueries({ queryKey: ['lab-orders-history'] });
      queryClient.invalidateQueries({ queryKey: ['lab-queue'] });
      if (isEditing) {
        queryClient.invalidateQueries({ queryKey: ['lab-order', orderId] });
      }
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

  // Calculate subtotal and discount
  const subtotal = selectedTests.reduce((sum, test) => sum + test.price, 0);
  const discountAmount = selectedDiscount
    ? calculateDiscountFromLoyverse(subtotal, selectedDiscount)
    : 0;
  const totalAmount = subtotal - discountAmount;

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
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
          {isEditing ? 'Edit Lab Order' : 'New Lab Order'}
        </h2>
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
          <div className="flex-1 overflow-y-auto overflow-x-visible p-4">
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

          {/* Footer - Outside overflow container */}
          <div className="shrink-0 border-t border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            {/* Discount Selector */}
            <div className="mb-4">
              <DiscountSelector
                subtotal={subtotal}
                selectedDiscount={selectedDiscount}
                onSelectDiscount={setSelectedDiscount}
                disabled={selectedTests.length === 0}
              />
            </div>

            {/* Price Breakdown */}
            <div className="mb-4">
              <PriceBreakdown
                subtotal={subtotal}
                discount={
                  selectedDiscount
                    ? {
                        name: selectedDiscount.name,
                        type: selectedDiscount.type,
                        value: getDiscountValue(selectedDiscount),
                        amount: discountAmount,
                      }
                    : undefined
                }
                totalAmount={totalAmount}
                compact
              />
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
                onClick={() => saveOrderMutation.mutate()}
                disabled={selectedTests.length === 0 || saveOrderMutation.isPending}
                className="flex-1 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
              >
                {saveOrderMutation.isPending
                  ? isEditing
                    ? 'Updating...'
                    : 'Creating...'
                  : isEditing
                    ? 'Update Order'
                    : 'Create Order'}
              </button>
            </div>

            {saveOrderMutation.isError && (
              <p className="mt-2 text-center text-sm text-red-500">
                {(saveOrderMutation.error as Error).message}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
