import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../../lib/db/client';

function getSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE;

  if (!supabaseUrl || !supabaseServiceRole) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceRole, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { email, password, roles, name } = await request.json();

    // Validation
    if (!email || !password || !roles || roles.length === 0) {
      return NextResponse.json(
        { error: 'Email, password, and at least one role are required' },
        { status: 400 }
      );
    }

    // 1. Create Supabase auth user
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email for development
      });

    if (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: authError.message || 'Failed to create auth user' },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    // 2. Create User record in database
    const userId = `user_${Date.now()}`;
    const supabase = getSupabaseClient();
    const { data: user, error: userError } = await supabase
      .from('User')
      .insert({
        id: userId,
        email,
        name: name || null,
        supabaseId: authData.user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (userError || !user) {
      console.error('User creation error:', userError);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: userError?.message || 'Failed to create user record' },
        { status: 500 }
      );
    }

    // 3. Get role IDs
    const { data: roleRecords, error: rolesError } = await supabase
      .from('Role')
      .select('*')
      .in('name', roles);

    if (rolesError || !roleRecords || roleRecords.length !== roles.length) {
      // Cleanup: delete the created user if roles are invalid
      await supabase
        .from('User')
        .delete()
        .eq('id', user.id);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);

      return NextResponse.json(
        { error: 'One or more roles are invalid' },
        { status: 400 }
      );
    }

    // 4. Assign roles to user
    const userRoleData = roleRecords.map((role: { id: string; name: string }) => ({
      id: `userrole_${Date.now()}_${role.id}`,
      userId: user.id,
      roleId: role.id,
    }));

    await supabase
      .from('UserRole')
      .insert(userRoleData);

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          roles: roleRecords.map((r: { name: string }) => r.name),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
