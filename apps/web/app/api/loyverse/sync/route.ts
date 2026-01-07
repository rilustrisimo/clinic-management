import { NextRequest, NextResponse } from 'next/server';
import { loyversePatientSync } from '../../../../lib/loyverse/sync';

/**
 * POST /api/loyverse/sync
 * Sync patients to Loyverse customers
 */
export async function POST(request: NextRequest) {
  console.log('[API /api/loyverse/sync] POST request received');
  
  try {
    const body = await request.json();
    const { patientId, syncAll } = body;
    
    console.log('[API /api/loyverse/sync] Body:', { patientId, syncAll });

    if (syncAll) {
      // Sync all patients
      console.log('[API /api/loyverse/sync] Syncing all patients...');
      const results = await loyversePatientSync.syncAllPatients();
      return NextResponse.json({
        success: true,
        ...results,
      });
    } else if (patientId) {
      // Sync single patient
      console.log('[API /api/loyverse/sync] Syncing patient:', patientId);
      const result = await loyversePatientSync.syncPatient(patientId);
      console.log('[API /api/loyverse/sync] Sync result:', result);
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        { error: 'Either patientId or syncAll must be provided' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('[API /api/loyverse/sync] Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
