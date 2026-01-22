-- Disable RLS on all tables to allow service role full access
-- This is necessary because the service role (used by API) needs to bypass RLS

-- Get list of tables and disable RLS on each
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', r.tablename);
    RAISE NOTICE 'Disabled RLS on table: %', r.tablename;
  END LOOP;
END $$;

-- Grant all permissions to service_role on all tables
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('GRANT ALL PRIVILEGES ON public.%I TO service_role', r.tablename);
    RAISE NOTICE 'Granted ALL to service_role on table: %', r.tablename;
  END LOOP;
END $$;

-- Also grant on all sequences
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT sequence_name 
    FROM information_schema.sequences 
    WHERE sequence_schema = 'public'
  LOOP
    EXECUTE format('GRANT ALL PRIVILEGES ON SEQUENCE public.%I TO service_role', r.sequence_name);
    RAISE NOTICE 'Granted ALL to service_role on sequence: %', r.sequence_name;
  END LOOP;
END $$;
