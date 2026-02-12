import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/labs/orders/[id]/claim-slip
 * Get order data formatted for claim slip printing
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    console.log('[API /api/labs/orders/[id]/claim-slip] Fetching order:', id);

    const supabase = getSupabaseClient();

    // Fetch order with patient and items
    const { data: order, error } = await supabase
      .from('LabOrder')
      .select(
        `
        id,
        orderNumber,
        placedAt,
        paidAt,
        totalAmount,
        paymentReference,
        paymentStatus,
        patient:Patient(
          firstName,
          lastName,
          middleName,
          mrn,
          phone,
          email,
          dob,
          gender
        ),
        items:LabOrderItem(
          testName,
          priceSnapshot
        )
      `,
      )
      .eq('id', id)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: 'Lab order not found' }, { status: 404 });
    }

    // Check if order is paid
    if (order.paymentStatus !== 'paid') {
      return NextResponse.json(
        { error: 'Order must be paid before generating claim slip' },
        { status: 400 },
      );
    }

    console.log('[API /api/labs/orders/[id]/claim-slip] Order found:', order.orderNumber);

    return NextResponse.json({ order });
  } catch (error) {
    console.error('[API /api/labs/orders/[id]/claim-slip] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch order' },
      { status: 500 },
    );
  }
}
