-- Create admin user profile for Rouie Ilustrisimo
-- This corresponds to the Supabase Auth user with UID: 45702c40-1504-4ffa-b6ef-9a4588f39324

-- Insert user record
INSERT INTO "public"."User" ("id", "email", "name", "supabaseId", "createdAt", "updatedAt")
VALUES (
  'user_admin_rouie',
  'itsmerouie+admin@gmail.com',
  'Rouie Ilustrisimo',
  '45702c40-1504-4ffa-b6ef-9a4588f39324',
  now(),
  now()
)
ON CONFLICT ("supabaseId") DO UPDATE SET
  "email" = EXCLUDED."email",
  "name" = EXCLUDED."name",
  "updatedAt" = now();

-- Assign Admin role
INSERT INTO "public"."UserRole" ("id", "userId", "roleId", "createdAt")
VALUES (
  'userrole_admin_rouie',
  'user_admin_rouie',
  'role_admin',
  now()
)
ON CONFLICT DO NOTHING;

-- Also assign other useful roles for full system access
INSERT INTO "public"."UserRole" ("id", "userId", "roleId", "createdAt")
VALUES (
  'userrole_doctor_rouie',
  'user_admin_rouie',
  'role_doctor',
  now()
),
(
  'userrole_labtech_rouie',
  'user_admin_rouie',
  'role_labtech',
  now()
)
ON CONFLICT DO NOTHING;
