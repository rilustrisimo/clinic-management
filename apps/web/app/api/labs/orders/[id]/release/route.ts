import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/labs/orders/[id]/release
 * Release all results for an order
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    console.log('[API /api/labs/orders/[id]/release] POST request for:', id);

    // Use service role for writes
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    // Check if order exists and has verified results
    const { data: order, error: orderError } = await supabase
      .from('LabOrder')
      .select(
        `
        id, status, orderNumber,
        items:LabOrderItem(
          id, status,
          result:LabResult(id, verifiedAt)
        )
      `,
      )
      .eq('id', id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Lab order not found' }, { status: 404 });
    }

    if (order.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cannot release results for a cancelled order' },
        { status: 400 },
      );
    }

    if (order.status === 'released') {
      return NextResponse.json({ error: 'Results have already been released' }, { status: 400 });
    }

    // Check if all items have verified results
    const items = order.items || [];
    const unverifiedItems = items.filter((item: any) => {
      const result = Array.isArray(item.result) ? item.result[0] : item.result;
      return !result || !result.verifiedAt;
    });

    if (unverifiedItems.length > 0) {
      return NextResponse.json(
        {
          error: 'Not all results have been verified',
          unverifiedCount: unverifiedItems.length,
        },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();

    // Update all results to released
    const resultIds = items
      .map((item: any) => {
        const result = Array.isArray(item.result) ? item.result[0] : item.result;
        return result?.id;
      })
      .filter(Boolean);

    if (resultIds.length > 0) {
      await supabase
        .from('LabResult')
        .update({
          releasedAt: now,
          updatedAt: now,
        })
        .in('id', resultIds);
    }

    // Update order status to released
    const { data: updatedOrder, error: updateError } = await supabase
      .from('LabOrder')
      .update({
        status: 'released',
        updatedAt: now,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[API /api/labs/orders/[id]/release] Update error:', updateError);
      throw updateError;
    }

    console.log(
      '[API /api/labs/orders/[id]/release] Results released for:',
      updatedOrder.orderNumber,
    );

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: `Results for order ${updatedOrder.orderNumber} have been released.`,
    });
  } catch (error) {
    console.error('[API /api/labs/orders/[id]/release] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to release results' },
      { status: 500 },
    );
  }
}
