export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const supabase = createServiceClient();
    
    // Delete the report
    const { error } = await supabase
      .from('affiliate_reports')
      .delete()
      .eq('id', resolvedParams.id);

    if (error) {
      throw new Error(`Failed to delete report: ${error.message}`);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Report deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting report:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete report' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from('affiliate_reports')
      .select(`
        *,
        affiliate_programs(
          name,
          commission_rate,
          brands(Name, Slug)
        )
      `)
      .eq('id', resolvedParams.id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch report: ${error.message}`);
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ report: data });
  } catch (error) {
    console.error('Error fetching report:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch report' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const supabase = createServiceClient();
    const body = await request.json();
    
    // Update report status or other fields
    const { data, error } = await supabase
      .from('affiliate_reports')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', resolvedParams.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update report: ${error.message}`);
    }

    return NextResponse.json({ 
      success: true, 
      report: data,
      message: 'Report updated successfully' 
    });
  } catch (error) {
    console.error('Error updating report:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update report' },
      { status: 500 }
    );
  }
}