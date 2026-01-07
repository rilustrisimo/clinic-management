-- Add deleted_at column to Patient table for soft deletes

ALTER TABLE "public"."Patient" 
ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ;

-- Add index for filtering active (non-deleted) patients
CREATE INDEX IF NOT EXISTS "idx_patient_deleted_at" 
ON "public"."Patient"("deleted_at");

-- Add comment
COMMENT ON COLUMN "public"."Patient"."deleted_at" IS 'Soft delete timestamp - null means active, not-null means deleted';
