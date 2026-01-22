-- Grant permissions to service_role and authenticated users on User and UserRole tables
-- This is needed because RLS is disabled but permissions might still be blocking inserts

-- Grant all permissions to service_role (used by API)
GRANT ALL ON "public"."User" TO service_role;
GRANT ALL ON "public"."UserRole" TO service_role;
GRANT ALL ON "public"."Role" TO service_role;

-- Grant permissions to authenticated users
GRANT SELECT ON "public"."User" TO authenticated;
GRANT SELECT ON "public"."UserRole" TO authenticated;
GRANT SELECT ON "public"."Role" TO authenticated;

-- Grant permissions to anon users (for registration)
GRANT SELECT ON "public"."Role" TO anon;

-- Ensure the tables are owned by postgres or have proper permissions
-- Note: This assumes the service_role has necessary privileges
