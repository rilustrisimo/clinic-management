import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/db/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/labs/orders/[id]/files
 * List all files for a lab order
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    console.log('[API /api/labs/orders/[id]/files] GET request for:', id);

    const supabase = getSupabaseClient();

    const { data: files, error } = await supabase
      .from('LabResultFile')
      .select('*')
      .eq('orderId', id)
      .order('uploadedAt', { ascending: false });

    if (error) {
      console.error('[API /api/labs/orders/[id]/files] Database error:', error);
      throw error;
    }

    return NextResponse.json({ files: files || [] });
  } catch (error) {
    console.error('[API /api/labs/orders/[id]/files] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch files' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/labs/orders/[id]/files
 * Upload a new file for a lab order
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: orderId } = await params;
    console.log('[API /api/labs/orders/[id]/files] POST request for:', orderId);

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const notes = formData.get('notes') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: PDF, DOC, DOCX, JPG, PNG, GIF, WEBP' },
        { status: 400 },
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 });
    }

    // Use service role for writes
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    // Check if order exists
    const { data: order, error: orderError } = await supabase
      .from('LabOrder')
      .select('id, orderNumber')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Lab order not found' }, { status: 404 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const ext = file.name.split('.').pop();
    const fileName = `${orderId}/${timestamp}-${crypto.randomUUID()}.${ext}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('lab-results')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('[API /api/labs/orders/[id]/files] Upload error:', uploadError);

      // If bucket doesn't exist, try to create it
      if (uploadError.message?.includes('Bucket not found')) {
        // Create the bucket
        const { error: createBucketError } = await supabase.storage.createBucket('lab-results', {
          public: false,
          fileSizeLimit: 10 * 1024 * 1024, // 10MB
        });

        if (createBucketError) {
          console.error(
            '[API /api/labs/orders/[id]/files] Create bucket error:',
            createBucketError,
          );
          throw new Error('Failed to create storage bucket');
        }

        // Retry upload
        const { data: retryData, error: retryError } = await supabase.storage
          .from('lab-results')
          .upload(fileName, buffer, {
            contentType: file.type,
            upsert: false,
          });

        if (retryError) {
          throw retryError;
        }
      } else {
        throw uploadError;
      }
    }

    // Get public URL (or signed URL if bucket is private)
    const { data: urlData } = supabase.storage.from('lab-results').getPublicUrl(fileName);

    // Create file record in database
    const fileId = crypto.randomUUID();
    const { data: fileRecord, error: dbError } = await supabase
      .from('LabResultFile')
      .insert({
        id: fileId,
        orderId,
        fileName,
        originalName: file.name,
        fileType: file.type,
        fileSize: file.size,
        storagePath: fileName,
        publicUrl: urlData?.publicUrl,
        notes: notes || null,
        uploadedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      console.error('[API /api/labs/orders/[id]/files] Database error:', dbError);
      // Try to delete the uploaded file
      await supabase.storage.from('lab-results').remove([fileName]);
      throw dbError;
    }

    console.log('[API /api/labs/orders/[id]/files] File uploaded:', fileRecord.id);

    return NextResponse.json({ success: true, file: fileRecord }, { status: 201 });
  } catch (error) {
    console.error('[API /api/labs/orders/[id]/files] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload file' },
      { status: 500 },
    );
  }
}
