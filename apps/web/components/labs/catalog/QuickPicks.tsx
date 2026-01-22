'use client';

import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

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

interface QuickPicksProps {
  onSelectTest?: (test: LabTest) => void;
  selectedTestIds?: string[];
  section?: string;
}

export function QuickPicks({ onSelectTest, selectedTestIds = [], section }: QuickPicksProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['lab-loyverse-tests'],
    queryFn: async () => {
      const res = await fetch('/api/labs/catalog/loyverse');
      if (!res.ok) throw new Error('Failed to fetch tests from Loyverse');
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-8 w-24 rounded-lg bg-neutral-200 dark:bg-neutral-800" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-sm text-red-500">Failed to load tests from Loyverse</div>;
  }

  const sections: LabSection[] = data?.sections || [];

  // Filter sections if a specific section is selected
  const filteredSections = section ? sections.filter((s) => s.code === section) : sections;

  // Get quick pick tests from each section (first 5)
  const quickPickTests = filteredSections.flatMap((s) => s.tests.filter((t) => t.isQuickPick));

  if (quickPickTests.length === 0) {
    return (
      <div className="text-sm text-neutral-500 dark:text-neutral-400">
        {data?.message || 'No tests available from Loyverse'}
      </div>
    );
  }

  // Format price for display
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(price);
  };

  return (
    <div className="space-y-4">
      {filteredSections.map((labSection) => {
        const sectionQuickPicks = labSection.tests.filter((t) => t.isQuickPick);
        if (sectionQuickPicks.length === 0) return null;

        return (
          <div key={labSection.id}>
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              {labSection.name}
            </h4>
            <div className="flex flex-wrap gap-2">
              {sectionQuickPicks.map((test) => (
                <button
                  key={test.id}
                  onClick={() => onSelectTest?.(test)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                    selectedTestIds.includes(test.id)
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700',
                  )}
                >
                  <span>{test.name}</span>
                  {test.price > 0 && (
                    <span className="ml-1.5 text-[10px] opacity-60">{formatPrice(test.price)}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Section filter component - dynamically loads sections from Loyverse
interface SectionFilterProps {
  value?: string;
  onChange: (section: string) => void;
}

export function SectionFilter({ value, onChange }: SectionFilterProps) {
  const { data } = useQuery({
    queryKey: ['lab-loyverse-tests'],
    queryFn: async () => {
      const res = await fetch('/api/labs/catalog/loyverse');
      if (!res.ok) throw new Error('Failed to fetch tests');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const sections: LabSection[] = data?.sections || [];

  // Build sections list from Loyverse data
  const sectionOptions = [
    { value: '', label: 'All Sections' },
    ...sections.map((s) => ({
      value: s.code,
      label: s.name,
    })),
  ];

  return (
    <div className="flex flex-wrap gap-1.5">
      {sectionOptions.map((section) => (
        <button
          key={section.value}
          onClick={() => onChange(section.value)}
          className={cn(
            'rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all',
            value === section.value
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700',
          )}
        >
          {section.label}
        </button>
      ))}
    </div>
  );
}
