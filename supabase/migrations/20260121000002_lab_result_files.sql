-- Add LabResultFile table to track uploaded result files
CREATE TABLE IF NOT EXISTS "public"."LabResultFile" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "orderId" text NOT NULL,
  "fileName" text NOT NULL,
  "originalName" text NOT NULL,
  "fileType" text NOT NULL,
  "fileSize" integer NOT NULL,
  "storagePath" text NOT NULL,
  "publicUrl" text,
  "notes" text,
  "uploadedAt" timestamp NOT NULL DEFAULT now(),
  "uploadedById" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

-- Add foreign keys
ALTER TABLE "public"."LabResultFile"
  ADD CONSTRAINT "LabResultFile_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "public"."LabOrder"("id") ON DELETE CASCADE;

ALTER TABLE "public"."LabResultFile"
  ADD CONSTRAINT "LabResultFile_uploadedById_fkey"
  FOREIGN KEY ("uploadedById") REFERENCES "public"."User"("id") ON DELETE SET NULL;

-- Add indexes
CREATE INDEX "LabResultFile_orderId_idx" ON "public"."LabResultFile"("orderId");
CREATE INDEX "LabResultFile_uploadedAt_idx" ON "public"."LabResultFile"("uploadedAt");

-- Enable RLS
ALTER TABLE "public"."LabResultFile" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "labresultfile_service_all" ON "public"."LabResultFile"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "labresultfile_staff" ON "public"."LabResultFile"
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON "public"."LabResultFile" TO authenticated;
GRANT ALL ON "public"."LabResultFile" TO service_role;

-- Add timeline tracking for lab orders
CREATE TABLE IF NOT EXISTS "public"."LabOrderTimeline" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "orderId" text NOT NULL,
  "status" text NOT NULL,
  "timestamp" timestamp NOT NULL DEFAULT now(),
  "userId" text,
  "notes" text,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

-- Add foreign keys
ALTER TABLE "public"."LabOrderTimeline"
  ADD CONSTRAINT "LabOrderTimeline_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "public"."LabOrder"("id") ON DELETE CASCADE;

ALTER TABLE "public"."LabOrderTimeline"
  ADD CONSTRAINT "LabOrderTimeline_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL;

-- Add indexes
CREATE INDEX "LabOrderTimeline_orderId_idx" ON "public"."LabOrderTimeline"("orderId");
CREATE INDEX "LabOrderTimeline_timestamp_idx" ON "public"."LabOrderTimeline"("timestamp");

-- Enable RLS
ALTER TABLE "public"."LabOrderTimeline" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "labordertimeline_service_all" ON "public"."LabOrderTimeline"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "labordertimeline_staff" ON "public"."LabOrderTimeline"
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT ON "public"."LabOrderTimeline" TO authenticated;
GRANT ALL ON "public"."LabOrderTimeline" TO service_role;

-- Function to automatically create timeline entries on status change
CREATE OR REPLACE FUNCTION log_lab_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') OR (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO "public"."LabOrderTimeline" ("orderId", "status", "timestamp", "userId")
    VALUES (NEW.id, NEW.status, now(), NEW."updatedById");
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timeline logging
DROP TRIGGER IF EXISTS lab_order_status_change_trigger ON "public"."LabOrder";
CREATE TRIGGER lab_order_status_change_trigger
  AFTER INSERT OR UPDATE ON "public"."LabOrder"
  FOR EACH ROW
  EXECUTE FUNCTION log_lab_order_status_change();
