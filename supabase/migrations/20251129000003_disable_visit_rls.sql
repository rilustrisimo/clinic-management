-- Disable RLS on Visit and VisitStatusEvent tables
-- This allows the service role to bypass RLS for visit operations

ALTER TABLE "public"."Visit" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."VisitStatusEvent" DISABLE ROW LEVEL SECURITY;

-- Verify RLS status
SELECT 
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE tablename IN ('Visit', 'VisitStatusEvent')
  AND schemaname = 'public';
