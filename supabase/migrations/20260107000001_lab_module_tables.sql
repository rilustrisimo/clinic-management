-- Migration: Lab Module Tables
-- Creates all tables needed for laboratory workflow
-- Made idempotent with IF NOT EXISTS checks

-- =====================================================
-- ENUMS (with IF NOT EXISTS checks)
-- =====================================================

-- Lab test sections
DO $$ BEGIN
  CREATE TYPE "public"."LabSection" AS ENUM (
    'hematology',
    'chemistry',
    'urinalysis',
    'serology',
    'fecalysis',
    'microbiology',
    'drug_testing',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Specimen types
DO $$ BEGIN
  CREATE TYPE "public"."SpecimenType" AS ENUM (
    'blood',
    'urine',
    'stool',
    'swab',
    'csf',
    'tissue',
    'sputum',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Lab order status (includes payment gate)
DO $$ BEGIN
  CREATE TYPE "public"."LabOrderStatus" AS ENUM (
    'pending_payment',
    'paid',
    'collecting',
    'collected',
    'processing',
    'completed',
    'verified',
    'released',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Payment status
DO $$ BEGIN
  CREATE TYPE "public"."PaymentStatus" AS ENUM (
    'unpaid',
    'paid',
    'partial',
    'refunded'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Lab order priority
DO $$ BEGIN
  CREATE TYPE "public"."LabPriority" AS ENUM (
    'routine',
    'urgent',
    'stat'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Specimen status
DO $$ BEGIN
  CREATE TYPE "public"."SpecimenStatus" AS ENUM (
    'pending',
    'collected',
    'received',
    'rejected',
    'processing',
    'completed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Abnormal flags
DO $$ BEGIN
  CREATE TYPE "public"."AbnormalFlag" AS ENUM (
    'N',
    'L',
    'H',
    'LL',
    'HH',
    'A'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- LAB CATALOG TABLES
-- =====================================================

-- Lab Tests
CREATE TABLE IF NOT EXISTS "public"."LabTest" (
  "id" text PRIMARY KEY,
  "code" text UNIQUE NOT NULL,
  "name" text NOT NULL,
  "section" "public"."LabSection" NOT NULL DEFAULT 'other',
  "specimenType" "public"."SpecimenType" NOT NULL DEFAULT 'blood',
  "container" text,
  "method" text,
  "defaultUnits" text,
  "referenceRange" jsonb,
  "turnaroundHours" integer DEFAULT 24,
  "requiresFasting" boolean DEFAULT false,
  "requiresVerification" boolean DEFAULT false,
  "price" numeric(10,2) DEFAULT 0,
  "isQuickPick" boolean DEFAULT false,
  "sortOrder" integer DEFAULT 0,
  "active" boolean DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

-- Add missing columns to LabTest if they don't exist
DO $$ BEGIN
  ALTER TABLE "public"."LabTest" ADD COLUMN IF NOT EXISTS "section" "public"."LabSection" NOT NULL DEFAULT 'other';
  ALTER TABLE "public"."LabTest" ADD COLUMN IF NOT EXISTS "specimenType" "public"."SpecimenType" NOT NULL DEFAULT 'blood';
  ALTER TABLE "public"."LabTest" ADD COLUMN IF NOT EXISTS "container" text;
  ALTER TABLE "public"."LabTest" ADD COLUMN IF NOT EXISTS "method" text;
  ALTER TABLE "public"."LabTest" ADD COLUMN IF NOT EXISTS "defaultUnits" text;
  ALTER TABLE "public"."LabTest" ADD COLUMN IF NOT EXISTS "referenceRange" jsonb;
  ALTER TABLE "public"."LabTest" ADD COLUMN IF NOT EXISTS "turnaroundHours" integer DEFAULT 24;
  ALTER TABLE "public"."LabTest" ADD COLUMN IF NOT EXISTS "requiresFasting" boolean DEFAULT false;
  ALTER TABLE "public"."LabTest" ADD COLUMN IF NOT EXISTS "requiresVerification" boolean DEFAULT false;
  ALTER TABLE "public"."LabTest" ADD COLUMN IF NOT EXISTS "price" numeric(10,2) DEFAULT 0;
  ALTER TABLE "public"."LabTest" ADD COLUMN IF NOT EXISTS "isQuickPick" boolean DEFAULT false;
  ALTER TABLE "public"."LabTest" ADD COLUMN IF NOT EXISTS "sortOrder" integer DEFAULT 0;
  ALTER TABLE "public"."LabTest" ADD COLUMN IF NOT EXISTS "active" boolean DEFAULT true;
  ALTER TABLE "public"."LabTest" ADD COLUMN IF NOT EXISTS "createdAt" timestamp NOT NULL DEFAULT now();
  ALTER TABLE "public"."LabTest" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp NOT NULL DEFAULT now();
EXCEPTION
  WHEN undefined_column THEN null;
  WHEN duplicate_column THEN null;
END $$;

-- Lab Panels (groups of tests)
CREATE TABLE IF NOT EXISTS "public"."LabPanel" (
  "id" text PRIMARY KEY,
  "code" text UNIQUE NOT NULL,
  "name" text NOT NULL,
  "section" "public"."LabSection" NOT NULL DEFAULT 'other',
  "description" text,
  "price" numeric(10,2) DEFAULT 0,
  "isQuickPick" boolean DEFAULT false,
  "sortOrder" integer DEFAULT 0,
  "active" boolean DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

-- Add missing columns to LabPanel if they don't exist
DO $$ BEGIN
  ALTER TABLE "public"."LabPanel" ADD COLUMN IF NOT EXISTS "section" "public"."LabSection" NOT NULL DEFAULT 'other';
  ALTER TABLE "public"."LabPanel" ADD COLUMN IF NOT EXISTS "description" text;
  ALTER TABLE "public"."LabPanel" ADD COLUMN IF NOT EXISTS "price" numeric(10,2) DEFAULT 0;
  ALTER TABLE "public"."LabPanel" ADD COLUMN IF NOT EXISTS "isQuickPick" boolean DEFAULT false;
  ALTER TABLE "public"."LabPanel" ADD COLUMN IF NOT EXISTS "sortOrder" integer DEFAULT 0;
  ALTER TABLE "public"."LabPanel" ADD COLUMN IF NOT EXISTS "active" boolean DEFAULT true;
  ALTER TABLE "public"."LabPanel" ADD COLUMN IF NOT EXISTS "createdAt" timestamp NOT NULL DEFAULT now();
  ALTER TABLE "public"."LabPanel" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp NOT NULL DEFAULT now();
EXCEPTION
  WHEN undefined_column THEN null;
  WHEN duplicate_column THEN null;
END $$;

-- Panel Items (tests in a panel)
CREATE TABLE IF NOT EXISTS "public"."LabPanelItem" (
  "panelId" text NOT NULL,
  "testId" text NOT NULL,
  "required" boolean DEFAULT true,
  "sortOrder" integer DEFAULT 0,
  PRIMARY KEY ("panelId", "testId")
);

-- Add missing columns to LabPanelItem if they don't exist
DO $$ BEGIN
  ALTER TABLE "public"."LabPanelItem" ADD COLUMN IF NOT EXISTS "required" boolean DEFAULT true;
  ALTER TABLE "public"."LabPanelItem" ADD COLUMN IF NOT EXISTS "sortOrder" integer DEFAULT 0;
EXCEPTION
  WHEN undefined_column THEN null;
  WHEN duplicate_column THEN null;
END $$;

-- Add foreign keys if they don't exist
DO $$ BEGIN
  ALTER TABLE "public"."LabPanelItem"
    ADD CONSTRAINT "LabPanelItem_panelId_fkey"
    FOREIGN KEY ("panelId") REFERENCES "public"."LabPanel"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "public"."LabPanelItem"
    ADD CONSTRAINT "LabPanelItem_testId_fkey"
    FOREIGN KEY ("testId") REFERENCES "public"."LabTest"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- LAB ORDER TABLES
-- =====================================================

-- Lab Orders
CREATE TABLE IF NOT EXISTS "public"."LabOrder" (
  "id" text PRIMARY KEY,
  "orderNumber" text UNIQUE NOT NULL,
  "patientId" text NOT NULL,
  "visitId" text,
  "appointmentId" text,
  "orderingProviderId" text,
  "priority" "public"."LabPriority" NOT NULL DEFAULT 'routine',
  "status" "public"."LabOrderStatus" NOT NULL DEFAULT 'pending_payment',
  "paymentStatus" "public"."PaymentStatus" NOT NULL DEFAULT 'unpaid',
  "paymentReference" text,
  "paidAt" timestamp,
  "totalAmount" numeric(10,2) DEFAULT 0,
  "notes" text,
  "placedAt" timestamp NOT NULL DEFAULT now(),
  "createdById" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

-- Add missing columns if they don't exist (for partial migrations)
DO $$ BEGIN
  ALTER TABLE "public"."LabOrder" ADD COLUMN IF NOT EXISTS "orderNumber" text UNIQUE;
  ALTER TABLE "public"."LabOrder" ADD COLUMN IF NOT EXISTS "appointmentId" text;
  ALTER TABLE "public"."LabOrder" ADD COLUMN IF NOT EXISTS "visitId" text;
  ALTER TABLE "public"."LabOrder" ADD COLUMN IF NOT EXISTS "orderingProviderId" text;
  ALTER TABLE "public"."LabOrder" ADD COLUMN IF NOT EXISTS "priority" "public"."LabPriority" DEFAULT 'routine';
  ALTER TABLE "public"."LabOrder" ADD COLUMN IF NOT EXISTS "status" "public"."LabOrderStatus" DEFAULT 'pending_payment';
  ALTER TABLE "public"."LabOrder" ADD COLUMN IF NOT EXISTS "paymentStatus" "public"."PaymentStatus" DEFAULT 'unpaid';
  ALTER TABLE "public"."LabOrder" ADD COLUMN IF NOT EXISTS "paymentReference" text;
  ALTER TABLE "public"."LabOrder" ADD COLUMN IF NOT EXISTS "paidAt" timestamp;
  ALTER TABLE "public"."LabOrder" ADD COLUMN IF NOT EXISTS "createdById" text;
  ALTER TABLE "public"."LabOrder" ADD COLUMN IF NOT EXISTS "placedAt" timestamp NOT NULL DEFAULT now();
  ALTER TABLE "public"."LabOrder" ADD COLUMN IF NOT EXISTS "totalAmount" numeric(10,2) DEFAULT 0;
  ALTER TABLE "public"."LabOrder" ADD COLUMN IF NOT EXISTS "notes" text;
  ALTER TABLE "public"."LabOrder" ADD COLUMN IF NOT EXISTS "createdAt" timestamp NOT NULL DEFAULT now();
  ALTER TABLE "public"."LabOrder" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp NOT NULL DEFAULT now();
EXCEPTION
  WHEN undefined_column THEN null;
  WHEN duplicate_column THEN null;
END $$;

-- Add foreign keys for LabOrder
DO $$ BEGIN
  ALTER TABLE "public"."LabOrder"
    ADD CONSTRAINT "LabOrder_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Note: Visit table has been dropped, so we comment out this foreign key
-- DO $$ BEGIN
--   ALTER TABLE "public"."LabOrder"
--     ADD CONSTRAINT "LabOrder_visitId_fkey"
--     FOREIGN KEY ("visitId") REFERENCES "public"."Visit"("id") ON DELETE SET NULL;
-- EXCEPTION
--   WHEN duplicate_object THEN null;
-- END $$;

DO $$ BEGIN
  ALTER TABLE "public"."LabOrder"
    ADD CONSTRAINT "LabOrder_appointmentId_fkey"
    FOREIGN KEY ("appointmentId") REFERENCES "public"."Appointment"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "public"."LabOrder"
    ADD CONSTRAINT "LabOrder_orderingProviderId_fkey"
    FOREIGN KEY ("orderingProviderId") REFERENCES "public"."User"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "public"."LabOrder"
    ADD CONSTRAINT "LabOrder_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Lab Order Items
CREATE TABLE IF NOT EXISTS "public"."LabOrderItem" (
  "id" text PRIMARY KEY,
  "orderId" text NOT NULL,
  "testId" text,
  "panelId" text,
  "testCode" text NOT NULL,
  "testName" text NOT NULL,
  "section" "public"."LabSection" NOT NULL,
  "status" text DEFAULT 'pending',
  "priceSnapshot" numeric(10,2) DEFAULT 0,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

-- Add missing columns for LabOrderItem
DO $$ BEGIN
  ALTER TABLE "public"."LabOrderItem" ADD COLUMN IF NOT EXISTS "panelId" text;
  ALTER TABLE "public"."LabOrderItem" ADD COLUMN IF NOT EXISTS "testId" text;
  ALTER TABLE "public"."LabOrderItem" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'pending';
  ALTER TABLE "public"."LabOrderItem" ADD COLUMN IF NOT EXISTS "priceSnapshot" numeric(10,2) DEFAULT 0;
  ALTER TABLE "public"."LabOrderItem" ADD COLUMN IF NOT EXISTS "testCode" text;
  ALTER TABLE "public"."LabOrderItem" ADD COLUMN IF NOT EXISTS "testName" text;
  ALTER TABLE "public"."LabOrderItem" ADD COLUMN IF NOT EXISTS "section" "public"."LabSection";
  ALTER TABLE "public"."LabOrderItem" ADD COLUMN IF NOT EXISTS "createdAt" timestamp NOT NULL DEFAULT now();
EXCEPTION
  WHEN undefined_column THEN null;
  WHEN duplicate_column THEN null;
END $$;

-- Add foreign keys for LabOrderItem
DO $$ BEGIN
  ALTER TABLE "public"."LabOrderItem"
    ADD CONSTRAINT "LabOrderItem_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "public"."LabOrder"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "public"."LabOrderItem"
    ADD CONSTRAINT "LabOrderItem_testId_fkey"
    FOREIGN KEY ("testId") REFERENCES "public"."LabTest"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "public"."LabOrderItem"
    ADD CONSTRAINT "LabOrderItem_panelId_fkey"
    FOREIGN KEY ("panelId") REFERENCES "public"."LabPanel"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- SPECIMEN TABLES
-- =====================================================

-- Specimens
CREATE TABLE IF NOT EXISTS "public"."Specimen" (
  "id" text PRIMARY KEY,
  "accessionNo" text UNIQUE NOT NULL,
  "orderId" text NOT NULL,
  "orderItemId" text,
  "specimenType" "public"."SpecimenType" NOT NULL,
  "container" text,
  "volumeMl" numeric(5,2),
  "appearance" text,
  "collectionNotes" text,
  "collectedAt" timestamp,
  "collectedById" text,
  "receivedAt" timestamp,
  "receivedById" text,
  "status" "public"."SpecimenStatus" NOT NULL DEFAULT 'pending',
  "rejectedReason" text,
  "rejectedAt" timestamp,
  "rejectedById" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

-- Add missing columns for Specimen
DO $$ BEGIN
  ALTER TABLE "public"."Specimen" ADD COLUMN IF NOT EXISTS "orderItemId" text;
  ALTER TABLE "public"."Specimen" ADD COLUMN IF NOT EXISTS "container" text;
  ALTER TABLE "public"."Specimen" ADD COLUMN IF NOT EXISTS "volumeMl" numeric(5,2);
  ALTER TABLE "public"."Specimen" ADD COLUMN IF NOT EXISTS "appearance" text;
  ALTER TABLE "public"."Specimen" ADD COLUMN IF NOT EXISTS "collectionNotes" text;
  ALTER TABLE "public"."Specimen" ADD COLUMN IF NOT EXISTS "collectedAt" timestamp;
  ALTER TABLE "public"."Specimen" ADD COLUMN IF NOT EXISTS "collectedById" text;
  ALTER TABLE "public"."Specimen" ADD COLUMN IF NOT EXISTS "receivedAt" timestamp;
  ALTER TABLE "public"."Specimen" ADD COLUMN IF NOT EXISTS "receivedById" text;
  ALTER TABLE "public"."Specimen" ADD COLUMN IF NOT EXISTS "rejectedReason" text;
  ALTER TABLE "public"."Specimen" ADD COLUMN IF NOT EXISTS "rejectedAt" timestamp;
  ALTER TABLE "public"."Specimen" ADD COLUMN IF NOT EXISTS "rejectedById" text;
  ALTER TABLE "public"."Specimen" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp DEFAULT now();
  ALTER TABLE "public"."Specimen" ADD COLUMN IF NOT EXISTS "createdAt" timestamp NOT NULL DEFAULT now();
  ALTER TABLE "public"."Specimen" ADD COLUMN IF NOT EXISTS "status" "public"."SpecimenStatus" NOT NULL DEFAULT 'pending';
  ALTER TABLE "public"."Specimen" ADD COLUMN IF NOT EXISTS "specimenType" "public"."SpecimenType";
  ALTER TABLE "public"."Specimen" ADD COLUMN IF NOT EXISTS "accessionNo" text;
EXCEPTION
  WHEN undefined_column THEN null;
  WHEN duplicate_column THEN null;
END $$;

-- Add foreign keys for Specimen
DO $$ BEGIN
  ALTER TABLE "public"."Specimen"
    ADD CONSTRAINT "Specimen_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "public"."LabOrder"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "public"."Specimen"
    ADD CONSTRAINT "Specimen_orderItemId_fkey"
    FOREIGN KEY ("orderItemId") REFERENCES "public"."LabOrderItem"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "public"."Specimen"
    ADD CONSTRAINT "Specimen_collectedById_fkey"
    FOREIGN KEY ("collectedById") REFERENCES "public"."User"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "public"."Specimen"
    ADD CONSTRAINT "Specimen_receivedById_fkey"
    FOREIGN KEY ("receivedById") REFERENCES "public"."User"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "public"."Specimen"
    ADD CONSTRAINT "Specimen_rejectedById_fkey"
    FOREIGN KEY ("rejectedById") REFERENCES "public"."User"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Specimen Events (audit trail)
CREATE TABLE IF NOT EXISTS "public"."SpecimenEvent" (
  "id" text PRIMARY KEY,
  "specimenId" text NOT NULL,
  "eventType" text NOT NULL,
  "details" jsonb,
  "performedAt" timestamp NOT NULL DEFAULT now(),
  "performedById" text,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

-- Add missing columns if they don't exist
DO $$ BEGIN
  ALTER TABLE "public"."SpecimenEvent" ADD COLUMN IF NOT EXISTS "performedById" text;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "public"."SpecimenEvent" ADD COLUMN IF NOT EXISTS "performedAt" timestamp NOT NULL DEFAULT now();
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- Add foreign keys for SpecimenEvent
DO $$ BEGIN
  ALTER TABLE "public"."SpecimenEvent"
    ADD CONSTRAINT "SpecimenEvent_specimenId_fkey"
    FOREIGN KEY ("specimenId") REFERENCES "public"."Specimen"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "public"."SpecimenEvent"
    ADD CONSTRAINT "SpecimenEvent_performedById_fkey"
    FOREIGN KEY ("performedById") REFERENCES "public"."User"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- RESULTS TABLES
-- =====================================================

-- Lab Results
CREATE TABLE IF NOT EXISTS "public"."LabResult" (
  "id" text PRIMARY KEY,
  "orderItemId" text NOT NULL,
  "specimenId" text,
  "resultValue" text,
  "resultText" text,
  "units" text,
  "referenceRange" text,
  "abnormalFlag" "public"."AbnormalFlag",
  "notes" text,
  "enteredById" text,
  "enteredAt" timestamp NOT NULL DEFAULT now(),
  "verifiedById" text,
  "verifiedAt" timestamp,
  "releasedAt" timestamp,
  "releasedById" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

-- Add missing columns for LabResult
DO $$ BEGIN
  ALTER TABLE "public"."LabResult" ADD COLUMN IF NOT EXISTS "specimenId" text;
  ALTER TABLE "public"."LabResult" ADD COLUMN IF NOT EXISTS "resultValue" text;
  ALTER TABLE "public"."LabResult" ADD COLUMN IF NOT EXISTS "resultText" text;
  ALTER TABLE "public"."LabResult" ADD COLUMN IF NOT EXISTS "units" text;
  ALTER TABLE "public"."LabResult" ADD COLUMN IF NOT EXISTS "referenceRange" text;
  ALTER TABLE "public"."LabResult" ADD COLUMN IF NOT EXISTS "abnormalFlag" "public"."AbnormalFlag";
  ALTER TABLE "public"."LabResult" ADD COLUMN IF NOT EXISTS "notes" text;
  ALTER TABLE "public"."LabResult" ADD COLUMN IF NOT EXISTS "enteredById" text;
  ALTER TABLE "public"."LabResult" ADD COLUMN IF NOT EXISTS "enteredAt" timestamp DEFAULT now();
  ALTER TABLE "public"."LabResult" ADD COLUMN IF NOT EXISTS "verifiedById" text;
  ALTER TABLE "public"."LabResult" ADD COLUMN IF NOT EXISTS "verifiedAt" timestamp;
  ALTER TABLE "public"."LabResult" ADD COLUMN IF NOT EXISTS "releasedAt" timestamp;
  ALTER TABLE "public"."LabResult" ADD COLUMN IF NOT EXISTS "releasedById" text;
  ALTER TABLE "public"."LabResult" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp DEFAULT now();
EXCEPTION
  WHEN undefined_column THEN null;
  WHEN duplicate_column THEN null;
END $$;

-- Add foreign keys for LabResult
DO $$ BEGIN
  ALTER TABLE "public"."LabResult"
    ADD CONSTRAINT "LabResult_orderItemId_fkey"
    FOREIGN KEY ("orderItemId") REFERENCES "public"."LabOrderItem"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "public"."LabResult"
    ADD CONSTRAINT "LabResult_specimenId_fkey"
    FOREIGN KEY ("specimenId") REFERENCES "public"."Specimen"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "public"."LabResult"
    ADD CONSTRAINT "LabResult_enteredById_fkey"
    FOREIGN KEY ("enteredById") REFERENCES "public"."User"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "public"."LabResult"
    ADD CONSTRAINT "LabResult_verifiedById_fkey"
    FOREIGN KEY ("verifiedById") REFERENCES "public"."User"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "public"."LabResult"
    ADD CONSTRAINT "LabResult_releasedById_fkey"
    FOREIGN KEY ("releasedById") REFERENCES "public"."User"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- DIGITAL ACCESS TABLES
-- =====================================================

-- Lab Result Access Tokens
CREATE TABLE IF NOT EXISTS "public"."LabResultToken" (
  "id" text PRIMARY KEY,
  "orderId" text NOT NULL,
  "token" text UNIQUE NOT NULL,
  "expiresAt" timestamp NOT NULL,
  "maxViews" integer DEFAULT 10,
  "viewCount" integer DEFAULT 0,
  "lastViewedAt" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

-- Add foreign key for LabResultToken
DO $$ BEGIN
  ALTER TABLE "public"."LabResultToken"
    ADD CONSTRAINT "LabResultToken_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "public"."LabOrder"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- INDEXES (IF NOT EXISTS)
-- =====================================================

CREATE INDEX IF NOT EXISTS "LabTest_section_idx" ON "public"."LabTest"("section");
CREATE INDEX IF NOT EXISTS "LabTest_active_idx" ON "public"."LabTest"("active");
CREATE INDEX IF NOT EXISTS "LabTest_isQuickPick_idx" ON "public"."LabTest"("isQuickPick");

CREATE INDEX IF NOT EXISTS "LabPanel_section_idx" ON "public"."LabPanel"("section");
CREATE INDEX IF NOT EXISTS "LabPanel_active_idx" ON "public"."LabPanel"("active");
CREATE INDEX IF NOT EXISTS "LabPanel_isQuickPick_idx" ON "public"."LabPanel"("isQuickPick");

CREATE INDEX IF NOT EXISTS "LabOrder_patientId_idx" ON "public"."LabOrder"("patientId");
CREATE INDEX IF NOT EXISTS "LabOrder_visitId_idx" ON "public"."LabOrder"("visitId");
CREATE INDEX IF NOT EXISTS "LabOrder_appointmentId_idx" ON "public"."LabOrder"("appointmentId");
CREATE INDEX IF NOT EXISTS "LabOrder_status_idx" ON "public"."LabOrder"("status");
CREATE INDEX IF NOT EXISTS "LabOrder_paymentStatus_idx" ON "public"."LabOrder"("paymentStatus");
CREATE INDEX IF NOT EXISTS "LabOrder_placedAt_idx" ON "public"."LabOrder"("placedAt");
CREATE INDEX IF NOT EXISTS "LabOrder_orderNumber_idx" ON "public"."LabOrder"("orderNumber");

CREATE INDEX IF NOT EXISTS "LabOrderItem_orderId_idx" ON "public"."LabOrderItem"("orderId");
CREATE INDEX IF NOT EXISTS "LabOrderItem_testId_idx" ON "public"."LabOrderItem"("testId");
CREATE INDEX IF NOT EXISTS "LabOrderItem_status_idx" ON "public"."LabOrderItem"("status");

CREATE INDEX IF NOT EXISTS "Specimen_orderId_idx" ON "public"."Specimen"("orderId");
CREATE INDEX IF NOT EXISTS "Specimen_status_idx" ON "public"."Specimen"("status");
CREATE INDEX IF NOT EXISTS "Specimen_accessionNo_idx" ON "public"."Specimen"("accessionNo");

CREATE INDEX IF NOT EXISTS "SpecimenEvent_specimenId_idx" ON "public"."SpecimenEvent"("specimenId");

CREATE INDEX IF NOT EXISTS "LabResult_orderItemId_idx" ON "public"."LabResult"("orderItemId");
CREATE INDEX IF NOT EXISTS "LabResult_specimenId_idx" ON "public"."LabResult"("specimenId");
CREATE INDEX IF NOT EXISTS "LabResult_abnormalFlag_idx" ON "public"."LabResult"("abnormalFlag");

CREATE INDEX IF NOT EXISTS "LabResultToken_token_idx" ON "public"."LabResultToken"("token");
CREATE INDEX IF NOT EXISTS "LabResultToken_orderId_idx" ON "public"."LabResultToken"("orderId");
CREATE INDEX IF NOT EXISTS "LabResultToken_expiresAt_idx" ON "public"."LabResultToken"("expiresAt");

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_lab_order_number()
RETURNS text AS $$
DECLARE
  today_date text;
  seq_num integer;
  new_order_number text;
BEGIN
  today_date := to_char(CURRENT_DATE, 'YYYYMMDD');
  SELECT COALESCE(MAX(
    CAST(SUBSTRING("orderNumber" FROM 'LAB-' || today_date || '-(\d+)') AS integer)
  ), 0) + 1
  INTO seq_num
  FROM "public"."LabOrder"
  WHERE "orderNumber" LIKE 'LAB-' || today_date || '-%';
  new_order_number := 'LAB-' || today_date || '-' || LPAD(seq_num::text, 4, '0');
  RETURN new_order_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate accession number
CREATE OR REPLACE FUNCTION generate_accession_number()
RETURNS text AS $$
DECLARE
  today_date text;
  seq_num integer;
  new_accession_no text;
BEGIN
  today_date := to_char(CURRENT_DATE, 'YYYYMMDD');
  SELECT COALESCE(MAX(
    CAST(SUBSTRING("accessionNo" FROM 'ACC-' || today_date || '-(\d+)') AS integer)
  ), 0) + 1
  INTO seq_num
  FROM "public"."Specimen"
  WHERE "accessionNo" LIKE 'ACC-' || today_date || '-%';
  new_accession_no := 'ACC-' || today_date || '-' || LPAD(seq_num::text, 4, '0');
  RETURN new_accession_no;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for updatedAt
CREATE OR REPLACE FUNCTION update_lab_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers (drop first if exists to be idempotent)
DROP TRIGGER IF EXISTS "LabTest_updatedAt" ON "public"."LabTest";
CREATE TRIGGER "LabTest_updatedAt"
  BEFORE UPDATE ON "public"."LabTest"
  FOR EACH ROW EXECUTE FUNCTION update_lab_updated_at();

DROP TRIGGER IF EXISTS "LabPanel_updatedAt" ON "public"."LabPanel";
CREATE TRIGGER "LabPanel_updatedAt"
  BEFORE UPDATE ON "public"."LabPanel"
  FOR EACH ROW EXECUTE FUNCTION update_lab_updated_at();

DROP TRIGGER IF EXISTS "LabOrder_updatedAt" ON "public"."LabOrder";
CREATE TRIGGER "LabOrder_updatedAt"
  BEFORE UPDATE ON "public"."LabOrder"
  FOR EACH ROW EXECUTE FUNCTION update_lab_updated_at();

DROP TRIGGER IF EXISTS "Specimen_updatedAt" ON "public"."Specimen";
CREATE TRIGGER "Specimen_updatedAt"
  BEFORE UPDATE ON "public"."Specimen"
  FOR EACH ROW EXECUTE FUNCTION update_lab_updated_at();

DROP TRIGGER IF EXISTS "LabResult_updatedAt" ON "public"."LabResult";
CREATE TRIGGER "LabResult_updatedAt"
  BEFORE UPDATE ON "public"."LabResult"
  FOR EACH ROW EXECUTE FUNCTION update_lab_updated_at();
