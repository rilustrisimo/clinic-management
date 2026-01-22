import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { collectSpecimenSchema } from '@/lib/validations/lab';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/labs/specimens/[id]/collect
 * Mark specimen as collected
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    console.log('[API /api/labs/specimens/[id]/collect] POST request for:', id);

    const body = await request.json().catch(() => ({}));
    const parseResult = collectSpecimenSchema.safeParse(body);

    const collectionData = parseResult.success ? parseResult.data : {};

    // Use service role for writes
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    // Check if specimen exists and is in pending status
    const { data: existing, error: checkError } = await supabase
      .from('Specimen')
      .select('id, status, accessionNo, orderId')
      .eq('id', id)
      .single();

    if (checkError || !existing) {
      return NextResponse.json({ error: 'Specimen not found' }, { status: 404 });
    }

    if (existing.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot collect a specimen in ${existing.status} status` },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();

    // Update specimen to collected
    const { data: specimen, error: updateError } = await supabase
      .from('Specimen')
      .update({
        status: 'collected',
        collectedAt: now,
        // collectedById: userId, // TODO: Get from auth session
        appearance: collectionData.appearance || null,
        volumeMl: collectionData.volumeMl || null,
        collectionNotes: collectionData.collectionNotes || null,
        updatedAt: now,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[API /api/labs/specimens/[id]/collect] Update error:', updateError);
      throw updateError;
    }

    // Create specimen event
    await supabase.from('SpecimenEvent').insert({
      id: crypto.randomUUID(),
      specimenId: id,
      eventType: 'collected',
      details: {
        appearance: collectionData.appearance,
        volumeMl: collectionData.volumeMl,
        notes: collectionData.collectionNotes,
      },
      performedAt: now,
      createdAt: now,
    });

    // Check if all specimens for this order are collected
    const { data: allSpecimens } = await supabase
      .from('Specimen')
      .select('id, status')
      .eq('orderId', existing.orderId);

    const allCollected = allSpecimens?.every(
      (s) =>
        s.status === 'collected' ||
        s.status === 'received' ||
        s.status === 'processing' ||
        s.status === 'completed',
    );

    // Update order status if all specimens are collected
    if (allCollected) {
      await supabase
        .from('LabOrder')
        .update({
          status: 'collected',
          updatedAt: now,
        })
        .eq('id', existing.orderId);
    }

    console.log('[API /api/labs/specimens/[id]/collect] Specimen collected:', specimen.accessionNo);

    return NextResponse.json({
      success: true,
      data: specimen,
      message: `Specimen ${specimen.accessionNo} has been collected.`,
    });
  } catch (error) {
    console.error('[API /api/labs/specimens/[id]/collect] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to mark specimen as collected' },
      { status: 500 },
    );
  }
}
