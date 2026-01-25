import type {
  DiscountType,
  DiscountCalculation,
  DiscountResult,
  LoyverseDiscount,
  DiscountSnapshot,
} from '@/lib/types/discount';

/**
 * Get the discount value from a Loyverse discount based on its type
 */
export function getDiscountValue(discount: LoyverseDiscount): number {
  if (discount.type === 'FIXED_PERCENT') {
    return discount.discount_percent || 0;
  }
  return discount.discount_amount || 0;
}

/**
 * Calculate discount amount based on type and value
 *
 * @param subtotal - Total before discount
 * @param discountType - 'FIXED_PERCENT' or 'FIXED_AMOUNT'
 * @param discountValue - Percentage (0-100) or fixed PHP amount
 * @returns Calculated discount amount (capped at subtotal)
 */
export function calculateDiscountAmount(
  subtotal: number,
  discountType: DiscountType,
  discountValue: number,
): number {
  if (subtotal <= 0 || discountValue <= 0) {
    return 0;
  }

  let discountAmount: number;

  if (discountType === 'FIXED_PERCENT') {
    // Ensure percentage is between 0 and 100
    const clampedPercent = Math.min(100, Math.max(0, discountValue));
    discountAmount = subtotal * (clampedPercent / 100);
  } else {
    // FIXED_AMOUNT
    discountAmount = discountValue;
  }

  // Discount cannot exceed subtotal
  return Math.min(discountAmount, subtotal);
}

/**
 * Calculate discount amount from a Loyverse discount object
 */
export function calculateDiscountFromLoyverse(
  subtotal: number,
  discount: LoyverseDiscount,
): number {
  const value = getDiscountValue(discount);
  return calculateDiscountAmount(subtotal, discount.type, value);
}

/**
 * Calculate full price breakdown with discount
 */
export function calculatePriceWithDiscount(calculation: DiscountCalculation): DiscountResult {
  const { subtotal, discountType, discountValue } = calculation;

  const discountAmount = calculateDiscountAmount(subtotal, discountType, discountValue);
  const totalAmount = Math.max(0, subtotal - discountAmount);

  return {
    subtotal,
    discountAmount,
    totalAmount,
  };
}

/**
 * Create discount snapshot from Loyverse discount and subtotal
 */
export function createDiscountSnapshot(
  discount: LoyverseDiscount,
  subtotal: number,
): DiscountSnapshot {
  const discountValue = getDiscountValue(discount);
  const discountAmount = calculateDiscountAmount(subtotal, discount.type, discountValue);

  return {
    discountId: discount.id,
    discountName: discount.name,
    discountType: discount.type,
    discountValue,
    discountAmount,
  };
}

/**
 * Format discount display string
 */
export function formatDiscountDisplay(discountType: DiscountType, discountValue: number): string {
  if (discountType === 'FIXED_PERCENT') {
    return `${discountValue}%`;
  }
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(discountValue);
}

/**
 * Format PHP currency
 */
export function formatPHP(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
}
