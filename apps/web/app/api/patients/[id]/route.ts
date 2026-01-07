import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '../../../../lib/db/client'
import { LoyversePatientSync } from '../../../../lib/loyverse/sync'

// GET /api/patients/[id] - Get a single patient by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    console.log('[API /api/patients/[id]] Fetching patient:', id)

    const supabase = getSupabaseClient()
    const { data: patient, error } = await supabase
      .from('Patient')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !patient) {
      console.log('[API /api/patients/[id]] Patient not found:', id)
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      )
    }

    console.log('[API /api/patients/[id]] Patient found:', patient.id)

    // Calculate age if dob exists
    let age = 0
    if (patient.dob) {
      const birthDate = new Date(patient.dob)
      const today = new Date()
      age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }
    }

    return NextResponse.json({
      ...patient,
      age,
    })
  } catch (error) {
    console.error('[API /api/patients/[id]] Error fetching patient:', error)
    return NextResponse.json(
      { error: 'Failed to fetch patient' },
      { status: 500 }
    )
  }
}

// PATCH /api/patients/[id] - Update a patient
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()

    // Extract fields that can be updated
    const {
      firstName,
      middleName,
      lastName,
      dob,
      gender,
      email,
      phone,
      address,
      authorId,
      reason,
    } = body

    console.log('[API /api/patients/[id]] Updating patient in Supabase (writes must use primary DB only):', id)

    // For WRITE operations, we MUST use Supabase only - no fallback to local DB
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )

    // Check if patient exists
    const { data: existingPatient } = await supabase
      .from('Patient')
      .select('*')
      .eq('id', id)
      .single()

    if (!existingPatient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      )
    }

    // Update patient
    const updateData: any = {
      firstName,
      middleName,
      lastName,
      dob: dob ? new Date(dob).toISOString() : undefined,
      gender,
      email,
      phone,
      address,
      updatedAt: new Date().toISOString(),
    }

    // Calculate full_name and email_lower
    const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ')
    const emailLower = email ? email.toLowerCase() : null

    updateData.full_name = fullName
    updateData.email_lower = emailLower

    const { data: updatedPatient, error: updateError } = await supabase
      .from('Patient')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('[API /api/patients/[id]] Supabase update error:', updateError)
      throw new Error(`Failed to update patient in primary database: ${updateError.message}`)
    }

    // Create version record if authorId and reason provided
    if (authorId && reason) {
      const { error: versionError } = await supabase.from('PatientVersion').insert({
        id: `version_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        patientId: id,
        firstName: updatedPatient.firstName,
        middleName: updatedPatient.middleName,
        lastName: updatedPatient.lastName,
        dob: updatedPatient.dob,
        gender: updatedPatient.gender,
        email: updatedPatient.email,
        phone: updatedPatient.phone,
        address: updatedPatient.address,
        authorId,
        reason,
      })
      
      if (versionError) {
        console.error('[API /api/patients/[id]] Version creation error:', versionError)
        // Don't throw - patient was updated, version can be added later
      }
    }

    console.log('[API /api/patients/[id]] Patient updated successfully in Supabase:', updatedPatient.id)

    // Auto-sync to Loyverse
    console.log('[API /api/patients/[id]] Auto-syncing patient update to Loyverse...');
    const loyverseSync = new LoyversePatientSync();
    const syncResult = await loyverseSync.syncPatient(updatedPatient.id);
    
    if (syncResult.success) {
      console.log(`[API /api/patients/[id]] ✅ Patient synced to Loyverse: ${syncResult.loyverseCustomerId}`);
    } else {
      console.error(`[API /api/patients/[id]] ⚠️ Loyverse sync failed (patient still updated): ${syncResult.error}`);
      // Don't throw - patient was updated successfully, Loyverse sync can be retried later
    }

    return NextResponse.json({
      ...updatedPatient,
      source: 'supabase', // Always Supabase for writes
      loyverseSynced: syncResult.success,
      loyverseCustomerId: syncResult.loyverseCustomerId,
    })
  } catch (error) {
    console.error('[API /api/patients/[id]] Error updating patient:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update patient' },
      { status: 500 }
    )
  }
}

// DELETE /api/patients/[id] - Soft delete a patient
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    console.log('[API /api/patients/[id]] Soft deleting patient:', id)

    // Soft delete by setting deletedAt timestamp (writes must use Supabase only)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing')
    }

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'apikey': supabaseKey,
        },
      },
    })

    // Check if patient exists and is not already deleted
    const { data: existingPatient, error: checkError } = await supabase
      .from('Patient')
      .select('id, deleted_at')
      .eq('id', id)
      .single()

    if (checkError || !existingPatient) {
      console.log('[API /api/patients/[id]] Patient not found:', id)
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      )
    }

    if (existingPatient.deleted_at) {
      console.log('[API /api/patients/[id]] Patient already deleted:', id)
      return NextResponse.json(
        { error: 'Patient already deleted' },
        { status: 400 }
      )
    }

    // Soft delete the patient
    const { data: deletedPatient, error: deleteError } = await supabase
      .from('Patient')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (deleteError) {
      console.error('[API /api/patients/[id]] Soft delete error:', deleteError)
      throw new Error(`Failed to delete patient: ${deleteError.message}`)
    }

    console.log('[API /api/patients/[id]] Patient soft deleted successfully:', id)

    // Also delete from Loyverse if synced
    console.log('[API /api/patients/[id]] Deleting patient from Loyverse...')
    const loyverseSync = new LoyversePatientSync()
    const deleteResult = await loyverseSync.deletePatient(id)
    
    if (deleteResult.success) {
      console.log(`[API /api/patients/[id]] ✅ Patient deleted from Loyverse`)
    } else {
      console.error(`[API /api/patients/[id]] ⚠️ Loyverse deletion failed (patient still deleted locally): ${deleteResult.error}`)
      // Don't throw - patient was deleted successfully, Loyverse deletion can be retried later
    }

    return NextResponse.json({
      success: true,
      message: 'Patient deleted successfully',
      patient: deletedPatient,
      loyverseDeleted: deleteResult.success,
    })
  } catch (error) {
    console.error('[API /api/patients/[id]] Error deleting patient:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete patient' },
      { status: 500 }
    )
  }
}
