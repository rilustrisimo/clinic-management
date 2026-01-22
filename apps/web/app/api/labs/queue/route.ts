import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db/client';

/**
 * GET /api/labs/queue
 * Get lab queue board data organized by status lanes
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[API /api/labs/queue] GET request received');

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const supabase = getSupabaseClient();

    // Date range for the day
    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;

    // Fetch all orders for the day
    const { data: orders, error } = await supabase
      .from('LabOrder')
      .select(
        `
        id,
        orderNumber,
        status,
        paymentStatus,
        priority,
        placedAt,
        totalAmount,
        patient:Patient(id, firstName, lastName, middleName, mrn),
        items:LabOrderItem(
          id, testCode, testName, status,
          result:LabResult(id, verifiedAt, releasedAt)
        )
      `,
      )
      .gte('placedAt', startOfDay)
      .lte('placedAt', endOfDay)
      .neq('status', 'cancelled')
      .order('priority', { ascending: false }) // stat > urgent > routine
      .order('placedAt', { ascending: true });

    if (error) {
      console.error('[API /api/labs/queue] Database error:', error);
      throw error;
    }

    // Organize orders by status into lanes
    const lanes = {
      pending_payment: [] as any[],
      paid: [] as any[],
      collecting: [] as any[],
      collected: [] as any[],
      processing: [] as any[],
      completed: [] as any[],
      verified: [] as any[],
      released: [] as any[],
    };

    for (const order of orders || []) {
      const status = order.status as keyof typeof lanes;
      if (lanes[status]) {
        // Add computed properties
        const itemsCount = order.items?.length || 0;
        const completedCount =
          order.items?.filter((i: any) => {
            const result = Array.isArray(i.result) ? i.result[0] : i.result;
            return result?.id;
          }).length || 0;
        const verifiedCount =
          order.items?.filter((i: any) => {
            const result = Array.isArray(i.result) ? i.result[0] : i.result;
            return result?.verifiedAt;
          }).length || 0;

        lanes[status].push({
          ...order,
          itemsCount,
          completedCount,
          verifiedCount,
          progress: itemsCount > 0 ? Math.round((completedCount / itemsCount) * 100) : 0,
        });
      }
    }

    console.log('[API /api/labs/queue] Queue data retrieved for:', date);

    return NextResponse.json({
      date,
      lanes,
      totals: {
        pending_payment: lanes.pending_payment.length,
        paid: lanes.paid.length,
        collecting: lanes.collecting.length,
        collected: lanes.collected.length,
        processing: lanes.processing.length,
        completed: lanes.completed.length,
        verified: lanes.verified.length,
        released: lanes.released.length,
        total: orders?.length || 0,
      },
    });
  } catch (error) {
    console.error('[API /api/labs/queue] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch queue data' },
      { status: 500 },
    );
  }
}
