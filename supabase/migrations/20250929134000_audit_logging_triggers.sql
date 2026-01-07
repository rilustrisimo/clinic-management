-- Generic audit logging to ChangeLog
CREATE OR REPLACE FUNCTION public.fn_audit_log()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  v_action text;
  v_row_id text;
  v_payload jsonb;
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
  INSERT INTO public."ChangeLog"("tableName","rowId","action","payload")
  VALUES (TG_TABLE_NAME, v_row_id, v_action, v_payload);
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END
$fn$;

-- Attach triggers to key tables
DO $$ BEGIN
  PERFORM 1 FROM pg_trigger WHERE tgname = 'tr_audit_patient';
  IF NOT FOUND THEN
    CREATE TRIGGER tr_audit_patient AFTER INSERT OR UPDATE OR DELETE ON public."Patient"
    FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
  END IF;
END $$;

DO $$ BEGIN
  PERFORM 1 FROM pg_trigger WHERE tgname = 'tr_audit_appointment';
  IF NOT FOUND THEN
    CREATE TRIGGER tr_audit_appointment AFTER INSERT OR UPDATE OR DELETE ON public."Appointment"
    FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
  END IF;
END $$;

DO $$ BEGIN
  PERFORM 1 FROM pg_trigger WHERE tgname = 'tr_audit_visit';
  IF NOT FOUND THEN
    CREATE TRIGGER tr_audit_visit AFTER INSERT OR UPDATE OR DELETE ON public."Visit"
    FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
  END IF;
END $$;

DO $$ BEGIN
  PERFORM 1 FROM pg_trigger WHERE tgname = 'tr_audit_visitcharge';
  IF NOT FOUND THEN
    CREATE TRIGGER tr_audit_visitcharge AFTER INSERT OR UPDATE OR DELETE ON public."VisitCharge"
    FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
  END IF;
END $$;

DO $$ BEGIN
  PERFORM 1 FROM pg_trigger WHERE tgname = 'tr_audit_invoice';
  IF NOT FOUND THEN
    CREATE TRIGGER tr_audit_invoice AFTER INSERT OR UPDATE OR DELETE ON public."Invoice"
    FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
  END IF;
END $$;

DO $$ BEGIN
  PERFORM 1 FROM pg_trigger WHERE tgname = 'tr_audit_payment';
  IF NOT FOUND THEN
    CREATE TRIGGER tr_audit_payment AFTER INSERT OR UPDATE OR DELETE ON public."Payment"
    FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
  END IF;
END $$;

DO $$ BEGIN
  PERFORM 1 FROM pg_trigger WHERE tgname = 'tr_audit_laborder';
  IF NOT FOUND THEN
    CREATE TRIGGER tr_audit_laborder AFTER INSERT OR UPDATE OR DELETE ON public."LabOrder"
    FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
  END IF;
END $$;

DO $$ BEGIN
  PERFORM 1 FROM pg_trigger WHERE tgname = 'tr_audit_labresult';
  IF NOT FOUND THEN
    CREATE TRIGGER tr_audit_labresult AFTER INSERT OR UPDATE OR DELETE ON public."LabResult"
    FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
  END IF;
END $$;

DO $$ BEGIN
  PERFORM 1 FROM pg_trigger WHERE tgname = 'tr_audit_inventorymovement';
  IF NOT FOUND THEN
    CREATE TRIGGER tr_audit_inventorymovement AFTER INSERT OR UPDATE OR DELETE ON public."InventoryMovement"
    FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
  END IF;
END $$;
