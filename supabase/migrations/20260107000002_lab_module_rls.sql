-- Migration: Lab Module RLS Policies
-- Enables Row Level Security and creates policies for lab tables

-- =====================================================
-- ENABLE RLS ON ALL LAB TABLES
-- =====================================================

ALTER TABLE "public"."LabTest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."LabPanel" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."LabPanelItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."LabOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."LabOrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Specimen" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."SpecimenEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."LabResult" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."LabResultToken" ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SERVICE ROLE POLICIES (Full Access)
-- =====================================================

-- LabTest
CREATE POLICY "labtest_service_all" ON "public"."LabTest"
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- LabPanel
CREATE POLICY "labpanel_service_all" ON "public"."LabPanel"
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- LabPanelItem
CREATE POLICY "labpanelitem_service_all" ON "public"."LabPanelItem"
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- LabOrder
CREATE POLICY "laborder_service_all" ON "public"."LabOrder"
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- LabOrderItem
CREATE POLICY "laborderitem_service_all" ON "public"."LabOrderItem"
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Specimen
CREATE POLICY "specimen_service_all" ON "public"."Specimen"
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- SpecimenEvent
CREATE POLICY "specimenevent_service_all" ON "public"."SpecimenEvent"
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- LabResult
CREATE POLICY "labresult_service_all" ON "public"."LabResult"
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- LabResultToken
CREATE POLICY "labresulttoken_service_all" ON "public"."LabResultToken"
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- =====================================================
-- AUTHENTICATED USER POLICIES (Role-based)
-- =====================================================

