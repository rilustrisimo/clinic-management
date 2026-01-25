'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import type { LoyverseDiscount, DiscountSelectorProps } from '@/lib/types/discount';
import {
  formatDiscountDisplay,
  calculateDiscountFromLoyverse,
  getDiscountValue,
  formatPHP,
} from '@/lib/utils/discount';

async function fetchDiscounts(): Promise<{ discounts: LoyverseDiscount[] }> {
  const response = await fetch('/api/loyverse/discounts');
  if (!response.ok) throw new Error('Failed to fetch discounts');
  return response.json();
}

export function DiscountSelector({
  subtotal,
  selectedDiscount,
  onSelectDiscount,
  disabled = false,
  className,
}: DiscountSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['loyverse-discounts'],
    queryFn: fetchDiscounts,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const discounts = data?.discounts || [];

  const handleSelect = (discount: LoyverseDiscount | null) => {
    onSelectDiscount(discount);
    setIsOpen(false);
  };

  // Calculate discount amount for preview
  const previewAmount = selectedDiscount
    ? calculateDiscountFromLoyverse(subtotal, selectedDiscount)
    : 0;

  // Get display value for selected discount
  const selectedDiscountValue = selectedDiscount ? getDiscountValue(selectedDiscount) : 0;

  return (
    <div className={cn('relative', className)}>
      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
        Discount
      </label>

      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled || isLoading}
        className={cn(
          'flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
          'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-neutral-600',
          disabled && 'cursor-not-allowed opacity-50',
          selectedDiscount &&
            'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950',
        )}
      >
        {isLoading ? (
          <span className="text-neutral-400">Loading discounts...</span>
        ) : selectedDiscount ? (
          <div className="flex flex-1 items-center justify-between">
            <div>
              <span className="font-medium text-neutral-900 dark:text-white">
                {selectedDiscount.name}
              </span>
              <span className="ml-2 text-neutral-500 dark:text-neutral-400">
                ({formatDiscountDisplay(selectedDiscount.type, selectedDiscountValue)})
              </span>
            </div>
            <span className="text-green-600 dark:text-green-400">-{formatPHP(previewAmount)}</span>
          </div>
        ) : (
          <span className="text-neutral-500 dark:text-neutral-400">No discount applied</span>
        )}

        <svg
          className={cn(
            'ml-2 h-4 w-4 flex-shrink-0 text-neutral-400 transition-transform',
            isOpen && 'rotate-180',
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 z-[100] mt-1 max-h-96 overflow-auto rounded-lg border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
          {/* Clear option */}
          <button
            type="button"
            onClick={() => handleSelect(null)}
            className={cn(
              'flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-700',
              !selectedDiscount && 'bg-neutral-100 dark:bg-neutral-700',
            )}
          >
            <span className="text-neutral-600 dark:text-neutral-300">No discount</span>
          </button>

          {error ? (
            <div className="px-3 py-2 text-sm text-red-500">Failed to load discounts</div>
          ) : discounts.length === 0 ? (
            <div className="px-3 py-2 text-sm text-neutral-500">No discounts available</div>
          ) : (
            discounts.map((discount) => {
              const amount = calculateDiscountFromLoyverse(subtotal, discount);
              const discountValue = getDiscountValue(discount);
              const isSelected = selectedDiscount?.id === discount.id;

              return (
                <button
                  key={discount.id}
                  type="button"
                  onClick={() => handleSelect(discount)}
                  className={cn(
                    'flex w-full items-center justify-between px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-700',
                    isSelected && 'bg-green-50 dark:bg-green-950',
                  )}
                >
                  <div>
                    <span className="text-sm font-medium text-neutral-900 dark:text-white">
                      {discount.name}
                    </span>
                    <span className="ml-2 text-xs text-neutral-500 dark:text-neutral-400">
                      {formatDiscountDisplay(discount.type, discountValue)}
                    </span>
                  </div>
                  <span className="text-sm text-green-600 dark:text-green-400">
                    -{formatPHP(amount)}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}

      {/* Selected discount badge */}
      {selectedDiscount && !isOpen && (
        <button
          type="button"
          onClick={() => handleSelect(null)}
          className="mt-2 inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200"
        >
          <span>Remove discount</span>
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
  );
}
