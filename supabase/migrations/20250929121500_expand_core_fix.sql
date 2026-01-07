-- Expand core domain objects (procedures, inventory, labs, billing, files, change_log)
-- This mirrors packages/db/prisma/migrations/20250928134739_expand_core_domain/migration.sql

-- Enums
DO $$ BEGIN
  CREATE TYPE "public"."SpecimenType" AS ENUM ('blood', 'urine', 'stool');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."SpecimenEventType" AS ENUM ('received', 'aliquoted', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."PaymentMethod" AS ENUM ('cash', 'card', 'e_wallet');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."InvoiceStatus" AS ENUM ('draft', 'open', 'paid', 'void');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."ChargeItemType" AS ENUM ('procedure', 'lab_test', 'inventory');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tables
CREATE TABLE IF NOT EXISTS "public"."Procedure" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Procedure_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."ProcedurePricing" (
  "id" TEXT NOT NULL,
  "procedureId" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'PHP',
  "salePrice" DECIMAL(12,2) NOT NULL,
  "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProcedurePricing_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."VisitProcedure" (
  "id" TEXT NOT NULL,
  "visitId" TEXT NOT NULL,
  "procedureId" TEXT NOT NULL,
  "unitPrice" DECIMAL(12,2) NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "provisional" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VisitProcedure_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."InventoryItem" (
  "id" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "unit" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."InventoryBatch" (
  "id" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "batchNo" TEXT,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "quantity" INTEGER NOT NULL DEFAULT 0,
  "costPerUnit" DECIMAL(12,4) NOT NULL,
  CONSTRAINT "InventoryBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."InventoryMovement" (
  "id" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "batchId" TEXT,
  "delta" INTEGER NOT NULL,
  "reason" TEXT,
  "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."InventoryPricing" (
  "id" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'PHP',
  "salePrice" DECIMAL(12,2),
  "markupPct" DECIMAL(6,2),
  "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryPricing_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."InventoryCogs" (
  "id" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "batchId" TEXT,
  "costPerUnit" DECIMAL(12,4) NOT NULL,
  "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryCogs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."LabTest" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "unit" TEXT,
  "refRange" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LabTest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."LabPanel" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LabPanel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."LabPanelItem" (
  "id" TEXT NOT NULL,
  "panelId" TEXT NOT NULL,
  "testId" TEXT NOT NULL,
  CONSTRAINT "LabPanelItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."LabPricing" (
  "id" TEXT NOT NULL,
  "testId" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'PHP',
  "salePrice" DECIMAL(12,2) NOT NULL,
  "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LabPricing_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."LabOrder" (
  "id" TEXT NOT NULL,
  "visitId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LabOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."LabOrderItem" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "testId" TEXT NOT NULL,
  "unitPrice" DECIMAL(12,2) NOT NULL,
  "provisional" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "LabOrderItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."Specimen" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "type" "public"."SpecimenType" NOT NULL,
  "barcode" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Specimen_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."SpecimenEvent" (
  "id" TEXT NOT NULL,
  "specimenId" TEXT NOT NULL,
  "event" "public"."SpecimenEventType" NOT NULL,
  "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "note" TEXT,
  CONSTRAINT "SpecimenEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."LabResult" (
  "id" TEXT NOT NULL,
  "orderItemId" TEXT NOT NULL,
  "valueText" TEXT,
  "valueNum" DECIMAL(12,4),
  "unit" TEXT,
  "abnormal" BOOLEAN NOT NULL DEFAULT false,
  "verifiedAt" TIMESTAMP(3),
  CONSTRAINT "LabResult_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."VisitCharge" (
  "id" TEXT NOT NULL,
  "visitId" TEXT NOT NULL,
  "itemType" "public"."ChargeItemType" NOT NULL,
  "itemId" TEXT NOT NULL,
  "unitPrice" DECIMAL(12,2) NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "discount" DECIMAL(12,2),
  "provisional" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VisitCharge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."VisitChargeCost" (
  "id" TEXT NOT NULL,
  "visitChargeId" TEXT NOT NULL,
  "costPerUnit" DECIMAL(12,4) NOT NULL,
  "source" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VisitChargeCost_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."Invoice" (
  "id" TEXT NOT NULL,
  "visitId" TEXT NOT NULL,
  "total" DECIMAL(12,2) NOT NULL,
  "status" "public"."InvoiceStatus" NOT NULL DEFAULT 'draft',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paidAt" TIMESTAMP(3),
  CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."Payment" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "method" "public"."PaymentMethod" NOT NULL,
  "reference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."FileObject" (
  "id" TEXT NOT NULL,
  "bucket" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "mimeType" TEXT,
  "size" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FileObject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."ChangeLog" (
  "id" TEXT NOT NULL,
  "tableName" TEXT NOT NULL,
  "rowId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChangeLog_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "Procedure_code_key" ON "public"."Procedure" ("code");
CREATE INDEX IF NOT EXISTS "ProcedurePricing_procedureId_effectiveAt_idx" ON "public"."ProcedurePricing" ("procedureId", "effectiveAt");
CREATE INDEX IF NOT EXISTS "VisitProcedure_visitId_idx" ON "public"."VisitProcedure" ("visitId");
CREATE UNIQUE INDEX IF NOT EXISTS "InventoryItem_sku_key" ON "public"."InventoryItem" ("sku");
CREATE INDEX IF NOT EXISTS "InventoryBatch_itemId_idx" ON "public"."InventoryBatch" ("itemId");
CREATE INDEX IF NOT EXISTS "InventoryMovement_itemId_at_idx" ON "public"."InventoryMovement" ("itemId", "at");
CREATE INDEX IF NOT EXISTS "InventoryPricing_itemId_effectiveAt_idx" ON "public"."InventoryPricing" ("itemId", "effectiveAt");
CREATE INDEX IF NOT EXISTS "InventoryCogs_itemId_effectiveAt_idx" ON "public"."InventoryCogs" ("itemId", "effectiveAt");
CREATE UNIQUE INDEX IF NOT EXISTS "LabTest_code_key" ON "public"."LabTest" ("code");
CREATE UNIQUE INDEX IF NOT EXISTS "LabPanel_code_key" ON "public"."LabPanel" ("code");
CREATE UNIQUE INDEX IF NOT EXISTS "LabPanelItem_panelId_testId_key" ON "public"."LabPanelItem" ("panelId", "testId");
CREATE INDEX IF NOT EXISTS "LabPricing_testId_effectiveAt_idx" ON "public"."LabPricing" ("testId", "effectiveAt");
CREATE INDEX IF NOT EXISTS "LabOrderItem_orderId_idx" ON "public"."LabOrderItem" ("orderId");
CREATE UNIQUE INDEX IF NOT EXISTS "Specimen_barcode_key" ON "public"."Specimen" ("barcode");
CREATE INDEX IF NOT EXISTS "SpecimenEvent_specimenId_at_idx" ON "public"."SpecimenEvent" ("specimenId", "at");
CREATE INDEX IF NOT EXISTS "VisitCharge_visitId_idx" ON "public"."VisitCharge" ("visitId");
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_visitId_key" ON "public"."Invoice" ("visitId");
CREATE UNIQUE INDEX IF NOT EXISTS "FileObject_bucket_path_key" ON "public"."FileObject" ("bucket", "path");
CREATE INDEX IF NOT EXISTS "ChangeLog_tableName_createdAt_idx" ON "public"."ChangeLog" ("tableName", "createdAt");

-- Foreign keys (guarded)
DO $$ BEGIN
  ALTER TABLE "public"."ProcedurePricing"
    ADD CONSTRAINT "ProcedurePricing_procedureId_fkey"
    FOREIGN KEY ("procedureId") REFERENCES "public"."Procedure"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "public"."VisitProcedure"
    ADD CONSTRAINT "VisitProcedure_visitId_fkey"
    FOREIGN KEY ("visitId") REFERENCES "public"."Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "public"."VisitProcedure"
    ADD CONSTRAINT "VisitProcedure_procedureId_fkey"
    FOREIGN KEY ("procedureId") REFERENCES "public"."Procedure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "public"."InventoryBatch"
    ADD CONSTRAINT "InventoryBatch_itemId_fkey"
    FOREIGN KEY ("itemId") REFERENCES "public"."InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "public"."InventoryMovement"
    ADD CONSTRAINT "InventoryMovement_itemId_fkey"
    FOREIGN KEY ("itemId") REFERENCES "public"."InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "public"."InventoryMovement"
    ADD CONSTRAINT "InventoryMovement_batchId_fkey"
    FOREIGN KEY ("batchId") REFERENCES "public"."InventoryBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "public"."InventoryPricing"
    ADD CONSTRAINT "InventoryPricing_itemId_fkey"
    FOREIGN KEY ("itemId") REFERENCES "public"."InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "public"."InventoryCogs"
    ADD CONSTRAINT "InventoryCogs_itemId_fkey"
    FOREIGN KEY ("itemId") REFERENCES "public"."InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "public"."InventoryCogs"
    ADD CONSTRAINT "InventoryCogs_batchId_fkey"
    FOREIGN KEY ("batchId") REFERENCES "public"."InventoryBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "public"."LabPanelItem"
    ADD CONSTRAINT "LabPanelItem_panelId_fkey"
    FOREIGN KEY ("panelId") REFERENCES "public"."LabPanel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "public"."LabPanelItem"
    ADD CONSTRAINT "LabPanelItem_testId_fkey"
    FOREIGN KEY ("testId") REFERENCES "public"."LabTest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "public"."LabPricing"
    ADD CONSTRAINT "LabPricing_testId_fkey"
    FOREIGN KEY ("testId") REFERENCES "public"."LabTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "public"."LabOrder"
    ADD CONSTRAINT "LabOrder_visitId_fkey"
    FOREIGN KEY ("visitId") REFERENCES "public"."Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "public"."LabOrder"
    ADD CONSTRAINT "LabOrder_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "public"."LabOrderItem"
    ADD CONSTRAINT "LabOrderItem_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "public"."LabOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "public"."LabOrderItem"
    ADD CONSTRAINT "LabOrderItem_testId_fkey"
    FOREIGN KEY ("testId") REFERENCES "public"."LabTest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "public"."Specimen"
    ADD CONSTRAINT "Specimen_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "public"."LabOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "public"."SpecimenEvent"
    ADD CONSTRAINT "SpecimenEvent_specimenId_fkey"
    FOREIGN KEY ("specimenId") REFERENCES "public"."Specimen"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "public"."LabResult"
    ADD CONSTRAINT "LabResult_orderItemId_fkey"
    FOREIGN KEY ("orderItemId") REFERENCES "public"."LabOrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "public"."VisitCharge"
    ADD CONSTRAINT "VisitCharge_visitId_fkey"
    FOREIGN KEY ("visitId") REFERENCES "public"."Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "public"."VisitChargeCost"
    ADD CONSTRAINT "VisitChargeCost_visitChargeId_fkey"
    FOREIGN KEY ("visitChargeId") REFERENCES "public"."VisitCharge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "public"."Invoice"
    ADD CONSTRAINT "Invoice_visitId_fkey"
    FOREIGN KEY ("visitId") REFERENCES "public"."Visit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "public"."Payment"
    ADD CONSTRAINT "Payment_invoiceId_fkey"
    FOREIGN KEY ("invoiceId") REFERENCES "public"."Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
