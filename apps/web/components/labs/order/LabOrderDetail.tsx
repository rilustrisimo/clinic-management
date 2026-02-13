'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow, parseISO, format } from 'date-fns';
import {
  X,
  Pencil,
  Trash2,
  Printer,
  FileText,
  AlertCircle,
  CheckCircle2,
  Upload,
  QrCode,
  Mail,
  ChevronRight,
  Loader2,
  Download,
  Eye,
  File,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { OrderStatusBadge, PaymentStatusBadge, PriorityBadge } from '../shared/OrderStatusBadge';
import { ResultsUpload } from '../results/ResultsUpload';

interface LabOrderDetailProps {
  orderId: string;
  onClose: () => void;
  onEdit?: () => void;
}

// Helper to safely parse date
function parseDate(dateValue: string | Date | null | undefined): Date {
  if (!dateValue) return new Date();
  if (dateValue instanceof Date) return dateValue;
  try {
    return parseISO(dateValue);
  } catch {
    return new Date(dateValue);
  }
}

const formatDateTimeManila = (dateValue: string | Date | null | undefined) => {
  const date = parseDate(dateValue);
  return date.toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatPHP = (amount: number | string) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(parseFloat(amount as string) || 0);

// Status flow for progression
const STATUS_FLOW = [
  'pending_payment',
  'paid',
  'collecting',
  'collected',
  'processing',
  'completed',
  'verified',
  'released',
];

const STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Pending Payment',
  paid: 'Paid',
  collecting: 'Collecting Specimens',
  collected: 'Specimens Collected',
  processing: 'Processing',
  completed: 'Completed',
  verified: 'Verified',
  released: 'Released',
  cancelled: 'Cancelled',
};

export function LabOrderDetail({ orderId, onClose, onEdit }: LabOrderDetailProps) {
  const queryClient = useQueryClient();
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showClaimSlip, setShowClaimSlip] = useState(false);

  // Fetch order details
  const {
    data: orderData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['lab-order', orderId],
    queryFn: async () => {
      const res = await fetch(`/api/labs/orders/${orderId}`);
      if (!res.ok) throw new Error('Failed to fetch order');
      return res.json();
    },
  });

  const order = orderData?.data;

  // Confirm payment mutation
  const confirmPaymentMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/labs/orders/${orderId}/confirm-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentReference: `LOYVERSE-${Date.now()}`,
          amount: order?.totalAmount,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to confirm payment');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['lab-orders'] });
      queryClient.invalidateQueries({ queryKey: ['lab-orders-history'] });
      queryClient.invalidateQueries({ queryKey: ['lab-stats'] });
      queryClient.invalidateQueries({ queryKey: ['lab-queue'] });
      setShowPaymentConfirm(false);
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const res = await fetch(`/api/labs/orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update status');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['lab-orders'] });
      queryClient.invalidateQueries({ queryKey: ['lab-orders-history'] });
      queryClient.invalidateQueries({ queryKey: ['lab-stats'] });
      queryClient.invalidateQueries({ queryKey: ['lab-queue'] });
    },
  });

  // Cancel order mutation
  const cancelOrderMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/labs/orders/${orderId}/cancel`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to cancel order');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['lab-orders'] });
      queryClient.invalidateQueries({ queryKey: ['lab-orders-history'] });
      queryClient.invalidateQueries({ queryKey: ['lab-stats'] });
      queryClient.invalidateQueries({ queryKey: ['lab-queue'] });
      setShowCancelConfirm(false);
    },
  });

  // Delete order mutation (only for pending_payment orders)
  const deleteOrderMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/labs/orders/${orderId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete order');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-orders'] });
      queryClient.invalidateQueries({ queryKey: ['lab-orders-history'] });
      queryClient.invalidateQueries({ queryKey: ['lab-stats'] });
      queryClient.invalidateQueries({ queryKey: ['lab-queue'] });
      onClose();
    },
  });

  // Get next status in flow
  const getNextStatus = (currentStatus: string): string | null => {
    const currentIndex = STATUS_FLOW.indexOf(currentStatus);
    if (currentIndex === -1 || currentIndex >= STATUS_FLOW.length - 1) return null;
    return STATUS_FLOW[currentIndex + 1];
  };

  const canEdit = order?.status === 'pending_payment';
  const canDelete = order?.status === 'pending_payment';
  const canCancel = order?.status !== 'cancelled' && order?.status !== 'released';
  const isPaid = order?.paymentStatus === 'paid';
  const nextStatus = order ? getNextStatus(order.status) : null;

  // Build patient name
  const patientName = order?.patient
    ? `${order.patient.lastName}, ${order.patient.firstName}${order.patient.middleName ? ` ${order.patient.middleName.charAt(0)}.` : ''}`
    : 'Unknown Patient';

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative ml-auto flex h-full w-full max-w-2xl flex-col bg-white shadow-xl dark:bg-neutral-900">
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="fixed inset-0 z-50 flex">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative ml-auto flex h-full w-full max-w-2xl flex-col bg-white shadow-xl dark:bg-neutral-900">
          <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <p className="text-neutral-600 dark:text-neutral-400">Failed to load order details</p>
            <button
              onClick={onClose}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Panel */}
      <div className="relative ml-auto flex h-full w-full max-w-2xl flex-col bg-white shadow-xl dark:bg-neutral-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                {order.orderNumber}
              </h2>
              {order.priority !== 'routine' && <PriorityBadge priority={order.priority} />}
            </div>
            <p className="mt-1 text-sm text-neutral-500">
              {formatDistanceToNow(parseDate(order.placedAt), { addSuffix: true })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={onEdit}
                className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
                title="Edit Order"
              >
                <Pencil className="h-5 w-5" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="rounded-lg p-2 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                title="Delete Order"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Status Section */}
          <div className="border-b border-neutral-200 bg-neutral-50 px-6 py-4 dark:border-neutral-800 dark:bg-neutral-950">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <OrderStatusBadge status={order.status} />
                <PaymentStatusBadge status={order.paymentStatus} />
              </div>
              <div className="text-right">
                {order.discountAmount && order.discountAmount > 0 ? (
                  <div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      Subtotal: {formatPHP(order.subtotal || order.totalAmount)}
                    </div>
                    <div className="text-xs text-green-600 dark:text-green-400">
                      {order.discountName} -{formatPHP(order.discountAmount)}
                    </div>
                    <div className="text-lg font-semibold text-neutral-900 dark:text-white">
                      {formatPHP(order.totalAmount)}
                    </div>
                  </div>
                ) : (
                  <span className="text-lg font-semibold text-neutral-900 dark:text-white">
                    {formatPHP(order.totalAmount)}
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons based on status */}
            <div className="mt-4 flex flex-wrap gap-2">
              {/* Confirm Payment Button */}
              {order.status === 'pending_payment' && (
                <button
                  onClick={() => setShowPaymentConfirm(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Confirm Payment
                </button>
              )}

              {/* View/Print Claim Slip (after payment) */}
              {isPaid && (
                <a
                  href={`/labs/orders/${orderId}/claim-slip`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  <FileText className="h-4 w-4" />
                  View Claim Slip
                </a>
              )}

              {/* Progress to Next Status */}
              {nextStatus && order.status !== 'pending_payment' && (
                <button
                  onClick={() => updateStatusMutation.mutate(nextStatus)}
                  disabled={updateStatusMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
                >
                  {updateStatusMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  Mark as {STATUS_LABELS[nextStatus]}
                </button>
              )}

              {/* Cancel Order */}
              {canCancel && (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                >
                  Cancel Order
                </button>
              )}
            </div>
          </div>

          {/* Patient Info */}
          <div className="border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Patient Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-neutral-500">Name</p>
                <p className="font-medium text-neutral-900 dark:text-white">{patientName}</p>
              </div>
              {order.patient?.mrn && (
                <div>
                  <p className="text-sm text-neutral-500">MRN</p>
                  <p className="font-medium text-neutral-900 dark:text-white">
                    {order.patient.mrn}
                  </p>
                </div>
              )}
              {order.patient?.phone && (
                <div>
                  <p className="text-sm text-neutral-500">Phone</p>
                  <p className="font-medium text-neutral-900 dark:text-white">
                    {order.patient.phone}
                  </p>
                </div>
              )}
              {order.patient?.email && (
                <div>
                  <p className="text-sm text-neutral-500">Email</p>
                  <p className="font-medium text-neutral-900 dark:text-white">
                    {order.patient.email}
                  </p>
                </div>
              )}
              {order.patient?.dob && (
                <div>
                  <p className="text-sm text-neutral-500">Date of Birth</p>
                  <p className="font-medium text-neutral-900 dark:text-white">
                    {format(parseDate(order.patient.dob), 'MMM d, yyyy')}
                  </p>
                </div>
              )}
              {order.patient?.gender && (
                <div>
                  <p className="text-sm text-neutral-500">Gender</p>
                  <p className="font-medium capitalize text-neutral-900 dark:text-white">
                    {order.patient.gender}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Order Items */}
          <div className="border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Ordered Tests ({order.items?.length || 0})
            </h3>
            <div className="space-y-2">
              {(order.items || []).map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-800"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300">
                        {item.testCode}
                      </span>
                      <span className="text-xs text-neutral-500">{item.section}</span>
                    </div>
                    <p className="mt-1 font-medium text-neutral-900 dark:text-white">
                      {item.testName}
                    </p>
                  </div>
                  <span className="font-medium text-neutral-900 dark:text-white">
                    {formatPHP(item.priceSnapshot)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Notes
              </h3>
              <p className="text-sm text-neutral-700 dark:text-neutral-300">{order.notes}</p>
            </div>
          )}

          {/* Results Section (for paid and beyond orders - allows file upload after payment) */}
          {[
            'paid',
            'collecting',
            'collected',
            'processing',
            'completed',
            'verified',
            'released',
          ].includes(order.status) && (
            <ResultsSection orderId={orderId} order={order} queryClient={queryClient} />
          )}

          {/* Order Timeline */}
          <div className="px-6 py-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Timeline
            </h3>
            <div className="space-y-3">
              {order.timeline && order.timeline.length > 0 ? (
                // Display timeline from database if available
                order.timeline
                  .sort(
                    (a: any, b: any) =>
                      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
                  )
                  .map((event: any) => (
                    <TimelineItem
                      key={event.id}
                      label={STATUS_LABELS[event.status] || event.status}
                      time={event.timestamp}
                      notes={event.notes}
                    />
                  ))
              ) : (
                // Fallback to manual timeline entries
                <>
                  <TimelineItem label="Order Created" time={order.placedAt} />
                  {order.paidAt && <TimelineItem label="Payment Confirmed" time={order.paidAt} />}
                  {order.updatedAt !== order.createdAt && (
                    <TimelineItem label="Last Updated" time={order.updatedAt} />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Confirmation Modal */}
      {showPaymentConfirm && (
        <ConfirmModal
          title="Confirm Payment"
          message="Please ensure that the payment has been completed in Loyverse POS before confirming. This action will mark the order as paid and allow specimen collection to proceed."
          confirmLabel="Yes, Payment Received"
          confirmVariant="success"
          isLoading={confirmPaymentMutation.isPending}
          onConfirm={() => confirmPaymentMutation.mutate()}
          onCancel={() => setShowPaymentConfirm(false)}
        />
      )}

      {/* Cancel Order Modal */}
      {showCancelConfirm && (
        <ConfirmModal
          title="Cancel Order"
          message="Are you sure you want to cancel this order? This action cannot be undone."
          confirmLabel="Yes, Cancel Order"
          confirmVariant="danger"
          isLoading={cancelOrderMutation.isPending}
          onConfirm={() => cancelOrderMutation.mutate()}
          onCancel={() => setShowCancelConfirm(false)}
        />
      )}

      {/* Delete Order Modal */}
      {showDeleteConfirm && (
        <ConfirmModal
          title="Delete Order"
          message="Are you sure you want to delete this order? This will permanently remove the order and cannot be undone."
          confirmLabel="Yes, Delete Order"
          confirmVariant="danger"
          isLoading={deleteOrderMutation.isPending}
          onConfirm={() => deleteOrderMutation.mutate()}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {/* Claim Slip Modal */}
      {showClaimSlip && order && (
        <ClaimSlipModal order={order} onClose={() => setShowClaimSlip(false)} />
      )}
    </div>
  );
}

function TimelineItem({ label, time, notes }: { label: string; time: string; notes?: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-neutral-400" />
      <div className="flex-1">
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</p>
        <p className="text-xs text-neutral-500">{formatDateTimeManila(time)}</p>
        {notes && <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{notes}</p>}
      </div>
    </div>
  );
}

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant: 'success' | 'danger';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmModal({
  title,
  message,
  confirmLabel,
  confirmVariant,
  isLoading,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-neutral-800">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{title}</h3>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50',
              confirmVariant === 'success'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-red-600 hover:bg-red-700',
            )}
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ClaimSlipModalProps {
  order: any;
  onClose: () => void;
}

function ClaimSlipModal({ order, onClose }: ClaimSlipModalProps) {
  const patientName = order.patient
    ? `${order.patient.lastName}, ${order.patient.firstName}${order.patient.middleName ? ` ${order.patient.middleName.charAt(0)}.` : ''}`
    : 'Unknown Patient';

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Claim Slip - ${order.orderNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 400px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 15px; }
          .logo { width: 80px; height: 80px; margin: 0 auto 10px; }
          .logo img { width: 100%; height: 100%; object-fit: contain; }
          .clinic-name { font-size: 14px; font-weight: bold; margin-bottom: 2px; }
          .clinic-address { font-size: 11px; color: #666; }
          .title { font-size: 16px; font-weight: bold; margin: 15px 0; text-transform: uppercase; }
          .order-number { font-size: 20px; font-weight: bold; text-align: center; background: #f0f0f0; padding: 10px; margin: 15px 0; border-radius: 4px; }
          .section { margin-bottom: 15px; }
          .section-title { font-size: 10px; text-transform: uppercase; color: #666; margin-bottom: 5px; font-weight: bold; }
          .patient-name { font-size: 14px; font-weight: bold; }
          .info-row { display: flex; justify-content: space-between; font-size: 12px; margin: 3px 0; }
          .tests { margin: 15px 0; }
          .test-item { display: flex; justify-content: space-between; font-size: 11px; padding: 5px 0; border-bottom: 1px dashed #ddd; }
          .total { display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; margin-top: 10px; padding-top: 10px; border-top: 2px solid #000; }
          .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #ddd; padding-top: 15px; }
          .paid-stamp { text-align: center; margin: 15px 0; padding: 8px; background: #d4edda; border: 2px solid #28a745; border-radius: 4px; color: #155724; font-weight: bold; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">
            <img src="/sjd-logo.png" alt="Logo" />
          </div>
          <div class="clinic-name">San Jose Medical Diagnostics & Health Solutions</div>
          <div class="clinic-address">Brgy 5, Talakag, Bukidnon</div>
        </div>

        <div class="title" style="text-align: center;">Patient Claim Slip</div>

        <div class="order-number">${order.orderNumber}</div>

        <div class="section">
          <div class="section-title">Patient Information</div>
          <div class="patient-name">${patientName}</div>
          ${order.patient?.mrn ? `<div class="info-row"><span>MRN:</span><span>${order.patient.mrn}</span></div>` : ''}
          ${order.patient?.phone ? `<div class="info-row"><span>Phone:</span><span>${order.patient.phone}</span></div>` : ''}
        </div>

        <div class="section">
          <div class="section-title">Order Details</div>
          <div class="info-row"><span>Date:</span><span>${formatDateTimeManila(order.placedAt)}</span></div>
          <div class="info-row"><span>Priority:</span><span style="text-transform: capitalize;">${order.priority}</span></div>
        </div>

        <div class="tests">
          <div class="section-title">Tests Ordered</div>
          ${(order.items || [])
            .map(
              (item: any) => `
            <div class="test-item">
              <span>${item.testCode} - ${item.testName}</span>
              <span>${formatPHP(item.priceSnapshot)}</span>
            </div>
          `,
            )
            .join('')}
        </div>

        <div class="total">
          <span>TOTAL</span>
          <span>${formatPHP(order.totalAmount)}</span>
        </div>

        ${
          order.paymentStatus === 'paid'
            ? `
          <div class="paid-stamp">
            PAID - ${order.paidAt ? formatDateTimeManila(order.paidAt) : 'Confirmed'}
          </div>
        `
            : ''
        }

        <div class="footer">
          <p>Please present this slip at the laboratory.</p>
          <p style="margin-top: 5px;">Thank you for choosing San Jose Medical Diagnostics.</p>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white shadow-xl dark:bg-neutral-800">
        {/* Preview Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-800">
          <h3 className="font-semibold text-neutral-900 dark:text-white">Claim Slip Preview</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Claim Slip Preview */}
        <div className="p-6">
          {/* Header */}
          <div className="mb-4 border-b-2 border-neutral-900 pb-4 text-center dark:border-neutral-300">
            <div className="mx-auto mb-2 h-16 w-16">
              <img src="/sjd-logo.png" alt="Logo" className="h-full w-full object-contain" />
            </div>
            <h1 className="text-sm font-bold text-neutral-900 dark:text-white">
              San Jose Medical Diagnostics & Health Solutions
            </h1>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Brgy 5, Talakag, Bukidnon
            </p>
          </div>

          <h2 className="mb-4 text-center text-base font-bold uppercase text-neutral-900 dark:text-white">
            Patient Claim Slip
          </h2>

          {/* Order Number */}
          <div className="mb-4 rounded-lg bg-neutral-100 p-3 text-center dark:bg-neutral-700">
            <span className="text-xl font-bold text-neutral-900 dark:text-white">
              {order.orderNumber}
            </span>
          </div>

          {/* Patient Info */}
          <div className="mb-4">
            <p className="mb-1 text-[10px] font-bold uppercase text-neutral-500">
              Patient Information
            </p>
            <p className="font-semibold text-neutral-900 dark:text-white">{patientName}</p>
            {order.patient?.mrn && (
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500">MRN:</span>
                <span className="text-neutral-900 dark:text-white">{order.patient.mrn}</span>
              </div>
            )}
          </div>

          {/* Order Details */}
          <div className="mb-4">
            <p className="mb-1 text-[10px] font-bold uppercase text-neutral-500">Order Details</p>
            <div className="flex justify-between text-xs">
              <span className="text-neutral-500">Date:</span>
              <span className="text-neutral-900 dark:text-white">
                {formatDateTimeManila(order.placedAt)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-neutral-500">Priority:</span>
              <span className="capitalize text-neutral-900 dark:text-white">{order.priority}</span>
            </div>
          </div>

          {/* Tests */}
          <div className="mb-4">
            <p className="mb-2 text-[10px] font-bold uppercase text-neutral-500">Tests Ordered</p>
            <div className="space-y-1">
              {(order.items || []).map((item: any) => (
                <div
                  key={item.id}
                  className="flex justify-between border-b border-dashed border-neutral-200 py-1 text-xs dark:border-neutral-600"
                >
                  <span className="text-neutral-700 dark:text-neutral-300">
                    {item.testCode} - {item.testName}
                  </span>
                  <span className="text-neutral-900 dark:text-white">
                    {formatPHP(item.priceSnapshot)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-between border-t-2 border-neutral-900 pt-2 dark:border-neutral-300">
            <span className="font-bold text-neutral-900 dark:text-white">TOTAL</span>
            <span className="font-bold text-neutral-900 dark:text-white">
              {formatPHP(order.totalAmount)}
            </span>
          </div>

          {/* Paid Stamp */}
          {order.paymentStatus === 'paid' && (
            <div className="mt-4 rounded-lg border-2 border-green-600 bg-green-50 p-2 text-center dark:bg-green-900/20">
              <span className="font-bold text-green-700 dark:text-green-400">
                PAID - {order.paidAt ? formatDateTimeManila(order.paidAt) : 'Confirmed'}
              </span>
            </div>
          )}

          {/* Footer */}
          <div className="mt-4 border-t border-neutral-200 pt-3 text-center text-[10px] text-neutral-500 dark:border-neutral-700">
            <p>Please present this slip at the laboratory.</p>
            <p className="mt-1">Thank you for choosing San Jose Medical Diagnostics.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ResultsSectionProps {
  orderId: string;
  order: any;
  queryClient: any;
}

function ResultsSection({ orderId, order, queryClient }: ResultsSectionProps) {
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Fetch files for this order
  const { data: filesData, isLoading: filesLoading } = useQuery({
    queryKey: ['lab-order-files', orderId],
    queryFn: async () => {
      const res = await fetch(`/api/labs/orders/${orderId}/files`);
      if (!res.ok) throw new Error('Failed to fetch files');
      return res.json();
    },
  });

  const files = filesData?.files || [];

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      const res = await fetch(`/api/labs/orders/${orderId}/files/${fileId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete file');
      }

      queryClient.invalidateQueries({ queryKey: ['lab-order-files', orderId] });
    } catch (error) {
      console.error('Delete error:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete file');
    }
  };

  const handleDownloadFile = async (fileId: string, fileName: string) => {
    try {
      const res = await fetch(`/api/labs/orders/${orderId}/files/${fileId}`);
      if (!res.ok) throw new Error('Failed to get file');

      const data = await res.json();
      if (data.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download file');
    }
  };

  const handleGenerateQR = async () => {
    try {
      const res = await fetch(`/api/labs/orders/${orderId}/generate-token`, {
        method: 'POST',
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to generate QR code');
      }

      const data = await res.json();
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/results/${data.token}`;
      setQrCodeUrl(url);
      setShowQRCode(true);
    } catch (error) {
      console.error('QR generation error:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate QR code');
    }
  };

  const handleSendEmail = async () => {
    if (!order.patient?.email) {
      alert('Patient does not have an email address');
      return;
    }

    setIsSendingEmail(true);
    try {
      const res = await fetch(`/api/labs/orders/${orderId}/send-email`, {
        method: 'POST',
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to send email');
      }

      alert('Email sent successfully!');
    } catch (error) {
      console.error('Email error:', error);
      alert(error instanceof Error ? error.message : 'Failed to send email');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('image')) return '🖼️';
    return '📎';
  };

  return (
    <div className="border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
        Results & Reports
      </h3>

      {/* Uploaded Files */}
      {filesLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
        </div>
      ) : files.length > 0 ? (
        <div className="mb-4 space-y-2">
          {files.map((file: any) => (
            <div
              key={file.id}
              className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{getFileIcon(file.fileType)}</span>
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">
                    {file.originalName}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {formatFileSize(file.fileSize)} •{' '}
                    {format(parseDate(file.uploadedAt), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleDownloadFile(file.id, file.originalName)}
                  className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700 dark:hover:bg-neutral-700 dark:hover:text-neutral-300"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteFile(file.id)}
                  className="rounded-lg p-2 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mb-4 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4 text-center dark:border-neutral-700 dark:bg-neutral-800">
          <File className="mx-auto h-8 w-8 text-neutral-400" />
          <p className="mt-2 text-sm text-neutral-500">No files uploaded yet</p>
        </div>
      )}

      {/* Upload Results Component */}
      <div className="mb-4">
        <ResultsUpload orderId={orderId} />
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={handleGenerateQR}
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          <QrCode className="h-4 w-4" />
          Generate QR Code
        </button>
        {order.patient?.email && (
          <button
            onClick={handleSendEmail}
            disabled={isSendingEmail}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            {isSendingEmail ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            Send to Email
          </button>
        )}
      </div>

      {/* QR Code Modal */}
      {showQRCode && qrCodeUrl && (
        <QRCodeModal url={qrCodeUrl} onClose={() => setShowQRCode(false)} />
      )}
    </div>
  );
}

interface QRCodeModalProps {
  url: string;
  onClose: () => void;
}

function QRCodeModal({ url, onClose }: QRCodeModalProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-neutral-800">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Results QR Code
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 flex flex-col items-center">
          {/* QR Code Image using API */}
          <div className="rounded-lg bg-white p-4">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`}
              alt="QR Code"
              className="h-48 w-48"
            />
          </div>

          <p className="mt-4 text-center text-sm text-neutral-600 dark:text-neutral-400">
            Scan this QR code to view lab results
          </p>

          <div className="mt-4 flex w-full gap-2">
            <input
              type="text"
              value={url}
              readOnly
              className="flex-1 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
            />
            <button
              onClick={handleCopy}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
            >
              Copy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
