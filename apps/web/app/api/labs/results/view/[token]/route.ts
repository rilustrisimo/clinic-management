import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface RouteParams {
  params: Promise<{ token: string }>;
}

/**
 * GET /api/labs/results/view/[token]
 * Public endpoint: View lab results using secure token (no auth required)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    console.log('[API /api/labs/results/view/[token]] GET request');

    // Use service role to access token table
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    // Find token and validate
    const { data: tokenRecord, error: tokenError } = await supabase
      .from('LabResultAccessToken')
      .select('*')
      .eq('token', token)
      .single();

    if (tokenError || !tokenRecord) {
      return NextResponse.json({ error: 'Invalid or expired access link' }, { status: 404 });
    }

    // Check if token is active
    if (tokenRecord.isActive === false) {
      return NextResponse.json({ error: 'This access link has been deactivated' }, { status: 403 });
    }

    // Check if token is expired
    if (tokenRecord.expiresAt && new Date(tokenRecord.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'This access link has expired' }, { status: 410 });
    }

    // Check if max views exceeded
    if (tokenRecord.maxViews && tokenRecord.viewCount >= tokenRecord.maxViews) {
      return NextResponse.json(
        { error: 'This access link has reached its maximum number of views' },
        { status: 410 },
      );
    }

    // Fetch the order with all data
    const { data: order, error: orderError } = await supabase
      .from('LabOrder')
      .select(
        `
        id,
        orderNumber,
        status,
        priority,
        placedAt,
        paidAt,
        totalAmount,
        patient:Patient(
          id,
          firstName,
          lastName,
          middleName,
          mrn
        ),
        items:LabOrderItem(
          id,
          testCode,
          testName,
          section,
          priceSnapshot
        )
      `,
      )
      .eq('id', tokenRecord.orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Lab order not found' }, { status: 404 });
    }

    // Fetch uploaded files for this order
    const { data: files } = await supabase
      .from('LabResultFile')
      .select('id, originalName, fileType, fileSize, uploadedAt')
      .eq('orderId', tokenRecord.orderId)
      .order('uploadedAt', { ascending: false });

    // Increment view count
    await supabase
      .from('LabResultToken')
      .update({
        viewCount: (tokenRecord.viewCount || 0) + 1,
        lastViewedAt: new Date().toISOString(),
      })
      .eq('id', tokenRecord.id);

    console.log(
      '[API /api/labs/results/view/[token]] Results viewed for order:',
      order.orderNumber,
    );

    return NextResponse.json({
      order,
      files: files || [],
    });
  } catch (error) {
    console.error('[API /api/labs/results/view/[token]] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch results' },
      { status: 500 },
    );
  }
}
