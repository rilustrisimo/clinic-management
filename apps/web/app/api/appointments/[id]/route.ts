import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '../../../../lib/db/client';

// GET /api/appointments/[id] - Get appointment details
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    console.log('[API /api/appointments/[id]] Fetching appointment:', id);

    const supabase = getSupabaseClient();
    const { data: appointment, error } = await supabase
      .from('Appointment')
      .select('*, patient:Patient(*)')
      .eq('id', id)
      .single();

    if (error || !appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    console.log('[API /api/appointments/[id]] Appointment found:', appointment.id);

    return NextResponse.json({
      ...appointment,
    });
  } catch (error) {
    console.error('[API /api/appointments/[id]] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch appointment' }, { status: 500 });
  }
}

// PATCH /api/appointments/[id] - Update appointment
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await request.json();

    const {
      start,
      end,
      type,
      reason,
      notes,
      status,
      providerId,
      services,
      totalPrice,
      // SOAP fields
      soapSubjective,
      soapObjective,
      soapAssessment,
      soapPlan,
    } = body;

    console.log('[API /api/appointments/[id]] Updating appointment:', id, body);

    // Validate time range if updating times
    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);

      if (startDate >= endDate) {
        return NextResponse.json({ error: 'Start time must be before end time' }, { status: 400 });
      }
    }

    // For WRITE operations, use Supabase only
    const { createClient } = await import('@supabase/supabase-js');
    const { randomUUID } = await import('crypto');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    // Check if appointment exists
    const { data: existing } = await supabase.from('Appointment').select('*').eq('id', id).single();

    if (!existing) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    if (start) updateData.startsAt = start;
    if (end) updateData.endsAt = end;
    if (type !== undefined) updateData.type = type;
    if (reason !== undefined) updateData.reason = reason;
    if (notes !== undefined) updateData.notes = notes;
    if (status) updateData.status = status;
    if (providerId !== undefined) updateData.providerId = providerId;
    if (totalPrice !== undefined) updateData.totalPrice = totalPrice;
    // SOAP fields
    if (soapSubjective !== undefined) updateData.soapSubjective = soapSubjective;
    if (soapObjective !== undefined) updateData.soapObjective = soapObjective;
    if (soapAssessment !== undefined) updateData.soapAssessment = soapAssessment;
    if (soapPlan !== undefined) updateData.soapPlan = soapPlan;

    const { data: updatedAppointment, error: updateError } = await supabase
      .from('Appointment')
      .update(updateData)
      .eq('id', id)
      .select('*, patient:Patient(*)')
      .single();

    if (updateError) {
      console.error('[API /api/appointments/[id]] Update error:', updateError);
      throw new Error(`Failed to update appointment: ${updateError.message}`);
    }

    // Update services if provided
    if (services && Array.isArray(services)) {
      // Delete existing services and their modifiers (cascade will handle modifiers)
      await supabase.from('AppointmentService').delete().eq('appointmentId', id);

      // Insert new services and modifiers
      for (const service of services) {
        const serviceId = randomUUID();
        const serviceData = {
          id: serviceId,
          appointmentId: id,
          itemId: service.itemId,
          variantId: service.variantId,
          itemName: service.itemName || null,
          variantName: service.variantName || null,
          basePrice: service.basePrice || 0,
          createdAt: new Date().toISOString(),
        };

        const { error: serviceError } = await supabase
          .from('AppointmentService')
          .insert(serviceData);

        if (serviceError) {
          console.error('[API /api/appointments/[id]] Service insert error:', serviceError);
          throw new Error(`Failed to update appointment service: ${serviceError.message}`);
        }

        // Insert modifiers for this service
        if (service.modifiers && service.modifiers.length > 0) {
          const modifierRecords = service.modifiers.map((mod: any) => ({
            id: randomUUID(),
            appointmentServiceId: serviceId,
            modifierId: mod.modifierId,
            optionId: mod.optionId,
            modifierName: mod.modifierName || null,
            optionName: mod.optionName || null,
            price: mod.price || 0,
            createdAt: new Date().toISOString(),
          }));

          const { error: modifierError } = await supabase
            .from('AppointmentServiceModifier')
            .insert(modifierRecords);

          if (modifierError) {
            console.error('[API /api/appointments/[id]] Modifier insert error:', modifierError);
            throw new Error(
              `Failed to update appointment service modifiers: ${modifierError.message}`,
            );
          }
        }
      }
    }

    console.log('[API /api/appointments/[id]] Appointment updated:', updatedAppointment.id);

    return NextResponse.json({
      ...updatedAppointment,
      source: 'supabase',
    });
  } catch (error) {
    console.error('[API /api/appointments/[id]] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update appointment' },
      { status: 500 },
    );
  }
}

// DELETE /api/appointments/[id] - Cancel appointment
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    console.log('[API /api/appointments/[id]] Cancelling appointment:', id);

    // For WRITE operations, use Supabase only
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    // Soft delete - mark as cancelled instead of deleting
    const { data: cancelled, error } = await supabase
      .from('Appointment')
      .update({
        status: 'cancelled',
        updatedAt: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
      }
      throw error;
    }

    console.log('[API /api/appointments/[id]] Appointment cancelled:', cancelled.id);

    return NextResponse.json({
      success: true,
      appointment: cancelled,
      source: 'supabase',
    });
  } catch (error) {
    console.error('[API /api/appointments/[id]] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel appointment' },
      { status: 500 },
    );
  }
}
