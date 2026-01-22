-- Disable RLS on Role table as well to allow service role full access
ALTER TABLE "public"."Role" DISABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  RAISE NOTICE 'Role table RLS disabled';
END $$;
