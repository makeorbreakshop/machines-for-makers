import { NextRequest, NextResponse } from 'next/server';
import TranscriptionService from '@/lib/services/transcription-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
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