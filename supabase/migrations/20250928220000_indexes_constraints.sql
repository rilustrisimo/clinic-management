-- Extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Appointments overlap guard (provider)
DO $$ BEGIN
  ALTER TABLE "public"."Appointment" ADD COLUMN "time_range" tstzrange;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Backfill time_range and index/constraint
UPDATE "public"."Appointment" SET "time_range" = tstzrange("startsAt","endsAt",'[)') WHERE "time_range" IS NULL;
CREATE INDEX IF NOT EXISTS idx_appointment_time_range ON "public"."Appointment" USING GIST ("time_range");
DO $$ BEGIN
  ALTER TABLE "public"."Appointment" ADD CONSTRAINT "no_overlap_per_provider" EXCLUDE USING GIST ("providerId" WITH =, "time_range" WITH &&);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Fuzzy search generated cols and trigram indexes
DO $$ BEGIN
  ALTER TABLE "public"."Patient" ADD COLUMN "full_name" text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "public"."Patient" ADD COLUMN "email_lower" text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

UPDATE "public"."Patient" SET "full_name" = btrim(concat_ws(' ', coalesce("firstName",''), coalesce("middleName",''), coalesce("lastName",'')));
UPDATE "public"."Patient" SET "email_lower" = lower("email");

CREATE INDEX IF NOT EXISTS idx_patient_full_name_trgm ON "public"."Patient" USING GIN ("full_name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_patient_email_trgm ON "public"."Patient" USING GIN ("email_lower" gin_trgm_ops);
