import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials missing');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const sql = `
-- Fix PatientVersion table permissions for service role
GRANT ALL ON TABLE "public"."PatientVersion" TO service_role;

ALTER TABLE "public"."PatientVersion" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS patientversion_service_all ON public."PatientVersion";
CREATE POLICY patientversion_service_all ON public."PatientVersion"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS patientversion_select_staff ON public."PatientVersion";
CREATE POLICY patientversion_select_staff ON public."PatientVersion"
  FOR SELECT TO authenticated USING (public.app_is_staff());

DROP POLICY IF EXISTS patientversion_insert_service ON public."PatientVersion";
CREATE POLICY patientversion_insert_service ON public."PatientVersion"
  FOR INSERT TO service_role WITH CHECK (true);
    `.trim();

    // Execute each statement separately since Supabase doesn't support multi-statement SQL via client
    const statements = sql.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      if (!statement.trim()) continue;
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
      if (error) {
        console.error('Migration statement failed:', statement);
        throw error;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'PatientVersion permissions fixed' 
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: error.message || 'Migration failed' },
      { status: 500 }
    );
  }
}
