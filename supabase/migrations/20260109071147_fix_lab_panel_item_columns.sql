-- Migration: Fix missing columns in lab tables
-- Adds missing columns that should have been added in previous migrations
-- Keeps existing id column as PRIMARY KEY (from old schema)

-- Add missing columns to LabPanelItem (keep id as PK)
DO $$ BEGIN
  ALTER TABLE "public"."LabPanelItem" ADD COLUMN IF NOT EXISTS "required" boolean DEFAULT true;
  ALTER TABLE "public"."LabPanelItem" ADD COLUMN IF NOT EXISTS "sortOrder" integer DEFAULT 0;
EXCEPTION
  WHEN undefined_column THEN null;
  WHEN duplicate_column THEN null;
END $$;

-- Expand SpecimenType ENUM to include new values
DO $$ BEGIN
  -- Add new enum values if they don't exist
  ALTER TYPE "public"."SpecimenType" ADD VALUE IF NOT EXISTS 'swab';
  ALTER TYPE "public"."SpecimenType" ADD VALUE IF NOT EXISTS 'csf';
  ALTER TYPE "public"."SpecimenType" ADD VALUE IF NOT EXISTS 'tissue';
  ALTER TYPE "public"."SpecimenType" ADD VALUE IF NOT EXISTS 'sputum';
  ALTER TYPE "public"."SpecimenType" ADD VALUE IF NOT EXISTS 'other';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
