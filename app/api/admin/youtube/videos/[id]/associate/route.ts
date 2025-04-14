import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth-utils';
import YouTubeDbService from '@/lib/services/youtube-db-service';

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
    const { machineId } = await request.json();

    if (!machineId) {
      return NextResponse.json(
        { error: 'Machine ID is required' },
        { status: 400 }
      );
    }

    const dbService = new YouTubeDbService();
    await dbService.associateVideoWithMachine(id, machineId);

    // Get updated machines for this video
    const machines = await dbService.getMachinesForVideo(id);

    return NextResponse.json({
      message: 'Machine associated successfully',
      machines,
    });
  } catch (error: any) {
    console.error('Error associating machine with video:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to associate machine with video' },
      { status: 500 }
    );
  }
} 