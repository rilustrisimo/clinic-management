'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import {
  Search,
  Filter,
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
} from 'lucide-react';
import { LabOrderCard } from '@/components/labs/order/LabOrderCard';
import { LabOrderDetail } from '@/components/labs/order/LabOrderDetail';
import { LabOrderForm } from '@/components/labs/order/LabOrderForm';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';

// Filter options
const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending_payment', label: 'Pending Payment' },
  { value: 'paid', label: 'Paid' },
  { value: 'collecting', label: 'Collecting' },
  { value: 'collected', label: 'Collected' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'verified', label: 'Verified' },
  { value: 'released', label: 'Released' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: '', label: 'All Payment Status' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'paid', label: 'Paid' },
  { value: 'partial', label: 'Partial' },
  { value: 'refunded', label: 'Refunded' },
];

const DATE_PRESETS = [
  { label: 'Today', getValue: () => ({ from: new Date(), to: new Date() }) },
  {
    label: 'Yesterday',
    getValue: () => ({ from: subDays(new Date(), 1), to: subDays(new Date(), 1) }),
  },
  { label: 'Last 7 Days', getValue: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
  { label: 'Last 30 Days', getValue: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  {
    label: 'This Month',
    getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }),
  },
  { label: 'All Time', getValue: () => ({ from: null, to: null }) },
];

interface Filters {
  search: string;
  status: string;
  paymentStatus: string;
  dateFrom: Date | null;
  dateTo: Date | null;
}

interface EditingOrder {
  orderId: string;
  patientId: string;
  patientName: string;
}

