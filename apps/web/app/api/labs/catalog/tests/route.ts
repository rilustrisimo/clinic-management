import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db/client';

/**
 * GET /api/labs/catalog/tests
 * List lab tests with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[API /api/labs/catalog/tests] GET request received');

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const section = searchParams.get('section') || '';
    const activeOnly = searchParams.get('active') !== 'false'; // default true
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log('[API /api/labs/catalog/tests] Params:', {
      search,
      section,
      activeOnly,
      limit,
      offset,
    });

    const supabase = getSupabaseClient();

    let query = supabase
      .from('LabTest')
      .select('*', { count: 'exact' })
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
      query = query.or(`code.ilike.%${search}%,name.ilike.%${search}%,method.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[API /api/labs/catalog/tests] Database error:', error);
      throw error;
    }

    console.log(`[API /api/labs/catalog/tests] Found ${data?.length || 0} of ${count || 0} tests`);

    return NextResponse.json({
      items: data || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[API /api/labs/catalog/tests] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch lab tests' },
      { status: 500 },
    );
  }
}
