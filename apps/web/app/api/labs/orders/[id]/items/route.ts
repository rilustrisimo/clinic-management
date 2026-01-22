import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { addOrderItemSchema } from '@/lib/validations/lab';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/labs/orders/[id]/items
 * Add a test or panel to an existing order
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    console.log('[API /api/labs/orders/[id]/items] POST request for order:', id);

    const body = await request.json();
    console.log('[API /api/labs/orders/[id]/items] Request body:', body);

    // Validate input
    const parseResult = addOrderItemSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.issues },
        { status: 400 },
      );
    }

    const { testId, panelId } = parseResult.data;

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

    // Only allow adding items to orders that haven't started processing
    const modifiableStatuses = ['pending_payment', 'paid'];
    if (!modifiableStatuses.includes(order.status)) {
      return NextResponse.json(
        { error: `Cannot add items to an order in ${order.status} status` },
        { status: 400 },
      );
    }

    const itemsToAdd: any[] = [];
    let additionalAmount = 0;

    if (testId) {
      // Fetch test details
      const { data: test, error: testError } = await supabase
        .from('LabTest')
        .select('*')
        .eq('id', testId)
        .single();

      if (testError || !test) {
        return NextResponse.json({ error: 'Test not found' }, { status: 404 });
      }

      // Check if test is already in order
      const { data: existingItem } = await supabase
        .from('LabOrderItem')
        .select('id')
        .eq('orderId', id)
        .eq('testId', testId)
        .single();

      if (existingItem) {
        return NextResponse.json({ error: 'Test is already in this order' }, { status: 400 });
      }

      additionalAmount = parseFloat(test.price) || 0;
      itemsToAdd.push({
        id: crypto.randomUUID(),
        orderId: id,
        testId: test.id,
        panelId: null,
        testCode: test.code,
        testName: test.name,
        section: test.section,
        status: 'pending',
        priceSnapshot: test.price,
        createdAt: new Date().toISOString(),
      });
    } else if (panelId) {
      // Fetch panel with tests
      const { data: panel, error: panelError } = await supabase
        .from('LabPanel')
        .select(`*, panelItems:LabPanelItem(*, test:LabTest(*))`)
        .eq('id', panelId)
        .single();

      if (panelError || !panel) {
        return NextResponse.json({ error: 'Panel not found' }, { status: 404 });
      }

      additionalAmount = parseFloat(panel.price) || 0;

      // Add panel's tests as items
      for (const panelItem of panel.panelItems || []) {
        if (panelItem.test) {
          // Check if this specific test is already in order
          const { data: existingItem } = await supabase
            .from('LabOrderItem')
            .select('id')
            .eq('orderId', id)
            .eq('testId', panelItem.test.id)
            .single();

          if (!existingItem) {
            itemsToAdd.push({
              id: crypto.randomUUID(),
              orderId: id,
              testId: panelItem.test.id,
              panelId: panel.id,
              testCode: panelItem.test.code,
              testName: panelItem.test.name,
              section: panelItem.test.section,
              status: 'pending',
              priceSnapshot: 0, // Price at panel level
              createdAt: new Date().toISOString(),
            });
          }
        }
      }

      if (itemsToAdd.length === 0) {
        return NextResponse.json(
          { error: 'All tests in this panel are already in the order' },
          { status: 400 },
        );
      }
    }

    // Insert items
    const { error: insertError } = await supabase.from('LabOrderItem').insert(itemsToAdd);

    if (insertError) {
      console.error('[API /api/labs/orders/[id]/items] Insert error:', insertError);
      throw insertError;
    }

    // Update order total
    const newTotal = (parseFloat(order.totalAmount) || 0) + additionalAmount;
    await supabase
      .from('LabOrder')
      .update({
        totalAmount: newTotal,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', id);

    console.log(`[API /api/labs/orders/[id]/items] Added ${itemsToAdd.length} items to order`);

    return NextResponse.json(
      {
        success: true,
        itemsAdded: itemsToAdd.length,
        additionalAmount,
        newTotal,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[API /api/labs/orders/[id]/items] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add item to order' },
      { status: 500 },
    );
  }
}
