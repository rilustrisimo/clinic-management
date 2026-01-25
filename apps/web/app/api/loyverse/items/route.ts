import { NextRequest, NextResponse } from 'next/server';

const LOYVERSE_API_BASE = 'https://api.loyverse.com/v1.0';

interface LoyverseItem {
  id: string;
  item_name: string;
  category_id?: string;
  category?: {
    id: string;
    name: string;
  };
  variants: Array<{
    variant_id: string;
    variant_name: string;
    sku?: string;
    price: number;
    cost?: number;
    default_pricing_type: 'FIXED' | 'VARIABLE';
  }>;
  modifiers_info?: Array<{
    id: string;
    name: string;
    options: Array<{
      id: string;
      name: string;
      price: number;
    }>;
  }>;
}

/**
 * GET /api/loyverse/items
 * Fetch all items (services/procedures) from Loyverse
 */
export async function GET(request: NextRequest) {
  try {
    const token = process.env.LOYVERSE_API_TOKEN;

    if (!token) {
      return NextResponse.json({ error: 'Loyverse API token not configured' }, { status: 500 });
    }

    // Fetch items from Loyverse
    const response = await fetch(`${LOYVERSE_API_BASE}/items?limit=250`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Loyverse Items API] Error:', error);
      return NextResponse.json(
        { error: `Loyverse API error: ${response.status}` },
        { status: response.status },
      );
    }

    const data = await response.json();
    const items: LoyverseItem[] = data.items || [];

    console.log('[Loyverse Items API] Fetched items:', items.length);

    // Enrich items with their modifiers using modifier_ids
    const enrichedItems = await Promise.all(
      items.map(async (item: any) => {
        const modifierIds = item.modifier_ids || [];

        if (modifierIds.length === 0) {
          return {
            ...item,
            modifiers_info: [],
          };
        }

        // Fetch each modifier individually to get modifier_options
        const itemModifiers = await Promise.all(
          modifierIds.map(async (modId: string) => {
            try {
              const modResponse = await fetch(`${LOYVERSE_API_BASE}/modifiers/${modId}`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });

              if (!modResponse.ok) {
                console.error(
                  `[Loyverse Items API] Failed to fetch modifier ${modId}:`,
                  modResponse.status,
                );
                return null;
              }

              const modifier = await modResponse.json();

              return {
                id: modifier.id,
                name: modifier.name,
                options: (modifier.modifier_options || []).map((opt: any) => ({
                  id: opt.id,
                  name: opt.name,
                  price: opt.price || 0,
                })),
              };
            } catch (error) {
              console.error(`[Loyverse Items API] Error fetching modifier ${modId}:`, error);
              return null;
            }
          }),
        );

        // Filter out null values (failed fetches)
        const validModifiers = itemModifiers.filter((mod) => mod !== null);

        console.log(
          `[Loyverse Items API] Item "${item.item_name}" has ${validModifiers.length} modifiers from modifier_ids:`,
          modifierIds,
        );

        return {
          ...item,
          modifiers_info: validModifiers,
        };
      }),
    );

    console.log(
      '[Loyverse Items API] Sample item with modifiers:',
      JSON.stringify(
        enrichedItems.find((i) => i.modifiers_info && i.modifiers_info.length > 0),
        null,
        2,
      ),
    );

    // Filter out Laboratory category items (they have their own dedicated lab module)
    const filteredItems = enrichedItems.filter((item) => {
      const categoryName = item.category?.name?.toLowerCase() || '';
      const itemName = item.item_name?.toLowerCase() || '';

      // Filter out any item with "laboratory" or "lab" in category or item name
      const isLabItem =
        categoryName.includes('laboratory') ||
        categoryName.includes('lab test') ||
        categoryName.includes('lab') ||
        itemName.includes('laboratory');

      return !isLabItem;
    });

    console.log(
      `[Loyverse Items API] Filtered ${enrichedItems.length - filteredItems.length} laboratory items. Returning ${filteredItems.length} items.`,
    );

    return NextResponse.json({
      items: filteredItems,
      total: filteredItems.length,
    });
  } catch (error) {
    console.error('[Loyverse Items API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch Loyverse items' }, { status: 500 });
  }
}
