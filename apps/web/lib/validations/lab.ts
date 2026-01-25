import { z } from 'zod';

// =====================================================
// ENUMS (matching database)
// =====================================================

export const LabSectionEnum = z.enum([
  'hematology',
  'chemistry',
  'urinalysis',
  'serology',
  'fecalysis',
  'microbiology',
  'drug_testing',
  'other',
]);

export const SpecimenTypeEnum = z.enum([
  'blood',
  'urine',
  'stool',
  'swab',
  'csf',
  'tissue',
  'sputum',
  'other',
]);

export const LabOrderStatusEnum = z.enum([
  'pending_payment',
  'paid',
  'collecting',
  'collected',
  'processing',
  'completed',
  'verified',
  'released',
  'cancelled',
]);

export const PaymentStatusEnum = z.enum(['unpaid', 'paid', 'partial', 'refunded']);

export const LabPriorityEnum = z.enum(['routine', 'urgent', 'stat']);

export const SpecimenStatusEnum = z.enum([
  'pending',
  'collected',
  'received',
  'rejected',
  'processing',
  'completed',
]);

export const AbnormalFlagEnum = z.enum(['N', 'L', 'H', 'LL', 'HH', 'A']);

// =====================================================
// TYPE EXPORTS
// =====================================================

export type LabSection = z.infer<typeof LabSectionEnum>;
export type SpecimenType = z.infer<typeof SpecimenTypeEnum>;
export type LabOrderStatus = z.infer<typeof LabOrderStatusEnum>;
export type PaymentStatus = z.infer<typeof PaymentStatusEnum>;
export type LabPriority = z.infer<typeof LabPriorityEnum>;
export type SpecimenStatus = z.infer<typeof SpecimenStatusEnum>;
export type AbnormalFlag = z.infer<typeof AbnormalFlagEnum>;

// =====================================================
// LAB ORDER SCHEMAS
// =====================================================

/**
 * Schema for creating a lab order
 */
export const createLabOrderSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  visitId: z.string().optional().nullable(),
  appointmentId: z.string().optional().nullable(),
  orderingProviderId: z.string().optional().nullable(),
  priority: LabPriorityEnum.default('routine'),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional().nullable(),
  items: z
    .array(
      z.object({
        testId: z.string().optional().nullable(),
        panelId: z.string().optional().nullable(),
        // Loyverse-based items (for direct catalog selection)
        loyverseOptionId: z.string().optional(),
        loyverseModifierId: z.string().optional(),
        code: z.string().optional(),
        name: z.string().optional(),
        section: z.string().optional(),
        price: z.number().optional(),
        specimenType: z.string().optional(),
      }),
    )
    .min(1, 'At least one test or panel is required')
    .refine(
      (items) => items.every((item) => item.testId || item.panelId || item.loyverseOptionId),
      'Each item must have either a testId, panelId, or loyverseOptionId',
    ),
  discount: z
    .object({
      discountId: z.string(),
      discountName: z.string(),
      discountType: z.enum([
        'FIXED_PERCENT',
        'FIXED_AMOUNT',
        'VARIABLE_PERCENT',
        'VARIABLE_AMOUNT',
        'DISCOUNT_BY_POINTS',
      ]),
      discountValue: z.number(),
    })
    .optional()
    .nullable(),
});

export type CreateLabOrderData = z.infer<typeof createLabOrderSchema>;

/**
 * Schema for updating a lab order
 */
export const updateLabOrderSchema = z.object({
  priority: LabPriorityEnum.optional(),
  notes: z.string().max(1000).optional().nullable(),
  totalAmount: z.number().nonnegative().optional(),
  subtotal: z.number().nonnegative().optional(),
  items: z
    .array(
      z.object({
        loyverseOptionId: z.string(),
        loyverseModifierId: z.string(),
        code: z.string().min(1, 'Test code is required'),
        name: z.string().min(1, 'Test name is required'),
        section: z.string().min(1, 'Section is required'),
        price: z.number().nonnegative('Price must be non-negative'),
        specimenType: z.string().optional(),
      }),
    )
    .optional(),
  discount: z
    .object({
      discountId: z.string(),
      discountName: z.string(),
      discountType: z.enum(['FIXED_PERCENT', 'FIXED_AMOUNT', 'PERCENT']),
      discountValue: z.number(),
    })
    .optional()
    .nullable(),
});

export type UpdateLabOrderData = z.infer<typeof updateLabOrderSchema>;

/**
 * Schema for adding item to an order
 */
export const addOrderItemSchema = z
  .object({
    testId: z.string().optional().nullable(),
    panelId: z.string().optional().nullable(),
  })
  .refine((data) => data.testId || data.panelId, 'Either testId or panelId is required');

export type AddOrderItemData = z.infer<typeof addOrderItemSchema>;

/**
 * Schema for confirming payment
 */
export const confirmPaymentSchema = z.object({
  paymentReference: z.string().min(1, 'Payment reference is required'),
  amount: z.number().positive('Amount must be positive'),
});

export type ConfirmPaymentData = z.infer<typeof confirmPaymentSchema>;

// =====================================================
// SPECIMEN SCHEMAS
// =====================================================

/**
 * Schema for creating/accessioning a specimen
 */
