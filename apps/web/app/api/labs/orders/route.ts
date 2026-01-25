import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/db/client';
import { z } from 'zod';

// Discount schema for lab orders
const discountSchema = z.object({
  discountId: z.string().min(1, 'Discount ID is required'),
  discountName: z.string().min(1, 'Discount name is required'),
  discountType: z.enum(['FIXED_PERCENT', 'FIXED_AMOUNT']),
  discountValue: z.number().nonnegative('Discount value must be non-negative'),
});

// Updated schema to support Loyverse-based tests
const createLabOrderSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  visitId: z.string().optional().nullable(),
  appointmentId: z.string().optional().nullable(),
  orderingProviderId: z.string().optional().nullable(),
  priority: z.enum(['routine', 'urgent', 'stat']).default('routine'),
  notes: z.string().max(1000).optional().nullable(),
  items: z
    .array(
      z.object({
        // Loyverse item info
        loyverseOptionId: z.string().min(1, 'Loyverse option ID is required'),
        loyverseModifierId: z.string().min(1, 'Loyverse modifier ID is required'),
        code: z.string().min(1, 'Test code is required'),
        name: z.string().min(1, 'Test name is required'),
        section: z.string().min(1, 'Section is required'),
        price: z.number().nonnegative('Price must be non-negative'),
        specimenType: z.string().optional(),
      }),
    )
    .min(1, 'At least one test is required'),
  discount: discountSchema.optional().nullable(),
});

// Calculate discount amount based on type and value
function calculateDiscountAmount(
  subtotal: number,
  discountType: 'FIXED_PERCENT' | 'FIXED_AMOUNT' | 'PERCENT',
  discountValue: number,
): number {
  if (subtotal <= 0 || discountValue <= 0) {
    return 0;
  }

  let amount: number;
  // Handle both 'PERCENT' (from DB) and 'FIXED_PERCENT' (from Loyverse)
  if (discountType === 'FIXED_PERCENT' || discountType === 'PERCENT') {
    const clampedPercent = Math.min(100, Math.max(0, discountValue));
    amount = subtotal * (clampedPercent / 100);
  } else {
    amount = discountValue;
  }

  // Discount cannot exceed subtotal
  return Math.min(amount, subtotal);
}

// Map section names to standard lab section enum codes
function mapSectionToEnum(sectionName: string): string {
  const lower = sectionName.toLowerCase();
  if (lower.includes('hematology')) return 'hematology';
  if (lower.includes('chemistry') || lower.includes('chemical')) return 'chemistry';
  if (
    lower.includes('urinalysis') ||
    lower.includes('urine') ||
    lower.includes('clinical microscopy')
  )
    return 'urinalysis';
  if (lower.includes('serology')) return 'serology';
  if (lower.includes('fecal') || lower.includes('stool')) return 'fecalysis';
  if (lower.includes('microbiology')) return 'microbiology';
  if (lower.includes('drug')) return 'drug_testing';
  return 'other';
}

