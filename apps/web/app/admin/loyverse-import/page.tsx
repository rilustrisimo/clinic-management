'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface LoyverseCustomer {
  id: string
  name: string
  email?: string
  phone_number?: string
  address?: string
  customer_code?: string
}

interface PotentialMatch {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  loyverseCustomerId: string | null
  matchScore: number
  matchReasons: string[]
}

interface CustomerWithMatches {
  loyverseCustomer: LoyverseCustomer
  potentialMatches: PotentialMatch[]
}

async function fetchLoyverseCustomers(): Promise<{ customers: CustomerWithMatches[] }> {
  const response = await fetch('/api/loyverse/import')
  if (!response.ok) throw new Error('Failed to fetch Loyverse customers')
  return response.json()
}

async function importCustomer(customerData: LoyverseCustomer): Promise<{ patientId: string }> {
  const response = await fetch('/api/loyverse/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'import', customerData }),
  })
  if (!response.ok) throw new Error('Failed to import customer')
  return response.json()
}

async function linkCustomer(customerId: string, patientId: string): Promise<void> {
  const response = await fetch('/api/loyverse/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'link', customerId, patientId }),
  })
  if (!response.ok) throw new Error('Failed to link customer')
}

async function bulkImportCustomers(customers: LoyverseCustomer[]): Promise<void> {
  const results = await Promise.allSettled(
    customers.map(customer => importCustomer(customer))
  )
  
  const failed = results.filter(r => r.status === 'rejected').length
  if (failed > 0) {
    throw new Error(`${failed} out of ${customers.length} imports failed`)
  }
}

