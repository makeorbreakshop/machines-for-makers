export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getAdminCookie, validateAdminCookie } from '@/lib/auth-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Await params (Next.js 15 requirement)
  const { id } = await params;
  try {
    // Check authentication
    const adminCookie = await getAdminCookie();
    const isAuthenticated = validateAdminCookie(adminCookie);
    
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();
    
    const { data: leadMagnet, error } = await supabase
      .from('lead_magnets')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !leadMagnet) {
      return NextResponse.json({ error: 'Lead magnet not found' }, { status: 404 });
    }

    return NextResponse.json({ leadMagnet });
  } catch (error) {
    console.error('Lead magnet API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params (Next.js 15 requirement)
    const { id } = await params;
    
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
      active
    } = body;

    const supabase = createServiceClient();
    
    const { data: leadMagnet, error } = await supabase
      .from('lead_magnets')
      .update({
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
        active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating lead magnet:', error);
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A lead magnet with this slug already exists' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: 'Failed to update lead magnet' }, { status: 500 });
    }

    if (!leadMagnet) {
      return NextResponse.json({ error: 'Lead magnet not found' }, { status: 404 });
    }

    return NextResponse.json({ leadMagnet });
  } catch (error) {
    console.error('Lead magnet API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const adminCookie = await getAdminCookie();
    const isAuthenticated = validateAdminCookie(adminCookie);
    
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const supabase = createServiceClient();
    
    const { data: leadMagnet, error } = await supabase
      .from('lead_magnets')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating lead magnet:', error);
      return NextResponse.json({ error: 'Failed to update lead magnet' }, { status: 500 });
    }

    if (!leadMagnet) {
      return NextResponse.json({ error: 'Lead magnet not found' }, { status: 404 });
    }

    return NextResponse.json({ leadMagnet });
  } catch (error) {
    console.error('Lead magnet API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Await params (Next.js 15 requirement)
  const { id } = await params;
  try {
    // Check authentication
    const adminCookie = await getAdminCookie();
    const isAuthenticated = validateAdminCookie(adminCookie);
    
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();
    
    const { error } = await supabase
      .from('lead_magnets')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting lead magnet:', error);
      return NextResponse.json({ error: 'Failed to delete lead magnet' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Lead magnet API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}