-- Helper function to check if user has a specific role
-- (Using existing app_has_role function if available, or create one)
CREATE OR REPLACE FUNCTION app_has_lab_role(required_role text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM "public"."UserRole" ur
    JOIN "public"."Role" r ON ur."roleId" = r."id"
    WHERE ur."userId" = auth.uid()::text
    AND r."name" = required_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has any lab-related role
CREATE OR REPLACE FUNCTION app_is_lab_staff()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM "public"."UserRole" ur
    JOIN "public"."Role" r ON ur."roleId" = r."id"
    WHERE ur."userId" = auth.uid()::text
    AND r."name" IN ('Admin', 'Provider', 'LabTech', 'Frontdesk', 'Billing')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can manage lab catalog (Admin only)
CREATE OR REPLACE FUNCTION app_can_manage_lab_catalog()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM "public"."UserRole" ur
    JOIN "public"."Role" r ON ur."roleId" = r."id"
    WHERE ur."userId" = auth.uid()::text
    AND r."name" = 'Admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can process lab work (LabTech or Admin)
CREATE OR REPLACE FUNCTION app_can_process_lab()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM "public"."UserRole" ur
    JOIN "public"."Role" r ON ur."roleId" = r."id"
    WHERE ur."userId" = auth.uid()::text
    AND r."name" IN ('Admin', 'LabTech')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- LAB CATALOG POLICIES
-- =====================================================

-- LabTest: All authenticated staff can read, only Admin can modify
CREATE POLICY "labtest_read_staff" ON "public"."LabTest"
  FOR SELECT TO authenticated
  USING (app_is_lab_staff());

CREATE POLICY "labtest_write_admin" ON "public"."LabTest"
  FOR ALL TO authenticated
  USING (app_can_manage_lab_catalog())
  WITH CHECK (app_can_manage_lab_catalog());

-- LabPanel: All authenticated staff can read, only Admin can modify
CREATE POLICY "labpanel_read_staff" ON "public"."LabPanel"
  FOR SELECT TO authenticated
  USING (app_is_lab_staff());

CREATE POLICY "labpanel_write_admin" ON "public"."LabPanel"
  FOR ALL TO authenticated
  USING (app_can_manage_lab_catalog())
  WITH CHECK (app_can_manage_lab_catalog());

-- LabPanelItem: All authenticated staff can read, only Admin can modify
CREATE POLICY "labpanelitem_read_staff" ON "public"."LabPanelItem"
  FOR SELECT TO authenticated
  USING (app_is_lab_staff());

CREATE POLICY "labpanelitem_write_admin" ON "public"."LabPanelItem"
  FOR ALL TO authenticated
  USING (app_can_manage_lab_catalog())
  WITH CHECK (app_can_manage_lab_catalog());

-- =====================================================
-- LAB ORDER POLICIES
-- =====================================================

-- LabOrder: All staff can read, Frontdesk/Admin/Provider can create
CREATE POLICY "laborder_read_staff" ON "public"."LabOrder"
  FOR SELECT TO authenticated
  USING (app_is_lab_staff());

CREATE POLICY "laborder_insert_staff" ON "public"."LabOrder"
  FOR INSERT TO authenticated
  WITH CHECK (
    app_has_lab_role('Admin') OR
    app_has_lab_role('Frontdesk') OR
    app_has_lab_role('Provider')
  );

CREATE POLICY "laborder_update_staff" ON "public"."LabOrder"
  FOR UPDATE TO authenticated
  USING (app_is_lab_staff())
  WITH CHECK (app_is_lab_staff());

-- LabOrderItem: All staff can read, follows order permissions
CREATE POLICY "laborderitem_read_staff" ON "public"."LabOrderItem"
  FOR SELECT TO authenticated
  USING (app_is_lab_staff());

CREATE POLICY "laborderitem_write_staff" ON "public"."LabOrderItem"
  FOR ALL TO authenticated
  USING (app_is_lab_staff())
  WITH CHECK (app_is_lab_staff());

-- =====================================================
-- SPECIMEN POLICIES
-- =====================================================

-- Specimen: All staff can read, LabTech/Admin can modify
CREATE POLICY "specimen_read_staff" ON "public"."Specimen"
  FOR SELECT TO authenticated
  USING (app_is_lab_staff());

CREATE POLICY "specimen_write_labtech" ON "public"."Specimen"
  FOR ALL TO authenticated
  USING (app_can_process_lab())
  WITH CHECK (app_can_process_lab());

-- SpecimenEvent: All staff can read, LabTech/Admin can insert
CREATE POLICY "specimenevent_read_staff" ON "public"."SpecimenEvent"
  FOR SELECT TO authenticated
  USING (app_is_lab_staff());

CREATE POLICY "specimenevent_insert_labtech" ON "public"."SpecimenEvent"
  FOR INSERT TO authenticated
  WITH CHECK (app_can_process_lab());

-- =====================================================
-- LAB RESULT POLICIES
-- =====================================================

-- LabResult: All staff can read, LabTech/Admin can write
CREATE POLICY "labresult_read_staff" ON "public"."LabResult"
  FOR SELECT TO authenticated
  USING (app_is_lab_staff());

CREATE POLICY "labresult_write_labtech" ON "public"."LabResult"
  FOR ALL TO authenticated
  USING (app_can_process_lab())
  WITH CHECK (app_can_process_lab());

-- =====================================================
-- LAB RESULT TOKEN POLICIES
-- =====================================================

-- LabResultToken: Staff can manage, service role for public access validation
CREATE POLICY "labresulttoken_staff" ON "public"."LabResultToken"
  FOR ALL TO authenticated
  USING (app_is_lab_staff())
  WITH CHECK (app_is_lab_staff());

-- Allow anonymous read for token validation (public results page)
CREATE POLICY "labresulttoken_anon_read" ON "public"."LabResultToken"
  FOR SELECT TO anon
  USING (
    "expiresAt" > now()
    AND "viewCount" < "maxViews"
  );

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant authenticated users access to lab tables
GRANT SELECT, INSERT, UPDATE ON "public"."LabTest" TO authenticated;
GRANT SELECT, INSERT, UPDATE ON "public"."LabPanel" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "public"."LabPanelItem" TO authenticated;
GRANT SELECT, INSERT, UPDATE ON "public"."LabOrder" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "public"."LabOrderItem" TO authenticated;
GRANT SELECT, INSERT, UPDATE ON "public"."Specimen" TO authenticated;
GRANT SELECT, INSERT ON "public"."SpecimenEvent" TO authenticated;
GRANT SELECT, INSERT, UPDATE ON "public"."LabResult" TO authenticated;
GRANT SELECT, INSERT, UPDATE ON "public"."LabResultToken" TO authenticated;

-- Grant anon read access for public results viewing
GRANT SELECT ON "public"."LabResultToken" TO anon;

-- Grant service_role full access
GRANT ALL ON "public"."LabTest" TO service_role;
GRANT ALL ON "public"."LabPanel" TO service_role;
GRANT ALL ON "public"."LabPanelItem" TO service_role;
GRANT ALL ON "public"."LabOrder" TO service_role;
GRANT ALL ON "public"."LabOrderItem" TO service_role;
GRANT ALL ON "public"."Specimen" TO service_role;
GRANT ALL ON "public"."SpecimenEvent" TO service_role;
GRANT ALL ON "public"."LabResult" TO service_role;
GRANT ALL ON "public"."LabResultToken" TO service_role;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION generate_lab_order_number() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_lab_order_number() TO service_role;
GRANT EXECUTE ON FUNCTION generate_accession_number() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_accession_number() TO service_role;
