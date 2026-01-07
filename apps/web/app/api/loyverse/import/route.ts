import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db/client';
import { LoyversePatientSync } from '@/lib/loyverse/sync';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const loyverseSync = new LoyversePatientSync();
    const result = await loyverseSync.importFromLoyverse();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching Loyverse customers:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Loyverse customers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, customerId, customerData, patientId } = body;

    const loyverseSync = new LoyversePatientSync();

    if (action === 'import') {
      if (!customerData) {
        return NextResponse.json(
          { error: 'Customer data is required for import' },
          { status: 400 }
        );
      }
      const patient = await loyverseSync.importCustomerAsPatient(customerData);
      return NextResponse.json({ success: true, patient });
    } else if (action === 'link') {
      if (!patientId || !customerId) {
        return NextResponse.json(
          { error: 'Patient ID and Customer ID are required for linking' },
          { status: 400 }
        );
      }
      await loyverseSync.linkPatientToCustomer(patientId, customerId);
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be "import" or "link"' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Error processing Loyverse import:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process import' },
      { status: 500 }
    );
  }
}
