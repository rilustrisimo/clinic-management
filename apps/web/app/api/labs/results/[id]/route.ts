import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/db/client';
import { updateLabResultSchema } from '@/lib/validations/lab';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/labs/results/[id]
 * Get a single lab result
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    console.log('[API /api/labs/results/[id]] GET request for:', id);

    const supabase = getSupabaseClient();

    const { data: result, error } = await supabase
      .from('LabResult')
      .select(
        `
        *,
        orderItem:LabOrderItem(
          *,
          test:LabTest(*),
          order:LabOrder(
            id, orderNumber,
            patient:Patient(id, firstName, lastName, mrn, dob, gender)
          )
        ),
        specimen:Specimen(id, accessionNo, specimenType),
        enteredBy:User!LabResult_enteredById_fkey(id, email),
        verifiedBy:User!LabResult_verifiedById_fkey(id, email),
        releasedBy:User!LabResult_releasedById_fkey(id, email)
      `,
      )
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Result not found' }, { status: 404 });
      }
      console.error('[API /api/labs/results/[id]] Database error:', error);
      throw error;
    }

    console.log('[API /api/labs/results/[id]] Found result:', result.id);

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('[API /api/labs/results/[id]] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch result' },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/labs/results/[id]
 * Update a lab result
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    console.log('[API /api/labs/results/[id]] PATCH request for:', id);

    const body = await request.json();
    const parseResult = updateLabResultSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.issues },
        { status: 400 },
      );
    }

    const updates = parseResult.data;

    // Use service role for writes
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    // Check if result exists and is not released
    const { data: existing, error: checkError } = await supabase
      .from('LabResult')
      .select('id, releasedAt')
      .eq('id', id)
      .single();

    if (checkError || !existing) {
      return NextResponse.json({ error: 'Result not found' }, { status: 404 });
    }

    if (existing.releasedAt) {
      return NextResponse.json({ error: 'Cannot update a released result' }, { status: 400 });
    }

    const { data: result, error: updateError } = await supabase
      .from('LabResult')
      .update({
        ...updates,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[API /api/labs/results/[id]] Update error:', updateError);
      throw updateError;
    }

    console.log('[API /api/labs/results/[id]] Result updated:', result.id);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[API /api/labs/results/[id]] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update result' },
      { status: 500 },
    );
  }
}
