-- Add supabaseId column to User table to link with Supabase Auth
ALTER TABLE "public"."User" ADD COLUMN IF NOT EXISTS "supabaseId" TEXT;

-- Create unique index on supabaseId
CREATE UNIQUE INDEX IF NOT EXISTS "User_supabaseId_key" ON "public"."User"("supabaseId");

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "User_supabaseId_idx" ON "public"."User"("supabaseId");
