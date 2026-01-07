'use client'

import { useQuery } from '@tanstack/react-query'

interface PatientVersion {
  id: string
  patientId: string
  firstName: string
  middleName: string | null
  lastName: string
  dob: string | null
  gender: string | null
  email: string | null
  phone: string | null
  address: string | null
  reason: string
  authorId: string | null
  createdAt: string
}

interface VersionHistoryProps {
  patientId: string
}

async function fetchVersions(patientId: string): Promise<{ versions: PatientVersion[] }> {
  const response = await fetch(`/api/patients/${patientId}/versions`)
  if (!response.ok) {
    throw new Error('Failed to fetch versions')
  }
  return response.json()
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function getFieldChanges(current: PatientVersion, previous?: PatientVersion): string[] {
  if (!previous) return ['Initial record creation']
  
  const changes: string[] = []
  
  if (current.firstName !== previous.firstName) {
    changes.push(`First name: ${previous.firstName} → ${current.firstName}`)
  }
  if (current.middleName !== previous.middleName) {
    changes.push(`Middle name: ${previous.middleName || 'None'} → ${current.middleName || 'None'}`)
  }
  if (current.lastName !== previous.lastName) {
    changes.push(`Last name: ${previous.lastName} → ${current.lastName}`)
  }
  if (current.dob !== previous.dob) {
    changes.push(`DOB: ${previous.dob ? formatDate(previous.dob) : 'None'} → ${current.dob ? formatDate(current.dob) : 'None'}`)
  }
  if (current.gender !== previous.gender) {
    changes.push(`Gender: ${previous.gender || 'None'} → ${current.gender || 'None'}`)
  }
  if (current.email !== previous.email) {
    changes.push(`Email: ${previous.email || 'None'} → ${current.email || 'None'}`)
  }
  if (current.phone !== previous.phone) {
    changes.push(`Phone: ${previous.phone || 'None'} → ${current.phone || 'None'}`)
  }
  if (current.address !== previous.address) {
    changes.push(`Address: ${previous.address || 'None'} → ${current.address || 'None'}`)
  }
  
  return changes.length > 0 ? changes : ['No field changes detected']
}

export function VersionHistory({ patientId }: VersionHistoryProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['patient-versions', patientId],
    queryFn: () => fetchVersions(patientId),
  })

  if (isLoading) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
        <h2 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-white">
          Version History
        </h2>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900"
            />
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
        <h2 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-white">
          Version History
        </h2>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
          <div className="flex items-center gap-2">
            <div className="text-lg">⚠️</div>
            <div>
              <p className="text-[11px] font-medium text-amber-900 dark:text-amber-100">
                Unable to load version history
              </p>
              <p className="mt-0.5 text-[10px] text-amber-700 dark:text-amber-300">
                {error instanceof Error ? error.message : 'An error occurred'}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const { versions } = data

  if (versions.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
        <h2 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-white">
          Version History
        </h2>
        <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center dark:border-neutral-700 dark:bg-neutral-900/50">
          <div className="text-3xl">📜</div>
          <p className="mt-2 text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
            No version history yet
          </p>
          <p className="mt-1 text-[10px] text-neutral-500 dark:text-neutral-400">
            Changes to this patient record will appear here
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">
          Version History
        </h2>
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
          {versions.length} {versions.length === 1 ? 'version' : 'versions'}
        </span>
      </div>

      <div className="relative space-y-4">
        {/* Timeline line */}
        <div className="absolute left-[7px] top-2 bottom-2 w-[2px] bg-neutral-200 dark:bg-neutral-800" />

        {versions.map((version, index) => {
          const previousVersion = versions[index + 1]
          const changes = getFieldChanges(version, previousVersion)
          const isLatest = index === 0

          return (
            <div key={version.id} className="relative pl-6">
              {/* Timeline dot */}
              <div
                className={`absolute left-0 top-1.5 h-4 w-4 rounded-full border-2 ${
                  isLatest
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900'
                }`}
              >
                {isLatest && (
                  <div className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-75" />
                )}
              </div>

              {/* Version card */}
              <div
                className={`rounded-lg border p-4 ${
                  isLatest
                    ? 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950'
                    : 'border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3
                        className={`text-[11px] font-semibold ${
                          isLatest
                            ? 'text-blue-900 dark:text-blue-100'
                            : 'text-neutral-900 dark:text-white'
                        }`}
                      >
                        {version.reason}
                      </h3>
                      {isLatest && (
                        <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[9px] font-medium text-white">
                          CURRENT
                        </span>
                      )}
                    </div>
                    <p
                      className={`mt-1 text-[10px] ${
                        isLatest
                          ? 'text-blue-700 dark:text-blue-300'
                          : 'text-neutral-500 dark:text-neutral-400'
                      }`}
                    >
                      {formatDateTime(version.createdAt)}
                      {version.authorId && (
                        <span className="ml-2">
                          • Author: {version.authorId.substring(0, 8)}...
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Changes list */}
                {changes.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {changes.map((change, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-2 text-[10px] ${
                          isLatest
                            ? 'text-blue-800 dark:text-blue-200'
                            : 'text-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        <span className="mt-0.5">•</span>
                        <span>{change}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Version snapshot */}
                <details className="mt-3">
                  <summary
                    className={`cursor-pointer text-[10px] font-medium ${
                      isLatest
                        ? 'text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200'
                        : 'text-neutral-600 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300'
                    }`}
                  >
                    View full snapshot →
                  </summary>
                  <div className="mt-2 grid grid-cols-2 gap-2 rounded border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-900">
                    <div>
                      <div className="text-[9px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                        Name
                      </div>
                      <div className="mt-0.5 text-[10px] text-neutral-900 dark:text-white">
                        {version.firstName}{' '}
                        {version.middleName && `${version.middleName} `}
                        {version.lastName}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                        DOB
                      </div>
                      <div className="mt-0.5 text-[10px] text-neutral-900 dark:text-white">
                        {version.dob ? formatDate(version.dob) : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                        Gender
                      </div>
                      <div className="mt-0.5 text-[10px] text-neutral-900 dark:text-white">
                        {version.gender || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                        Phone
                      </div>
                      <div className="mt-0.5 text-[10px] text-neutral-900 dark:text-white">
                        {version.phone || 'N/A'}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-[9px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                        Email
                      </div>
                      <div className="mt-0.5 text-[10px] text-neutral-900 dark:text-white">
                        {version.email || 'N/A'}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-[9px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                        Address
                      </div>
                      <div className="mt-0.5 text-[10px] text-neutral-900 dark:text-white">
                        {version.address || 'N/A'}
                      </div>
                    </div>
                  </div>
                </details>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
