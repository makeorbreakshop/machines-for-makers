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

    // Update the machine to set published_at to current timestamp
    const { data, error } = await supabase
      .from('machines')
      .update({ 
        'Published On': new Date().toISOString()
      })
      .eq('id', id)
      .select('id, "Machine Name", "Published On"')
      .single();

    if (error) {
      console.error('Error publishing machine:', error);
      return NextResponse.json(
        { error: 'Failed to publish machine' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      machine: data,
      message: 'Machine published successfully'
    });

  } catch (error) {
    console.error('Error in publish API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}