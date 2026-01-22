import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/db/client';
import { updateLabOrderSchema } from '@/lib/validations/lab';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/labs/orders/[id]
 * Get a single lab order with all related data
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    console.log('[API /api/labs/orders/[id]] GET request for:', id);

    const supabase = getSupabaseClient();

    // First, let's try to get items directly to debug
    const { data: directItems, error: directError } = await supabase
      .from('LabOrderItem')
      .select('*')
      .eq('orderId', id);

    console.log('[API /api/labs/orders/[id]] Direct items query result:', directItems?.length || 0);
    if (directError) {
      console.error('[API /api/labs/orders/[id]] Direct items error:', directError);
    }

    const { data: order, error } = await supabase
      .from('LabOrder')
      .select(
        `
        *,
        patient:Patient(id, firstName, lastName, middleName, mrn, dob, gender, phone, email),
        orderingProvider:User!LabOrder_orderingProviderId_fkey(id, email),
        createdBy:User!LabOrder_createdById_fkey(id, email),
        items:LabOrderItem!LabOrderItem_orderId_fkey(
          *,
          test:LabTest!LabOrderItem_testId_fkey(id, code, name, section, specimenType, container, defaultUnits, referenceRange, requiresVerification),
          panel:LabPanel!LabOrderItem_panelId_fkey(id, code, name, section),
          result:LabResult(*)
        ),
        specimens:Specimen(
          *,
          collectedBy:User!Specimen_collectedById_fkey(id, email),
          receivedBy:User!Specimen_receivedById_fkey(id, email),
          events:SpecimenEvent(*)
        ),
        timeline:LabOrderTimeline(
          id,
          status,
          timestamp,
          notes,
          userId,
          user:User(id, email)
        )
      `,
      )
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Lab order not found' }, { status: 404 });
      }
      console.error('[API /api/labs/orders/[id]] Database error:', error);
      throw error;
    }

    console.log('[API /api/labs/orders/[id]] Found order:', order.orderNumber);
    console.log('[API /api/labs/orders/[id]] Order items count:', order.items?.length || 0);
    console.log('[API /api/labs/orders/[id]] Order items:', JSON.stringify(order.items, null, 2));

    // If items are empty but we found them in direct query, add them
    if ((!order.items || order.items.length === 0) && directItems && directItems.length > 0) {
      console.log('[API /api/labs/orders/[id]] Using direct items as fallback');
      order.items = directItems;
    }

    return NextResponse.json({ data: order });
  } catch (error) {
    console.error('[API /api/labs/orders/[id]] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch lab order' },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/labs/orders/[id]
 * Update a lab order (priority, notes)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    console.log('[API /api/labs/orders/[id]] PATCH request for:', id);

    const body = await request.json();
    console.log('[API /api/labs/orders/[id]] Request body:', body);

    // Validate input
    const parseResult = updateLabOrderSchema.safeParse(body);
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

    // Check if order exists and is not cancelled/released
    const { data: existingOrder, error: checkError } = await supabase
      .from('LabOrder')
      .select('id, status')
      .eq('id', id)
      .single();

    if (checkError || !existingOrder) {
      return NextResponse.json({ error: 'Lab order not found' }, { status: 404 });
    }

    if (existingOrder.status === 'cancelled') {
      return NextResponse.json({ error: 'Cannot update a cancelled order' }, { status: 400 });
    }

    if (existingOrder.status === 'released') {
      return NextResponse.json({ error: 'Cannot update a released order' }, { status: 400 });
    }

    // Update the order
    const { data: order, error: updateError } = await supabase
      .from('LabOrder')
      .update({
        ...updates,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[API /api/labs/orders/[id]] Update error:', updateError);
      throw updateError;
    }

    console.log('[API /api/labs/orders/[id]] Order updated:', order.orderNumber);

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error('[API /api/labs/orders/[id]] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update lab order' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/labs/orders/[id]
 * Delete a lab order (only allowed for pending_payment status)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    console.log('[API /api/labs/orders/[id]] DELETE request for:', id);

    // Use service role for writes
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    // Check if order exists and is in pending_payment status
    const { data: existingOrder, error: checkError } = await supabase
      .from('LabOrder')
      .select('id, status, orderNumber')
      .eq('id', id)
      .single();

    if (checkError || !existingOrder) {
      return NextResponse.json({ error: 'Lab order not found' }, { status: 404 });
    }

    // Only allow deletion for pending_payment orders
    if (existingOrder.status !== 'pending_payment') {
      return NextResponse.json(
        {
          error:
            'Only orders with pending_payment status can be deleted. Use cancel for paid orders.',
        },
        { status: 400 },
      );
    }

    // Delete order items first (cascade)
    const { error: itemsDeleteError } = await supabase
      .from('LabOrderItem')
      .delete()
      .eq('orderId', id);

    if (itemsDeleteError) {
      console.error('[API /api/labs/orders/[id]] Items delete error:', itemsDeleteError);
      // Continue anyway, order delete might still work
    }

    // Delete the order
    const { error: deleteError } = await supabase.from('LabOrder').delete().eq('id', id);

    if (deleteError) {
      console.error('[API /api/labs/orders/[id]] Delete error:', deleteError);
      throw deleteError;
    }

    console.log('[API /api/labs/orders/[id]] Order deleted:', existingOrder.orderNumber);

    return NextResponse.json({ success: true, message: 'Order deleted successfully' });
  } catch (error) {
    console.error('[API /api/labs/orders/[id]] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete lab order' },
      { status: 500 },
    );
  }
}
