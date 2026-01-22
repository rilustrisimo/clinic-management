import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db/client';

/**
 * GET /api/labs/stats
 * Get lab statistics for dashboard
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[API /api/labs/stats] GET request received');

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const supabase = getSupabaseClient();

    // Date range for today
    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;

    // Fetch orders for today
    const { data: todayOrders, error: ordersError } = await supabase
      .from('LabOrder')
      .select('id, status, paymentStatus, priority, placedAt, totalAmount')
      .gte('placedAt', startOfDay)
      .lte('placedAt', endOfDay);

    if (ordersError) {
      console.error('[API /api/labs/stats] Orders query error:', ordersError);
      throw ordersError;
    }

    // Calculate order stats
    const orderStats = {
      total: todayOrders?.length || 0,
      pending_payment: todayOrders?.filter((o) => o.status === 'pending_payment').length || 0,
      paid: todayOrders?.filter((o) => o.status === 'paid').length || 0,
      processing:
        todayOrders?.filter((o) => ['collecting', 'collected', 'processing'].includes(o.status))
          .length || 0,
      completed: todayOrders?.filter((o) => o.status === 'completed').length || 0,
      verified: todayOrders?.filter((o) => o.status === 'verified').length || 0,
      released: todayOrders?.filter((o) => o.status === 'released').length || 0,
      cancelled: todayOrders?.filter((o) => o.status === 'cancelled').length || 0,
    };

    // Calculate priority breakdown
    const priorityStats = {
      routine: todayOrders?.filter((o) => o.priority === 'routine').length || 0,
      urgent: todayOrders?.filter((o) => o.priority === 'urgent').length || 0,
      stat: todayOrders?.filter((o) => o.priority === 'stat').length || 0,
    };

    // Calculate revenue (only paid orders)
    const revenueStats = {
      total:
        todayOrders
          ?.filter((o) => o.paymentStatus === 'paid')
          .reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0) || 0,
      pending:
        todayOrders
          ?.filter((o) => o.paymentStatus === 'unpaid')
          .reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0) || 0,
    };

    // Fetch specimen stats for today
    const { data: todaySpecimens, error: specimensError } = await supabase
      .from('Specimen')
      .select('id, status, specimenType')
      .gte('createdAt', startOfDay)
      .lte('createdAt', endOfDay);

    if (specimensError) {
      console.error('[API /api/labs/stats] Specimens query error:', specimensError);
      // Don't throw, just continue without specimen stats
    }

    const specimenStats = {
      total: todaySpecimens?.length || 0,
      pending: todaySpecimens?.filter((s) => s.status === 'pending').length || 0,
      collected: todaySpecimens?.filter((s) => s.status === 'collected').length || 0,
      received: todaySpecimens?.filter((s) => s.status === 'received').length || 0,
      rejected: todaySpecimens?.filter((s) => s.status === 'rejected').length || 0,
      byType:
        todaySpecimens?.reduce((acc: Record<string, number>, s) => {
          acc[s.specimenType] = (acc[s.specimenType] || 0) + 1;
          return acc;
        }, {}) || {},
    };

    // Fetch result stats for today
    const { data: todayResults, error: resultsError } = await supabase
      .from('LabResult')
      .select('id, verifiedAt, releasedAt')
      .gte('updatedAt', startOfDay)
      .lte('updatedAt', endOfDay);

    if (resultsError) {
      console.error('[API /api/labs/stats] Results query error:', resultsError);
    }

    const resultStats = {
      total: todayResults?.length || 0,
      verified: todayResults?.filter((r) => r.verifiedAt).length || 0,
      released: todayResults?.filter((r) => r.releasedAt).length || 0,
      pending: todayResults?.filter((r) => !r.verifiedAt).length || 0,
    };

    console.log('[API /api/labs/stats] Stats calculated for:', date);

    return NextResponse.json({
      date,
      orders: orderStats,
      priority: priorityStats,
      revenue: revenueStats,
      specimens: specimenStats,
      results: resultStats,
    });
  } catch (error) {
    console.error('[API /api/labs/stats] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch statistics' },
      { status: 500 },
    );
  }
}
