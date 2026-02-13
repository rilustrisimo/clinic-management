'use client';

import { formatDistanceToNow, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { OrderStatusBadge, PaymentStatusBadge, PriorityBadge } from '../shared/OrderStatusBadge';

// Helper to safely parse date from various formats
function normalizeDateString(value: string): string {
  const trimmed = value.trim();
  const hasTimeZone = /[zZ]|[+-]\d{2}:\d{2}$/.test(trimmed);
  if (hasTimeZone) return trimmed;
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(trimmed)) {
    return `${trimmed.replace(' ', 'T')}Z`;
  }
  return trimmed;
}

function parseDate(dateValue: string | Date | null | undefined): Date {
  if (!dateValue) return new Date();
  if (dateValue instanceof Date) return dateValue;
  // Handle ISO string format from Supabase
  const normalized = normalizeDateString(dateValue);
  try {
    return parseISO(normalized);
  } catch {
    return new Date(normalized);
  }
}

interface LabOrderCardProps {
  order: {
    id: string;
    orderNumber: string;
    status: any;
    paymentStatus: any;
    priority: any;
    placedAt: string;
    totalAmount: number | string;
    subtotal?: number | string;
    discountAmount?: number | string;
    discountName?: string;
    patient?: {
      id: string;
      firstName: string;
      lastName: string;
      middleName?: string;
      mrn?: string;
    };
    items?: any[];
    itemsCount?: number;
    completedCount?: number;
    verifiedCount?: number;
    progress?: number;
  };
  onClick?: () => void;
  compact?: boolean;
}

export function LabOrderCard({ order, onClick, compact = false }: LabOrderCardProps) {
  const patientName = order.patient
    ? `${order.patient.lastName}, ${order.patient.firstName}${order.patient.middleName ? ` ${order.patient.middleName.charAt(0)}.` : ''}`
    : 'Unknown Patient';

  const formatPrice = (price: number | string) =>
    new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(parseFloat(price as string) || 0);

  const itemsCount = order.itemsCount ?? order.items?.length ?? 0;
  const completedCount = order.completedCount ?? 0;
  const progress =
    order.progress ?? (itemsCount > 0 ? Math.round((completedCount / itemsCount) * 100) : 0);

  if (compact) {
    return (
      <button
        onClick={onClick}
        className="w-full rounded-lg border border-neutral-200 bg-white p-3 text-left transition-all hover:border-neutral-300 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium text-neutral-900 dark:text-white">{order.orderNumber}</p>
            <p className="mt-0.5 text-[11px] text-neutral-600 dark:text-neutral-400">
              {patientName}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {order.priority !== 'routine' && <PriorityBadge priority={order.priority} size="sm" />}
            <OrderStatusBadge status={order.status} size="sm" />
          </div>
        </div>
        {progress > 0 && progress < 100 && (
          <div className="mt-2">
            <div className="h-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-[10px] text-neutral-500">
              {completedCount}/{itemsCount} tests completed
            </p>
          </div>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl border border-neutral-200 bg-white p-4 text-left transition-all hover:border-neutral-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-900 dark:text-white">
              {order.orderNumber}
            </span>
            {order.priority !== 'routine' && <PriorityBadge priority={order.priority} />}
          </div>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{patientName}</p>
          {order.patient?.mrn && (
            <p className="text-[11px] text-neutral-500 dark:text-neutral-500">
              MRN: {order.patient.mrn}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <OrderStatusBadge status={order.status} />
          <PaymentStatusBadge status={order.paymentStatus} />
        </div>
      </div>

      {/* Items Summary */}
      {itemsCount > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(order.items || []).slice(0, 4).map((item: any) => (
            <span
              key={item.id}
              className="rounded bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
            >
              {item.testCode}
            </span>
          ))}
          {itemsCount > 4 && (
            <span className="text-[10px] text-neutral-500">+{itemsCount - 4} more</span>
          )}
        </div>
      )}

      {/* Progress Bar */}
      {progress > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] text-neutral-500">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div
              className={cn(
                'h-full transition-all',
                progress === 100 ? 'bg-green-500' : 'bg-blue-500',
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 border-t border-neutral-100 pt-3 dark:border-neutral-800">
        {order.discountAmount && parseFloat(order.discountAmount as string) > 0 && (
          <div className="mb-2 space-y-0.5 text-[11px]">
            <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
              <span>Subtotal</span>
              <span>{formatPrice(order.subtotal || order.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-green-600 dark:text-green-400">
              <span>{order.discountName}</span>
              <span>-{formatPrice(order.discountAmount)}</span>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-neutral-500">
            {formatDistanceToNow(parseDate(order.placedAt), { addSuffix: true })}
          </span>
          <span className="font-semibold text-neutral-900 dark:text-white">
            {formatPrice(order.totalAmount)}
          </span>
        </div>
      </div>
    </button>
  );
}
