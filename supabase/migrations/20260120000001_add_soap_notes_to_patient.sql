-- Add SOAP notes fields to Patient table
-- SOAP: Subjective, Objective, Assessment, Plan
-- Provides structured clinical documentation instead of generic notes

ALTER TABLE "public"."Patient"
ADD COLUMN IF NOT EXISTS "soapSubjective" TEXT,
ADD COLUMN IF NOT EXISTS "soapObjective" TEXT,
ADD COLUMN IF NOT EXISTS "soapAssessment" TEXT,
ADD COLUMN IF NOT EXISTS "soapPlan" TEXT;

COMMENT ON COLUMN "public"."Patient"."soapSubjective" IS 'S - Subjective: What the patient says (chief complaint, symptoms, history)';
COMMENT ON COLUMN "public"."Patient"."soapObjective" IS 'O - Objective: What is observed or measured (vitals, exam findings, lab results)';
COMMENT ON COLUMN "public"."Patient"."soapAssessment" IS 'A - Assessment: Clinical judgment and diagnosis';
COMMENT ON COLUMN "public"."Patient"."soapPlan" IS 'P - Plan: Treatment plan, medications, follow-up';
