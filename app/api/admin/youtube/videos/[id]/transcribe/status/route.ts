import { NextRequest, NextResponse } from 'next/server';
import TranscriptionService from '@/lib/services/transcription-service';
import { requireAdminAuth } from '@/lib/auth-utils';

// Set the configuration for this API route
export const dynamic = 'force-dynamic';

// Create a singleton instance of the transcription service
const transcriptionService = new TranscriptionService();

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
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

    // Get video ID from the context params directly
    const videoId = context.params.id;
    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    // Get the status of the transcription
    const status = transcriptionService.getTranscriptionStatus(videoId);
    
    if (!status) {
      return NextResponse.json(
        { status: 'unknown', message: 'No transcription in progress or completed for this video' },
        { status: 404 }
      );
    }

    return NextResponse.json(status, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching transcription status:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    );
  }
} 