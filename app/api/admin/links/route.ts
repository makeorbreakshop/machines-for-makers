export const runtime = 'nodejs';

import { createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const supabase = createServiceClient();
    
    const { data: links, error } = await supabase
      .from('short_links')
      .select(`
        *,
        click_count:link_clicks(count)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Transform the data to include click counts
    const linksWithStats = links?.map(link => ({
      ...link,
      click_count: link.click_count?.[0]?.count || 0
    })) || [];

    return NextResponse.json(linksWithStats);
  } catch (error) {
    console.error('Error fetching links:', error);
    return NextResponse.json(
      { error: 'Failed to fetch links' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();

    // Validate required fields
    if (!body.slug || !body.destination_url) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const { data: existing } = await supabase
      .from('short_links')
      .select('id')
      .eq('slug', body.slug)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Slug already exists' },
        { status: 409 }
      );
    }

    // Create the link
    const { data, error } = await supabase
      .from('short_links')
      .insert({
        slug: body.slug,
        destination_url: body.destination_url,
        type: body.type || 'resource',
        campaign: body.campaign || null,
        utm_source: body.utm_source || null,
        utm_medium: body.utm_medium || null,
        utm_campaign: body.utm_campaign || null,
        utm_term: body.utm_term || null,
        utm_content: body.utm_content || null,
        append_utms: body.append_utms !== false,
        active: body.active !== false,
        metadata: body.metadata || {},
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating link:', error);
    return NextResponse.json(
      { error: 'Failed to create link' },
      { status: 500 }
    );
  }
}