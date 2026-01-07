-- Station scoping for Appointments
-- Adds station concept and refines RLS to scope writes by station for non-admin roles.

CREATE TABLE IF NOT EXISTS public."Station" (
  id text primary key,
  name text not null,
  createdAt timestamp(3) not null default current_timestamp
);

CREATE TABLE IF NOT EXISTS public."UserStation" (
  id text primary key,
  userId text not null references public."User"(id) on delete cascade,
  stationId text not null references public."Station"(id) on delete cascade,
  unique(userId, stationId)
);

ALTER TABLE public."Appointment" ADD COLUMN IF NOT EXISTS "stationId" text;
DO $$ BEGIN
  ALTER TABLE public."Appointment"
    ADD CONSTRAINT "Appointment_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES public."Station"(id) ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "Appointment_stationId_idx" ON public."Appointment"("stationId");

-- RLS refinement: Appointments write policy limited by station membership for Frontdesk; Providers can write their own; Admin unrestricted
DROP POLICY IF EXISTS appt_write_roles ON public."Appointment";
CREATE POLICY appt_write_roles ON public."Appointment"
  FOR ALL TO authenticated
  USING (
    public.app_has_role('Admin')
    OR (public.app_has_role('Provider') AND "providerId" = auth.uid()::text)
    OR (
      public.app_has_role('Frontdesk') AND (
        "stationId" IS NULL OR EXISTS (
          SELECT 1 FROM public."UserStation" us WHERE us.userid = auth.uid()::text AND us.stationid = "Appointment"."stationId"
        )
      )
    )
  )
  WITH CHECK (
    public.app_has_role('Admin')
    OR (public.app_has_role('Provider') AND "providerId" = auth.uid()::text)
    OR (
      public.app_has_role('Frontdesk') AND (
        "stationId" IS NULL OR EXISTS (
          SELECT 1 FROM public."UserStation" us WHERE us.userid = auth.uid()::text AND us.stationid = "Appointment"."stationId"
        )
      )
    )
  );