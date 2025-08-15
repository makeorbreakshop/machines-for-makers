export const runtime = 'nodejs'; // Required for Supabase

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

// GET - Fetch saved UTM links
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const campaign = searchParams.get('campaign');
    const source = searchParams.get('source');
    
    // Build query
    let query = supabase
      .from('utm_links')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    // Apply filters if provided
    if (campaign) {
      query = query.ilike('campaign', `%${campaign}%`);
    }
    if (source) {
      query = query.eq('source', source);
    }
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Error fetching UTM links:', error);
      return NextResponse.json(
        { error: 'Failed to fetch UTM links' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      links: data || [],
      total: count || 0
    });
  } catch (error) {
    console.error('Error in UTM links GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Save a new UTM link
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['url', 'lead_magnet', 'source', 'medium', 'campaign'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Insert the UTM link
    const { data, error } = await supabase
      .from('utm_links')
      .insert({
        url: body.url,
        lead_magnet: body.lead_magnet,
        source: body.source,
        medium: body.medium,
        campaign: body.campaign,
        content: body.content || null,
        term: body.term || null,
        notes: body.notes || null,
        created_by: user.id
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error saving UTM link:', error);
      return NextResponse.json(
        { error: 'Failed to save UTM link' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ link: data }, { status: 201 });
  } catch (error) {
    console.error('Error in UTM links POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a UTM link
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing link ID' },
        { status: 400 }
      );
    }
    
    const { error } = await supabase
      .from('utm_links')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting UTM link:', error);
      return NextResponse.json(
        { error: 'Failed to delete UTM link' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in UTM links DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update click count or notes
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();
    
    if (!body.id) {
      return NextResponse.json(
        { error: 'Missing link ID' },
        { status: 400 }
      );
    }
    
    const updates: any = {};
    if (body.click_count !== undefined) {
      updates.click_count = body.click_count;
    }
    if (body.notes !== undefined) {
      updates.notes = body.notes;
    }
    
    const { data, error } = await supabase
      .from('utm_links')
      .update(updates)
      .eq('id', body.id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating UTM link:', error);
      return NextResponse.json(
        { error: 'Failed to update UTM link' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ link: data });
  } catch (error) {
    console.error('Error in UTM links PATCH:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}