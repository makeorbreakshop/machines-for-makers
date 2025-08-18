export const runtime = 'nodejs';

import { createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json({ available: false, error: 'Slug is required' });
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json({ 
        available: false, 
        error: 'Slug can only contain lowercase letters, numbers, and hyphens' 
      });
    }

    const supabase = createServiceClient();
    
    const { data } = await supabase
      .from('short_links')
      .select('id')
      .eq('slug', slug)
      .single();

    return NextResponse.json({ available: !data });
  } catch (error) {
    console.error('Error validating slug:', error);
    return NextResponse.json({ available: false, error: 'Failed to validate slug' });
  }
}