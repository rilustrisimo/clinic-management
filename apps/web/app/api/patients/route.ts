import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '../../../lib/db/client';
import { LoyversePatientSync } from '../../../lib/loyverse/sync';

export async function GET(request: NextRequest) {
  try {
    console.log('[API /api/patients] GET request received');
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log('[API /api/patients] Params:', { search, limit, offset });

    const supabase = getSupabaseClient();
    // Build Supabase query
    let query = supabase
      .from('Patient')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)  // Only get non-deleted patients (use snake_case for Supabase)
      .order('createdAt', { ascending: false })
      .range(offset, offset + limit - 1);

    // Add search filter if provided
    if (search) {
      query = query.or(
        `firstName.ilike.%${search}%,` +
        `lastName.ilike.%${search}%,` +
        `middleName.ilike.%${search}%,` +
        `mrn.ilike.%${search}%,` +
        `email.ilike.%${search}%,` +
        `phone.ilike.%${search}%`
      );
    }

    const { data, error: dbError, count } = await query;
    
    if (dbError) {
      throw dbError;
    }
    
    const result = { patients: data || [], total: count || 0 };

    console.log(`[API /api/patients] Found ${result.patients.length} of ${result.total} patients`);

    // Calculate age from DOB
    const patientsWithAge = result.patients.map((patient: any) => {
      let age = null;
      if (patient.dob) {
        const today = new Date();
        const birthDate = new Date(patient.dob);
        age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (
          monthDiff < 0 ||
          (monthDiff === 0 && today.getDate() < birthDate.getDate())
        ) {
          age--;
        }
      }

      return {
        ...patient,
        age,
      };
    });

    return NextResponse.json(
      {
        patients: patientsWithAge,
        total: result.total,
        limit,
        offset,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API /api/patients] Error fetching patients:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to fetch patients',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[API /api/patients] POST body:', body);
    
    const {
      mrn,
      firstName,
      lastName,
      middleName,
      dob,
      gender,
      phone,
      email,
      addressLine1,
      addressLine2,
    } = body;

    // Validation (basic - main validation is in the form)
    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'First name and last name are required' },
        { status: 400 }
      );
    }

    if (!dob) {
      return NextResponse.json(
        { error: 'Date of birth is required' },
        { status: 400 }
      );
    }

    if (!gender) {
      return NextResponse.json(
        { error: 'Gender is required' },
        { status: 400 }
      );
    }

    // Combine address lines
    const address = [addressLine1, addressLine2]
      .filter(Boolean)
      .join(', ') || null;

    const patientData = {
      mrn: mrn || null,
      firstName,
      lastName,
      middleName: middleName || null,
      dob: new Date(dob).toISOString(),
      gender,
      phone: phone || null,
      email: email || null,
      address,
      createdById: null, // TODO: Get from auth session
      updatedAt: new Date().toISOString(),
    };

    console.log('[API /api/patients] Creating patient in Supabase (writes must use primary DB only)...');
    console.log('[API /api/patients] Data to insert:', patientData);

    // For WRITE operations, we MUST use Supabase only - no fallback to local DB
    // This ensures data consistency and prevents split-brain scenarios
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    // Insert into Supabase (ID will be auto-generated)
    const { data: patient, error: insertError } = await supabase
      .from('Patient')
      .insert({
        ...patientData,
        createdAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('[API /api/patients] Supabase insert error:', insertError);
      throw new Error(`Failed to create patient in primary database: ${insertError.message}`);
    }

    console.log('[API /api/patients] Patient created in Supabase:', patient.id);

    // Create initial version
    const { error: versionError } = await supabase
      .from('PatientVersion')
      .insert({
        patientId: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        middleName: patient.middleName,
        dob: patient.dob,
        gender: patient.gender,
        phone: patient.phone,
        email: patient.email,
        address: patient.address,
        reason: 'Initial record creation',
        authorId: null,
      });

    if (versionError) {
      console.error('[API /api/patients] Version creation error:', versionError);
      // Don't throw - patient was created, version can be added later
    }

    console.log(`[API /api/patients] Patient created successfully in Supabase:`, patient.id);

    // Auto-sync to Loyverse
    console.log('[API /api/patients] Auto-syncing patient to Loyverse...');
    const loyverseSync = new LoyversePatientSync();
    const syncResult = await loyverseSync.syncPatient(patient.id);
    
    if (syncResult.success) {
      console.log(`[API /api/patients] ✅ Patient synced to Loyverse: ${syncResult.loyverseCustomerId}`);
    } else {
      console.error(`[API /api/patients] ⚠️ Loyverse sync failed (patient still created): ${syncResult.error}`);
      // Don't throw - patient was created successfully, Loyverse sync can be retried later
    }

    return NextResponse.json(
      {
        success: true,
        patient,
        source: 'supabase', // Always Supabase for writes
        loyverseSynced: syncResult.success,
        loyverseCustomerId: syncResult.loyverseCustomerId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API /api/patients] Error creating patient:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to create patient',
      },
      { status: 500 }
    );
  }
}
