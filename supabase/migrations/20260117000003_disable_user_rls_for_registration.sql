-- Disable RLS on User and UserRole tables temporarily
-- This allows the service role to create the initial admin user
-- RLS will be re-enabled after initial setup with proper policies

-- Drop existing policies that aren't working for service role inserts
DROP POLICY IF EXISTS user_insert_service ON public."User";
DROP POLICY IF EXISTS userrole_insert_service ON public."UserRole";

-- Disable RLS to allow service role (API key) to insert
ALTER TABLE public."User" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."UserRole" DISABLE ROW LEVEL SECURITY;

-- Note: After creating admin user, you should run a migration to re-enable RLS
-- with proper INSERT policies that allow authenticated users to be created
