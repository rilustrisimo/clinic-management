import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/db/client';

interface RouteParams {
  params: Promise<{ id: string; fileId: string }>;
}

/**
 * GET /api/labs/orders/[id]/files/[fileId]
 * Get a signed URL for downloading a file
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: orderId, fileId } = await params;
    console.log('[API /api/labs/orders/[id]/files/[fileId]] GET request:', { orderId, fileId });

    const supabase = getSupabaseClient();

    // Get file record
    const { data: file, error: fileError } = await supabase
      .from('LabResultFile')
      .select('*')
      .eq('id', fileId)
      .eq('orderId', orderId)
      .single();

    if (fileError || !file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Use service role to get signed URL
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    // Get signed URL (valid for 1 hour)
    const { data: urlData, error: urlError } = await serviceSupabase.storage
      .from('lab-results')
      .createSignedUrl(file.storagePath, 3600);

    if (urlError) {
      console.error('[API /api/labs/orders/[id]/files/[fileId]] URL error:', urlError);
      throw urlError;
    }

    return NextResponse.json({
      file,
      downloadUrl: urlData?.signedUrl,
    });
  } catch (error) {
    console.error('[API /api/labs/orders/[id]/files/[fileId]] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get file' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/labs/orders/[id]/files/[fileId]
 * Delete a file
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: orderId, fileId } = await params;
    console.log('[API /api/labs/orders/[id]/files/[fileId]] DELETE request:', { orderId, fileId });

    // Use service role for writes
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    // Get file record
    const { data: file, error: fileError } = await supabase
      .from('LabResultFile')
      .select('*')
      .eq('id', fileId)
      .eq('orderId', orderId)
      .single();

    if (fileError || !file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('lab-results')
      .remove([file.storagePath]);

    if (storageError) {
      console.error('[API /api/labs/orders/[id]/files/[fileId]] Storage error:', storageError);
      // Continue to delete database record anyway
    }

    // Delete database record
    const { error: dbError } = await supabase.from('LabResultFile').delete().eq('id', fileId);

    if (dbError) {
      console.error('[API /api/labs/orders/[id]/files/[fileId]] Database error:', dbError);
      throw dbError;
    }

    console.log('[API /api/labs/orders/[id]/files/[fileId]] File deleted:', fileId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API /api/labs/orders/[id]/files/[fileId]] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete file' },
      { status: 500 },
    );
  }
}
