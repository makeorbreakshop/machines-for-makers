export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getAdminCookie, validateAdminCookie } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const adminCookie = await getAdminCookie();
    const isAuthenticated = validateAdminCookie(adminCookie);
    
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();
    
    const { data: leadMagnets, error } = await supabase
      .from('lead_magnets')
      .select('*')
      .order('position', { ascending: true });

    if (error) {
      console.error('Error fetching lead magnets:', error);
      return NextResponse.json({ error: 'Failed to fetch lead magnets' }, { status: 500 });
    }

    return NextResponse.json({ leadMagnets });
  } catch (error) {
    console.error('Lead magnets API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const adminCookie = await getAdminCookie();
    const isAuthenticated = validateAdminCookie(adminCookie);
    
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      slug,
      description,
      landing_page_url,
      convertkit_form_id,
      convertkit_form_name,
      convertkit_tag,
      icon,
      color,
      position,
      active = true
    } = body;

    // Validate required fields
    if (!name || !slug || !landing_page_url) {
      return NextResponse.json(
        { error: 'Name, slug, and landing page URL are required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    
    // Get user for created_by
    const { data: { user } } = await supabase.auth.getUser();

    const { data: leadMagnet, error } = await supabase
      .from('lead_magnets')
      .insert({
        name,
        slug,
        description,
        landing_page_url,
        convertkit_form_id,
        convertkit_form_name,
        convertkit_tag,
        icon: icon || 'gift',
        color: color || '#3b82f6',
        position: position || 0,
        active,
        created_by: user?.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating lead magnet:', error);
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A lead magnet with this slug already exists' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: 'Failed to create lead magnet' }, { status: 500 });
    }

    return NextResponse.json({ leadMagnet }, { status: 201 });
  } catch (error) {
    console.error('Lead magnets API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}