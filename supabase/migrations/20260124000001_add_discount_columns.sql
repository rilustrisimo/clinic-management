-- Migration: Add discount columns to LabOrder and Appointment tables
-- Supports both FIXED_PERCENT and FIXED_AMOUNT discount types from Loyverse

-- =====================================================
-- DISCOUNT COLUMNS FOR LAB ORDER
-- =====================================================

-- Add discount columns to LabOrder table
ALTER TABLE "public"."LabOrder"
  ADD COLUMN IF NOT EXISTS "subtotal" NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "discountId" TEXT,
  ADD COLUMN IF NOT EXISTS "discountName" TEXT,
  ADD COLUMN IF NOT EXISTS "discountType" TEXT,
  ADD COLUMN IF NOT EXISTS "discountValue" NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "discountAmount" NUMERIC(10,2) DEFAULT 0;

-- Add check constraint for discount type
DO $$ BEGIN
  ALTER TABLE "public"."LabOrder"
    ADD CONSTRAINT "LabOrder_discountType_check"
    CHECK ("discountType" IS NULL OR "discountType" IN ('FIXED_PERCENT', 'FIXED_AMOUNT'));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add index for discount queries
CREATE INDEX IF NOT EXISTS "LabOrder_discountId_idx" ON "public"."LabOrder"("discountId");

-- =====================================================
-- DISCOUNT COLUMNS FOR APPOINTMENT
-- =====================================================

-- Add discount columns to Appointment table
ALTER TABLE "public"."Appointment"
  ADD COLUMN IF NOT EXISTS "subtotal" NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "discountId" TEXT,
  ADD COLUMN IF NOT EXISTS "discountName" TEXT,
  ADD COLUMN IF NOT EXISTS "discountType" TEXT,
  ADD COLUMN IF NOT EXISTS "discountValue" NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "discountAmount" NUMERIC(10,2) DEFAULT 0;

-- Add check constraint for discount type
DO $$ BEGIN
  ALTER TABLE "public"."Appointment"
    ADD CONSTRAINT "Appointment_discountType_check"
    CHECK ("discountType" IS NULL OR "discountType" IN ('FIXED_PERCENT', 'FIXED_AMOUNT'));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add index for discount queries
CREATE INDEX IF NOT EXISTS "Appointment_discountId_idx" ON "public"."Appointment"("discountId");

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON COLUMN "public"."LabOrder"."subtotal" IS 'Sum of all item prices before discount';
COMMENT ON COLUMN "public"."LabOrder"."discountId" IS 'Loyverse discount ID';
COMMENT ON COLUMN "public"."LabOrder"."discountName" IS 'Snapshot of discount name at time of order';
COMMENT ON COLUMN "public"."LabOrder"."discountType" IS 'FIXED_PERCENT or FIXED_AMOUNT';
COMMENT ON COLUMN "public"."LabOrder"."discountValue" IS 'Percentage (0-100) or fixed amount in PHP';
COMMENT ON COLUMN "public"."LabOrder"."discountAmount" IS 'Calculated discount amount in PHP';

COMMENT ON COLUMN "public"."Appointment"."subtotal" IS 'Sum of all service prices before discount';
COMMENT ON COLUMN "public"."Appointment"."discountId" IS 'Loyverse discount ID';
COMMENT ON COLUMN "public"."Appointment"."discountName" IS 'Snapshot of discount name at time of booking';
COMMENT ON COLUMN "public"."Appointment"."discountType" IS 'FIXED_PERCENT or FIXED_AMOUNT';
COMMENT ON COLUMN "public"."Appointment"."discountValue" IS 'Percentage (0-100) or fixed amount in PHP';
COMMENT ON COLUMN "public"."Appointment"."discountAmount" IS 'Calculated discount amount in PHP';
