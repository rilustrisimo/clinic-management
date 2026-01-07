-- RLS & Security: helper functions
-- Assumption: public."User" IDs match auth.uid() values.
-- Helper: check if current user has a given app role
CREATE OR REPLACE FUNCTION public.app_has_role(role_name text)
RETURNS boolean
LANGUAGE sql STABLE PARALLEL SAFE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public."UserRole" ur
    JOIN public."Role" r ON r.id = ur."roleId"
    WHERE ur."userId" = auth.uid()::text AND r.name = role_name
  );
$$;

-- Helper: check if current user has ANY of the given roles
CREATE OR REPLACE FUNCTION public.app_has_any_role(role_names text[])
RETURNS boolean
LANGUAGE sql STABLE PARALLEL SAFE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public."UserRole" ur
    JOIN public."Role" r ON r.id = ur."roleId"
    WHERE ur."userId" = auth.uid()::text AND r.name = ANY(role_names)
  );
$$;

GRANT EXECUTE ON FUNCTION public.app_has_role(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.app_has_any_role(text[]) TO anon, authenticated, service_role;

-- Convenience: staff role check
CREATE OR REPLACE FUNCTION public.app_is_staff()
RETURNS boolean
LANGUAGE sql STABLE PARALLEL SAFE
AS $fn$
  SELECT public.app_has_any_role(ARRAY['Admin','Provider','Frontdesk','Billing','Inventory','LabTech']);
$fn$;
GRANT EXECUTE ON FUNCTION public.app_is_staff() TO anon, authenticated, service_role;

-- Enable RLS on all core tables
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Role" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."UserRole" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Patient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PatientVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Appointment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Visit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."VisitStatusEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Procedure" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ProcedurePricing" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."VisitProcedure" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."InventoryItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."InventoryBatch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."InventoryMovement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."InventoryPricing" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."InventoryCogs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LabTest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LabPanel" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LabPanelItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LabPricing" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LabOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LabOrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Specimen" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SpecimenEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LabResult" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."VisitCharge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."VisitChargeCost" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."FileObject" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ChangeLog" ENABLE ROW LEVEL SECURITY;

-- Baseline: Users & Roles
DROP POLICY IF EXISTS user_select_staff ON public."User";
CREATE POLICY user_select_staff ON public."User"
  FOR SELECT TO authenticated USING (public.app_is_staff());
DROP POLICY IF EXISTS user_update_admin ON public."User";
CREATE POLICY user_update_admin ON public."User"
  FOR UPDATE TO authenticated USING (public.app_has_role('Admin')) WITH CHECK (public.app_has_role('Admin'));

DROP POLICY IF EXISTS role_select_staff ON public."Role";
CREATE POLICY role_select_staff ON public."Role"
  FOR SELECT TO authenticated USING (public.app_is_staff());
DROP POLICY IF EXISTS role_modify_admin ON public."Role";
CREATE POLICY role_modify_admin ON public."Role"
  FOR ALL TO authenticated USING (public.app_has_role('Admin')) WITH CHECK (public.app_has_role('Admin'));

DROP POLICY IF EXISTS userrole_select_staff ON public."UserRole";
CREATE POLICY userrole_select_staff ON public."UserRole"
  FOR SELECT TO authenticated USING (public.app_is_staff());
DROP POLICY IF EXISTS userrole_modify_admin ON public."UserRole";
CREATE POLICY userrole_modify_admin ON public."UserRole"
  FOR ALL TO authenticated USING (public.app_has_role('Admin')) WITH CHECK (public.app_has_role('Admin'));

-- Patients
DROP POLICY IF EXISTS patient_select_staff ON public."Patient";
CREATE POLICY patient_select_staff ON public."Patient"
  FOR SELECT TO authenticated USING (public.app_is_staff());
DROP POLICY IF EXISTS patient_insert_staff ON public."Patient";
CREATE POLICY patient_insert_staff ON public."Patient"
  FOR INSERT TO authenticated WITH CHECK (public.app_has_any_role(ARRAY['Admin','Provider','Frontdesk']));
DROP POLICY IF EXISTS patient_update_roles ON public."Patient";
CREATE POLICY patient_update_roles ON public."Patient"
  FOR UPDATE TO authenticated USING (public.app_has_any_role(ARRAY['Admin','Provider','Frontdesk'])) WITH CHECK (public.app_has_any_role(ARRAY['Admin','Provider','Frontdesk']));

-- PatientVersion: insert server-only; staff can read
DROP POLICY IF EXISTS patientversion_select_staff ON public."PatientVersion";
CREATE POLICY patientversion_select_staff ON public."PatientVersion"
  FOR SELECT TO authenticated USING (public.app_is_staff());
DROP POLICY IF EXISTS patientversion_insert_service ON public."PatientVersion";
CREATE POLICY patientversion_insert_service ON public."PatientVersion"
  FOR INSERT TO service_role WITH CHECK (true);

-- Appointments
DROP POLICY IF EXISTS appt_select_staff ON public."Appointment";
CREATE POLICY appt_select_staff ON public."Appointment"
  FOR SELECT TO authenticated USING (public.app_is_staff());
DROP POLICY IF EXISTS appt_write_roles ON public."Appointment";
CREATE POLICY appt_write_roles ON public."Appointment"
  FOR ALL TO authenticated USING (public.app_has_any_role(ARRAY['Admin','Provider','Frontdesk'])) WITH CHECK (public.app_has_any_role(ARRAY['Admin','Provider','Frontdesk']));

-- Visits and Status Events
DROP POLICY IF EXISTS visit_select_staff ON public."Visit";
CREATE POLICY visit_select_staff ON public."Visit"
  FOR SELECT TO authenticated USING (public.app_is_staff());
DROP POLICY IF EXISTS visit_write_roles ON public."Visit";
CREATE POLICY visit_write_roles ON public."Visit"
  FOR ALL TO authenticated USING (public.app_has_any_role(ARRAY['Admin','Provider','Frontdesk'])) WITH CHECK (public.app_has_any_role(ARRAY['Admin','Provider','Frontdesk']));

DROP POLICY IF EXISTS vstatus_select_staff ON public."VisitStatusEvent";
CREATE POLICY vstatus_select_staff ON public."VisitStatusEvent"
  FOR SELECT TO authenticated USING (public.app_is_staff());
DROP POLICY IF EXISTS vstatus_write_roles ON public."VisitStatusEvent";
CREATE POLICY vstatus_write_roles ON public."VisitStatusEvent"
  FOR ALL TO authenticated USING (public.app_has_any_role(ARRAY['Admin','Provider','Frontdesk'])) WITH CHECK (public.app_has_any_role(ARRAY['Admin','Provider','Frontdesk']));

-- Labs catalog & pricing: staff read; writes Admin/Billing
DO $$ BEGIN
  -- LabTest
  DROP POLICY IF EXISTS labtest_select_staff ON public."LabTest";
  CREATE POLICY labtest_select_staff ON public."LabTest" FOR SELECT TO authenticated USING (public.app_is_staff());
  DROP POLICY IF EXISTS labtest_write_admin_billing ON public."LabTest";
  CREATE POLICY labtest_write_admin_billing ON public."LabTest" FOR ALL TO authenticated USING (public.app_has_any_role(ARRAY['Admin','Billing'])) WITH CHECK (public.app_has_any_role(ARRAY['Admin','Billing']));
  -- LabPanel
  DROP POLICY IF EXISTS labpanel_select_staff ON public."LabPanel";
  CREATE POLICY labpanel_select_staff ON public."LabPanel" FOR SELECT TO authenticated USING (public.app_is_staff());
  DROP POLICY IF EXISTS labpanel_write_admin_billing ON public."LabPanel";
  CREATE POLICY labpanel_write_admin_billing ON public."LabPanel" FOR ALL TO authenticated USING (public.app_has_any_role(ARRAY['Admin','Billing'])) WITH CHECK (public.app_has_any_role(ARRAY['Admin','Billing']));
  -- LabPanelItem
  DROP POLICY IF EXISTS labpanelitem_select_staff ON public."LabPanelItem";
  CREATE POLICY labpanelitem_select_staff ON public."LabPanelItem" FOR SELECT TO authenticated USING (public.app_is_staff());
  DROP POLICY IF EXISTS labpanelitem_write_admin_billing ON public."LabPanelItem";
  CREATE POLICY labpanelitem_write_admin_billing ON public."LabPanelItem" FOR ALL TO authenticated USING (public.app_has_any_role(ARRAY['Admin','Billing'])) WITH CHECK (public.app_has_any_role(ARRAY['Admin','Billing']));
  -- LabPricing
  DROP POLICY IF EXISTS labpricing_select_staff ON public."LabPricing";
  CREATE POLICY labpricing_select_staff ON public."LabPricing" FOR SELECT TO authenticated USING (public.app_is_staff());
  DROP POLICY IF EXISTS labpricing_write_admin_billing ON public."LabPricing";
  CREATE POLICY labpricing_write_admin_billing ON public."LabPricing" FOR ALL TO authenticated USING (public.app_has_any_role(ARRAY['Admin','Billing'])) WITH CHECK (public.app_has_any_role(ARRAY['Admin','Billing']));
END $$;

-- Procedures catalog & pricing
DROP POLICY IF EXISTS procedure_select_staff ON public."Procedure";
CREATE POLICY procedure_select_staff ON public."Procedure" FOR SELECT TO authenticated USING (public.app_is_staff());
DROP POLICY IF EXISTS procedure_write_admin_billing ON public."Procedure";
CREATE POLICY procedure_write_admin_billing ON public."Procedure" FOR ALL TO authenticated USING (public.app_has_any_role(ARRAY['Admin','Billing'])) WITH CHECK (public.app_has_any_role(ARRAY['Admin','Billing']));

DROP POLICY IF EXISTS procedurepricing_select_staff ON public."ProcedurePricing";
CREATE POLICY procedurepricing_select_staff ON public."ProcedurePricing" FOR SELECT TO authenticated USING (public.app_is_staff());
DROP POLICY IF EXISTS procedurepricing_write_admin_billing ON public."ProcedurePricing";
CREATE POLICY procedurepricing_write_admin_billing ON public."ProcedurePricing" FOR ALL TO authenticated USING (public.app_has_any_role(ARRAY['Admin','Billing'])) WITH CHECK (public.app_has_any_role(ARRAY['Admin','Billing']));

-- Inventory catalog & pricing
DROP POLICY IF EXISTS invitem_select_staff ON public."InventoryItem";
CREATE POLICY invitem_select_staff ON public."InventoryItem" FOR SELECT TO authenticated USING (public.app_is_staff());
DROP POLICY IF EXISTS invitem_write_admin_inventory ON public."InventoryItem";
CREATE POLICY invitem_write_admin_inventory ON public."InventoryItem" FOR ALL TO authenticated USING (public.app_has_any_role(ARRAY['Admin','Inventory'])) WITH CHECK (public.app_has_any_role(ARRAY['Admin','Inventory']));

DROP POLICY IF EXISTS invbatch_select_staff ON public."InventoryBatch";
CREATE POLICY invbatch_select_staff ON public."InventoryBatch" FOR SELECT TO authenticated USING (public.app_is_staff());
DROP POLICY IF EXISTS invbatch_write_admin_inventory ON public."InventoryBatch";
CREATE POLICY invbatch_write_admin_inventory ON public."InventoryBatch" FOR ALL TO authenticated USING (public.app_has_any_role(ARRAY['Admin','Inventory'])) WITH CHECK (public.app_has_any_role(ARRAY['Admin','Inventory']));

DROP POLICY IF EXISTS invmove_select_staff ON public."InventoryMovement";
CREATE POLICY invmove_select_staff ON public."InventoryMovement" FOR SELECT TO authenticated USING (public.app_is_staff());
DROP POLICY IF EXISTS invmove_write_admin_inventory ON public."InventoryMovement";
CREATE POLICY invmove_write_admin_inventory ON public."InventoryMovement" FOR ALL TO authenticated USING (public.app_has_any_role(ARRAY['Admin','Inventory'])) WITH CHECK (public.app_has_any_role(ARRAY['Admin','Inventory']));

DROP POLICY IF EXISTS invpricing_select_staff ON public."InventoryPricing";
CREATE POLICY invpricing_select_staff ON public."InventoryPricing" FOR SELECT TO authenticated USING (public.app_is_staff());
DROP POLICY IF EXISTS invpricing_write_admin_billing ON public."InventoryPricing";
CREATE POLICY invpricing_write_admin_billing ON public."InventoryPricing" FOR ALL TO authenticated USING (public.app_has_any_role(ARRAY['Admin','Billing'])) WITH CHECK (public.app_has_any_role(ARRAY['Admin','Billing']));

DROP POLICY IF EXISTS invcogs_select_staff ON public."InventoryCogs";
CREATE POLICY invcogs_select_staff ON public."InventoryCogs" FOR SELECT TO authenticated USING (public.app_is_staff());
DROP POLICY IF EXISTS invcogs_write_admin_inventory ON public."InventoryCogs";
CREATE POLICY invcogs_write_admin_inventory ON public."InventoryCogs" FOR ALL TO authenticated USING (public.app_has_any_role(ARRAY['Admin','Inventory'])) WITH CHECK (public.app_has_any_role(ARRAY['Admin','Inventory']));

-- Lab workflow tables
DROP POLICY IF EXISTS laborder_select_staff ON public."LabOrder";
CREATE POLICY laborder_select_staff ON public."LabOrder" FOR SELECT TO authenticated USING (public.app_is_staff());
DROP POLICY IF EXISTS laborder_write_provider_labtech_admin ON public."LabOrder";
CREATE POLICY laborder_write_provider_labtech_admin ON public."LabOrder" FOR ALL TO authenticated USING (public.app_has_any_role(ARRAY['Admin','Provider','LabTech'])) WITH CHECK (public.app_has_any_role(ARRAY['Admin','Provider','LabTech']));

DROP POLICY IF EXISTS laborderitem_select_staff ON public."LabOrderItem";
CREATE POLICY laborderitem_select_staff ON public."LabOrderItem" FOR SELECT TO authenticated USING (public.app_is_staff());
DROP POLICY IF EXISTS laborderitem_write_provider_labtech_admin ON public."LabOrderItem";
CREATE POLICY laborderitem_write_provider_labtech_admin ON public."LabOrderItem" FOR ALL TO authenticated USING (public.app_has_any_role(ARRAY['Admin','Provider','LabTech'])) WITH CHECK (public.app_has_any_role(ARRAY['Admin','Provider','LabTech']));

DROP POLICY IF EXISTS specimen_select_staff ON public."Specimen";
CREATE POLICY specimen_select_staff ON public."Specimen" FOR SELECT TO authenticated USING (public.app_is_staff());
DROP POLICY IF EXISTS specimen_write_labtech_admin ON public."Specimen";
CREATE POLICY specimen_write_labtech_admin ON public."Specimen" FOR ALL TO authenticated USING (public.app_has_any_role(ARRAY['Admin','LabTech'])) WITH CHECK (public.app_has_any_role(ARRAY['Admin','LabTech']));

DROP POLICY IF EXISTS specimenevent_select_staff ON public."SpecimenEvent";
CREATE POLICY specimenevent_select_staff ON public."SpecimenEvent" FOR SELECT TO authenticated USING (public.app_is_staff());
DROP POLICY IF EXISTS specimenevent_write_labtech_admin ON public."SpecimenEvent";
CREATE POLICY specimenevent_write_labtech_admin ON public."SpecimenEvent" FOR ALL TO authenticated USING (public.app_has_any_role(ARRAY['Admin','LabTech'])) WITH CHECK (public.app_has_any_role(ARRAY['Admin','LabTech']));

DROP POLICY IF EXISTS labresult_select_staff ON public."LabResult";
CREATE POLICY labresult_select_staff ON public."LabResult" FOR SELECT TO authenticated USING (public.app_has_any_role(ARRAY['Admin','Provider','LabTech','Frontdesk','Billing']));
DROP POLICY IF EXISTS labresult_write_labtech_admin ON public."LabResult";
CREATE POLICY labresult_write_labtech_admin ON public."LabResult" FOR ALL TO authenticated USING (public.app_has_any_role(ARRAY['Admin','LabTech'])) WITH CHECK (public.app_has_any_role(ARRAY['Admin','LabTech']));

-- Billing: server-only for certain tables; staff read
DROP POLICY IF EXISTS vcharge_select_staff ON public."VisitCharge";
CREATE POLICY vcharge_select_staff ON public."VisitCharge" FOR SELECT TO authenticated USING (public.app_is_staff());
DROP POLICY IF EXISTS vcharge_write_server_only ON public."VisitCharge";
CREATE POLICY vcharge_write_server_only ON public."VisitCharge" FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS vchargecost_select_staff ON public."VisitChargeCost";
CREATE POLICY vchargecost_select_staff ON public."VisitChargeCost" FOR SELECT TO authenticated USING (public.app_is_staff());
DROP POLICY IF EXISTS vchargecost_write_server_only ON public."VisitChargeCost";
CREATE POLICY vchargecost_write_server_only ON public."VisitChargeCost" FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS invoice_select_staff ON public."Invoice";
CREATE POLICY invoice_select_staff ON public."Invoice" FOR SELECT TO authenticated USING (public.app_is_staff());
DROP POLICY IF EXISTS invoice_write_billing_admin ON public."Invoice";
CREATE POLICY invoice_write_billing_admin ON public."Invoice" FOR ALL TO authenticated USING (public.app_has_any_role(ARRAY['Admin','Billing'])) WITH CHECK (public.app_has_any_role(ARRAY['Admin','Billing']));

DROP POLICY IF EXISTS payment_select_staff ON public."Payment";
CREATE POLICY payment_select_staff ON public."Payment" FOR SELECT TO authenticated USING (public.app_is_staff());
DROP POLICY IF EXISTS payment_write_billing_admin ON public."Payment";
CREATE POLICY payment_write_billing_admin ON public."Payment" FOR ALL TO authenticated USING (public.app_has_any_role(ARRAY['Admin','Billing'])) WITH CHECK (public.app_has_any_role(ARRAY['Admin','Billing']));

-- Files metadata (note: actual file access controlled by Supabase Storage policies)
DROP POLICY IF EXISTS file_select_staff ON public."FileObject";
CREATE POLICY file_select_staff ON public."FileObject" FOR SELECT TO authenticated USING (public.app_is_staff());
DROP POLICY IF EXISTS file_write_server_only ON public."FileObject";
CREATE POLICY file_write_server_only ON public."FileObject" FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ChangeLog: admin read only
DROP POLICY IF EXISTS changelog_select_admin ON public."ChangeLog";
CREATE POLICY changelog_select_admin ON public."ChangeLog" FOR SELECT TO authenticated USING (public.app_has_role('Admin'));
