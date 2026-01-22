'use client';

import Image from 'next/image';

interface ClaimSlipProps {
  order: {
    id: string;
    orderNumber: string;
    placedAt: string;
    paidAt: string | null;
    totalAmount: number;
    paymentReference: string | null;
    patient: {
      firstName: string;
      lastName: string;
      middleName?: string | null;
      mrn?: string | null;
      phone?: string | null;
      email?: string | null;
    };
    items: Array<{
      testName: string;
      priceSnapshot: number;
    }>;
  };
}

export function ClaimSlip({ order }: ClaimSlipProps) {
  // Add print styles
  const printStyles = `
    @media print {
      * {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      .claim-slip-container {
        max-width: 100%;
        padding: 0.5rem;
        font-size: 11px;
      }
      .claim-slip-container h1 {
        font-size: 16px;
      }
      .claim-slip-container h2 {
        font-size: 14px;
      }
      .claim-slip-container h3 {
        font-size: 11px;
      }
      .claim-slip-container .text-sm {
        font-size: 10px;
      }
      .claim-slip-container .text-xs {
        font-size: 9px;
      }
    }
  `;

  const patientFullName = [
    order.patient.firstName,
    order.patient.middleName,
    order.patient.lastName,
  ]
    .filter(Boolean)
    .join(' ');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-PH', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Manila',
    });
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      <div className="claim-slip-container mx-auto max-w-2xl bg-white p-8">
        {/* Clinic Header */}
        <div className="mb-8 flex items-start gap-4 border-b-2 border-neutral-900 pb-6">
          <Image
            src="/sjd-logo.png"
            alt="San Jose Medical Diagnostics Logo"
            width={80}
            height={80}
            className="rounded"
          />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-neutral-900">
              San Jose Medical Diagnostics & Health Solutions
            </h1>
            <p className="mt-1 text-sm text-neutral-600">Brgy 5, Talakag, Bukidnon</p>
          </div>
        </div>

        {/* Document Title */}
        <div className="mb-6 text-center">
          <h2 className="text-xl font-semibold text-neutral-900">LABORATORY CLAIM SLIP</h2>
          <p className="mt-1 text-sm text-neutral-600">Official Payment Receipt</p>
        </div>

        {/* Order Information */}
        <div className="mb-6 grid grid-cols-2 gap-4 rounded-lg bg-neutral-50 p-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
              Order Number
            </p>
            <p className="mt-1 font-mono text-sm font-semibold text-neutral-900">
              {order.orderNumber}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
              Order Date
            </p>
            <p className="mt-1 text-sm font-semibold text-neutral-900">
              {formatDate(order.placedAt)}
            </p>
          </div>
          {order.paidAt && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                Payment Date
              </p>
              <p className="mt-1 text-sm font-semibold text-neutral-900">
                {formatDate(order.paidAt)}
              </p>
            </div>
          )}
          {order.paymentReference && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                Payment Reference
              </p>
              <p className="mt-1 font-mono text-sm font-semibold text-neutral-900">
                {order.paymentReference}
              </p>
            </div>
          )}
        </div>

        {/* Patient Information */}
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-700">
            Patient Information
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-neutral-600">Name:</span>
              <span className="text-sm font-medium text-neutral-900">{patientFullName}</span>
            </div>
            {order.patient.mrn && (
              <div className="flex justify-between">
                <span className="text-sm text-neutral-600">MRN:</span>
                <span className="font-mono text-sm font-medium text-neutral-900">
                  {order.patient.mrn}
                </span>
              </div>
            )}
            {order.patient.phone && (
              <div className="flex justify-between">
                <span className="text-sm text-neutral-600">Contact:</span>
                <span className="text-sm font-medium text-neutral-900">{order.patient.phone}</span>
              </div>
            )}
            {order.patient.email && (
              <div className="flex justify-between">
                <span className="text-sm text-neutral-600">Email:</span>
                <span className="text-sm font-medium text-neutral-900">{order.patient.email}</span>
              </div>
            )}
          </div>
        </div>

        {/* Test Items */}
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-700">
            Laboratory Tests Ordered
          </h3>
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-300">
                <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-neutral-600">
                  Test Name
                </th>
                <th className="pb-2 text-right text-xs font-medium uppercase tracking-wider text-neutral-600">
                  Price
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {order.items.map((item, index) => (
                <tr key={index}>
                  <td className="py-2 text-sm text-neutral-900">{item.testName}</td>
                  <td className="py-2 text-right text-sm font-medium text-neutral-900">
                    {formatPrice(item.priceSnapshot)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-neutral-900">
                <td className="pt-3 text-sm font-semibold text-neutral-900">TOTAL AMOUNT</td>
                <td className="pt-3 text-right text-lg font-bold text-neutral-900">
                  {formatPrice(order.totalAmount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Payment Confirmation */}
        {order.paidAt && (
          <div className="mb-6 rounded-lg bg-green-50 p-4">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="text-sm font-semibold text-green-900">PAYMENT CONFIRMED</p>
                <p className="text-xs text-green-700">
                  Please proceed to the laboratory for specimen collection
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mb-6 rounded-lg border border-neutral-300 bg-neutral-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-neutral-900">Important Instructions:</h3>
          <ul className="list-inside list-disc space-y-1 text-xs text-neutral-700">
            <li>Present this claim slip to the Medical Technologist</li>
            <li>Follow fasting requirements if applicable</li>
            <li>Results will be available within 24-48 hours</li>
            <li>You will be notified via email/SMS when results are ready</li>
          </ul>
        </div>

        {/* Footer */}
        <div className="mt-8 border-t border-neutral-300 pt-4 text-center">
          <p className="text-xs text-neutral-500">
            This is an official receipt from San Jose Medical Diagnostics & Health Solutions
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            For inquiries, please contact the clinic reception
          </p>
        </div>
      </div>
    </>
  );
}
