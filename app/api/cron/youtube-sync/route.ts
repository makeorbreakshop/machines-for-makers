export const runtime = 'nodejs';
export const maxDuration = 60; // Allow up to 60 seconds for the sync

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Verify this is from Vercel Cron (check for secret)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if YouTube API is configured
    const apiKey = process.env.YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY_;
    const channelId = process.env.YOUTUBE_CHANNEL_ID;
    
    if (!apiKey || !channelId) {
      return NextResponse.json({ 
        error: 'YouTube API not configured' 
      }, { status: 500 });
    }

    // Import the sync logic from your existing API
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/admin/youtube/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Pass through any admin auth if needed
      }
    });

    const data = await response.json();
    
    // Log the sync result
    console.log(`YouTube sync completed at ${new Date().toISOString()}:`, data);

    return NextResponse.json({ 
      success: true,
      syncedAt: new Date().toISOString(),
      ...data
    });

  } catch (error) {
    console.error('YouTube cron sync error:', error);
    return NextResponse.json({ 
      error: 'Sync failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}