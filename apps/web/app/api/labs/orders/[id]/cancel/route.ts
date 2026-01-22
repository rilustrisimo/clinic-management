import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/labs/orders/[id]/cancel
 * Cancel a lab order
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    console.log('[API /api/labs/orders/[id]/cancel] POST request for:', id);

    const body = await request.json().catch(() => ({}));
    const { reason } = body;

    // Use service role for writes
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    // Check if order exists and can be cancelled
    const { data: existingOrder, error: checkError } = await supabase
      .from('LabOrder')
      .select('id, status, orderNumber')
      .eq('id', id)
      .single();

    if (checkError || !existingOrder) {
      return NextResponse.json({ error: 'Lab order not found' }, { status: 404 });
    }

    if (existingOrder.status === 'cancelled') {
      return NextResponse.json({ error: 'Order is already cancelled' }, { status: 400 });
    }

    if (existingOrder.status === 'released') {
      return NextResponse.json({ error: 'Cannot cancel a released order' }, { status: 400 });
    }

    // Orders with specimens collected or results entered should require special handling
    const nonCancellableStatuses = ['processing', 'completed', 'verified'];
    if (nonCancellableStatuses.includes(existingOrder.status)) {
      return NextResponse.json(
        {
          error: `Cannot cancel an order in ${existingOrder.status} status. Please contact lab management.`,
        },
        { status: 400 },
      );
    }

    // Update the order to cancelled
    const updateData: any = {
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
    };

    if (reason) {
      updateData.notes =
        existingOrder.status === 'pending_payment'
          ? `Cancelled: ${reason}`
          : `${existingOrder.status} - Cancelled: ${reason}`;
    }

    const { data: order, error: updateError } = await supabase
      .from('LabOrder')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[API /api/labs/orders/[id]/cancel] Update error:', updateError);
      throw updateError;
    }

    // Cancel all pending specimens
    await supabase
      .from('Specimen')
      .update({
        status: 'rejected',
        rejectedReason: 'Order cancelled',
        rejectedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .eq('orderId', id)
      .in('status', ['pending', 'collected']);

    console.log('[API /api/labs/orders/[id]/cancel] Order cancelled:', order.orderNumber);

    return NextResponse.json({
      success: true,
      data: order,
      message: `Order ${order.orderNumber} has been cancelled.`,
    });
  } catch (error) {
    console.error('[API /api/labs/orders/[id]/cancel] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel order' },
      { status: 500 },
    );
  }
}
