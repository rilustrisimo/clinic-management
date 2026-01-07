-- Migration: Support multiple services per appointment
-- Create AppointmentService table to store multiple services per appointment
CREATE TABLE IF NOT EXISTS "public"."AppointmentService" (
  "id" text PRIMARY KEY,
  "appointmentId" text NOT NULL,
  "itemId" text NOT NULL,
  "variantId" text NOT NULL,
  "itemName" text,
  "variantName" text,
  "basePrice" numeric(10,2) DEFAULT 0,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "AppointmentService_appointmentId_fkey" 
    FOREIGN KEY ("appointmentId") 
    REFERENCES "public"."Appointment"("id") 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
);

-- Create AppointmentServiceModifier table to store modifiers per service
CREATE TABLE IF NOT EXISTS "public"."AppointmentServiceModifier" (
  "id" text PRIMARY KEY,
  "appointmentServiceId" text NOT NULL,
  "modifierId" text NOT NULL,
  "optionId" text NOT NULL,
  "modifierName" text,
  "optionName" text,
  "price" numeric(10,2) DEFAULT 0,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "AppointmentServiceModifier_appointmentServiceId_fkey" 
    FOREIGN KEY ("appointmentServiceId") 
    REFERENCES "public"."AppointmentService"("id") 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
);

-- Add RLS for AppointmentService
ALTER TABLE "public"."AppointmentService" ENABLE ROW LEVEL SECURITY;

-- Policy for service_role to access everything
CREATE POLICY appointmentservice_service_all 
  ON "public"."AppointmentService" 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- Add RLS for AppointmentServiceModifier
ALTER TABLE "public"."AppointmentServiceModifier" ENABLE ROW LEVEL SECURITY;

-- Policy for service_role to access everything
CREATE POLICY appointmentservicemodifier_service_all 
  ON "public"."AppointmentServiceModifier" 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS "AppointmentService_appointmentId_idx" 
  ON "public"."AppointmentService"("appointmentId");

CREATE INDEX IF NOT EXISTS "AppointmentServiceModifier_appointmentServiceId_idx" 
  ON "public"."AppointmentServiceModifier"("appointmentServiceId");

-- Keep old columns for backward compatibility (can be removed later after data migration)
-- Existing: itemId, variantId, itemName, variantName, basePrice, totalPrice on Appointment table
-- Note: These will be deprecated in favor of the new AppointmentService table structure
