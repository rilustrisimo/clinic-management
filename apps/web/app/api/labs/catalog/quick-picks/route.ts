import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db/client';

/**
 * GET /api/labs/catalog/quick-picks
 * Get quick-pick tests and panels for fast ordering
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[API /api/labs/catalog/quick-picks] GET request received');

    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section') || '';

    const supabase = getSupabaseClient();

    // Fetch quick-pick tests
    let testsQuery = supabase
      .from('LabTest')
      .select('*')
      .eq('isQuickPick', true)
      .eq('active', true)
      .order('sortOrder', { ascending: true })
      .order('name', { ascending: true });

    if (section) {
      testsQuery = testsQuery.eq('section', section);
    }

    // Fetch quick-pick panels with their tests
    let panelsQuery = supabase
      .from('LabPanel')
      .select(`*, panelItems:LabPanelItem(*, test:LabTest(*))`)
      .eq('isQuickPick', true)
      .eq('active', true)
      .order('sortOrder', { ascending: true })
      .order('name', { ascending: true });

    if (section) {
      panelsQuery = panelsQuery.eq('section', section);
    }

    // Execute both queries in parallel
    const [testsResult, panelsResult] = await Promise.all([testsQuery, panelsQuery]);

    if (testsResult.error) {
      console.error('[API /api/labs/catalog/quick-picks] Tests query error:', testsResult.error);
      throw testsResult.error;
    }

    if (panelsResult.error) {
      console.error('[API /api/labs/catalog/quick-picks] Panels query error:', panelsResult.error);
      throw panelsResult.error;
    }

    // Transform panels to include tests array
    const panels =
      panelsResult.data?.map((panel: any) => ({
        ...panel,
        tests:
          panel.panelItems
            ?.filter((item: any) => item.test)
            .map((item: any) => ({
              ...item.test,
              required: item.required,
              sortOrder: item.sortOrder,
            }))
            .sort((a: any, b: any) => a.sortOrder - b.sortOrder) || [],
        panelItems: undefined,
      })) || [];

    // Group by section for easier UI rendering
    const groupBySection = (items: any[]) => {
      return items.reduce((acc: Record<string, any[]>, item: any) => {
        const section = item.section || 'other';
        if (!acc[section]) {
          acc[section] = [];
        }
        acc[section].push(item);
        return acc;
      }, {});
    };

    console.log(
      `[API /api/labs/catalog/quick-picks] Found ${testsResult.data?.length || 0} tests and ${panels.length} panels`,
    );

    return NextResponse.json({
      tests: testsResult.data || [],
      panels,
      testsBySection: groupBySection(testsResult.data || []),
      panelsBySection: groupBySection(panels),
    });
  } catch (error) {
    console.error('[API /api/labs/catalog/quick-picks] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch quick picks' },
      { status: 500 },
    );
  }
}
