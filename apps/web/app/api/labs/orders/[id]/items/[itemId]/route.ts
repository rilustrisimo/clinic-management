import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface RouteParams {
  params: Promise<{ id: string; itemId: string }>;
}

/**
 * DELETE /api/labs/orders/[id]/items/[itemId]
 * Remove an item from an order
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, itemId } = await params;
    console.log(
      '[API /api/labs/orders/[id]/items/[itemId]] DELETE request for item:',
      itemId,
      'from order:',
      id,
    );

    // Use service role for writes
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    // Check if order exists and is in a modifiable status
    const { data: order, error: orderError } = await supabase
      .from('LabOrder')
      .select('id, status, totalAmount')
      .eq('id', id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Lab order not found' }, { status: 404 });
    }

    // Only allow removing items from orders that haven't started processing
    const modifiableStatuses = ['pending_payment', 'paid'];
    if (!modifiableStatuses.includes(order.status)) {
      return NextResponse.json(
        { error: `Cannot remove items from an order in ${order.status} status` },
        { status: 400 },
      );
    }

    // Check if item exists and belongs to this order
    const { data: item, error: itemError } = await supabase
      .from('LabOrderItem')
      .select('id, orderId, priceSnapshot, status')
      .eq('id', itemId)
      .eq('orderId', id)
      .single();

    if (itemError || !item) {
      return NextResponse.json({ error: 'Order item not found' }, { status: 404 });
    }

    // Check if item has results
    const { data: result } = await supabase
      .from('LabResult')
      .select('id')
      .eq('orderItemId', itemId)
      .single();

    if (result) {
      return NextResponse.json(
        { error: 'Cannot remove an item that has results' },
        { status: 400 },
      );
    }

    // Count remaining items
    const { count: itemCount } = await supabase
      .from('LabOrderItem')
      .select('*', { count: 'exact', head: true })
      .eq('orderId', id);

    if ((itemCount || 0) <= 1) {
      return NextResponse.json(
        { error: 'Cannot remove the last item. Cancel the order instead.' },
        { status: 400 },
      );
    }

    // Delete the item
    const { error: deleteError } = await supabase.from('LabOrderItem').delete().eq('id', itemId);

    if (deleteError) {
      console.error('[API /api/labs/orders/[id]/items/[itemId]] Delete error:', deleteError);
      throw deleteError;
    }

    // Update order total
    const priceReduction = parseFloat(item.priceSnapshot) || 0;
    const newTotal = Math.max(0, (parseFloat(order.totalAmount) || 0) - priceReduction);

    await supabase
      .from('LabOrder')
      .update({
        totalAmount: newTotal,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', id);

    console.log('[API /api/labs/orders/[id]/items/[itemId]] Item removed:', itemId);

    return NextResponse.json({
      success: true,
      message: 'Item removed from order',
      priceReduction,
      newTotal,
    });
  } catch (error) {
    console.error('[API /api/labs/orders/[id]/items/[itemId]] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove item from order' },
      { status: 500 },
    );
  }
}
