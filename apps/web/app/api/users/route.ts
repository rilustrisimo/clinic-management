import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '../../../lib/db/client'

/**
 * GET /api/users
 * List all users with their provider role status
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    
    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('User')
      .select('id, email, name')
      .order('email')

    if (usersError) {
      console.error('[Users API] Error fetching users:', usersError)
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      )
    }

    // Get Provider role ID
    const { data: providerRole } = await supabase
      .from('Role')
      .select('id')
      .eq('name', 'Provider')
      .single()

    if (!providerRole) {
      return NextResponse.json({ 
        users: users?.map((u: any) => ({ ...u, hasProviderRole: false })) || [] 
      })
    }

    // Get all UserRoles for Provider
    const { data: userRoles } = await supabase
      .from('UserRole')
      .select('userId')
      .eq('roleId', providerRole.id)

    const providerUserIds = new Set(userRoles?.map((ur: any) => ur.userId) || [])

    const result = users?.map((u: any) => ({
      ...u,
      hasProviderRole: providerUserIds.has(u.id),
    })) || []

    return NextResponse.json({ users: result })
  } catch (error) {
    console.error('[Users API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
