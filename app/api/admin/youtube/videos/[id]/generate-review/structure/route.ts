import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth-utils';
import { createAdminClient } from '@/lib/supabase/admin';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function POST(
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

    // In Next.js 15, params is a promise that must be awaited
    const unwrappedParams = await params;
    const videoId = unwrappedParams.id;
    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    // Initialize Supabase admin client
    const supabaseAdmin = createAdminClient();

    // Create a default blank structure instead of calling Claude
    const defaultStructure = {
      introduction: { title: "Introduction", outline: [] },
      specifications: { title: "Specifications and Features", outline: [] },
      strengths: { title: "Key Strengths", outline: [] },
      weaknesses: { title: "Key Weaknesses", outline: [] },
      performance: { title: "Performance", outline: [] },
      usability: { title: "Usability", outline: [] },
      value: { title: "Value for Money", outline: [] },
      conclusion: { title: "Conclusion", outline: [] }
    };

    // Store the default structure as a draft
    const { data: draft, error: draftError } = await supabaseAdmin
      .from('review_drafts')
      .insert({
        youtube_video_id: videoId,
        structure: defaultStructure,
        generation_status: 'structure_generated',
        version: 1
      })
      .select()
      .single();

    if (draftError) {
      throw new Error(`Failed to store review draft: ${draftError.message}`);
    }

    return NextResponse.json(draft, { status: 200 });
  } catch (error: any) {
    console.error('Error creating review structure:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred while creating the review structure' },
      { status: 500 }
    );
  }
} 