import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth-utils';
import YouTubeDbService from '@/lib/services/youtube-db-service';

export const dynamic = 'force-dynamic';

export async function GET(
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
    const id = params.id;
    const dbService = new YouTubeDbService();
    
    // Get video details
    const video = await dbService.getVideo(id);
    
    // Get associated machines
    const machines = await dbService.getMachinesForVideo(id);
    
    // Get transcript if available
    const transcript = await dbService.getTranscript(id);

    return NextResponse.json({
      video,
      machines,
      transcript,
    });
  } catch (error: any) {
    console.error('Error fetching YouTube video:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch YouTube video' },
      { status: 500 }
    );
  }
} 