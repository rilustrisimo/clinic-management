import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rejectSpecimenSchema } from '@/lib/validations/lab';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/labs/specimens/[id]/reject
 * Reject a specimen with reason
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    console.log('[API /api/labs/specimens/[id]/reject] POST request for:', id);

    const body = await request.json();
    const parseResult = rejectSpecimenSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.issues },
        { status: 400 },
      );
    }

    const { reason } = parseResult.data;

    // Use service role for writes
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    // Check if specimen exists and is not already rejected/completed
    const { data: existing, error: checkError } = await supabase
      .from('Specimen')
      .select('id, status, accessionNo, orderId')
      .eq('id', id)
      .single();

    if (checkError || !existing) {
      return NextResponse.json({ error: 'Specimen not found' }, { status: 404 });
    }

    if (existing.status === 'rejected') {
      return NextResponse.json({ error: 'Specimen is already rejected' }, { status: 400 });
    }

    if (existing.status === 'completed') {
      return NextResponse.json({ error: 'Cannot reject a completed specimen' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Update specimen to rejected
    const { data: specimen, error: updateError } = await supabase
      .from('Specimen')
      .update({
        status: 'rejected',
        rejectedReason: reason,
        rejectedAt: now,
        // rejectedById: userId, // TODO: Get from auth session
        updatedAt: now,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[API /api/labs/specimens/[id]/reject] Update error:', updateError);
      throw updateError;
    }

    // Create specimen event
    await supabase.from('SpecimenEvent').insert({
      id: crypto.randomUUID(),
      specimenId: id,
      eventType: 'rejected',
      details: { reason },
      performedAt: now,
      createdAt: now,
    });

    console.log('[API /api/labs/specimens/[id]/reject] Specimen rejected:', specimen.accessionNo);

    return NextResponse.json({
      success: true,
      data: specimen,
      message: `Specimen ${specimen.accessionNo} has been rejected. Reason: ${reason}`,
    });
  } catch (error) {
    console.error('[API /api/labs/specimens/[id]/reject] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reject specimen' },
      { status: 500 },
    );
  }
}
