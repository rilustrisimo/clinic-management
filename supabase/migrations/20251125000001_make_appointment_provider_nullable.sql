-- Make providerId nullable in Appointment table
-- Allows appointments to be created without immediately assigning a provider

ALTER TABLE "public"."Appointment" 
  ALTER COLUMN "providerId" DROP NOT NULL;

COMMENT ON COLUMN "public"."Appointment"."providerId" IS 'Provider assigned to this appointment (optional, can be assigned later)';
