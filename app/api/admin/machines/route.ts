import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth-utils';
import { createClient } from '@supabase/supabase-js';

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
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const search = url.searchParams.get('search') || '';

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Build query
    let query = supabase
      .from('machines')
      .select('id, "Machine Name"', { count: 'exact' });

    // Add search if provided
    if (search) {
      query = query.ilike('Machine Name', `%${search}%`);
    }

    // Add pagination
    query = query.order('Machine Name').range(offset, offset + limit - 1);

    // Execute query
    const { data: machines, error, count } = await query;

    if (error) {
      console.error('Error fetching machines:', error);
      throw error;
    }

    return NextResponse.json({
      machines,
      pagination: {
        total: count || 0,
        limit,
        offset,
      },
    });
  } catch (error: any) {
    console.error('Error fetching machines:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch machines' },
      { status: 500 }
    );
  }
} 