export default function LabHistoryPage() {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<EditingOrder | null>(null);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: '',
    paymentStatus: '',
    dateFrom: subDays(new Date(), 30),
    dateTo: new Date(),
  });

  const debouncedSearch = useDebounce(filters.search, 300);
  const limit = 20;

  // Build query params
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set('limit', limit.toString());
    params.set('offset', ((page - 1) * limit).toString());

    if (debouncedSearch) {
      params.set('search', debouncedSearch);
    }
    if (filters.status) {
      params.set('status', filters.status);
    }
    if (filters.paymentStatus) {
      params.set('paymentStatus', filters.paymentStatus);
    }
    if (filters.dateFrom) {
      params.set('dateFrom', format(filters.dateFrom, 'yyyy-MM-dd'));
    }
    if (filters.dateTo) {
      params.set('dateTo', format(filters.dateTo, 'yyyy-MM-dd'));
    }

    return params.toString();
  }, [
    debouncedSearch,
    filters.status,
    filters.paymentStatus,
    filters.dateFrom,
    filters.dateTo,
    page,
  ]);

  // Fetch orders
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['lab-orders-history', queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/labs/orders?${queryParams}`);
      if (!res.ok) throw new Error('Failed to fetch orders');
      return res.json();
    },
  });

  const orders = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const handleFilterChange = (key: keyof Filters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page on filter change
  };

  const applyDatePreset = (preset: (typeof DATE_PRESETS)[0]) => {
    const { from, to } = preset.getValue();
    setFilters((prev) => ({ ...prev, dateFrom: from, dateTo: to }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      paymentStatus: '',
      dateFrom: null,
      dateTo: null,
    });
    setPage(1);
  };

  const hasActiveFilters =
    filters.search || filters.status || filters.paymentStatus || filters.dateFrom || filters.dateTo;

  const formatPHP = (amount: number) =>
    new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);

  // Calculate summary stats from current results
  const stats = useMemo(() => {
    const totalAmount = orders.reduce(
      (sum: number, o: any) => sum + (parseFloat(o.totalAmount) || 0),
      0,
    );
    const paidCount = orders.filter((o: any) => o.paymentStatus === 'paid').length;
    const completedCount = orders.filter((o: any) =>
      ['completed', 'verified', 'released'].includes(o.status),
    ).length;
    return { totalAmount, paidCount, completedCount };
  }, [orders]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-white px-6 py-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">
              Lab Order History
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              {total} orders found
              {filters.dateFrom && filters.dateTo && (
                <span className="ml-2">
                  • {format(filters.dateFrom, 'MMM d, yyyy')} -{' '}
                  {format(filters.dateTo, 'MMM d, yyyy')}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
              Refresh
            </button>
            <a
              href="/labs"
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
            >
              Today&apos;s Orders
            </a>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="border-b border-neutral-200 bg-neutral-50 px-6 py-3 dark:border-neutral-800 dark:bg-neutral-950">
        {/* Search and Quick Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Search by order number or patient name..."
              className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-4 text-sm placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
            />
          </div>

          {/* Date Presets */}
          <div className="flex items-center gap-1">
            {DATE_PRESETS.slice(0, 4).map((preset) => (
              <button
                key={preset.label}
                onClick={() => applyDatePreset(preset)}
                className={cn(
                  'rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                  preset.label === 'Last 30 Days' &&
                    filters.dateFrom &&
                    format(filters.dateFrom, 'yyyy-MM-dd') ===
                      format(subDays(new Date(), 30), 'yyyy-MM-dd')
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                    : 'bg-white text-neutral-600 hover:bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700',
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Toggle Advanced Filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              showFilters || hasActiveFilters
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                : 'bg-white text-neutral-600 hover:bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300',
            )}
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-neutral-900 dark:bg-neutral-900 dark:text-white">
                {[filters.status, filters.paymentStatus, filters.dateFrom].filter(Boolean).length}
              </span>
            )}
          </button>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <X className="h-4 w-4" />
              Clear
            </button>
          )}
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-3 flex flex-wrap items-end gap-4 border-t border-neutral-200 pt-3 dark:border-neutral-700">
            {/* Date Range */}
            <div className="flex items-center gap-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">From</label>
                <input
                  type="date"
                  value={filters.dateFrom ? format(filters.dateFrom, 'yyyy-MM-dd') : ''}
                  onChange={(e) =>
                    handleFilterChange('dateFrom', e.target.value ? new Date(e.target.value) : null)
                  }
                  className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">To</label>
                <input
                  type="date"
                  value={filters.dateTo ? format(filters.dateTo, 'yyyy-MM-dd') : ''}
                  onChange={(e) =>
                    handleFilterChange('dateTo', e.target.value ? new Date(e.target.value) : null)
                  }
                  className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">
                Order Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Status Filter */}
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">
                Payment Status
              </label>
              <select
                value={filters.paymentStatus}
                onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
              >
                {PAYMENT_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {orders.length > 0 && (
        <div className="border-b border-neutral-200 bg-white px-6 py-3 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-neutral-500">Showing:</span>
              <span className="ml-2 font-medium text-neutral-900 dark:text-white">
                {orders.length} of {total}
              </span>
            </div>
            <div>
              <span className="text-neutral-500">Paid:</span>
              <span className="ml-2 font-medium text-green-600">{stats.paidCount}</span>
            </div>
            <div>
              <span className="text-neutral-500">Completed:</span>
              <span className="ml-2 font-medium text-blue-600">{stats.completedCount}</span>
            </div>
            <div className="ml-auto">
              <span className="text-neutral-500">Total Value:</span>
              <span className="ml-2 font-semibold text-neutral-900 dark:text-white">
                {formatPHP(stats.totalAmount)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Orders Grid */}
      <div className="flex-1 overflow-auto bg-neutral-50 p-6 dark:bg-neutral-950">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-48 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800"
              />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-red-500">Failed to load orders</p>
            <button
              onClick={() => refetch()}
              className="mt-4 rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
            >
              Try Again
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-4xl">🔬</div>
            <p className="mt-3 text-lg font-medium text-neutral-900 dark:text-white">
              No Orders Found
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              {hasActiveFilters
                ? 'Try adjusting your filters to find more orders.'
                : 'No lab orders match your search criteria.'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-4 rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {orders.map((order: any) => (
                <LabOrderCard
                  key={order.id}
                  order={order}
                  onClick={() => setSelectedOrderId(order.id)}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={cn(
                          'h-9 w-9 rounded-lg text-sm font-medium transition-colors',
                          page === pageNum
                            ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                            : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800',
                        )}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Order Detail Slide-over */}
      {selectedOrderId && (
        <LabOrderDetail
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          onEdit={() => {
            // Find the order to get patient info
            const order = orders.find((o: any) => o.id === selectedOrderId);
            if (order && order.patient) {
              setEditingOrder({
                orderId: selectedOrderId,
                patientId: order.patientId,
                patientName: `${order.patient.firstName} ${order.patient.lastName}`,
              });
              setSelectedOrderId(null);
            }
          }}
        />
      )}

      {/* Edit Order Dialog */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-neutral-900">
            <LabOrderForm
              patientId={editingOrder.patientId}
              patientName={editingOrder.patientName}
              orderId={editingOrder.orderId}
              onSuccess={() => {
                setEditingOrder(null);
                refetch();
              }}
              onCancel={() => setEditingOrder(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
