'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ClaimSlip } from '@/components/labs/print/ClaimSlip';
import { use } from 'react';

// Print styles to ensure only slip is printed
const printStyles = `
  @media print {
    @page {
      size: A4;
      margin: 0.5cm;
    }
    body {
      margin: 0;
      padding: 0;
    }
    body * {
      visibility: hidden;
    }
    .print-area, .print-area * {
      visibility: visible;
    }
    .print-area {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
    }
  }
`;

export default function ClaimSlipPage() {
  const params = useParams();
  const orderId = params.id as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ['lab-order-claim-slip', orderId],
    queryFn: async () => {
      const res = await fetch(`/api/labs/orders/${orderId}/claim-slip`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to fetch claim slip');
      }
      return res.json();
    },
  });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-900"></div>
          <p className="mt-4 text-sm text-neutral-600">Loading claim slip...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-neutral-900">Error Loading Claim Slip</h2>
          <p className="mt-2 text-sm text-neutral-600">
            {error instanceof Error ? error.message : 'An error occurred'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      <div className="min-h-screen bg-neutral-100">
        {/* Print Button - Hidden when printing */}
        <div className="sticky top-0 z-10 border-b border-neutral-300 bg-white px-6 py-4 print:hidden">
          <div className="mx-auto flex max-w-2xl items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-neutral-900">Laboratory Claim Slip</h1>
              <p className="text-sm text-neutral-600">{data.order.orderNumber}</p>
            </div>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              Print Claim Slip
            </button>
          </div>
        </div>

        {/* Claim Slip Content */}
        <div className="print-area py-8">
          <ClaimSlip order={data.order} />
        </div>
      </div>
    </>
  );
}
