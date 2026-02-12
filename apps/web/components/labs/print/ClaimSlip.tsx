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
      dob?: string | null;
      gender?: string | null;
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
      @page {
        size: A4 portrait;
        margin: 0.3cm;
      }
      * {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      body {
        margin: 0;
        padding: 0;
      }
      .claim-slip-wrapper {
        width: 100%;
        max-width: 21cm;
        margin: 0 auto;
      }
      .claim-slip-page {
        page-break-after: avoid;
        page-break-inside: avoid;
        width: 100%;
        height: auto;
        max-height: 13.5cm;
      }
      .claim-slip-container {
        width: 100%;
        padding: 0.2cm 0.5cm;
        font-size: 8px;
        box-sizing: border-box;
      }
      .claim-slip-container h1 {
        font-size: 10px;
      }
      .claim-slip-container h2 {
        font-size: 9px;
      }
      .claim-slip-container h3 {
        font-size: 8px;
      }
      .claim-slip-container .text-sm {
        font-size: 7px;
      }
      .claim-slip-container .text-xs {
        font-size: 6px;
      }
      .cut-line {
        page-break-before: avoid;
        page-break-after: avoid;
        margin: 0.2cm 0;
      }
    }
    @media screen {
      .claim-slip-wrapper {
        max-width: 800px;
        margin: 0 auto;
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

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatDateOfBirth = (dateOfBirth: string) => {
    return new Date(dateOfBirth).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderSlipContent = (copyLabel: string) => (
    <div className="claim-slip-page">
      <div className="claim-slip-container bg-white">
        {/* Clinic Header */}
        <div className="mb-1.5 flex items-start gap-2 border-b border-neutral-900 pb-1.5">
          <Image
            src="/sjd-logo.png"
            alt="San Jose Medical Diagnostics Logo"
            width={40}
            height={40}
            className="rounded"
          />
          <div className="flex-1">
            <h1 className="text-sm font-bold text-neutral-900">
              San Jose Medical Diagnostics & Health Solutions
            </h1>
            <p className="text-[8px] text-neutral-600">Brgy 5, Talakag, Bukidnon</p>
          </div>
        </div>

        {/* Document Title */}
        <div className="mb-1.5 text-center">
          <h2 className="text-xs font-semibold text-neutral-900">LABORATORY CLAIM SLIP</h2>
          <p className="text-[8px] text-neutral-600">Official Payment Receipt</p>
        </div>

        {/* Order Information */}
        <div className="mb-2 grid grid-cols-4 gap-2 rounded bg-neutral-50 p-1.5">
          <div>
            <p className="text-[7px] font-medium uppercase tracking-wider text-neutral-500">
              Order Number
            </p>
            <p className="font-mono text-[8px] font-semibold text-neutral-900">
              {order.orderNumber}
            </p>
          </div>
          <div>
            <p className="text-[7px] font-medium uppercase tracking-wider text-neutral-500">
              Order Date
            </p>
            <p className="text-[8px] font-semibold text-neutral-900">
              {formatDate(order.placedAt)}
            </p>
          </div>
          {order.paidAt && (
            <div>
              <p className="text-[7px] font-medium uppercase tracking-wider text-neutral-500">
                Payment Date
              </p>
              <p className="text-[8px] font-semibold text-neutral-900">
                {formatDate(order.paidAt)}
              </p>
            </div>
          )}
          {order.paymentReference && (
            <div>
              <p className="text-[7px] font-medium uppercase tracking-wider text-neutral-500">
                Payment Ref
              </p>
              <p className="font-mono text-[8px] font-semibold text-neutral-900">
                {order.paymentReference}
              </p>
            </div>
          )}
        </div>

        {/* Patient Information */}
        <div className="mb-2">
          <h3 className="mb-1 text-[8px] font-semibold uppercase tracking-wider text-neutral-700">
            Patient Information
          </h3>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[8px]">
            <span>
              <span className="text-[7px] text-neutral-600">Name: </span>
              <span className="font-medium text-neutral-900">{patientFullName}</span>
            </span>
            {order.patient.dob && (
              <span>
                <span className="text-[7px] text-neutral-600">DOB: </span>
                <span className="font-medium text-neutral-900">
                  {formatDateOfBirth(order.patient.dob)}
                </span>
              </span>
            )}
            {order.patient.dob && (
              <span>
                <span className="text-[7px] text-neutral-600">Age: </span>
                <span className="font-medium text-neutral-900">
                  {calculateAge(order.patient.dob)}
                </span>
              </span>
            )}
            {order.patient.gender && (
              <span>
                <span className="text-[7px] text-neutral-600">Gender: </span>
                <span className="font-medium text-neutral-900">
                  {order.patient.gender === 'M'
                    ? 'Male'
                    : order.patient.gender === 'F'
                      ? 'Female'
                      : order.patient.gender}
                </span>
              </span>
            )}
            {order.patient.mrn && (
              <span>
                <span className="text-[7px] text-neutral-600">MRN: </span>
                <span className="font-mono font-medium text-neutral-900">{order.patient.mrn}</span>
              </span>
            )}
            {order.patient.phone && (
              <span>
                <span className="text-[7px] text-neutral-600">Contact: </span>
                <span className="font-medium text-neutral-900">{order.patient.phone}</span>
              </span>
            )}
            {order.patient.email && (
              <span>
                <span className="text-[7px] text-neutral-600">Email: </span>
                <span className="font-medium text-neutral-900">{order.patient.email}</span>
              </span>
            )}
          </div>
        </div>

        {/* Test Items */}
        <div className="mb-2">
          <h3 className="mb-1 text-[8px] font-semibold uppercase tracking-wider text-neutral-700">
            Laboratory Tests Ordered
          </h3>
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-300">
                <th className="pb-0.5 text-left text-[7px] font-medium uppercase tracking-wider text-neutral-600">
                  Test Name
                </th>
                <th className="pb-0.5 text-right text-[7px] font-medium uppercase tracking-wider text-neutral-600">
                  Price
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {order.items.map((item, index) => (
                <tr key={index}>
                  <td className="py-0.5 text-[8px] text-neutral-900">{item.testName}</td>
                  <td className="py-0.5 text-right text-[8px] font-medium text-neutral-900">
                    {formatPrice(item.priceSnapshot)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-neutral-900">
                <td className="pt-1 text-[8px] font-semibold text-neutral-900">TOTAL AMOUNT</td>
                <td className="pt-1 text-right text-[10px] font-bold text-neutral-900">
                  {formatPrice(order.totalAmount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Payment Confirmation */}
        {order.paidAt && (
          <div className="mb-1 rounded bg-green-50 px-1.5 py-0.5">
            <div className="flex items-center gap-1">
              <svg className="h-2.5 w-2.5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-[8px] font-semibold text-green-900">
                PAYMENT CONFIRMED{' '}
                <span className="font-normal text-green-700">
                  — Please proceed to the laboratory for specimen collection
                </span>
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-1 border-t border-neutral-300 pt-1 text-center">
          <p className="text-[8px] font-semibold text-neutral-900">{copyLabel}</p>
          <p className="text-[7px] text-neutral-500">
            Present this slip to the Medical Technologist &bull; Results available within 24-48
            hours
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      <div className="claim-slip-wrapper">
        <div className="space-y-0">
          {/* Customer Copy */}
          {renderSlipContent('CUSTOMER COPY')}

          {/* Dotted Line Separator */}
          <div className="cut-line my-1 py-1 text-center">
            <div className="border-t-2 border-dashed border-neutral-400"></div>
            <span className="-mt-2.5 inline-block bg-white px-3 text-[9px] text-neutral-400">
              ✂ CUT HERE ✂
            </span>
          </div>

          {/* Laboratory Copy */}
          {renderSlipContent('LABORATORY COPY')}
        </div>
      </div>
    </>
  );
}
