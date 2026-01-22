-- Move SOAP notes from Patient to Appointment table
-- SOAP notes should be per-appointment, not per-patient
-- This allows tracking clinical documentation for each visit

-- Add SOAP fields to Appointment table
ALTER TABLE "public"."Appointment"
ADD COLUMN IF NOT EXISTS "soapSubjective" TEXT,
ADD COLUMN IF NOT EXISTS "soapObjective" TEXT,
ADD COLUMN IF NOT EXISTS "soapAssessment" TEXT,
ADD COLUMN IF NOT EXISTS "soapPlan" TEXT;

-- Add comments for documentation
COMMENT ON COLUMN "public"."Appointment"."soapSubjective" IS 'S - Subjective: What the patient says (chief complaint, symptoms, history)';
COMMENT ON COLUMN "public"."Appointment"."soapObjective" IS 'O - Objective: What is observed or measured (vitals, exam findings, lab results)';
COMMENT ON COLUMN "public"."Appointment"."soapAssessment" IS 'A - Assessment: Clinical judgment and diagnosis';
COMMENT ON COLUMN "public"."Appointment"."soapPlan" IS 'P - Plan: Treatment plan, medications, follow-up';

-- Remove SOAP fields from Patient table (they were incorrectly placed there)
ALTER TABLE "public"."Patient"
DROP COLUMN IF EXISTS "soapSubjective",
DROP COLUMN IF EXISTS "soapObjective",
DROP COLUMN IF EXISTS "soapAssessment",
DROP COLUMN IF EXISTS "soapPlan";
