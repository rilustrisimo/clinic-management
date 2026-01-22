-- Add Loyverse columns to LabOrderItem table
-- These columns store the Loyverse modifier option IDs for lab tests

ALTER TABLE "public"."LabOrderItem"
ADD COLUMN IF NOT EXISTS "loyverseOptionId" TEXT,
ADD COLUMN IF NOT EXISTS "loyverseModifierId" TEXT,
ADD COLUMN IF NOT EXISTS "specimenType" TEXT DEFAULT 'blood';

-- Add comment for documentation
COMMENT ON COLUMN "public"."LabOrderItem"."loyverseOptionId" IS 'Loyverse modifier option ID for this test';
COMMENT ON COLUMN "public"."LabOrderItem"."loyverseModifierId" IS 'Loyverse modifier ID (test category)';
COMMENT ON COLUMN "public"."LabOrderItem"."specimenType" IS 'Type of specimen required for this test';

-- Create index for Loyverse lookups
CREATE INDEX IF NOT EXISTS "idx_lab_order_item_loyverse_option" ON "public"."LabOrderItem"("loyverseOptionId");
