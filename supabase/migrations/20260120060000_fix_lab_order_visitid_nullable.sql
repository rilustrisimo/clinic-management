-- Fix: Allow visitId to be NULL in LabOrder table
-- Lab orders can be created without a visit (walk-in lab patients)

-- Drop the NOT NULL constraint on visitId if it exists
ALTER TABLE "public"."LabOrder"
ALTER COLUMN "visitId" DROP NOT NULL;

-- Also ensure appointmentId and orderingProviderId are nullable
ALTER TABLE "public"."LabOrder"
ALTER COLUMN "appointmentId" DROP NOT NULL;

ALTER TABLE "public"."LabOrder"
ALTER COLUMN "orderingProviderId" DROP NOT NULL;

-- Verify the column is now nullable by adding a comment
COMMENT ON COLUMN "public"."LabOrder"."visitId" IS 'Optional - NULL for walk-in lab orders';
