import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

/**
 * POST /api/users/provider-role
 * Add or remove Provider role from a user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, action } = body

    if (!userId || !action || !['add', 'remove'].includes(action)) {
      return NextResponse.json(
        { error: 'userId and action (add/remove) are required' },
        { status: 400 }
      )
    }

    // Use Supabase service role for write operations
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )

    // Get Provider role ID
    const { data: providerRole, error: roleError } = await supabase
      .from('Role')
      .select('id')
      .eq('name', 'Provider')
      .single()

    if (roleError || !providerRole) {
      return NextResponse.json(
        { error: 'Provider role not found' },
        { status: 404 }
      )
    }

    if (action === 'add') {
      // Check if user already has the role
      const { data: existing } = await supabase
        .from('UserRole')
        .select('id')
        .eq('userId', userId)
        .eq('roleId', providerRole.id)
        .single()

      if (existing) {
        return NextResponse.json({ message: 'User already has Provider role' })
      }

      // Add the role
      const { error: insertError } = await supabase
        .from('UserRole')
        .insert({
          id: randomUUID(),
          userId,
          roleId: providerRole.id,
          createdAt: new Date().toISOString(),
        })

      if (insertError) {
        console.error('[API /api/users/provider-role] Error adding role:', insertError)
        return NextResponse.json(
          { error: 'Failed to add Provider role' },
          { status: 500 }
        )
      }

      return NextResponse.json({ message: 'Provider role added successfully' })
    } else {
      // Remove the role
      const { error: deleteError } = await supabase
        .from('UserRole')
        .delete()
        .eq('userId', userId)
        .eq('roleId', providerRole.id)

      if (deleteError) {
        console.error('[API /api/users/provider-role] Error removing role:', deleteError)
        return NextResponse.json(
          { error: 'Failed to remove Provider role' },
          { status: 500 }
        )
      }

      return NextResponse.json({ message: 'Provider role removed successfully' })
    }
  } catch (error) {
    console.error('[API /api/users/provider-role] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
