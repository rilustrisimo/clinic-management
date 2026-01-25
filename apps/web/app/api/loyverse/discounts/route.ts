import { NextRequest, NextResponse } from 'next/server';
import { getLoyverseClient, LoyverseDiscount } from '@/lib/loyverse/client';

/**
 * GET /api/loyverse/discounts
 * Fetch all discounts from Loyverse
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[API /api/loyverse/discounts] GET request received');

    const client = getLoyverseClient();

    // Fetch all discounts (with pagination if needed)
    let allDiscounts: LoyverseDiscount[] = [];
    let cursor: string | undefined;

    do {
      const response = await client.getDiscounts({ cursor, limit: 250 });
      allDiscounts = [...allDiscounts, ...(response.discounts || [])];
      cursor = response.cursor;
    } while (cursor);

    console.log(`[API /api/loyverse/discounts] Fetched ${allDiscounts.length} discounts`);

    return NextResponse.json({
      discounts: allDiscounts,
      total: allDiscounts.length,
    });
  } catch (error) {
    console.error('[API /api/loyverse/discounts] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch discounts',
      },
      { status: 500 },
    );
  }
}
