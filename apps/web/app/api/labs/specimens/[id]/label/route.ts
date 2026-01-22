import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/labs/specimens/[id]/label
 * Get label data for printing barcode labels
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    console.log('[API /api/labs/specimens/[id]/label] GET request for:', id);

    const supabase = getSupabaseClient();

    const { data: specimen, error } = await supabase
      .from('Specimen')
      .select(
        `
        id,
        accessionNo,
        specimenType,
        container,
        createdAt,
        order:orderId(
          id,
          orderNumber,
          patient:patientId(
            id,
            firstName,
            lastName,
            middleName,
            dob,
            gender
          )
        ),
        orderItem:orderItemId(
          id,
          testCode,
          testName
        )
      `,
      )
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Specimen not found' }, { status: 404 });
      }
      console.error('[API /api/labs/specimens/[id]/label] Database error:', error);
      throw error;
    }

    // Extract order and patient data (Supabase returns foreign key relationships as arrays)
    const order = Array.isArray(specimen.order) ? specimen.order[0] : specimen.order;
    const patient = order?.patient
      ? Array.isArray(order.patient)
        ? order.patient[0]
        : order.patient
      : null;
    const orderItem = Array.isArray(specimen.orderItem)
      ? specimen.orderItem[0]
      : specimen.orderItem;

    // Calculate patient age
    let age = '';
    if (patient?.dob) {
      const today = new Date();
      const birthDate = new Date(patient.dob);
      const years = today.getFullYear() - birthDate.getFullYear();
      const months = today.getMonth() - birthDate.getMonth();
      if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
        age = `${years - 1}Y`;
      } else {
        age = `${years}Y`;
      }
    }

    // Format patient name
    const patientName = patient
      ? `${patient.lastName}, ${patient.firstName}${patient.middleName ? ` ${patient.middleName.charAt(0)}.` : ''}`
      : 'Unknown';

    // Format collection date
    const collectionDate = new Date(specimen.createdAt).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    // Build label data
    const labelData = {
      accessionNo: specimen.accessionNo,
      barcode: specimen.accessionNo, // Can be used for barcode generation
      patientName,
      age,
      gender: patient?.gender?.charAt(0).toUpperCase() || '',
      dob: patient?.dob ? new Date(patient.dob).toLocaleDateString('en-PH') : '',
      specimenType: specimen.specimenType,
      container: specimen.container || '',
      testCode: orderItem?.testCode || '',
      testName: orderItem?.testName || '',
      collectionDate,
      orderNumber: order?.orderNumber || '',
    };

    console.log(
      '[API /api/labs/specimens/[id]/label] Label data generated for:',
      specimen.accessionNo,
    );

    return NextResponse.json({ data: labelData });
  } catch (error) {
    console.error('[API /api/labs/specimens/[id]/label] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch label data' },
      { status: 500 },
    );
  }
}
