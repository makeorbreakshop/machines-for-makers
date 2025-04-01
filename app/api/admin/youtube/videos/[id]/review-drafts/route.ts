import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth-utils';
import { createAdminClient } from '@/lib/supabase/admin';

const supabaseAdmin = createAdminClient();

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Admin authorization check
    const authorized = await requireAdminAuth();
    if (!authorized) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const videoId = params.id;
    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    // Get all review drafts for this video
    const { data, error } = await supabaseAdmin
      .from('review_drafts')
      .select('*')
      .eq('youtube_video_id', videoId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get review drafts: ${error.message}`);
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching review drafts:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred while fetching review drafts' },
      { status: 500 }
    );
  }
} 