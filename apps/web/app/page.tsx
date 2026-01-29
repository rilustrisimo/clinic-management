'use client';

import { useAuth, hasRole } from '../components/auth/AuthProvider';
import { useQuery } from '@tanstack/react-query';

async function fetchDashboardStats() {
  const today = new Date().toISOString().split('T')[0];

  const [patientsRes, appointmentsRes] = await Promise.all([
    fetch('/api/patients?limit=1'),
    fetch(`/api/appointments?date=${today}&view=day`),
  ]);

  const patientsData = await patientsRes.json();
  const appointmentsData = await appointmentsRes.json();

  return {
    totalPatients: patientsData.total || 0,
    todaysAppointments: appointmentsData.appointments?.length || 0,
  };
}

export default function DashboardPage() {
  const { session, roles, loading, userId } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-3rem)] flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="text-sm text-neutral-500">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-3rem)] bg-neutral-50 dark:bg-neutral-950">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Welcome Section */}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">
            Welcome back
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{session?.user?.email}</p>
        </div>

        {/* User Info Card */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-sm">
          <h2 className="text-base font-semibold mb-4 text-neutral-900 dark:text-white">
            Your Access
          </h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-neutral-500 dark:text-neutral-400 w-20">User ID</span>
              <code className="text-xs bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-md font-mono text-neutral-700 dark:text-neutral-300">
                {userId}
              </code>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-neutral-500 dark:text-neutral-400 w-20">Roles</span>
              <div className="flex flex-wrap gap-2">
                {roles.length > 0 ? (
                  roles.map((role) => (
                    <span
                      key={role}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                    >
                      {role}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-neutral-400">No roles assigned</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Patients"
            value={stats?.totalPatients?.toString() || '0'}
            loading={!stats}
          />
          <StatCard
            title="Today's Appointments"
            value={stats?.todaysAppointments?.toString() || '0'}
            loading={!stats}
          />
          <StatCard title="Pending Lab Results" value="0" />
          <StatCard title="Unpaid Invoices" value="0" />
        </div>

        {/* Module Cards */}
        <div>
          <h2 className="text-base font-semibold mb-4 text-neutral-900 dark:text-white">
            Quick Access
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Patients Module */}
            <ModuleCard
              title="Patients"
              description="Patient records and history"
              icon="👥"
              href="/patients"
              available={false}
            />

            {/* Appointments Module */}
            <ModuleCard
              title="Appointments"
              description="Scheduling and calendar"
              icon="📅"
              href="/appointments"
              available={false}
            />

            {/* Labs Module - LabTech, Provider, Admin, Frontdesk */}
            {hasRole(roles, ['LabTech', 'Provider', 'Admin', 'Frontdesk']) && (
              <ModuleCard
                title="Laboratory"
                description="Lab orders and results"
                icon="🔬"
                href="/labs"
                available={false}
              />
            )}

            {/* Billing Module - Billing, Admin */}
            {hasRole(roles, ['Billing', 'Admin']) && (
              <ModuleCard
                title="Billing"
                description="Invoices and payments"
                icon="💰"
                href="/billing"
                available={false}
              />
            )}

            {/* Inventory Module - Inventory, Admin */}
            {hasRole(roles, ['Inventory', 'Admin']) && (
              <ModuleCard
                title="Inventory"
                description="Stock and supplies"
                icon="📦"
                href="/inventory"
                available={false}
              />
            )}

            {/* Admin Module - Admin only */}
            {hasRole(roles, 'Admin') && (
              <ModuleCard
                title="Administration"
                description="System settings and user management"
                icon="⚙️"
                href="/admin"
                available={false}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function ModuleCard({
  title,
  description,
  icon,
  href,
  available,
}: {
  title: string;
  description: string;
  icon: string;
  href: string;
  available: boolean;
}) {
  const CardContent = () => (
    <>
      <div className="flex items-start justify-between mb-3">
        <div className="text-3xl">{icon}</div>
        {!available && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400 font-medium">
            Coming Soon
          </span>
        )}
      </div>
      <h3 className="text-sm font-semibold mb-1.5 text-neutral-900 dark:text-white">{title}</h3>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
        {description}
      </p>
    </>
  );

  if (available) {
    return (
      <a
        href={href}
        className="group block p-5 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all duration-200 cursor-pointer"
      >
        <CardContent />
      </a>
    );
  }

  return (
    <div className="block p-5 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 opacity-60">
      <CardContent />
    </div>
  );
}

function StatCard({ title, value, loading }: { title: string; value: string; loading?: boolean }) {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm">
      <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">{title}</div>
      {loading ? (
        <div className="h-8 w-16 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse"></div>
      ) : (
        <div className="text-2xl font-semibold text-neutral-900 dark:text-white">{value}</div>
      )}
    </div>
  );
}
