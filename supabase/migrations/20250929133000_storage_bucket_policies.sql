-- Create private Storage bucket and RLS policies for files
-- Bucket creation (idempotent)
DO $$ BEGIN
  PERFORM 1 FROM storage.buckets WHERE id = 'files';
  IF NOT FOUND THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('files', 'files', false);
  END IF;
END $$;

-- Policies on storage.objects
-- Staff can read objects only in the 'files' bucket
DO $$ BEGIN
  CREATE POLICY files_read_staff ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'files' AND public.app_is_staff());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Service role has full access for 'files' bucket (writes server-only)
DO $$ BEGIN
  CREATE POLICY files_all_service ON storage.objects
    FOR ALL TO service_role
    USING (bucket_id = 'files')
    WITH CHECK (bucket_id = 'files');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
