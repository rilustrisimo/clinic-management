import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Laboratory | Clinic Management',
  description: 'Laboratory orders and results',
};

export default function LabsPage() {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-white px-6 py-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">
              Laboratory
            </h1>
            <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
              Lab orders, specimens, and results
            </p>
          </div>
          <button className="h-8 rounded-lg bg-neutral-900 px-4 text-[11px] font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100">
            + New Lab Order
          </button>
        </div>
      </div>

      {/* Lab Lanes Navigation */}
      <div className="border-b border-neutral-200 bg-neutral-50 px-6 py-3 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex items-center gap-2">
          <button className="h-7 rounded-lg bg-white px-3 text-[11px] font-medium text-neutral-900 shadow-sm ring-1 ring-neutral-900/10 dark:bg-neutral-900 dark:text-white dark:ring-white/10">
            Orders
          </button>
          <button className="h-7 rounded-lg px-3 text-[11px] font-medium text-neutral-600 hover:bg-white dark:text-neutral-400 dark:hover:bg-neutral-900">
            Receiving
          </button>
          <button className="h-7 rounded-lg px-3 text-[11px] font-medium text-neutral-600 hover:bg-white dark:text-neutral-400 dark:hover:bg-neutral-900">
            Analysis
          </button>
          <button className="h-7 rounded-lg px-3 text-[11px] font-medium text-neutral-600 hover:bg-white dark:text-neutral-400 dark:hover:bg-neutral-900">
            Verification
          </button>
          <button className="h-7 rounded-lg px-3 text-[11px] font-medium text-neutral-600 hover:bg-white dark:text-neutral-400 dark:hover:bg-neutral-900">
            Results
          </button>
        </div>
      </div>

      {/* Lab Orders List */}
      <div className="flex-1 overflow-auto bg-white p-6 dark:bg-neutral-900">
        <div className="space-y-4">
          {/* Section: Today's Orders */}
          <div>
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Today&apos;s Orders
            </h2>
            
            {/* Coming Soon Placeholder */}
            <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center dark:border-neutral-700 dark:bg-neutral-900/50">
              <div className="text-4xl">🔬</div>
              <p className="mt-3 text-sm font-medium text-neutral-900 dark:text-white">
                No Lab Orders Yet
              </p>
              <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                Lab orders will appear here when created
              </p>
            </div>
          </div>

          {/* Quick Picks Reference */}
          <div className="mt-8">
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Quick Picks
            </h2>
            
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {[
                { name: 'CBC', icon: '🩸', desc: 'Complete Blood Count' },
                { name: 'UA', icon: '💧', desc: 'Urinalysis' },
                { name: 'FBS', icon: '🍬', desc: 'Fasting Blood Sugar' },
                { name: 'Lipid Panel', icon: '📊', desc: 'Cholesterol & Triglycerides' },
                { name: 'HbA1c', icon: '🔬', desc: 'Glycated Hemoglobin' },
                { name: 'Pregnancy Test', icon: '🤰', desc: 'hCG Qualitative' },
                { name: 'HBsAg', icon: '🦠', desc: 'Hepatitis B Surface Antigen' },
                { name: 'Drug Test', icon: '💊', desc: '5-Panel Drug Screen' },
              ].map((test) => (
                <div
                  key={test.name}
                  className="rounded-xl border border-neutral-200 bg-white p-3 transition-all hover:border-neutral-300 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700"
                >
                  <div className="text-2xl">{test.icon}</div>
                  <h3 className="mt-2 font-semibold text-neutral-900 dark:text-white">
                    {test.name}
                  </h3>
                  <p className="mt-0.5 text-[10px] text-neutral-500 dark:text-neutral-400">
                    {test.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Features Coming Soon */}
          <div className="mt-8 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center dark:border-neutral-700 dark:bg-neutral-900/50">
            <div className="text-4xl">🧪</div>
            <p className="mt-3 text-sm font-medium text-neutral-900 dark:text-white">
              Full Lab Module Coming Soon
            </p>
            <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
              Complete diagnostics workflow: orders → specimens → analysis → verification → results
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2 text-[10px] text-neutral-500 dark:text-neutral-400">
              <span className="rounded-full bg-neutral-200 px-2 py-1 dark:bg-neutral-800">Accession</span>
              <span className="rounded-full bg-neutral-200 px-2 py-1 dark:bg-neutral-800">Barcode Labels</span>
              <span className="rounded-full bg-neutral-200 px-2 py-1 dark:bg-neutral-800">Results Entry</span>
              <span className="rounded-full bg-neutral-200 px-2 py-1 dark:bg-neutral-800">Verification</span>
              <span className="rounded-full bg-neutral-200 px-2 py-1 dark:bg-neutral-800">Abnormal Flags</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
