import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Machine ID is required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Update the machine to set published_at to null (making it a draft)
    const { data, error } = await supabase
      .from('machines')
      .update({ 
        'Published On': null
      })
      .eq('id', id)
      .select('id, "Machine Name", "Published On"')
      .single();

    if (error) {
      console.error('Error unpublishing machine:', error);
      return NextResponse.json(
        { error: 'Failed to unpublish machine' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      machine: data,
      message: 'Machine unpublished successfully (now a draft)'
    });

  } catch (error) {
    console.error('Error in unpublish API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}