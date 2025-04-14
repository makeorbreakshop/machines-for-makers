import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth-utils';
import { ClaudeService, ClaudeModel } from '@/lib/services/claude-service';
import { createAdminClient } from '@/lib/supabase/admin';

const supabaseAdmin = createAdminClient();
const claudeService = new ClaudeService();

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    console.log('Structure generation API called for video ID:', id);
    
    // Admin authorization check
    const authorized = await requireAdminAuth();
    if (!authorized) {
      console.error('Unauthorized access attempt to structure generation API');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the video ID from the params
    const videoId = id;
    if (!videoId) {
      console.error('Missing video ID in structure generation request');
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    // Verify the video exists in the database
    const { data: video, error: videoError } = await supabaseAdmin
      .from('youtube_videos')
      .select('id, title')
      .eq('id', videoId)
      .single();
    
    if (videoError || !video) {
      console.error('Video not found in database:', videoError?.message || 'Not found');
      return NextResponse.json(
        { error: `Video not found: ${videoError?.message || 'No matching record'}` },
        { status: 404 }
      );
    }
    
    console.log('Found video in database:', video.title);

    // Get the model from the request body if provided
    const requestBody = await request.json().catch(() => ({}));
    const model = requestBody.model as ClaudeModel | undefined;
    
    console.log('Using Claude model for structure generation:', model || 'default');

    // Generate the review structure using the Claude service with the specified model
    console.log('Calling Claude service to generate structure...');
    const draft = await claudeService.generateReviewStructure(videoId, model);
    console.log('Structure generated successfully, draft ID:', draft.id);

    // Return the generated draft with the structure
    return NextResponse.json(draft, { status: 200 });
  } catch (error: any) {
    console.error('Error in structure generation API:', error);
    return NextResponse.json(
      { 
        error: error.message || 'An error occurred while generating the review structure',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 