import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db/client';

/**
 * GET /api/labs/catalog/panels
 * List lab panels with their included tests
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[API /api/labs/catalog/panels] GET request received');

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const section = searchParams.get('section') || '';
    const activeOnly = searchParams.get('active') !== 'false'; // default true
    const includeTests = searchParams.get('includeTests') !== 'false'; // default true
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log('[API /api/labs/catalog/panels] Params:', {
      search,
      section,
      activeOnly,
      includeTests,
      limit,
      offset,
    });

    const supabase = getSupabaseClient();

    // Build the select string based on whether to include tests
    const selectString = includeTests ? `*, panelItems:LabPanelItem(*, test:LabTest(*))` : '*';

    let query = supabase
      .from('LabPanel')
      .select(selectString, { count: 'exact' })
      .order('sortOrder', { ascending: true })
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1);

    // Filter by active status
    if (activeOnly) {
      query = query.eq('active', true);
    }

    // Filter by section
    if (section) {
      query = query.eq('section', section);
    }

    // Search filter
    if (search) {
      query = query.or(
        `code.ilike.%${search}%,name.ilike.%${search}%,description.ilike.%${search}%`,
      );
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[API /api/labs/catalog/panels] Database error:', error);
      throw error;
    }

    // Transform the data to include tests array if includeTests is true
    const panels =
      data?.map((panel: any) => {
        if (includeTests && panel.panelItems) {
          return {
            ...panel,
            tests: panel.panelItems
              .filter((item: any) => item.test) // Filter out null tests
              .map((item: any) => ({
                ...item.test,
                required: item.required,
                sortOrder: item.sortOrder,
              }))
              .sort((a: any, b: any) => a.sortOrder - b.sortOrder),
            panelItems: undefined, // Remove the raw panelItems
          };
        }
        return panel;
      }) || [];

    console.log(`[API /api/labs/catalog/panels] Found ${panels.length} of ${count || 0} panels`);

    return NextResponse.json({
      items: panels,
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[API /api/labs/catalog/panels] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch lab panels' },
      { status: 500 },
    );
  }
}
