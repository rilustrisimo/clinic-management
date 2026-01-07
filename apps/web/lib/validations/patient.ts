import { z } from "zod";

/**
 * Patient form validation schema
 * Used for both create and update operations
 */
export const patientFormSchema = z.object({
  // Required fields
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(100, "First name must be less than 100 characters")
    .refine(
      (val) => val.trim().length > 0, 
      "First name is required"
    )
    .refine(
      (val) => /^[a-zA-Z\s\-'.]+$/.test(val.trim()),
      "First name can only contain letters, spaces, hyphens, and apostrophes"
    ),
  
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(100, "Last name must be less than 100 characters")
    .refine(
      (val) => val.trim().length > 0,
      "Last name is required"
    )
    .refine(
      (val) => /^[a-zA-Z\s\-'.]+$/.test(val.trim()),
      "Last name can only contain letters, spaces, hyphens, and apostrophes"
    ),
  
  // Optional fields
  middleName: z
    .string()
    .max(100, "Middle name must be less than 100 characters")
    .refine(
      (val) => !val || val.trim() === "" || /^[a-zA-Z\s\-'.]+$/.test(val.trim()),
      "Middle name can only contain letters, spaces, hyphens, and apostrophes"
    )
    .optional()
    .nullable(),
  
  mrn: z
    .string()
    .max(50, "MRN must be less than 50 characters")
    .refine(
      (val) => !val || val.trim() === "" || /^[A-Z0-9\-]+$/.test(val.trim()),
      "MRN can only contain uppercase letters, numbers, and hyphens"
    )
    .optional()
    .nullable()
    .or(z.literal("")),
  
  dob: z
    .string()
    .min(1, "Date of birth is required")
    .refine((val) => {
      const date = new Date(val);
      const now = new Date();
      return date <= now;
    }, "Date of birth cannot be in the future")
    .refine((val) => {
      const date = new Date(val);
      const minDate = new Date("1900-01-01");
      return date >= minDate;
    }, "Date of birth must be after January 1, 1900")
    .refine((val) => {
      const date = new Date(val);
      const age = Math.floor((new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
      return age <= 150;
    }, "Age cannot be more than 150 years"),
  
  gender: z
    .enum(["male", "female", "other"], {
      message: "Gender is required",
    }),
  
  email: z
    .string()
    .refine(
      (val) => !val || val.trim() === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim()),
      "Invalid email address"
    )
    .max(255, "Email must be less than 255 characters")
    .optional()
    .nullable()
    .or(z.literal("")),
  
  phone: z
    .string()
    .max(20, "Phone number must be less than 20 characters")
    .refine(
      (val) => !val || val.trim() === "" || /^[\d\s\-\+\(\)]+$/.test(val.trim()),
      "Phone number can only contain digits, spaces, hyphens, plus signs, and parentheses"
    )
    .refine((val) => {
      if (!val || val.trim() === "") return true; // Optional
      // Remove all non-digit characters and check length
      const digitsOnly = val.replace(/\D/g, "");
      return digitsOnly.length >= 7 && digitsOnly.length <= 15;
    }, "Phone number must have between 7 and 15 digits")
    .optional()
    .nullable()
    .or(z.literal("")),
  
  addressLine1: z
    .string()
    .max(255, "Address line 1 must be less than 255 characters")
    .optional()
    .nullable(),
  
  addressLine2: z
    .string()
    .max(255, "Address line 2 must be less than 255 characters")
    .optional()
    .nullable(),
});

export type PatientFormData = z.infer<typeof patientFormSchema>;

/**
 * API request schema for creating a patient
 * All fields are optional except firstName and lastName
 */
export const createPatientSchema = patientFormSchema;

/**
 * API request schema for updating a patient
 * Includes required metadata for versioning
 */
export const updatePatientSchema = patientFormSchema.extend({
  reason: z
    .string()
    .min(1, "Please provide a reason for this update")
    .max(500, "Reason must be less than 500 characters"),
});

export type UpdatePatientData = z.infer<typeof updatePatientSchema>;