export default function LoyverseImportPage() {
  const [filter, setFilter] = useState<'all' | 'unmatched' | 'matched'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['loyverse-import'],
    queryFn: fetchLoyverseCustomers,
  })

  const importMutation = useMutation({
    mutationFn: importCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyverse-import'] })
    },
  })

  const linkMutation = useMutation({
    mutationFn: ({ customerId, patientId }: { customerId: string; patientId: string }) =>
      linkCustomer(customerId, patientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyverse-import'] })
    },
  })

  const bulkImportMutation = useMutation({
    mutationFn: bulkImportCustomers,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyverse-import'] })
    },
  })

  const customers = data?.customers || []
  
  const filteredCustomers = customers.filter(({ potentialMatches }) => {
    if (filter === 'unmatched') return potentialMatches.length === 0
    if (filter === 'matched') return potentialMatches.length > 0
    return true
  })

  // Pagination - only for 'all' and 'matched' tabs
  const shouldPaginate = filter === 'all' || filter === 'matched'
  const totalPages = shouldPaginate ? Math.ceil(filteredCustomers.length / itemsPerPage) : 1
  const paginatedCustomers = shouldPaginate
    ? filteredCustomers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : filteredCustomers

  // Reset to page 1 when filter changes
  const handleFilterChange = (newFilter: 'all' | 'unmatched' | 'matched') => {
    setFilter(newFilter)
    setCurrentPage(1)
  }

  const unmatchedCount = customers.filter(c => c.potentialMatches.length === 0).length
  const matchedCount = customers.filter(c => c.potentialMatches.length > 0).length
  
  const unmatchedCustomers = customers
    .filter(c => c.potentialMatches.length === 0)
    .map(c => c.loyverseCustomer)

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">
          Loyverse Customer Import
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
          Import customers from Loyverse and reconcile with existing patients
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
          <div className="text-2xl font-semibold text-neutral-900 dark:text-white">
            {customers.length}
          </div>
          <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
            Total Customers
          </div>
        </div>
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
          <div className="text-2xl font-semibold text-amber-600 dark:text-amber-400">
            {unmatchedCount}
          </div>
          <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
            Unmatched
          </div>
        </div>
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
          <div className="text-2xl font-semibold text-green-600 dark:text-green-400">
            {matchedCount}
          </div>
          <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
            With Matches
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => handleFilterChange('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
            }`}
          >
            All ({customers.length})
          </button>
          <button
            onClick={() => handleFilterChange('unmatched')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'unmatched'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
            }`}
          >
            Unmatched ({unmatchedCount})
          </button>
          <button
            onClick={() => handleFilterChange('matched')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'matched'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
            }`}
          >
            With Matches ({matchedCount})
          </button>
        </div>

        {/* Bulk Import Button - Only show when viewing unmatched */}
        {filter === 'unmatched' && unmatchedCustomers.length > 0 && (
          <button
            onClick={() => bulkImportMutation.mutate(unmatchedCustomers)}
            disabled={bulkImportMutation.isPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {bulkImportMutation.isPending ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Importing {unmatchedCustomers.length} customers...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Import All {unmatchedCustomers.length} as New Patients
              </>
            )}
          </button>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="text-neutral-600 dark:text-neutral-400">Loading customers...</div>
        </div>
      )}

      {/* Customer List */}
      <div className="space-y-4">
        {paginatedCustomers.map(({ loyverseCustomer, potentialMatches }) => (
          <div
            key={loyverseCustomer.id}
            className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6"
          >
            {/* Customer Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="font-semibold text-neutral-900 dark:text-white">
                  {loyverseCustomer.name}
                </h3>
                <div className="flex items-center gap-4 mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                  {loyverseCustomer.email && <span>📧 {loyverseCustomer.email}</span>}
                  {loyverseCustomer.phone_number && <span>📞 {loyverseCustomer.phone_number}</span>}
                  {loyverseCustomer.customer_code && <span>🔖 {loyverseCustomer.customer_code}</span>}
                </div>
              </div>
              
              {/* Import Button for Unmatched */}
              {potentialMatches.length === 0 && (
                <button
                  onClick={() => importMutation.mutate(loyverseCustomer)}
                  disabled={importMutation.isPending}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {importMutation.isPending ? 'Importing...' : 'Import as New Patient'}
                </button>
              )}
            </div>

            {/* Potential Matches */}
            {potentialMatches.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  Potential Matches ({potentialMatches.length}):
                </div>
                {potentialMatches.map((match) => (
                  <div
                    key={match.id}
                    className="flex items-center justify-between rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 p-3"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm text-neutral-900 dark:text-white">
                        {match.firstName} {match.lastName}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                        {match.email && <span>📧 {match.email}</span>}
                        {match.phone && <span>📞 {match.phone}</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="text-xs font-medium text-neutral-900 dark:text-white">
                          Match: {match.matchScore}%
                        </div>
                        {match.matchReasons.map((reason, idx) => (
                          <span
                            key={idx}
                            className="rounded-full bg-green-100 dark:bg-green-900/50 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:text-green-300"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    {!match.loyverseCustomerId && (
                      <button
                        onClick={() =>
                          linkMutation.mutate({
                            customerId: loyverseCustomer.id,
                            patientId: match.id,
                          })
                        }
                        disabled={linkMutation.isPending}
                        className="rounded-lg border border-green-600 px-4 py-2 text-sm font-medium text-green-600 hover:bg-green-50 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-900/20 disabled:opacity-50"
                      >
                        Link to This Patient
                      </button>
                    )}
                    
                    {match.loyverseCustomerId && (
                      <div className="rounded-lg bg-green-100 dark:bg-green-900/50 px-3 py-1 text-xs font-medium text-green-700 dark:text-green-300">
                        ✓ Already Linked
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination - Only for 'all' and 'matched' tabs */}
      {shouldPaginate && totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between border-t border-neutral-200 dark:border-neutral-800 pt-4">
          <div className="text-sm text-neutral-600 dark:text-neutral-400">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredCustomers.length)} of {filteredCustomers.length} customers
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                // Show first page, last page, current page, and pages around current
                const showPage = page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1
                const showEllipsis = (page === 2 && currentPage > 3) || (page === totalPages - 1 && currentPage < totalPages - 2)
                
                if (showEllipsis) {
                  return <span key={page} className="px-2 text-neutral-400">...</span>
                }
                
                if (!showPage) return null
                
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      page === currentPage
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                        : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-700'
                    }`}
                  >
                    {page}
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredCustomers.length === 0 && (
        <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50 p-12 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-sm font-medium text-neutral-900 dark:text-white">
            No customers found
          </p>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
            {filter === 'unmatched' && 'All customers have potential matches'}
            {filter === 'matched' && 'No customers with potential matches'}
            {filter === 'all' && 'No Loyverse customers available'}
          </p>
        </div>
      )}
    </div>
  )
}
