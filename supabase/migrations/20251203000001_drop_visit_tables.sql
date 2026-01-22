-- Drop Visit-related tables in correct order (respecting foreign key constraints)
-- This migration removes the complex visit workflow system

-- Drop Payment table (references Invoice)
DROP TABLE IF EXISTS "Payment" CASCADE;

-- Drop dependent tables first
DROP TABLE IF EXISTS "VisitStatusEvent" CASCADE;
DROP TABLE IF EXISTS "VisitProcedure" CASCADE;
DROP TABLE IF EXISTS "VisitChargeCost" CASCADE;
DROP TABLE IF EXISTS "VisitCharge" CASCADE;

-- Drop Invoice table (has foreign key to Visit)
DROP TABLE IF EXISTS "Invoice" CASCADE;

-- Drop Visit table last
DROP TABLE IF EXISTS "Visit" CASCADE;

-- Drop enums
DROP TYPE IF EXISTS "VisitStatus" CASCADE;
DROP TYPE IF EXISTS "InvoiceStatus" CASCADE;
DROP TYPE IF EXISTS "PaymentMethod" CASCADE;

-- Update AppointmentStatus enum to remove 'arrived' and 'confirmed'
-- First, update any existing 'arrived' or 'confirmed' statuses to 'scheduled'
UPDATE "Appointment" 
SET status = 'scheduled'::"AppointmentStatus"
WHERE status::text IN ('arrived', 'confirmed');

-- Now recreate the enum with only the values we need
ALTER TYPE "AppointmentStatus" RENAME TO "AppointmentStatus_old";

CREATE TYPE "AppointmentStatus" AS ENUM ('scheduled', 'cancelled', 'completed', 'no_show');

-- Update the column to use the new enum
ALTER TABLE "Appointment" 
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE "AppointmentStatus" USING status::text::"AppointmentStatus",
  ALTER COLUMN status SET DEFAULT 'scheduled'::"AppointmentStatus";

-- Drop the old enum
DROP TYPE "AppointmentStatus_old";
