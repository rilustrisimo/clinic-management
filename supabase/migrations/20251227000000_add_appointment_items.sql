-- Add Loyverse item fields to Appointment table
ALTER TABLE "public"."Appointment" 
  ADD COLUMN IF NOT EXISTS "itemId" text,
  ADD COLUMN IF NOT EXISTS "variantId" text,
  ADD COLUMN IF NOT EXISTS "itemName" text,
  ADD COLUMN IF NOT EXISTS "variantName" text,
  ADD COLUMN IF NOT EXISTS "basePrice" numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "totalPrice" numeric(10,2) DEFAULT 0;

-- Create AppointmentModifier table for storing selected modifiers
CREATE TABLE IF NOT EXISTS "public"."AppointmentModifier" (
  "id" text PRIMARY KEY,
  "appointmentId" text NOT NULL,
  "modifierId" text NOT NULL,
  "optionId" text NOT NULL,
  "modifierName" text,
  "optionName" text,
  "price" numeric(10,2) DEFAULT 0,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "AppointmentModifier_appointmentId_fkey" 
    FOREIGN KEY ("appointmentId") 
    REFERENCES "public"."Appointment"("id") 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
);

-- Add RLS for AppointmentModifier
ALTER TABLE "public"."AppointmentModifier" ENABLE ROW LEVEL SECURITY;

-- Policy for service_role to access everything
CREATE POLICY appointmentmodifier_service_all 
  ON "public"."AppointmentModifier" 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "AppointmentModifier_appointmentId_idx" 
  ON "public"."AppointmentModifier"("appointmentId");

-- Grant permissions
GRANT ALL ON "public"."AppointmentModifier" TO service_role;
