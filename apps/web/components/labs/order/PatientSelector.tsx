'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/useDebounce';
import Link from 'next/link';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  mrn?: string;
  dob?: string;
  gender?: string;
  age?: number;
  phone?: string;
  email?: string;
}

interface PatientSelectorProps {
  onSelect: (patient: Patient) => void;
  onClose: () => void;
}

export function PatientSelector({ onSelect, onClose }: PatientSelectorProps) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  // Fetch patients - latest 10 by default, or search results
  const { data, isLoading, error } = useQuery({
    queryKey: ['patients-for-lab', debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('limit', '10');
      params.set('offset', '0');
      if (debouncedSearch) {
        params.set('search', debouncedSearch);
      }
      const res = await fetch(`/api/patients?${params}`);
      if (!res.ok) throw new Error('Failed to fetch patients');
      return res.json();
    },
  });

  const patients: Patient[] = data?.patients || [];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Select Patient
            </h2>
            <p className="mt-0.5 text-[11px] text-neutral-500">
              Choose a patient to create a lab order
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search by name, MRN, phone, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white py-2.5 pl-10 pr-4 text-sm placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-500"
            autoFocus
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
        {!search && (
          <p className="mt-2 text-[11px] text-neutral-500">
            Showing latest 10 patients. Type to search for more.
          </p>
        )}
        {search && data?.total !== undefined && (
          <p className="mt-2 text-[11px] text-neutral-500">
            Found {data.total} patient{data.total !== 1 ? 's' : ''} matching &quot;{search}&quot;
          </p>
        )}
      </div>

      {/* Patient List */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-6">
            <div className="animate-pulse space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-20 rounded-lg bg-neutral-100 dark:bg-neutral-800" />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <p className="text-red-500">Failed to load patients</p>
            <p className="mt-1 text-sm text-neutral-400">Please try again</p>
          </div>
        ) : patients.length === 0 ? (
          <div className="p-8 text-center">
            {search ? (
              <>
                <div className="text-4xl">🔍</div>
                <p className="mt-3 font-medium text-neutral-900 dark:text-white">
                  No patients found
                </p>
                <p className="mt-1 text-sm text-neutral-500">
                  No patients match &quot;{search}&quot;. Try a different search term.
                </p>
              </>
            ) : (
              <>
                <div className="text-4xl">👥</div>
                <p className="mt-3 font-medium text-neutral-900 dark:text-white">No patients yet</p>
                <p className="mt-1 text-sm text-neutral-500">
                  Create a patient first before ordering labs
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {patients.map((patient) => (
              <button
                key={patient.id}
                onClick={() => onSelect(patient)}
                className="w-full px-6 py-4 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-neutral-900 dark:text-white">
                      {patient.lastName}, {patient.firstName}
                      {patient.middleName && ` ${patient.middleName.charAt(0)}.`}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-500">
                      {patient.mrn && (
                        <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono dark:bg-neutral-800">
                          MRN: {patient.mrn}
                        </span>
                      )}
                      {patient.age !== undefined && patient.age !== null && (
                        <span>{patient.age} years old</span>
                      )}
                      {patient.gender && <span className="capitalize">{patient.gender}</span>}
                      {patient.dob && (
                        <span>DOB: {new Date(patient.dob).toLocaleDateString('en-PH')}</span>
                      )}
                    </div>
                    {(patient.phone || patient.email) && (
                      <div className="mt-1 flex items-center gap-3 text-[11px] text-neutral-400">
                        {patient.phone && <span>{patient.phone}</span>}
                        {patient.email && <span>{patient.email}</span>}
                      </div>
                    )}
                  </div>
                  <svg
                    className="h-5 w-5 text-neutral-300 dark:text-neutral-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="border-t border-neutral-200 px-6 py-3 dark:border-neutral-800">
        <p className="text-center text-[11px] text-neutral-400">
          Can&apos;t find the patient?{' '}
          <Link href="/patients" className="text-blue-600 hover:underline dark:text-blue-400">
            Create a new patient
          </Link>
        </p>
      </div>
    </div>
  );
}
