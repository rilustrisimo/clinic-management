import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Valid status transitions
const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending_payment: ['paid', 'cancelled'],
  paid: ['collecting', 'cancelled'],
  collecting: ['collected', 'cancelled'],
  collected: ['processing', 'cancelled'],
  processing: ['completed', 'cancelled'],
  completed: ['verified', 'released', 'cancelled'],
  verified: ['released', 'cancelled'],
  released: [], // Terminal state
  cancelled: [], // Terminal state
};

const updateStatusSchema = z.object({
  status: z.enum([
    'pending_payment',
    'paid',
    'collecting',
    'collected',
    'processing',
    'completed',
    'verified',
    'released',
    'cancelled',
  ]),
});

/**
 * POST /api/labs/orders/[id]/status
 * Update the status of a lab order
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    console.log('[API /api/labs/orders/[id]/status] POST request for:', id);

    const body = await request.json();
    console.log('[API /api/labs/orders/[id]/status] Request body:', body);

    // Validate input
    const parseResult = updateStatusSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.issues },
        { status: 400 },
      );
    }

    const { status: newStatus } = parseResult.data;

    // Use service role for writes
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    // Get current order
    const { data: existingOrder, error: checkError } = await supabase
      .from('LabOrder')
      .select('id, status, orderNumber')
      .eq('id', id)
      .single();

    if (checkError || !existingOrder) {
      return NextResponse.json({ error: 'Lab order not found' }, { status: 404 });
    }

    const currentStatus = existingOrder.status;

    // Check if transition is valid
    const allowedTransitions = STATUS_TRANSITIONS[currentStatus] || [];
    if (!allowedTransitions.includes(newStatus)) {
      return NextResponse.json(
        {
          error: `Invalid status transition from '${currentStatus}' to '${newStatus}'`,
          allowedTransitions,
        },
        { status: 400 },
      );
    }

    // Build update object
    const updateData: Record<string, any> = {
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    // If transitioning to paid, set paidAt (though confirm-payment endpoint should be used)
    if (newStatus === 'paid' && currentStatus === 'pending_payment') {
      updateData.paymentStatus = 'paid';
      updateData.paidAt = new Date().toISOString();
    }

    // Update the order
    const { data: order, error: updateError } = await supabase
      .from('LabOrder')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[API /api/labs/orders/[id]/status] Update error:', updateError);
      throw updateError;
    }

    console.log(
      '[API /api/labs/orders/[id]/status] Order status updated:',
      order.orderNumber,
      `${currentStatus} -> ${newStatus}`,
    );

    return NextResponse.json({
      success: true,
      data: order,
      previousStatus: currentStatus,
      newStatus: newStatus,
    });
  } catch (error) {
    console.error('[API /api/labs/orders/[id]/status] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update order status' },
      { status: 500 },
    );
  }
}
