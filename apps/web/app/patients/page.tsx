'use client'

import { useQuery } from '@tanstack/react-query'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Patient {
  id: string
  mrn: string | null
  firstName: string
  middleName: string | null
  lastName: string
  dob: string | null
  gender: string | null
  email: string | null
  phone: string | null
  address: string | null
  age: number
  deletedAt?: string | null
}

interface PatientsResponse {
  patients: Patient[]
  total: number
  limit: number
  offset: number
}

async function fetchPatients(search: string = ''): Promise<PatientsResponse> {
  const params = new URLSearchParams()
  if (search) params.append('search', search)
  
  console.log('[fetchPatients] Fetching with search:', search)
  
  const response = await fetch(`/api/patients?${params.toString()}`)
  
  console.log('[fetchPatients] Response status:', response.status, response.statusText)
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error('[fetchPatients] Error response:', errorText)
    throw new Error('Failed to fetch patients')
  }
  
  const data = await response.json()
  console.log('[fetchPatients] Received data:', data)
  
  return data
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  })
}

export default function PatientsPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['patients', debouncedSearch],
    queryFn: () => fetchPatients(debouncedSearch),
  })

  // Debounce search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearch(value)
    
    // Debounce for 300ms
    const timer = setTimeout(() => {
      setDebouncedSearch(value)
    }, 300)
    
    return () => clearTimeout(timer)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-white px-6 py-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">
              Patients
            </h1>
            <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
              Manage patient records and demographics
            </p>
          </div>
          <button 
            onClick={() => router.push('/patients/new')}
            className="h-8 rounded-lg bg-neutral-900 px-4 text-[11px] font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
          >
            + New Patient
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="border-b border-neutral-200 bg-neutral-50 px-6 py-3 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search patients by name, MRN, or contact..."
              value={search}
              onChange={handleSearchChange}
              className="h-8 w-full rounded-lg border border-neutral-300 bg-white px-3 text-[11px] placeholder-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder-neutral-500 dark:focus:border-white dark:focus:ring-white"
            />
          </div>
          
          {/* Filter button */}
          <button className="h-8 rounded-lg border border-neutral-300 bg-white px-3 text-[11px] font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800">
            Filters
          </button>
        </div>
      </div>

      {/* Patient List */}
      <div className="flex-1 overflow-auto bg-white p-6 dark:bg-neutral-900">
        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800"
              />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center dark:border-red-900 dark:bg-red-950">
            <p className="text-sm font-medium text-red-900 dark:text-red-100">
              Error loading patients
            </p>
            <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </div>
        )}

        {data && (
          <div className="space-y-2">
            {data.patients.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center dark:border-neutral-700 dark:bg-neutral-900/50">
                <div className="text-4xl">👥</div>
                <p className="mt-3 text-sm font-medium text-neutral-900 dark:text-white">
                  {search ? 'No patients found' : 'No patients yet'}
                </p>
                <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                  {search
                    ? 'Try adjusting your search terms'
                    : 'Get started by adding your first patient'}
                </p>
              </div>
            ) : (
              <>
                {data.patients.map((patient) => (
                  <div
                    key={patient.id}
                    className="rounded-xl border border-neutral-200 bg-white p-4 transition-all hover:border-neutral-300 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-neutral-900 dark:text-white">
                            {patient.firstName}{' '}
                            {patient.middleName && `${patient.middleName} `}
                            {patient.lastName}
                          </h3>
                          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                            MRN: {patient.mrn || 'N/A'}
                          </span>
                        </div>

                        <div className="mt-2 flex items-center gap-4 text-[11px] text-neutral-500 dark:text-neutral-400">
                          {patient.dob && (
                            <div className="flex items-center gap-1">
                              <span className="text-neutral-400">📅</span>
                              <span>
                                Born {formatDate(patient.dob)} ({patient.age}{' '}
                                years)
                              </span>
                            </div>
                          )}
                          {patient.gender && (
                            <div className="flex items-center gap-1">
                              <span className="text-neutral-400">⚥</span>
                              <span>{patient.gender}</span>
                            </div>
                          )}
                          {patient.phone && (
                            <div className="flex items-center gap-1">
                              <span className="text-neutral-400">📱</span>
                              <span>{patient.phone}</span>
                            </div>
                          )}
                          {patient.email && (
                            <div className="flex items-center gap-1">
                              <span className="text-neutral-400">✉️</span>
                              <span>{patient.email}</span>
                            </div>
                          )}
                        </div>

                        {patient.address && (
                          <div className="mt-2 text-[11px] text-neutral-500 dark:text-neutral-400">
                            📍 {patient.address}
                          </div>
                        )}
                      </div>

                      <button 
                        onClick={() => router.push(`/patients/${patient.id}`)}
                        className="h-7 rounded-lg border border-neutral-300 px-3 text-[11px] font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}

                {/* Results summary */}
                <div className="pt-2 text-center text-[11px] text-neutral-500 dark:text-neutral-400">
                  Showing {data.patients.length} of {data.total} patients
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
