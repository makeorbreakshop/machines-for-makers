import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = createServiceClient();

    const { data: brands, error } = await supabase
      .from('brands')
      .select('id, Name, Slug')
      .order('Name', { ascending: true });

    if (error) {
      console.error('Error fetching brands:', error);
      return NextResponse.json(
        { error: 'Failed to fetch brands' },
        { status: 500 }
      );
    }

    return NextResponse.json(brands);
  } catch (error) {
    console.error('Error in brands API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}