/**
 * GET /api/labs/orders
 * List lab orders with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[API /api/labs/orders] GET request received');

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const status = searchParams.get('status');
    const paymentStatus = searchParams.get('paymentStatus');
    const date = searchParams.get('date'); // YYYY-MM-DD (single day)
    const dateFrom = searchParams.get('dateFrom'); // YYYY-MM-DD (range start)
    const dateTo = searchParams.get('dateTo'); // YYYY-MM-DD (range end)
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log('[API /api/labs/orders] Params:', {
      patientId,
      status,
      paymentStatus,
      date,
      dateFrom,
      dateTo,
      search,
      limit,
      offset,
    });

    const supabase = getSupabaseClient();

    let query = supabase
      .from('LabOrder')
      .select(
        `
        *,
        patient:Patient(id, firstName, lastName, middleName, mrn, dob, gender),
        items:LabOrderItem(*)
      `,
        { count: 'exact' },
      )
      .order('placedAt', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (patientId) {
      query = query.eq('patientId', patientId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (paymentStatus) {
      query = query.eq('paymentStatus', paymentStatus);
    }

    if (date) {
      // Filter by single date (start of day to end of day)
      const startOfDay = `${date}T00:00:00.000Z`;
      const endOfDay = `${date}T23:59:59.999Z`;
      query = query.gte('placedAt', startOfDay).lte('placedAt', endOfDay);
    } else if (dateFrom || dateTo) {
      // Filter by date range
      if (dateFrom) {
        const startOfRange = `${dateFrom}T00:00:00.000Z`;
        query = query.gte('placedAt', startOfRange);
      }
      if (dateTo) {
        const endOfRange = `${dateTo}T23:59:59.999Z`;
        query = query.lte('placedAt', endOfRange);
      }
    }

    if (search) {
      // Search by order number or patient name
      query = query.or(`orderNumber.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[API /api/labs/orders] Database error:', error);
      throw error;
    }

    console.log(`[API /api/labs/orders] Found ${data?.length || 0} of ${count || 0} orders`);

    return NextResponse.json({
      items: data || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[API /api/labs/orders] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch lab orders' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/labs/orders
 * Create a new lab order with Loyverse-based tests
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[API /api/labs/orders] POST request received');

    const body = await request.json();
    console.log('[API /api/labs/orders] Request body:', body);

    // Validate input
    const parseResult = createLabOrderSchema.safeParse(body);
    if (!parseResult.success) {
      console.error('[API /api/labs/orders] Validation error:', parseResult.error.issues);
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.issues },
        { status: 400 },
      );
    }

    const {
      patientId,
      visitId,
      appointmentId,
      orderingProviderId,
      priority,
      notes,
      items,
      discount,
    } = parseResult.data;

    // Use service role for writes
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    // Generate order number using database function
    const { data: orderNumberData, error: orderNumberError } = await supabase.rpc(
      'generate_lab_order_number',
    );

    if (orderNumberError) {
      console.error('[API /api/labs/orders] Order number generation error:', orderNumberError);
      throw new Error('Failed to generate order number');
    }

    const orderNumber = orderNumberData;
    console.log('[API /api/labs/orders] Generated order number:', orderNumber);

    // Calculate subtotal from Loyverse items
    const subtotal = items.reduce((sum, item) => sum + item.price, 0);

    // Calculate discount amount if discount is provided
    let discountAmount = 0;
    if (discount) {
      discountAmount = calculateDiscountAmount(
        subtotal,
        discount.discountType,
        discount.discountValue,
      );
      console.log('[API /api/labs/orders] Discount applied:', {
        name: discount.discountName,
        type: discount.discountType,
        value: discount.discountValue,
        amount: discountAmount,
      });
    }

    // Calculate total amount after discount
    const totalAmount = subtotal - discountAmount;

    // Convert Loyverse discount type to database format
    const dbDiscountType = discount?.discountType
      ? discount.discountType === 'FIXED_PERCENT'
        ? 'PERCENT'
        : 'FIXED_AMOUNT'
      : null;

    // Create order items from Loyverse data
    const orderItems = items.map((item) => ({
      id: crypto.randomUUID(),
      testId: null, // No database test ID - using Loyverse
      panelId: null,
      testCode: item.code,
      testName: item.name,
      section: mapSectionToEnum(item.section), // Convert to enum value
      status: 'pending',
      priceSnapshot: item.price,
      unitPrice: item.price, // Required by older schema
      loyverseOptionId: item.loyverseOptionId,
      loyverseModifierId: item.loyverseModifierId,
      specimenType: item.specimenType || 'blood',
    }));

    // Create the order
    const orderId = crypto.randomUUID();
    const { data: order, error: orderError } = await supabase
      .from('LabOrder')
      .insert({
        id: orderId,
        orderNumber,
        patientId,
        visitId: visitId || null,
        appointmentId: appointmentId || null,
        orderingProviderId: orderingProviderId || null,
        priority: priority || 'routine',
        status: 'pending_payment',
        paymentStatus: 'unpaid',
        subtotal,
        totalAmount,
        discountId: discount?.discountId || null,
        discountName: discount?.discountName || null,
        discountType: dbDiscountType,
        discountValue: discount?.discountValue || null,
        discountAmount: discountAmount || null,
        notes: notes || null,
        placedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (orderError) {
      console.error('[API /api/labs/orders] Order creation error:', orderError);
      throw orderError;
    }

    console.log('[API /api/labs/orders] Order created:', order.id);

    // Create order items
    if (orderItems.length > 0) {
      const itemsToInsert = orderItems.map((item) => ({
        ...item,
        orderId: order.id,
        createdAt: new Date().toISOString(),
      }));

      console.log(
        '[API /api/labs/orders] Inserting items:',
        JSON.stringify(itemsToInsert, null, 2),
      );

      const { data: insertedItems, error: itemsError } = await supabase
        .from('LabOrderItem')
        .insert(itemsToInsert)
        .select();

      if (itemsError) {
        console.error('[API /api/labs/orders] Order items creation error:', itemsError);
        // Don't throw - order was created, items can be added later
      } else {
        console.log('[API /api/labs/orders] Items inserted:', insertedItems?.length || 0);
      }
    }

    // Fetch the complete order with items and patient
    const { data: completeOrder, error: fetchError } = await supabase
      .from('LabOrder')
      .select(
        `
        *,
        patient:Patient(id, firstName, lastName, middleName, mrn, dob, gender),
        items:LabOrderItem!LabOrderItem_orderId_fkey(*)
      `,
      )
      .eq('id', order.id)
      .single();

    if (fetchError) {
      console.error('[API /api/labs/orders] Fetch complete order error:', fetchError);
    } else {
      console.log(
        '[API /api/labs/orders] Fetched order with items:',
        completeOrder?.items?.length || 0,
      );
    }

    console.log('[API /api/labs/orders] Order created successfully:', order.orderNumber);

    return NextResponse.json({ success: true, data: completeOrder || order }, { status: 201 });
  } catch (error) {
    console.error('[API /api/labs/orders] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create lab order' },
      { status: 500 },
    );
  }
}
