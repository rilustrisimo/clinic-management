import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/db/client';
import { updateSpecimenSchema } from '@/lib/validations/lab';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/labs/specimens/[id]
 * Get a single specimen with events
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    console.log('[API /api/labs/specimens/[id]] GET request for:', id);

    const supabase = getSupabaseClient();

    const { data: specimen, error } = await supabase
      .from('Specimen')
      .select(
        `
        *,
        order:LabOrder(
          id, orderNumber, status, patientId,
          patient:Patient(id, firstName, lastName, middleName, mrn, dob, gender)
        ),
        orderItem:LabOrderItem(
          id, testCode, testName, section,
          test:LabTest(*)
        ),
        collectedBy:User!Specimen_collectedById_fkey(id, email),
        receivedBy:User!Specimen_receivedById_fkey(id, email),
        rejectedBy:User!Specimen_rejectedById_fkey(id, email),
        events:SpecimenEvent(
          *,
          performedBy:User(id, email)
        )
      `,
      )
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Specimen not found' }, { status: 404 });
      }
      console.error('[API /api/labs/specimens/[id]] Database error:', error);
      throw error;
    }

    console.log('[API /api/labs/specimens/[id]] Found specimen:', specimen.accessionNo);

    return NextResponse.json({ data: specimen });
  } catch (error) {
    console.error('[API /api/labs/specimens/[id]] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch specimen' },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/labs/specimens/[id]
 * Update specimen details
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    console.log('[API /api/labs/specimens/[id]] PATCH request for:', id);

    const body = await request.json();
    const parseResult = updateSpecimenSchema.safeParse(body);

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

    // Check if specimen exists and is not rejected/completed
    const { data: existing, error: checkError } = await supabase
      .from('Specimen')
      .select('id, status')
      .eq('id', id)
      .single();

    if (checkError || !existing) {
      return NextResponse.json({ error: 'Specimen not found' }, { status: 404 });
    }

    if (existing.status === 'rejected') {
      return NextResponse.json({ error: 'Cannot update a rejected specimen' }, { status: 400 });
    }

    if (existing.status === 'completed') {
      return NextResponse.json({ error: 'Cannot update a completed specimen' }, { status: 400 });
    }

    const { data: specimen, error: updateError } = await supabase
      .from('Specimen')
      .update({
        ...updates,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[API /api/labs/specimens/[id]] Update error:', updateError);
      throw updateError;
    }

    console.log('[API /api/labs/specimens/[id]] Specimen updated:', specimen.accessionNo);

    return NextResponse.json({ success: true, data: specimen });
  } catch (error) {
    console.error('[API /api/labs/specimens/[id]] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update specimen' },
      { status: 500 },
    );
  }
}
