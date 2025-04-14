import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth-utils';
import YouTubeDbService from '@/lib/services/youtube-db-service';
import TranscriptionService from '@/lib/services/transcription-service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check admin authentication
    const adminAuth = await requireAdminAuth();
    if (!adminAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // In Next.js 15, params is a promise that must be awaited
    const unwrappedParams = await params;
    const id = unwrappedParams.id;
    
    const dbService = new YouTubeDbService();
    const transcriptionService = new TranscriptionService();
    
    // Fetch video first to get the YouTube ID
    const video = await dbService.getVideo(id);
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }
    
    // Force regenerate transcript
    console.log(`Regenerating transcript for video ${id} (${video.title})...`);
    
    const result = await transcriptionService.regenerateTranscript(id);
    
    // Fetch the newly created transcript
    const transcript = await dbService.getTranscript(id);
    
    return NextResponse.json({
      success: true,
      transcript
    });
  } catch (error: any) {
    console.error('Error regenerating transcript:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to regenerate transcript' },
      { status: 500 }
    );
  }
} 