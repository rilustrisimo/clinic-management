import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/db/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: orderId } = await params;
    const supabase = getSupabaseClient();

    // Fetch order with patient info
    const { data: order, error: orderError } = await supabase
      .from('LabOrder')
      .select(
        `
        *,
        patient:patientId (
          id,
          firstName,
          lastName,
          email
        )
      `,
      )
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (!order.patient?.email) {
      return NextResponse.json(
        { error: 'Patient does not have an email address' },
        { status: 400 },
      );
    }

    // Check if order has results
    const { data: files } = await supabase
      .from('LabResultFile')
      .select('id')
      .eq('orderId', orderId)
      .limit(1);

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No results available to send' }, { status: 400 });
    }

    // Generate or fetch access token
    let token: string;
    const { data: existingToken } = await supabase
      .from('LabResultToken')
      .select('token')
      .eq('orderId', orderId)
      .single();

    if (existingToken) {
      token = existingToken.token;
    } else {
      // Generate new token
      token = `${orderId}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry

      const { error: tokenError } = await supabase.from('LabResultToken').insert({
        orderId,
        token,
        expiresAt: expiresAt.toISOString(),
        isActive: true,
      });

      if (tokenError) {
        console.error('Error creating token:', tokenError);
        return NextResponse.json({ error: 'Failed to generate access token' }, { status: 500 });
      }
    }

    // Build results URL
    const baseUrl = request.headers.get('origin') || 'http://localhost:3000';
    const resultsUrl = `${baseUrl}/results/${token}`;

    // Send email using Supabase Auth (or you can use another email service)
    // For now, we'll use a simple approach with fetch to a hypothetical email service
    // In production, you'd integrate with Resend, SendGrid, or use Supabase's email functions

    const patientName = `${order.patient.firstName} ${order.patient.lastName}`;

    // TODO: Implement actual email sending
    // For now, just log and return success
    console.log('Email would be sent to:', order.patient.email);
    console.log('Results URL:', resultsUrl);
    console.log('Patient:', patientName);
    console.log('Order:', order.orderNumber);

    // Example email content:
    const emailContent = {
      to: order.patient.email,
      subject: `Your Lab Results - ${order.orderNumber}`,
      html: `
        <h2>Your Lab Results are Ready</h2>
        <p>Dear ${patientName},</p>
        <p>Your laboratory test results for order <strong>${order.orderNumber}</strong> are now available.</p>
        <p>You can view your results by clicking the link below:</p>
        <p><a href="${resultsUrl}">${resultsUrl}</a></p>
        <p>This link will remain valid for 30 days.</p>
        <br>
        <p>Best regards,<br>
        <strong>San Jose Medical Diagnostics & Health Solutions</strong><br>
        Brgy 5, Talakag, Bukidnon</p>
      `,
    };

    // In a real implementation, you would send the email here:
    // await sendEmail(emailContent);

    // For demo purposes, we'll just return success
    // You can integrate with email services like:
    // - Resend (https://resend.com)
    // - SendGrid
    // - AWS SES
    // - Supabase Edge Functions with email templates

    return NextResponse.json({
      message: 'Email sent successfully (demo mode - check console for details)',
      email: order.patient.email,
      resultsUrl,
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
