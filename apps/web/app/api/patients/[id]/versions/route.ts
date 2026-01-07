import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '../../../../../lib/db/client'

// GET /api/patients/[id]/versions - Get version history for a patient
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    console.log('[API /api/patients/[id]/versions] Fetching versions for patient:', id)

    const supabase = getSupabaseClient()
    const { data: versions, error } = await supabase
      .from('PatientVersion')
      .select('*')
      .eq('patientId', id)
      .order('createdAt', { ascending: false })

    if (error) {
      console.error('[API /api/patients/[id]/versions] Error fetching versions:', error)
      throw error
    }

    console.log(`[API /api/patients/[id]/versions] Found ${versions?.length || 0} versions`)

    return NextResponse.json({
      versions: versions || [],
    })
  } catch (error) {
    console.error('[API /api/patients/[id]/versions] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch patient versions' },
      { status: 500 }
    )
  }
}
