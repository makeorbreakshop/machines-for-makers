import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();

    // Fix the specific machine with http URL
    const { error } = await supabase
      .from('machines')
      .update({
        'Image': 'https://omtechlaser.com/cdn/shop/files/Frame21_1x_99a3d90b-2068-4330-9d28-f3ac195c10de.webp?v=1741590316',
        'Updated On': new Date().toISOString()
      })
      .eq('id', '6631c4a0-24bb-4f68-9829-207923875f64');

    if (error) {
      console.error('Error fixing image URL:', error);
      return NextResponse.json(
        { error: 'Failed to fix image URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Image URL fixed successfully'
    });

  } catch (error) {
    console.error('Error in fix-image-urls API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}