export const runtime = 'nodejs';

import { createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();
    const body = await request.json();

    // Validate required fields
    if (!body.slug || !body.destination_url) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if slug already exists (if changed)
    const { data: existing } = await supabase
      .from('short_links')
      .select('id, slug')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404 }
      );
    }

    // If slug changed, check if new slug is available
    if (body.slug !== existing.slug) {
      const { data: slugExists } = await supabase
        .from('short_links')
        .select('id')
        .eq('slug', body.slug)
        .single();

      if (slugExists) {
        return NextResponse.json(
          { error: 'Slug already exists' },
          { status: 409 }
        );
      }
    }

    // Update the link
    const { data, error } = await supabase
      .from('short_links')
      .update({
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
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating link:', error);
    return NextResponse.json(
      { error: 'Failed to update link' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();

    // First delete all clicks for this link
    const { error: clicksError } = await supabase
      .from('link_clicks')
      .delete()
      .eq('link_id', id);

    if (clicksError) {
      throw clicksError;
    }

    // Then delete the link
    const { error } = await supabase
      .from('short_links')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting link:', error);
    return NextResponse.json(
      { error: 'Failed to delete link' },
      { status: 500 }
    );
  }
}