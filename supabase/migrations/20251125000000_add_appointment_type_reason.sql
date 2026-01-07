-- Add type and reason columns to Appointment table
-- These fields allow capturing the appointment type and reason for visit

ALTER TABLE "public"."Appointment" 
  ADD COLUMN IF NOT EXISTS "type" TEXT,
  ADD COLUMN IF NOT EXISTS "reason" TEXT;

-- Add comment for documentation
COMMENT ON COLUMN "public"."Appointment"."type" IS 'Type of appointment: consultation, follow_up, procedure, checkup, etc.';
COMMENT ON COLUMN "public"."Appointment"."reason" IS 'Reason for the visit or appointment';
