-- Seed initial admin user and roles
-- This allows the first user to be created and assigned admin role

-- First, ensure roles exist
INSERT INTO "public"."Role" ("id", "name", "createdAt", "updatedAt")
VALUES 
  ('role_admin', 'Admin', now(), now()),
  ('role_doctor', 'Doctor', now(), now()),
  ('role_nurse', 'Nurse', now(), now()),
  ('role_receptionist', 'Receptionist', now(), now()),
  ('role_billing', 'Billing', now(), now()),
  ('role_labtech', 'LabTech', now(), now())
ON CONFLICT ("name") DO NOTHING;

-- Temporarily disable RLS on User table to allow initial admin creation
-- This is needed because there are no users yet to authenticate
ALTER TABLE public."User" DISABLE ROW LEVEL SECURITY;

-- Temporarily disable RLS on UserRole table
ALTER TABLE public."UserRole" DISABLE ROW LEVEL SECURITY;

-- Note: Initial admin user will be created through the registration endpoint
-- The credentials should be set via environment variable or entered through the register page
