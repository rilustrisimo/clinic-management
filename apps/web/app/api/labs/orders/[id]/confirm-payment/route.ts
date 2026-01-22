import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { confirmPaymentSchema } from '@/lib/validations/lab';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/labs/orders/[id]/confirm-payment
 * Confirm payment for a lab order (changes status from pending_payment to paid)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    console.log('[API /api/labs/orders/[id]/confirm-payment] POST request for:', id);

    const body = await request.json();
    console.log('[API /api/labs/orders/[id]/confirm-payment] Request body:', body);

    // Validate input
    const parseResult = confirmPaymentSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.issues },
        { status: 400 },
      );
    }

    const { paymentReference, amount } = parseResult.data;

    // Use service role for writes
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    // Check if order exists and is in pending_payment status
    const { data: existingOrder, error: checkError } = await supabase
      .from('LabOrder')
      .select('id, status, paymentStatus, orderNumber, totalAmount')
      .eq('id', id)
      .single();

    if (checkError || !existingOrder) {
      return NextResponse.json({ error: 'Lab order not found' }, { status: 404 });
    }

    if (existingOrder.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cannot confirm payment for a cancelled order' },
        { status: 400 },
      );
    }

    if (existingOrder.paymentStatus === 'paid') {
      return NextResponse.json(
        { error: 'Order payment has already been confirmed' },
        { status: 400 },
      );
    }

    // Update the order with payment confirmation
    const { data: order, error: updateError } = await supabase
      .from('LabOrder')
      .update({
        status: 'paid',
        paymentStatus: 'paid',
        paymentReference,
        paidAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[API /api/labs/orders/[id]/confirm-payment] Update error:', updateError);
      throw updateError;
    }

    console.log(
      '[API /api/labs/orders/[id]/confirm-payment] Payment confirmed for:',
      order.orderNumber,
    );

    return NextResponse.json({
      success: true,
      data: order,
      message: `Payment confirmed. Order ${order.orderNumber} is now ready for specimen collection.`,
    });
  } catch (error) {
    console.error('[API /api/labs/orders/[id]/confirm-payment] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to confirm payment' },
      { status: 500 },
    );
  }
}
