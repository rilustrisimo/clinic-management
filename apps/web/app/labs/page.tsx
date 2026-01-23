'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LabOrderCard } from '@/components/labs/order/LabOrderCard';
import { LabOrderForm } from '@/components/labs/order/LabOrderForm';
import { LabOrderDetail } from '@/components/labs/order/LabOrderDetail';
import { PatientSelector } from '@/components/labs/order/PatientSelector';
import { QuickPicks } from '@/components/labs/catalog/QuickPicks';
import { cn } from '@/lib/utils';

type TabType = 'orders' | 'queue' | 'stats';

interface SelectedPatient {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
}

export default function LabsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('orders');
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<SelectedPatient | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  // Fetch today's orders
  const today = new Date().toISOString().split('T')[0];
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['lab-orders', today],
    queryFn: async () => {
      const params = new URLSearchParams({ date: today, limit: '50' });
      const res = await fetch(`/api/labs/orders?${params}`);
      if (!res.ok) throw new Error('Failed to fetch orders');
      return res.json();
    },
  });

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ['lab-stats', today],
    queryFn: async () => {
      const res = await fetch(`/api/labs/stats?date=${today}`);
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
  });

  const orders = ordersData?.items || [];
  const stats = statsData?.orders || {};

  const handleOrderCreated = () => {
    setShowNewOrder(false);
    setSelectedPatient(null);
    setEditingOrderId(null);
  };

  const handlePatientSelect = (patient: SelectedPatient) => {
    setSelectedPatient(patient);
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(price);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-white px-6 py-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">Laboratory</h1>
            <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
              Lab orders, specimens, and results
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/labs/history"
              className="h-8 rounded-lg border border-neutral-200 px-4 text-[11px] font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 inline-flex items-center"
            >
              View History
            </a>
            <button
              onClick={() => setShowNewOrder(true)}
              className="h-8 rounded-lg bg-neutral-900 px-4 text-[11px] font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
            >
              + New Lab Order
            </button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="border-b border-neutral-200 bg-neutral-50 px-6 py-3 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex items-center gap-6">
          <StatItem label="Today's Orders" value={stats.total || 0} />
          <StatItem label="Pending Payment" value={stats.pending_payment || 0} color="amber" />
          <StatItem label="In Progress" value={stats.processing || 0} color="blue" />
          <StatItem label="Completed" value={stats.completed || 0} color="green" />
          <StatItem label="Released" value={stats.released || 0} color="gray" />
          {statsData?.revenue && (
            <div className="ml-auto">
              <span className="text-[10px] uppercase tracking-wider text-neutral-500">Revenue</span>
              <p className="font-semibold text-neutral-900 dark:text-white">
                {formatPrice(statsData.revenue.total)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-200 bg-white px-6 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center gap-1">
          {[
            { id: 'orders', label: 'Orders' },
            { id: 'queue', label: 'Queue Board' },
            { id: 'stats', label: 'Statistics' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={cn(
                'px-4 py-3 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-b-2 border-neutral-900 text-neutral-900 dark:border-white dark:text-white'
                  : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-white p-6 dark:bg-neutral-900">
        {activeTab === 'orders' && (
          <OrdersTab orders={orders} loading={ordersLoading} onOrderClick={setSelectedOrderId} />
        )}
        {activeTab === 'queue' && <QueueTab onOrderClick={setSelectedOrderId} />}
        {activeTab === 'stats' && <StatsTab stats={statsData} />}
      </div>

      {/* New Order Slide-over */}
      {showNewOrder && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setShowNewOrder(false);
              setSelectedPatient(null);
            }}
          />

          {/* Panel */}
          <div className="relative ml-auto flex h-full w-full max-w-4xl flex-col bg-white shadow-xl dark:bg-neutral-900">
            {!selectedPatient ? (
              // Patient Selection
              <PatientSelector
                onSelect={handlePatientSelect}
                onClose={() => setShowNewOrder(false)}
              />
            ) : (
              // Lab Order Form
              <LabOrderForm
                patientId={selectedPatient.id}
                patientName={`${selectedPatient.lastName}, ${selectedPatient.firstName}${selectedPatient.middleName ? ` ${selectedPatient.middleName.charAt(0)}.` : ''}`}
                onSuccess={handleOrderCreated}
                onCancel={() => {
                  setShowNewOrder(false);
                  setSelectedPatient(null);
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Order Detail Slide-over */}
      {selectedOrderId && (
        <LabOrderDetail
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          onEdit={() => {
            setEditingOrderId(selectedOrderId);
            setSelectedOrderId(null);
            setShowNewOrder(true);
          }}
        />
      )}
    </div>
  );
}

function StatItem({ label, value, color }: { label: string; value: number; color?: string }) {
  const colorClasses = {
    amber: 'text-amber-600 dark:text-amber-400',
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    gray: 'text-neutral-600 dark:text-neutral-400',
  };

  return (
    <div>
      <span className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</span>
      <p
        className={cn(
          'text-lg font-semibold',
          color
            ? colorClasses[color as keyof typeof colorClasses]
            : 'text-neutral-900 dark:text-white',
        )}
      >
        {value}
      </p>
    </div>
  );
}

function OrdersTab({
  orders,
  loading,
  onOrderClick,
}: {
  orders: any[];
  loading: boolean;
  onOrderClick: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-neutral-100 dark:bg-neutral-800" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="space-y-8">
        {/* Empty State */}
        <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center dark:border-neutral-700 dark:bg-neutral-900/50">
          <div className="text-4xl">🔬</div>
          <p className="mt-3 text-sm font-medium text-neutral-900 dark:text-white">
            No Lab Orders Today
          </p>
          <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
            Lab orders will appear here when created
          </p>
        </div>

        {/* Quick Picks Preview */}
        <div>
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Popular Tests
          </h3>
          <QuickPicks />
        </div>
      </div>
    );
  }

  // Group orders by status
  const pendingPayment = orders.filter((o) => o.status === 'pending_payment');
  const inProgress = orders.filter((o) =>
    ['paid', 'collecting', 'collected', 'processing'].includes(o.status),
  );
  const completed = orders.filter((o) => ['completed', 'verified', 'released'].includes(o.status));

  return (
    <div className="space-y-8">
      {/* Pending Payment */}
      {pendingPayment.length > 0 && (
        <OrderSection
          title="Pending Payment"
          count={pendingPayment.length}
          orders={pendingPayment}
          color="amber"
          onOrderClick={onOrderClick}
        />
      )}

      {/* In Progress */}
      {inProgress.length > 0 && (
        <OrderSection
          title="In Progress"
          count={inProgress.length}
          orders={inProgress}
          color="blue"
          onOrderClick={onOrderClick}
        />
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <OrderSection
          title="Completed"
          count={completed.length}
          orders={completed}
          color="green"
          onOrderClick={onOrderClick}
        />
      )}
    </div>
  );
}

function OrderSection({
  title,
  count,
  orders,
  color,
  onOrderClick,
}: {
  title: string;
  count: number;
  orders: any[];
  color: string;
  onOrderClick: (id: string) => void;
}) {
  const colorClasses = {
    amber: 'text-amber-600 dark:text-amber-400',
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
  };

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          {title}
        </h3>
        <span
          className={cn('text-sm font-semibold', colorClasses[color as keyof typeof colorClasses])}
        >
          {count}
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {orders.map((order) => (
          <LabOrderCard key={order.id} order={order} onClick={() => onOrderClick(order.id)} />
        ))}
      </div>
    </div>
  );
}

function QueueTab({ onOrderClick }: { onOrderClick: (id: string) => void }) {
  const today = new Date().toISOString().split('T')[0];
  const { data, isLoading } = useQuery({
    queryKey: ['lab-queue', today],
    queryFn: async () => {
      const res = await fetch(`/api/labs/queue?date=${today}`);
      if (!res.ok) throw new Error('Failed to fetch queue');
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="flex gap-4 overflow-x-auto">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-96 w-72 flex-shrink-0 rounded-xl bg-neutral-100 dark:bg-neutral-800"
            />
          ))}
        </div>
      </div>
    );
  }

  const lanes = data?.lanes || {};
  const laneConfig = [
    { id: 'paid', label: 'Ready for Collection', color: 'green' },
    { id: 'collecting', label: 'Collecting', color: 'blue' },
    { id: 'collected', label: 'Collected', color: 'indigo' },
    { id: 'processing', label: 'Processing', color: 'purple' },
    { id: 'completed', label: 'Completed', color: 'teal' },
    { id: 'verified', label: 'Verified', color: 'emerald' },
  ];

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {laneConfig.map((lane) => (
        <div
          key={lane.id}
          className="w-72 flex-shrink-0 rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950"
        >
          <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-neutral-900 dark:text-white">{lane.label}</h3>
              <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                {lanes[lane.id]?.length || 0}
              </span>
            </div>
          </div>
          <div className="max-h-[500px] space-y-2 overflow-y-auto p-3">
            {(lanes[lane.id] || []).map((order: any) => (
              <LabOrderCard
                key={order.id}
                order={order}
                compact
                onClick={() => onOrderClick(order.id)}
              />
            ))}
            {(lanes[lane.id] || []).length === 0 && (
              <p className="py-8 text-center text-sm text-neutral-400">No orders</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatsTab({ stats }: { stats: any }) {
  if (!stats) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-neutral-500">Loading statistics...</p>
      </div>
    );
  }

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(price);

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {/* Orders */}
      <StatCard title="Orders" icon="📋">
        <div className="space-y-2">
          <StatRow label="Total" value={stats.orders?.total || 0} />
          <StatRow label="Pending Payment" value={stats.orders?.pending_payment || 0} />
          <StatRow label="In Progress" value={stats.orders?.processing || 0} />
          <StatRow label="Completed" value={stats.orders?.completed || 0} />
          <StatRow label="Released" value={stats.orders?.released || 0} />
        </div>
      </StatCard>

      {/* Priority */}
      <StatCard title="Priority" icon="🚨">
        <div className="space-y-2">
          <StatRow label="Routine" value={stats.priority?.routine || 0} />
          <StatRow label="Urgent" value={stats.priority?.urgent || 0} color="orange" />
          <StatRow label="STAT" value={stats.priority?.stat || 0} color="red" />
        </div>
      </StatCard>

      {/* Specimens */}
      <StatCard title="Specimens" icon="🧪">
        <div className="space-y-2">
          <StatRow label="Total" value={stats.specimens?.total || 0} />
          <StatRow label="Pending" value={stats.specimens?.pending || 0} />
          <StatRow label="Collected" value={stats.specimens?.collected || 0} />
          <StatRow label="Rejected" value={stats.specimens?.rejected || 0} color="red" />
        </div>
      </StatCard>

      {/* Revenue */}
      <StatCard title="Revenue" icon="💰">
        <div className="space-y-2">
          <div className="text-2xl font-semibold text-neutral-900 dark:text-white">
            {formatPrice(stats.revenue?.total || 0)}
          </div>
          <StatRow label="Pending" value={formatPrice(stats.revenue?.pending || 0)} />
        </div>
      </StatCard>
    </div>
  );
}

function StatCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <h3 className="font-semibold text-neutral-900 dark:text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function StatRow({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color?: string;
}) {
  const colorClasses = {
    orange: 'text-orange-600 dark:text-orange-400',
    red: 'text-red-600 dark:text-red-400',
  };

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-neutral-600 dark:text-neutral-400">{label}</span>
      <span
        className={cn(
          'font-medium',
          color
            ? colorClasses[color as keyof typeof colorClasses]
            : 'text-neutral-900 dark:text-white',
        )}
      >
        {value}
      </span>
    </div>
  );
}
