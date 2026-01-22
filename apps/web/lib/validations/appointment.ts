import { z } from 'zod';

/**
 * Appointment status enum
 */
export const AppointmentStatusEnum = z.enum([
  'scheduled',
  'confirmed',
  'arrived',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
]);

export type AppointmentStatus = z.infer<typeof AppointmentStatusEnum>;

/**
 * Appointment type enum
 */
export const AppointmentTypeEnum = z.enum([
  'consultation',
  'follow_up',
  'procedure',
  'lab_visit',
  'other',
]);

export type AppointmentType = z.infer<typeof AppointmentTypeEnum>;

/**
 * SOAP Notes validation schema
 * Used for clinical documentation per appointment
 */
export const soapNotesSchema = z.object({
  soapSubjective: z
    .string()
    .max(5000, 'Subjective section must be less than 5000 characters')
    .optional()
    .nullable(),

  soapObjective: z
    .string()
    .max(5000, 'Objective section must be less than 5000 characters')
    .optional()
    .nullable(),

  soapAssessment: z
    .string()
    .max(5000, 'Assessment section must be less than 5000 characters')
    .optional()
    .nullable(),

  soapPlan: z
    .string()
    .max(5000, 'Plan section must be less than 5000 characters')
    .optional()
    .nullable(),
});

export type SoapNotesData = z.infer<typeof soapNotesSchema>;

/**
 * Service modifier schema
 */
export const serviceModifierSchema = z.object({
  modifierId: z.string(),
  optionId: z.string(),
  modifierName: z.string().optional().nullable(),
  optionName: z.string().optional().nullable(),
  price: z.number().default(0),
});

/**
 * Appointment service schema
 */
export const appointmentServiceSchema = z.object({
  itemId: z.string(),
  variantId: z.string().optional().nullable(),
  itemName: z.string().optional().nullable(),
  variantName: z.string().optional().nullable(),
  basePrice: z.number().default(0),
  modifiers: z.array(serviceModifierSchema).optional(),
});

/**
 * Create appointment schema
 */
export const createAppointmentSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  providerId: z.string().optional().nullable(),
  start: z.string().min(1, 'Start time is required'),
  end: z.string().min(1, 'End time is required'),
  type: AppointmentTypeEnum.optional(),
  reason: z.string().max(500, 'Reason must be less than 500 characters').optional().nullable(),
  notes: z.string().max(2000, 'Notes must be less than 2000 characters').optional().nullable(),
  services: z.array(appointmentServiceSchema).optional(),
  totalPrice: z.number().optional(),
});

export type CreateAppointmentData = z.infer<typeof createAppointmentSchema>;

/**
 * Update appointment schema (includes SOAP notes)
 */
export const updateAppointmentSchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
  type: AppointmentTypeEnum.optional(),
  reason: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  status: AppointmentStatusEnum.optional(),
  providerId: z.string().optional().nullable(),
  services: z.array(appointmentServiceSchema).optional(),
  totalPrice: z.number().optional(),
  // SOAP Notes
  ...soapNotesSchema.shape,
});

export type UpdateAppointmentData = z.infer<typeof updateAppointmentSchema>;

/**
 * Update SOAP notes only schema
 */
export const updateSoapNotesSchema = soapNotesSchema;

export type UpdateSoapNotesData = z.infer<typeof updateSoapNotesSchema>;
