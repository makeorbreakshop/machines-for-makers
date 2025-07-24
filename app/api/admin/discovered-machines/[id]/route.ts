export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

interface Params {
  params: Promise<{
    id: string;
  }>;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { normalized_data } = await request.json();
    const { id } = await params;
    
    if (!normalized_data) {
      return NextResponse.json({ error: 'normalized_data is required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Update the normalized_data field
    const { error } = await supabase
      .from('discovered_machines')
      .update({ 
        normalized_data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('Update error:', error);
      return NextResponse.json(
        { error: 'Failed to update product' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Product update error:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}