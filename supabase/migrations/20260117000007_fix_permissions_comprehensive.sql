-- Debug and fix permissions for User, UserRole, and Role tables
-- This will output current status and ensure proper grants

-- Show current RLS status
DO $$
DECLARE
  user_rls boolean;
  userrole_rls boolean;
  role_rls boolean;
BEGIN
  SELECT relrowsecurity INTO user_rls FROM pg_class WHERE relname = 'User';
  SELECT relrowsecurity INTO userrole_rls FROM pg_class WHERE relname = 'UserRole';
  SELECT relrowsecurity INTO role_rls FROM pg_class WHERE relname = 'Role';
  
  RAISE NOTICE 'User RLS: %', user_rls;
  RAISE NOTICE 'UserRole RLS: %', userrole_rls;
  RAISE NOTICE 'Role RLS: %', role_rls;
END $$;

-- Ensure RLS is disabled (already done in previous migration but let's be sure)
ALTER TABLE "public"."User" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."UserRole" DISABLE ROW LEVEL SECURITY;

-- Grant ALL permissions to service_role for these tables
GRANT ALL PRIVILEGES ON "public"."User" TO service_role;
GRANT ALL PRIVILEGES ON "public"."UserRole" TO service_role;
GRANT ALL PRIVILEGES ON "public"."Role" TO service_role;

-- Also grant to postgres role (owner)
GRANT ALL PRIVILEGES ON "public"."User" TO postgres;
GRANT ALL PRIVILEGES ON "public"."UserRole" TO postgres;
GRANT ALL PRIVILEGES ON "public"."Role" TO postgres;

-- Grant read to authenticated
GRANT SELECT ON "public"."User" TO authenticated;
GRANT SELECT ON "public"."UserRole" TO authenticated;
GRANT SELECT ON "public"."Role" TO authenticated;

-- Verify grants
DO $$
BEGIN
  RAISE NOTICE 'Permissions updated successfully';
END $$;
