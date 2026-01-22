import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateTokenSchema } from '@/lib/validations/lab';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/labs/orders/[id]/generate-token
 * Generate a secure access token for viewing results
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    console.log('[API /api/labs/orders/[id]/generate-token] POST request for:', id);

    const body = await request.json().catch(() => ({}));
    const parseResult = generateTokenSchema.safeParse(body);

    const { expiresInHours, maxViews } = parseResult.success
      ? parseResult.data
      : { expiresInHours: 48, maxViews: 10 };

    // Use service role for writes
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    // Check if order exists
    const { data: order, error: orderError } = await supabase
      .from('LabOrder')
      .select('id, orderNumber, status')
      .eq('id', id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Lab order not found' }, { status: 404 });
    }

    // Allow token generation for paid orders and beyond
    const disallowedStatuses = ['pending_payment', 'cancelled'];
    if (disallowedStatuses.includes(order.status)) {
      return NextResponse.json(
        { error: 'Cannot generate token for unpaid or cancelled orders' },
        { status: 400 },
      );
    }

    // Generate secure random token
    const tokenArray = new Uint8Array(32);
    crypto.getRandomValues(tokenArray);
    const token = Array.from(tokenArray)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    // Create token record
    const { data: tokenRecord, error: tokenError } = await supabase
      .from('LabResultToken')
      .insert({
        id: crypto.randomUUID(),
        orderId: id,
        token,
        expiresAt: expiresAt.toISOString(),
        maxViews,
        viewCount: 0,
        createdAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (tokenError) {
      console.error('[API /api/labs/orders/[id]/generate-token] Token creation error:', tokenError);
      throw tokenError;
    }

    // Build the access URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL || 'http://localhost:3000';
    const accessUrl = `${baseUrl}/results/${token}`;

    console.log(
      '[API /api/labs/orders/[id]/generate-token] Token generated for:',
      order.orderNumber,
    );

    return NextResponse.json({
      success: true,
      token,
      accessUrl,
      expiresAt: tokenRecord.expiresAt,
      maxViews: tokenRecord.maxViews,
    });
  } catch (error) {
    console.error('[API /api/labs/orders/[id]/generate-token] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate token' },
      { status: 500 },
    );
  }
}
