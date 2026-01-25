'use client';

import { cn } from '@/lib/utils';
import type { PriceBreakdownProps } from '@/lib/types/discount';
import { formatDiscountDisplay, formatPHP } from '@/lib/utils/discount';

export function PriceBreakdown({
  subtotal,
  discount,
  totalAmount,
  className,
  compact = false,
}: PriceBreakdownProps) {
  const hasDiscount = discount && discount.amount > 0;

  if (compact) {
    return (
      <div className={cn('space-y-1', className)}>
        {hasDiscount && (
          <>
            <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
              <span>Subtotal</span>
              <span>{formatPHP(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-green-600 dark:text-green-400">
              <span>
                Discount ({discount.name} - {formatDiscountDisplay(discount.type, discount.value)})
              </span>
              <span>-{formatPHP(discount.amount)}</span>
            </div>
          </>
        )}
        <div className="flex items-center justify-between text-sm font-semibold text-neutral-900 dark:text-white">
          <span>Total</span>
          <span>{formatPHP(totalAmount)}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900',
        className,
      )}
    >
      <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
        Price Breakdown
      </h4>

      <div className="space-y-2">
        {/* Subtotal */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-neutral-600 dark:text-neutral-400">Subtotal</span>
          <span className="font-medium text-neutral-900 dark:text-white">
            {formatPHP(subtotal)}
          </span>
        </div>

        {/* Discount */}
        {hasDiscount && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="text-green-600 dark:text-green-400">Discount</span>
              <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                {discount.name}
              </span>
            </div>
            <span className="font-medium text-green-600 dark:text-green-400">
              -{formatPHP(discount.amount)}
            </span>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-neutral-200 dark:border-neutral-700" />

        {/* Total */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-neutral-900 dark:text-white">
            Total Amount
          </span>
          <span className="text-xl font-bold text-neutral-900 dark:text-white">
            {formatPHP(totalAmount)}
          </span>
        </div>
      </div>

      {/* Savings callout */}
      {hasDiscount && (
        <div className="mt-3 rounded-lg bg-green-100 p-2 text-center dark:bg-green-900/30">
          <span className="text-xs font-medium text-green-800 dark:text-green-300">
            You save {formatPHP(discount.amount)} with {discount.name}!
          </span>
        </div>
      )}
    </div>
  );
}
