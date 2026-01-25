/**
 * Loyverse Discount Types
 * Based on Loyverse API v1.0 discounts endpoint
 */

export type DiscountType = 'FIXED_PERCENT' | 'FIXED_AMOUNT';

/**
 * Loyverse Discount from API
 */
export interface LoyverseDiscount {
  id: string;
  name: string;
  type: DiscountType;
  discount_amount: number; // Used for FIXED_AMOUNT type (PHP amount)
  discount_percent: number; // Used for FIXED_PERCENT type (0.01-100)
  stores?: string[];
  restricted_access?: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

/**
 * Discount response from our API
 */
export interface DiscountsResponse {
  discounts: LoyverseDiscount[];
  total: number;
}

/**
 * Discount data to be stored with an order/appointment
 */
export interface DiscountSnapshot {
  discountId: string;
  discountName: string;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
}

/**
 * Props for discount calculation
 */
export interface DiscountCalculation {
  subtotal: number;
  discountType: DiscountType;
  discountValue: number;
}

/**
 * Result of discount calculation
 */
export interface DiscountResult {
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
}

/**
 * Props for DiscountSelector component
 */
export interface DiscountSelectorProps {
  subtotal: number;
  selectedDiscount: LoyverseDiscount | null;
  onSelectDiscount: (discount: LoyverseDiscount | null) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Props for PriceBreakdown component
 */
export interface PriceBreakdownProps {
  subtotal: number;
  discount?: {
    name: string;
    type: DiscountType;
    value: number;
    amount: number;
  };
  totalAmount: number;
  className?: string;
  compact?: boolean;
}
