import { NextRequest, NextResponse } from 'next/server';
import TranscriptionService from '@/lib/services/transcription-service';
import { requireAdminAuth } from '@/lib/auth-utils';

// Set the configuration for this API route
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Maximum duration in seconds (5 minutes)

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check admin authentication
    const adminAuth = await requireAdminAuth();
    if (!adminAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // In Next.js 15, params is accessed directly
    const id = params.id;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing video ID' },
        { status: 400 }
      );
    }
    
    const transcriptionService = new TranscriptionService();
    const result = await transcriptionService.transcribeVideo(id);
    
    return NextResponse.json({
      success: true,
      transcriptId: result.transcriptId,
      content: result.content,
    });
  } catch (error: any) {
    console.error('Error transcribing video:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to transcribe video',
        details: error.message,
      },
      { status: 500 }
    );
  }
} 