export const createSpecimenSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  orderItemId: z.string().optional().nullable(),
  specimenType: SpecimenTypeEnum,
  container: z.string().max(100).optional().nullable(),
  volumeMl: z
    .number()
    .positive('Volume must be positive')
    .max(999.99, 'Volume cannot exceed 999.99 ml')
    .optional()
    .nullable(),
  appearance: z.string().max(100).optional().nullable(),
  collectionNotes: z.string().max(500).optional().nullable(),
});

export type CreateSpecimenData = z.infer<typeof createSpecimenSchema>;

/**
 * Schema for updating a specimen
 */
export const updateSpecimenSchema = z.object({
  volumeMl: z.number().positive().max(999.99).optional().nullable(),
  appearance: z.string().max(100).optional().nullable(),
  collectionNotes: z.string().max(500).optional().nullable(),
});

export type UpdateSpecimenData = z.infer<typeof updateSpecimenSchema>;

/**
 * Schema for collecting a specimen
 */
export const collectSpecimenSchema = z.object({
  collectionNotes: z.string().max(500).optional().nullable(),
  appearance: z.string().max(100).optional().nullable(),
  volumeMl: z.number().positive().max(999.99).optional().nullable(),
});

export type CollectSpecimenData = z.infer<typeof collectSpecimenSchema>;

/**
 * Schema for rejecting a specimen
 */
export const rejectSpecimenSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required').max(500),
});

export type RejectSpecimenData = z.infer<typeof rejectSpecimenSchema>;

// =====================================================
// RESULT SCHEMAS
// =====================================================

/**
 * Schema for entering a lab result
 */
export const createLabResultSchema = z
  .object({
    orderItemId: z.string().min(1, 'Order item ID is required'),
    specimenId: z.string().optional().nullable(),
    resultValue: z.string().max(500).optional().nullable(),
    resultText: z.string().max(2000).optional().nullable(),
    units: z.string().max(50).optional().nullable(),
    referenceRange: z.string().max(200).optional().nullable(),
    abnormalFlag: AbnormalFlagEnum.optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),
  })
  .refine(
    (data) => data.resultValue || data.resultText,
    'Either resultValue or resultText is required',
  );

export type CreateLabResultData = z.infer<typeof createLabResultSchema>;

/**
 * Schema for updating a lab result
 */
export const updateLabResultSchema = z.object({
  resultValue: z.string().max(500).optional().nullable(),
  resultText: z.string().max(2000).optional().nullable(),
  units: z.string().max(50).optional().nullable(),
  referenceRange: z.string().max(200).optional().nullable(),
  abnormalFlag: AbnormalFlagEnum.optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export type UpdateLabResultData = z.infer<typeof updateLabResultSchema>;

// =====================================================
// CATALOG SCHEMAS (for admin)
// =====================================================

/**
 * Schema for creating/updating a lab test
 */
export const labTestSchema = z.object({
  code: z
    .string()
    .min(1, 'Code is required')
    .max(50)
    .refine(
      (val) => /^[A-Z0-9_-]+$/.test(val),
      'Code must be uppercase letters, numbers, underscores, or hyphens',
    ),
  name: z.string().min(1, 'Name is required').max(200),
  section: LabSectionEnum,
  specimenType: SpecimenTypeEnum,
  container: z.string().max(100).optional().nullable(),
  method: z.string().max(200).optional().nullable(),
  defaultUnits: z.string().max(50).optional().nullable(),
  referenceRange: z.record(z.string(), z.any()).optional().nullable(),
  turnaroundHours: z.number().int().positive().max(720).optional().nullable(),
  requiresFasting: z.boolean().default(false),
  requiresVerification: z.boolean().default(false),
  price: z.number().nonnegative('Price cannot be negative').default(0),
  isQuickPick: z.boolean().default(false),
  sortOrder: z.number().int().nonnegative().default(0),
  active: z.boolean().default(true),
});

export type LabTestData = z.infer<typeof labTestSchema>;

/**
 * Schema for creating/updating a lab panel
 */
export const labPanelSchema = z.object({
  code: z
    .string()
    .min(1, 'Code is required')
    .max(50)
    .refine(
      (val) => /^[A-Z0-9_-]+$/.test(val),
      'Code must be uppercase letters, numbers, underscores, or hyphens',
    ),
  name: z.string().min(1, 'Name is required').max(200),
  section: LabSectionEnum,
  description: z.string().max(500).optional().nullable(),
  price: z.number().nonnegative().default(0),
  isQuickPick: z.boolean().default(false),
  sortOrder: z.number().int().nonnegative().default(0),
  active: z.boolean().default(true),
  testIds: z.array(z.string()).min(1, 'At least one test is required'),
});

export type LabPanelData = z.infer<typeof labPanelSchema>;

// =====================================================
// DIGITAL ACCESS SCHEMA
// =====================================================

/**
 * Schema for generating result access token
 */
export const generateTokenSchema = z.object({
  expiresInHours: z.number().int().positive().max(168).default(48), // max 7 days
  maxViews: z.number().int().positive().max(100).default(10),
});

export type GenerateTokenData = z.infer<typeof generateTokenSchema>;

/**
 * Schema for sending results via email
 */
export const sendResultsEmailSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .refine((val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), 'Invalid email address'),
  includeFullResults: z.boolean().default(true),
});

export type SendResultsEmailData = z.infer<typeof sendResultsEmailSchema>;
