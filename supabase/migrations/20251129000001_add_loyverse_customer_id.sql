-- Add loyverse_customer_id to Patient table

ALTER TABLE "public"."Patient" 
ADD COLUMN IF NOT EXISTS "loyverse_customer_id" TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS "idx_patient_loyverse_customer_id" 
ON "public"."Patient"("loyverse_customer_id");

-- Add comment
COMMENT ON COLUMN "public"."Patient"."loyverse_customer_id" IS 'Loyverse customer ID for sync';
