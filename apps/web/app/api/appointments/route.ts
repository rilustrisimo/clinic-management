import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '../../../lib/db/client';
import { randomUUID } from 'crypto';

// GET /api/appointments - List appointments with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date'); // YYYY-MM-DD format
    const patientId = searchParams.get('patientId');
    const providerId = searchParams.get('providerId');
    const status = searchParams.get('status');
    const view = searchParams.get('view') || 'day'; // day, week, month

    console.log('[API /api/appointments] GET request', {
      date,
      patientId,
      providerId,
      status,
      view,
    });

    // Helper to format date without timezone conversion
    const formatLocal = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };

    const supabase = getSupabaseClient();
    let query = supabase
      .from('Appointment')
      .select(
        `
        *,
        Patient (
          id,
          firstName,
          lastName,
          middleName,
          mrn
        ),
        User (
          id,
          email,
          name
        )
      `,
      )
      .order('startsAt', { ascending: true });

    // Filter by date/date range based on view
    if (date) {
      const targetDate = new Date(date);
      console.log('[API] Target date:', targetDate.toISOString());

      if (view === 'day') {
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        const startStr = formatLocal(startOfDay);
        const endStr = formatLocal(endOfDay);

        console.log('[API] Day range (local):', {
          start: startStr,
          end: endStr,
        });

        query = query.gte('startsAt', startStr).lte('startsAt', endStr);
      } else if (view === 'week') {
        // Get start of week (Sunday)
        const startOfWeek = new Date(targetDate);
        startOfWeek.setDate(targetDate.getDate() - targetDate.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        query = query
          .gte('startsAt', formatLocal(startOfWeek))
          .lte('startsAt', formatLocal(endOfWeek));
      } else if (view === 'month') {
        const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
        const endOfMonth = new Date(
          targetDate.getFullYear(),
          targetDate.getMonth() + 1,
          0,
          23,
          59,
          59,
          999,
        );

        query = query
          .gte('startsAt', formatLocal(startOfMonth))
          .lte('startsAt', formatLocal(endOfMonth));
      }
    }

    if (patientId) {
      query = query.eq('patientId', patientId);
    }

    if (providerId) {
      query = query.eq('providerId', providerId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: appointments, error } = await query;

    if (error) {
      console.error('[API /api/appointments] Error:', error);
      throw error;
    }

    console.log(`[API /api/appointments] Found ${appointments?.length || 0} appointments`);
    console.log(
      '[API /api/appointments] First appointment:',
      JSON.stringify(appointments?.[0], null, 2),
    );

    // Fetch services and modifiers for all appointments
    const appointmentIds = (appointments || []).map((apt: any) => apt.id);

    let servicesWithModifiers: any[] = [];
    if (appointmentIds.length > 0) {
      // Fetch services
      const { data: services } = await supabase
        .from('AppointmentService')
        .select('*')
        .in('appointmentId', appointmentIds);

      // Fetch modifiers for these services
      const serviceIds = (services || []).map((s: any) => s.id);
      let modifiers: any[] = [];

      if (serviceIds.length > 0) {
        const { data: fetchedModifiers } = await supabase
          .from('AppointmentServiceModifier')
          .select('*')
          .in('appointmentServiceId', serviceIds);

        modifiers = fetchedModifiers || [];
      }

      // Combine services with their modifiers
      servicesWithModifiers = (services || []).map((service: any) => ({
        ...service,
        modifiers: modifiers.filter((m: any) => m.appointmentServiceId === service.id),
      }));
    }

    // Normalize response: map User to provider and add services
    const normalizedAppointments = (appointments || []).map((apt: any) => ({
      ...apt,
      patient: apt.Patient || apt.patient,
      provider: apt.User || apt.provider,
      services: servicesWithModifiers.filter((s: any) => s.appointmentId === apt.id),
    }));

    return NextResponse.json({
      appointments: normalizedAppointments,
    });
  } catch (error) {
    console.error('[API /api/appointments] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch appointments' },
      { status: 500 },
    );
  }
}

// POST /api/appointments - Create new appointment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[API /api/appointments] POST body:', body);

    const {
      patientId,
      providerId,
      start,
      end,
      services, // Array of services with modifiers
      totalPrice,
      type,
      reason,
      notes,
      // SOAP Notes
      soapSubjective,
      soapObjective,
      soapAssessment,
      soapPlan,
    } = body;

    // Validation
    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    if (!start || !end) {
      return NextResponse.json({ error: 'Start and end times are required' }, { status: 400 });
    }

    if (!services || !Array.isArray(services) || services.length === 0) {
      return NextResponse.json({ error: 'At least one service is required' }, { status: 400 });
    }

    // No need to parse dates - they're already in the correct format from the form
    // Format: "YYYY-MM-DDTHH:MM:SS" (no timezone)
    if (start >= end) {
      return NextResponse.json({ error: 'Start time must be before end time' }, { status: 400 });
    }

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

    // Check for overlapping appointments (same patient, overlapping time)
    const { data: existing } = await supabase
      .from('Appointment')
      .select('id')
      .eq('patientId', patientId)
      .neq('status', 'cancelled')
      .or(`and(startsAt.lte.${end},endsAt.gte.${start})`);

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: 'Patient already has an appointment during this time' },
        { status: 409 },
      );
    }

    const appointmentId = randomUUID();
    const appointmentData: any = {
      id: appointmentId,
      patientId,
      providerId: providerId || null,
      startsAt: start,
      endsAt: end,
      reason: reason || null,
      notes: notes || null,
      status: 'scheduled',
      totalPrice: totalPrice || 0,
      // SOAP Notes
      soapSubjective: soapSubjective || null,
      soapObjective: soapObjective || null,
      soapAssessment: soapAssessment || null,
      soapPlan: soapPlan || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Only add type if it's provided and valid
    if (type) {
      appointmentData.type = type;
    }

    const { data: appointment, error: insertError } = await supabase
      .from('Appointment')
      .insert(appointmentData)
      .select('*, patient:Patient(*)')
      .single();

    if (insertError) {
      console.error('[API /api/appointments] Supabase insert error:', insertError);
      throw new Error(`Failed to create appointment: ${insertError.message}`);
    }

    // Insert services and their modifiers
    for (const service of services) {
      const serviceId = randomUUID();
      const serviceData = {
        id: serviceId,
        appointmentId,
        itemId: service.itemId,
        variantId: service.variantId,
        itemName: service.itemName || null,
        variantName: service.variantName || null,
        basePrice: service.basePrice || 0,
        createdAt: new Date().toISOString(),
      };

      const { error: serviceError } = await supabase.from('AppointmentService').insert(serviceData);

      if (serviceError) {
        console.error('[API /api/appointments] AppointmentService insert error:', serviceError);
        throw new Error(`Failed to create appointment service: ${serviceError.message}`);
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
          console.error(
            '[API /api/appointments] AppointmentServiceModifier insert error:',
            modifierError,
          );
          throw new Error(
            `Failed to create appointment service modifiers: ${modifierError.message}`,
          );
        }
      }
    }

    console.log('[API /api/appointments] Appointment created:', appointment.id);

    return NextResponse.json(
      {
        success: true,
        appointment,
        source: 'supabase',
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[API /api/appointments] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create appointment' },
      { status: 500 },
    );
  }
}
