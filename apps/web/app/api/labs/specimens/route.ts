import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/db/client';
import { createSpecimenSchema } from '@/lib/validations/lab';

/**
 * GET /api/labs/specimens
 * List specimens with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[API /api/labs/specimens] GET request received');

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const status = searchParams.get('status');
    const specimenType = searchParams.get('specimenType');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = getSupabaseClient();

    let query = supabase
      .from('Specimen')
      .select(
        `
        *,
        order:LabOrder(
          id, orderNumber, status,
          patient:Patient(id, firstName, lastName, mrn)
        ),
        orderItem:LabOrderItem(
          id, testCode, testName, section
        ),
        collectedBy:User!Specimen_collectedById_fkey(id, email),
        receivedBy:User!Specimen_receivedById_fkey(id, email),
        events:SpecimenEvent(*)
      `,
        { count: 'exact' },
      )
      .order('createdAt', { ascending: false })
      .range(offset, offset + limit - 1);

    if (orderId) {
      query = query.eq('orderId', orderId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (specimenType) {
      query = query.eq('specimenType', specimenType);
    }

    if (search) {
      query = query.ilike('accessionNo', `%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[API /api/labs/specimens] Database error:', error);
      throw error;
    }

    console.log(`[API /api/labs/specimens] Found ${data?.length || 0} of ${count || 0} specimens`);

    return NextResponse.json({
      items: data || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[API /api/labs/specimens] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch specimens' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/labs/specimens
 * Create/accession a new specimen
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[API /api/labs/specimens] POST request received');

    const body = await request.json();
    console.log('[API /api/labs/specimens] Request body:', body);

    // Validate input
    const parseResult = createSpecimenSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.issues },
        { status: 400 },
      );
    }

    const { orderId, orderItemId, specimenType, container, volumeMl, appearance, collectionNotes } =
      parseResult.data;

    // Use service role for writes
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    // Check if order exists and is in the right status
    const { data: order, error: orderError } = await supabase
      .from('LabOrder')
      .select('id, status, paymentStatus')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Lab order not found' }, { status: 404 });
    }

    // Only allow specimen creation for paid orders
    if (order.paymentStatus !== 'paid') {
      return NextResponse.json(
        { error: 'Cannot create specimen for an unpaid order' },
        { status: 400 },
      );
    }

    if (order.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cannot create specimen for a cancelled order' },
        { status: 400 },
      );
    }

    // Generate accession number
    const { data: accessionNo, error: accessionError } = await supabase.rpc(
      'generate_accession_number',
    );

    if (accessionError) {
      console.error('[API /api/labs/specimens] Accession number error:', accessionError);
      throw new Error('Failed to generate accession number');
    }

    console.log('[API /api/labs/specimens] Generated accession number:', accessionNo);

    // Create the specimen
    const specimenId = crypto.randomUUID();
    const { data: specimen, error: specimenError } = await supabase
      .from('Specimen')
      .insert({
        id: specimenId,
        accessionNo,
        orderId,
        orderItemId: orderItemId || null,
        specimenType,
        container: container || null,
        volumeMl: volumeMl || null,
        appearance: appearance || null,
        collectionNotes: collectionNotes || null,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (specimenError) {
      console.error('[API /api/labs/specimens] Specimen creation error:', specimenError);
      throw specimenError;
    }

    // Create specimen event
    await supabase.from('SpecimenEvent').insert({
      id: crypto.randomUUID(),
      specimenId: specimen.id,
      eventType: 'accessioned',
      details: { accessionNo, specimenType, container },
      performedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    // Update order status to collecting if it was paid
    if (order.status === 'paid') {
      await supabase
        .from('LabOrder')
        .update({
          status: 'collecting',
          updatedAt: new Date().toISOString(),
        })
        .eq('id', orderId);
    }

    console.log('[API /api/labs/specimens] Specimen created:', specimen.accessionNo);

    return NextResponse.json({ success: true, data: specimen }, { status: 201 });
  } catch (error) {
    console.error('[API /api/labs/specimens] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create specimen' },
      { status: 500 },
    );
  }
}
