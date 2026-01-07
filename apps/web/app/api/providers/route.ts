import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '../../../lib/db/client'

/**
 * GET /api/providers
 * List all users with Provider role
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    
    // Get Provider role ID first
    const { data: providerRole } = await supabase
      .from('Role')
      .select('id')
      .eq('name', 'Provider')
      .single()

    if (!providerRole) {
      return NextResponse.json({ providers: [] })
    }

    // Get all users who have the Provider role
    const { data: userRoles, error } = await supabase
      .from('UserRole')
      .select(`
        userId,
        User (
          id,
          email,
          name
        )
      `)
      .eq('roleId', providerRole.id)

    if (error) {
      console.error('[Providers API] Error fetching providers:', error)
      return NextResponse.json(
        { error: 'Failed to fetch providers' },
        { status: 500 }
      )
    }

    // Extract unique users
    const providers = userRoles
      ?.map((ur: any) => ur.User)
      .filter((user: any) => user != null) || []

    console.log(`[API /api/providers] Fetched ${providers.length} providers`)

    return NextResponse.json({ providers })
  } catch (error) {
    console.error('[Providers API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
