import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/labs/results/[id]/verify
 * Verify a lab result (senior MT sign-off)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    console.log('[API /api/labs/results/[id]/verify] POST request for:', id);

    // Use service role for writes
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    // Check if result exists and is not already verified/released
    const { data: existing, error: checkError } = await supabase
      .from('LabResult')
      .select(
        `
        id, verifiedAt, releasedAt,
        orderItem:LabOrderItem(
          id, orderId,
          test:LabTest(requiresVerification)
        )
      `,
      )
      .eq('id', id)
      .single();

    if (checkError || !existing) {
      return NextResponse.json({ error: 'Result not found' }, { status: 404 });
    }

    if (existing.verifiedAt) {
      return NextResponse.json({ error: 'Result is already verified' }, { status: 400 });
    }

    if (existing.releasedAt) {
      return NextResponse.json({ error: 'Result has already been released' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Update result to verified
    const { data: result, error: updateError } = await supabase
      .from('LabResult')
      .update({
        verifiedAt: now,
        // verifiedById: userId, // TODO: Get from auth session
        updatedAt: now,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[API /api/labs/results/[id]/verify] Update error:', updateError);
      throw updateError;
    }

    // Update order item status
    const orderItem = existing.orderItem as any;
    await supabase.from('LabOrderItem').update({ status: 'verified' }).eq('id', orderItem.id);

    // Check if all results in the order are verified
    const { data: allResults } = await supabase
      .from('LabOrderItem')
      .select(
        `
        id,
        result:LabResult(id, verifiedAt)
      `,
      )
      .eq('orderId', orderItem.orderId);

    const allVerified = allResults?.every((item: any) => {
      const itemResult = Array.isArray(item.result) ? item.result[0] : item.result;
      return itemResult?.verifiedAt;
    });

    // Update order status to verified if all results are verified
    if (allVerified) {
      await supabase
        .from('LabOrder')
        .update({
          status: 'verified',
          updatedAt: now,
        })
        .eq('id', orderItem.orderId);
    }

    console.log('[API /api/labs/results/[id]/verify] Result verified:', result.id);

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Result has been verified.',
      orderFullyVerified: allVerified,
    });
  } catch (error) {
    console.error('[API /api/labs/results/[id]/verify] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to verify result' },
      { status: 500 },
    );
  }
}
