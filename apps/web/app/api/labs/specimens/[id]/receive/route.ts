import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/labs/specimens/[id]/receive
 * Mark specimen as received in lab
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    console.log('[API /api/labs/specimens/[id]/receive] POST request for:', id);

    const body = await request.json().catch(() => ({}));
    const { notes } = body;

    // Use service role for writes
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    // Check if specimen exists and is in collected status
    const { data: existing, error: checkError } = await supabase
      .from('Specimen')
      .select('id, status, accessionNo, orderId')
      .eq('id', id)
      .single();

    if (checkError || !existing) {
      return NextResponse.json({ error: 'Specimen not found' }, { status: 404 });
    }

    if (existing.status !== 'collected') {
      return NextResponse.json(
        {
          error: `Cannot receive a specimen in ${existing.status} status. Specimen must be in 'collected' status.`,
        },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();

    // Update specimen to received
    const { data: specimen, error: updateError } = await supabase
      .from('Specimen')
      .update({
        status: 'received',
        receivedAt: now,
        // receivedById: userId, // TODO: Get from auth session
        updatedAt: now,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[API /api/labs/specimens/[id]/receive] Update error:', updateError);
      throw updateError;
    }

    // Create specimen event
    await supabase.from('SpecimenEvent').insert({
      id: crypto.randomUUID(),
      specimenId: id,
      eventType: 'received',
      details: { notes },
      performedAt: now,
      createdAt: now,
    });

    console.log('[API /api/labs/specimens/[id]/receive] Specimen received:', specimen.accessionNo);

    return NextResponse.json({
      success: true,
      data: specimen,
      message: `Specimen ${specimen.accessionNo} has been received in the lab.`,
    });
  } catch (error) {
    console.error('[API /api/labs/specimens/[id]/receive] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to mark specimen as received' },
      { status: 500 },
    );
  }
}
