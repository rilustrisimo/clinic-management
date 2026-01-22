import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createLabResultSchema } from '@/lib/validations/lab';

/**
 * POST /api/labs/results
 * Enter a lab result for an order item
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[API /api/labs/results] POST request received');

    const body = await request.json();
    console.log('[API /api/labs/results] Request body:', body);

    // Validate input
    const parseResult = createLabResultSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.issues },
        { status: 400 },
      );
    }

    const {
      orderItemId,
      specimenId,
      resultValue,
      resultText,
      units,
      referenceRange,
      abnormalFlag,
      notes,
    } = parseResult.data;

    // Use service role for writes
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    // Check if order item exists
    const { data: orderItem, error: itemError } = await supabase
      .from('LabOrderItem')
      .select(
        `
        id, status, orderId,
        order:LabOrder(id, status)
      `,
      )
      .eq('id', orderItemId)
      .single();

    if (itemError || !orderItem) {
      return NextResponse.json({ error: 'Order item not found' }, { status: 404 });
    }

    // Check if order is in a state that allows result entry
    const order = orderItem.order as any;
    const allowedOrderStatuses = ['collected', 'processing', 'completed', 'verified'];
    if (!allowedOrderStatuses.includes(order?.status)) {
      return NextResponse.json(
        { error: `Cannot enter results for an order in ${order?.status} status` },
        { status: 400 },
      );
    }

    // Check if result already exists for this item
    const { data: existingResult } = await supabase
      .from('LabResult')
      .select('id')
      .eq('orderItemId', orderItemId)
      .single();

    if (existingResult) {
      return NextResponse.json(
        { error: 'Result already exists for this item. Use PATCH to update.' },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();

    // Create the result
    const resultId = crypto.randomUUID();
    const { data: result, error: resultError } = await supabase
      .from('LabResult')
      .insert({
        id: resultId,
        orderItemId,
        specimenId: specimenId || null,
        resultValue: resultValue || null,
        resultText: resultText || null,
        units: units || null,
        referenceRange: referenceRange || null,
        abnormalFlag: abnormalFlag || null,
        notes: notes || null,
        enteredAt: now,
        // enteredById: userId, // TODO: Get from auth session
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single();

    if (resultError) {
      console.error('[API /api/labs/results] Result creation error:', resultError);
      throw resultError;
    }

    // Update order item status to completed
    await supabase
      .from('LabOrderItem')
      .update({
        status: 'completed',
      })
      .eq('id', orderItemId);

    // Update specimen status to processing if provided
    if (specimenId) {
      await supabase
        .from('Specimen')
        .update({
          status: 'processing',
          updatedAt: now,
        })
        .eq('id', specimenId)
        .in('status', ['received', 'processing']);
    }

    // Check if all items in the order have results
    const { data: allItems } = await supabase
      .from('LabOrderItem')
      .select(
        `
        id,
        result:LabResult(id)
      `,
      )
      .eq('orderId', orderItem.orderId);

    const allHaveResults = allItems?.every(
      (item: any) => item.result && (Array.isArray(item.result) ? item.result.length > 0 : true),
    );

    // Update order status to processing or completed
    if (allHaveResults) {
      await supabase
        .from('LabOrder')
        .update({
          status: 'completed',
          updatedAt: now,
        })
        .eq('id', orderItem.orderId);
    } else {
      await supabase
        .from('LabOrder')
        .update({
          status: 'processing',
          updatedAt: now,
        })
        .eq('id', orderItem.orderId)
        .in('status', ['collected', 'processing']);
    }

    console.log('[API /api/labs/results] Result created:', result.id);

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    console.error('[API /api/labs/results] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create result' },
      { status: 500 },
    );
  }
}
