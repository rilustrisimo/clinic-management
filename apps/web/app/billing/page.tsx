import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Billing | Clinic Management',
  description: 'Billing, invoices, and payments',
};

export default function BillingPage() {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-white px-6 py-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">
              Billing
            </h1>
            <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
              Invoices, payments, and checkout
            </p>
          </div>
          <button className="h-8 rounded-lg bg-neutral-900 px-4 text-[11px] font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100">
            + New Invoice
          </button>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="border-b border-neutral-200 bg-neutral-50 px-6 py-3 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex items-center gap-2">
          <button className="h-7 rounded-lg bg-white px-3 text-[11px] font-medium text-neutral-900 shadow-sm ring-1 ring-neutral-900/10 dark:bg-neutral-900 dark:text-white dark:ring-white/10">
            Ready for Checkout
          </button>
          <button className="h-7 rounded-lg px-3 text-[11px] font-medium text-neutral-600 hover:bg-white dark:text-neutral-400 dark:hover:bg-neutral-900">
            Unpaid
          </button>
          <button className="h-7 rounded-lg px-3 text-[11px] font-medium text-neutral-600 hover:bg-white dark:text-neutral-400 dark:hover:bg-neutral-900">
            Paid
          </button>
          <button className="h-7 rounded-lg px-3 text-[11px] font-medium text-neutral-600 hover:bg-white dark:text-neutral-400 dark:hover:bg-neutral-900">
            All Invoices
          </button>
        </div>
      </div>

      {/* Billing Content */}
      <div className="flex-1 overflow-auto bg-white p-6 dark:bg-neutral-900">
        <div className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
              <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Today&apos;s Revenue
              </div>
              <div className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-white">
                ₱0.00
              </div>
            </div>
            
            <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
              <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Pending
              </div>
              <div className="mt-2 text-2xl font-semibold text-orange-600 dark:text-orange-400">
                ₱0.00
              </div>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
              <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                This Month
              </div>
              <div className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-white">
                ₱0.00
              </div>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
              <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Outstanding
              </div>
              <div className="mt-2 text-2xl font-semibold text-red-600 dark:text-red-400">
                ₱0.00
              </div>
            </div>
          </div>

          {/* Ready for Checkout Queue */}
          <div>
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Ready for Checkout
            </h2>
            
            <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center dark:border-neutral-700 dark:bg-neutral-900/50">
              <div className="text-4xl">💳</div>
              <p className="mt-3 text-sm font-medium text-neutral-900 dark:text-white">
                No Pending Checkouts
              </p>
              <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                Visits ready for checkout will appear here
              </p>
            </div>
          </div>

          {/* Billing Features Overview */}
          <div className="mt-8 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-8 dark:border-neutral-700 dark:bg-neutral-900/50">
            <div className="text-center">
              <div className="text-4xl">🧾</div>
              <p className="mt-3 text-sm font-medium text-neutral-900 dark:text-white">
                Full Billing Module Coming Soon
              </p>
              <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                Late-checkout billing with provisional charges, pricing snapshots, and payments
              </p>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
                <div className="text-xl">📋</div>
                <h3 className="mt-2 text-[11px] font-semibold text-neutral-900 dark:text-white">
                  Provisional Charges
                </h3>
                <p className="mt-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                  Add charges during visit: consult, labs, procedures, supplies
                </p>
              </div>

              <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
                <div className="text-xl">💰</div>
                <h3 className="mt-2 text-[11px] font-semibold text-neutral-900 dark:text-white">
                  Price Snapshots
                </h3>
                <p className="mt-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                  Capture pricing and COGS at time of charge
                </p>
              </div>

              <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
                <div className="text-xl">🧾</div>
                <h3 className="mt-2 text-[11px] font-semibold text-neutral-900 dark:text-white">
                  Checkout & Receipts
                </h3>
                <p className="mt-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                  Finalize invoice, accept payments (cash/card/e-wallet)
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-2 text-[10px] text-neutral-500 dark:text-neutral-400">
              <span className="rounded-full bg-neutral-200 px-2 py-1 dark:bg-neutral-800">Discounts</span>
              <span className="rounded-full bg-neutral-200 px-2 py-1 dark:bg-neutral-800">Overrides</span>
              <span className="rounded-full bg-neutral-200 px-2 py-1 dark:bg-neutral-800">Split Payments</span>
              <span className="rounded-full bg-neutral-200 px-2 py-1 dark:bg-neutral-800">Receipts</span>
              <span className="rounded-full bg-neutral-200 px-2 py-1 dark:bg-neutral-800">Refunds</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
