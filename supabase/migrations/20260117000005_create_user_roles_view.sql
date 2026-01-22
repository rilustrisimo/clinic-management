-- Create user_roles_view for the AuthProvider to query user roles
-- This view joins User, UserRole, and Role tables to show which roles each user has

CREATE OR REPLACE VIEW "public"."user_roles_view" AS
SELECT 
  u."supabaseId" as user_id,
  r.name as role_name
FROM "public"."User" u
INNER JOIN "public"."UserRole" ur ON u.id = ur."userId"
INNER JOIN "public"."Role" r ON ur."roleId" = r.id;

-- Grant access to authenticated users
GRANT SELECT ON "public"."user_roles_view" TO authenticated;
GRANT SELECT ON "public"."user_roles_view" TO anon;
