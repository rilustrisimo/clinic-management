'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { SectionFilter } from './QuickPicks';

interface LabTest {
  id: string;
  code: string;
  name: string;
  section: string;
  sectionId: string;
  sectionCode: string;
  price: number;
  loyverseModifierId: string;
  loyverseOptionId: string;
  specimenType: string;
  isQuickPick: boolean;
  sortOrder: number;
}

interface LabSection {
  id: string;
  name: string;
  code: string;
  tests: LabTest[];
}

interface TestCatalogProps {
  onSelectTest?: (test: LabTest) => void;
  selectedTestIds?: string[];
}

export function TestCatalog({ onSelectTest, selectedTestIds = [] }: TestCatalogProps) {
  const [search, setSearch] = useState('');
  const [section, setSection] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['lab-loyverse-tests'],
    queryFn: async () => {
      const res = await fetch('/api/labs/catalog/loyverse');
      if (!res.ok) throw new Error('Failed to fetch tests from Loyverse');
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const sections: LabSection[] = data?.sections || [];

  // Filter and search tests
  const filteredTests = useMemo(() => {
    let tests: LabTest[] = [];

    // Get all tests from sections
    if (section) {
      const selectedSection = sections.find((s) => s.code === section);
      tests = selectedSection?.tests || [];
    } else {
      tests = sections.flatMap((s) => s.tests);
    }

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      tests = tests.filter(
        (t) =>
          t.name.toLowerCase().includes(searchLower) ||
          t.code.toLowerCase().includes(searchLower) ||
          t.section.toLowerCase().includes(searchLower),
      );
    }

    return tests;
  }, [sections, section, search]);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(price);

  return (
    <div className="flex h-full flex-col">
      {/* Search */}
      <div className="border-b border-neutral-200 p-4 dark:border-neutral-800">
        <input
          type="text"
          placeholder="Search tests..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-500"
        />
      </div>

      {/* Section Filter */}
      <div className="border-b border-neutral-200 p-3 dark:border-neutral-800">
        <SectionFilter value={section} onChange={setSection} />
      </div>

      {/* Stats */}
      <div className="border-b border-neutral-200 px-4 py-2 dark:border-neutral-800">
        <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
          {filteredTests.length} test{filteredTests.length !== 1 ? 's' : ''} available
          {section && ` in ${sections.find((s) => s.code === section)?.name || section}`}
        </p>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto">
        <TestList
          tests={filteredTests}
          loading={isLoading}
          error={error}
          message={data?.message}
          selectedIds={selectedTestIds}
          onSelect={onSelectTest}
          formatPrice={formatPrice}
        />
      </div>
    </div>
  );
}

interface TestListProps {
  tests: LabTest[];
  loading: boolean;
  error: Error | null;
  message?: string;
  selectedIds: string[];
  onSelect?: (test: LabTest) => void;
  formatPrice: (price: number) => string;
}

function TestList({
  tests,
  loading,
  error,
  message,
  selectedIds,
  onSelect,
  formatPrice,
}: TestListProps) {
  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-neutral-100 dark:bg-neutral-800" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-red-500">Failed to load tests from Loyverse</p>
        <p className="mt-1 text-xs text-neutral-500">Please check your Loyverse configuration</p>
      </div>
    );
  }

  if (tests.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {message || 'No tests found'}
        </p>
        {message && (
          <p className="mt-2 text-xs text-neutral-400">
            Set up your Laboratory item in Loyverse with modifiers for test categories
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
      {tests.map((test) => (
        <button
          key={test.id}
          onClick={() => onSelect?.(test)}
          className={cn(
            'w-full px-4 py-3 text-left transition-colors',
            selectedIds.includes(test.id)
              ? 'bg-neutral-100 dark:bg-neutral-800'
              : 'hover:bg-neutral-50 dark:hover:bg-neutral-900',
          )}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-neutral-900 dark:text-white">{test.name}</span>
                <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                  {test.section}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-3 text-[11px] text-neutral-500 dark:text-neutral-500">
                <span className="capitalize">{test.specimenType}</span>
                <span className="font-mono text-neutral-400">{test.code}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-medium text-neutral-900 dark:text-white">
                {formatPrice(test.price)}
              </span>
              {selectedIds.includes(test.id) && (
                <span className="mt-1 block text-[10px] font-medium text-green-600 dark:text-green-400">
                  Selected
                </span>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
