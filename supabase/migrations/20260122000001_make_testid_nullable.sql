-- Make testId nullable in LabOrderItem to support Loyverse integration
-- Loyverse tests don't have corresponding LabTest entries in our database

-- Drop the NOT NULL constraint on testId
ALTER TABLE "public"."LabOrderItem" 
  ALTER COLUMN "testId" DROP NOT NULL;

-- Add comment explaining why testId is nullable
COMMENT ON COLUMN "public"."LabOrderItem"."testId" IS 
  'Foreign key to LabTest table. Nullable to support Loyverse-sourced tests that may not have corresponding LabTest entries.';
