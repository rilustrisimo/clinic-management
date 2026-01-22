'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { FileText, Download, AlertCircle, CheckCircle2, Clock, Loader2, File } from 'lucide-react';

interface LabOrder {
  id: string;
  orderNumber: string;
  status: string;
  priority: string;
  placedAt: string;
  paidAt?: string;
  totalAmount: number;
  patient: {
    firstName: string;
    lastName: string;
    middleName?: string;
    mrn?: string;
  };
  items: Array<{
    id: string;
    testCode: string;
    testName: string;
    section: string;
    priceSnapshot: number;
  }>;
}

interface ResultFile {
  id: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  paid: { label: 'Paid - Awaiting Collection', color: 'bg-green-100 text-green-800' },
  collecting: { label: 'Collecting Specimens', color: 'bg-blue-100 text-blue-800' },
  collected: { label: 'Specimens Collected', color: 'bg-indigo-100 text-indigo-800' },
  processing: { label: 'Processing', color: 'bg-purple-100 text-purple-800' },
  completed: { label: 'Results Ready', color: 'bg-teal-100 text-teal-800' },
  verified: { label: 'Results Verified', color: 'bg-emerald-100 text-emerald-800' },
  released: { label: 'Results Released', color: 'bg-gray-100 text-gray-800' },
};

export default function PublicResultsPage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<LabOrder | null>(null);
  const [files, setFiles] = useState<ResultFile[]>([]);

  useEffect(() => {
    async function fetchResults() {
      try {
        const res = await fetch(`/api/labs/results/view/${token}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch results');
        }

        setOrder(data.order);
        setFiles(data.files || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      fetchResults();
    }
  }, [token]);

  const formatPHP = (amount: number) =>
    new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);

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

  const handleDownload = async (fileId: string) => {
    try {
      const res = await fetch(`/api/labs/results/view/${token}/files/${fileId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to get download link');
      }

      if (data.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to download file');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-neutral-400" />
          <p className="mt-4 text-neutral-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
        <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-lg">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h1 className="mt-4 text-xl font-semibold text-neutral-900">Unable to Load Results</h1>
          <p className="mt-2 text-neutral-600">{error}</p>
          <p className="mt-4 text-sm text-neutral-500">
            This link may have expired or been revoked. Please contact the clinic for assistance.
          </p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
        <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-lg">
          <AlertCircle className="mx-auto h-12 w-12 text-amber-500" />
          <h1 className="mt-4 text-xl font-semibold text-neutral-900">Results Not Found</h1>
          <p className="mt-2 text-neutral-600">
            No results found for this link. The link may be invalid or expired.
          </p>
        </div>
      </div>
    );
  }

  const patientName = `${order.patient.lastName}, ${order.patient.firstName}${order.patient.middleName ? ` ${order.patient.middleName.charAt(0)}.` : ''}`;
  const statusInfo = STATUS_LABELS[order.status] || {
    label: order.status,
    color: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="min-h-screen bg-neutral-50 py-8">
      <div className="mx-auto max-w-2xl px-4">
        {/* Header */}
        <div className="mb-6 text-center">
          <img src="/sjd-logo.png" alt="Logo" className="mx-auto h-16 w-16" />
          <h1 className="mt-2 text-lg font-bold text-neutral-900">
            San Jose Medical Diagnostics & Health Solutions
          </h1>
          <p className="text-sm text-neutral-600">Brgy 5, Talakag, Bukidnon</p>
        </div>

        {/* Order Card */}
        <div className="rounded-xl bg-white shadow-lg">
          {/* Order Header */}
          <div className="border-b border-neutral-200 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-neutral-900">{order.orderNumber}</h2>
                <p className="mt-1 text-sm text-neutral-600">{patientName}</p>
                {order.patient.mrn && (
                  <p className="text-xs text-neutral-500">MRN: {order.patient.mrn}</p>
                )}
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </div>
          </div>

          {/* Status Timeline */}
          <div className="border-b border-neutral-200 bg-neutral-50 p-6">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-neutral-400" />
              <div>
                <p className="text-sm text-neutral-600">Order Date</p>
                <p className="font-medium text-neutral-900">
                  {format(new Date(order.placedAt), 'MMMM d, yyyy h:mm a')}
                </p>
              </div>
            </div>
            {order.paidAt && (
              <div className="mt-3 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-neutral-600">Payment Confirmed</p>
                  <p className="font-medium text-neutral-900">
                    {format(new Date(order.paidAt), 'MMMM d, yyyy h:mm a')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Tests Ordered */}
          <div className="border-b border-neutral-200 p-6">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Tests Ordered
            </h3>
            <div className="space-y-2">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg bg-neutral-50 px-4 py-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-700">
                        {item.testCode}
                      </span>
                      <span className="text-xs text-neutral-500">{item.section}</span>
                    </div>
                    <p className="mt-1 font-medium text-neutral-900">{item.testName}</p>
                  </div>
                  <span className="font-medium text-neutral-700">
                    {formatPHP(item.priceSnapshot)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-between border-t border-neutral-200 pt-4">
              <span className="font-semibold text-neutral-900">Total</span>
              <span className="font-semibold text-neutral-900">{formatPHP(order.totalAmount)}</span>
            </div>
          </div>

          {/* Results Files */}
          <div className="p-6">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Results & Reports
            </h3>

            {files.length > 0 ? (
              <div className="space-y-2">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getFileIcon(file.fileType)}</span>
                      <div>
                        <p className="font-medium text-neutral-900">{file.originalName}</p>
                        <p className="text-xs text-neutral-500">
                          {formatFileSize(file.fileSize)} • Uploaded{' '}
                          {format(new Date(file.uploadedAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownload(file.id)}
                      className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
                <File className="mx-auto h-10 w-10 text-neutral-400" />
                <p className="mt-3 font-medium text-neutral-700">No Results Available Yet</p>
                <p className="mt-1 text-sm text-neutral-500">
                  Results will appear here once they are ready.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-neutral-500">
          <p>This is a secure link. Do not share with others.</p>
          <p className="mt-1">For questions, please contact the clinic directly.</p>
        </div>
      </div>
    </div>
  );
}
