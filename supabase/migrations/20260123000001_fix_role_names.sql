-- Fix role names to match application expectations
-- Update existing roles to use correct names

-- Delete old roles that don't match the app
DELETE FROM "public"."Role" WHERE "name" IN ('Doctor', 'Nurse', 'Receptionist');

-- Ensure all required roles exist with correct names
INSERT INTO "public"."Role" ("id", "name", "createdAt", "updatedAt")
VALUES 
  ('role_admin', 'Admin', now(), now()),
  ('role_provider', 'Provider', now(), now()),
  ('role_frontdesk', 'Frontdesk', now(), now()),
  ('role_billing', 'Billing', now(), now()),
  ('role_inventory', 'Inventory', now(), now()),
  ('role_labtech', 'LabTech', now(), now())
ON CONFLICT ("name") DO NOTHING;
