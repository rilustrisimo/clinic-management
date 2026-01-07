-- Fix PatientVersion table permissions for service role
-- Service role should have full access and bypass RLS

-- Grant all privileges to service_role
GRANT ALL ON TABLE "public"."PatientVersion" TO service_role;

-- Ensure service_role can bypass RLS (this is default but being explicit)
ALTER TABLE "public"."PatientVersion" FORCE ROW LEVEL SECURITY;

-- Add policy for service_role to bypass RLS
DROP POLICY IF EXISTS patientversion_service_all ON public."PatientVersion";
CREATE POLICY patientversion_service_all ON public."PatientVersion"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Also ensure authenticated users with proper roles can read
DROP POLICY IF EXISTS patientversion_select_staff ON public."PatientVersion";
CREATE POLICY patientversion_select_staff ON public."PatientVersion"
  FOR SELECT TO authenticated USING (public.app_is_staff());

-- Allow service_role to insert (for initial version creation)
DROP POLICY IF EXISTS patientversion_insert_service ON public."PatientVersion";
CREATE POLICY patientversion_insert_service ON public."PatientVersion"
  FOR INSERT TO service_role WITH CHECK (true);
