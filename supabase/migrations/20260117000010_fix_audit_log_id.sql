-- Fix audit log trigger to generate ChangeLog.id
-- The fn_audit_log() function was inserting into ChangeLog without an id, causing null constraint violations

CREATE OR REPLACE FUNCTION public.fn_audit_log()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  v_action text;
  v_row_id text;
  v_payload jsonb;
  v_changelog_id text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'insert';
    v_row_id := coalesce((NEW).id::text, '');
    v_payload := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_row_id := coalesce((NEW).id::text, (OLD).id::text, '');
    v_payload := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
  ELSE
    v_action := 'delete';
    v_row_id := coalesce((OLD).id::text, '');
    v_payload := to_jsonb(OLD);
  END IF;
  
  -- Generate a unique ID for the ChangeLog entry
  v_changelog_id := 'changelog_' || extract(epoch from now())::bigint::text || '_' || substr(md5(random()::text), 1, 8);
  
  INSERT INTO public."ChangeLog"("id", "tableName", "rowId", "action", "payload")
  VALUES (v_changelog_id, TG_TABLE_NAME, v_row_id, v_action, v_payload);
  
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END
$fn$;
