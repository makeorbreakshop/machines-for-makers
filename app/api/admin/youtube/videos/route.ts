import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth-utils';
import YouTubeDbService from '@/lib/services/youtube-db-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Check admin authentication
    const adminAuth = await requireAdminAuth();
    if (!adminAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10');
    const status = url.searchParams.get('status') || undefined;

    const dbService = new YouTubeDbService();
    const { videos, count } = await dbService.getVideos(page, pageSize, status);

    return NextResponse.json({
      videos,
      pagination: {
        total: count,
        page,
        pageSize,
        totalPages: Math.ceil(count / pageSize),
      },
    });
  } catch (error: any) {
    console.error('Error fetching YouTube videos:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch YouTube videos' },
      { status: 500 }
    );
  }
} 