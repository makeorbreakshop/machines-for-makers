export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import * as z from 'zod';

const createProgramSchema = z.object({
  name: z.string().min(1),
  brand_id: z.string().uuid(),
  commission_rate: z.number().min(0.001).max(1),
  is_active: z.boolean().default(true),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate the request body
    const validatedData = createProgramSchema.parse(body);
    
    const supabase = createServiceClient();
    
    // Check if a program already exists for this brand
    const { data: existing } = await supabase
      .from('affiliate_programs')
      .select('id')
      .eq('brand_id', validatedData.brand_id)
      .maybeSingle();
    
    if (existing) {
      return NextResponse.json(
        { message: 'An affiliate program already exists for this brand' },
        { status: 400 }
      );
    }
    
    // Create the new program
    const { data: program, error } = await supabase
      .from('affiliate_programs')
      .insert({
        name: validatedData.name,
        brand_id: validatedData.brand_id,
        commission_rate: validatedData.commission_rate,
        is_active: validatedData.is_active,
        notes: validatedData.notes || null,
        csv_column_mappings: {}, // Empty object for now
      })
      .select()
      .single();
    
    if (error) {
      console.error('Database error creating affiliate program:', error);
      return NextResponse.json(
        { message: 'Failed to create affiliate program' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      message: 'Affiliate program created successfully',
      program,
    });
    
  } catch (error) {
    console.error('Error in POST /api/admin/affiliate/programs:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Validation error', errors: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    
    const { data: programs, error } = await supabase
      .from('affiliate_programs')
      .select(`
        *,
        brands(Name, Slug)
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Database error fetching affiliate programs:', error);
      return NextResponse.json(
        { message: 'Failed to fetch affiliate programs' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ programs });
    
  } catch (error) {
    console.error('Error in GET /api/admin/affiliate/programs:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}