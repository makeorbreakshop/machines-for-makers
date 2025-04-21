import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

// Use Node.js runtime for Supabase operations
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string, variant: string } }
) {
  const { id: machineId, variant: variantAttribute } = params;
  
  if (!machineId || !variantAttribute) {
    return NextResponse.json(
      { success: false, error: "Machine ID and variant attribute are required" },
      { status: 400 }
    );
  }
  
  try {
    const supabase = createAdminClient();
    
    // Get variant configuration
    const { data, error } = await supabase
      .from('variant_extraction_config')
      .select('*')
      .eq('machine_id', machineId)
      .eq('variant_attribute', variantAttribute)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching variant configuration:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      config: data || null
    });
    
  } catch (error) {
    console.error('Error fetching variant configuration:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string, variant: string } }
) {
  const { id: machineId, variant: variantAttribute } = params;
  
  if (!machineId || !variantAttribute) {
    return NextResponse.json(
      { success: false, error: "Machine ID and variant attribute are required" },
      { status: 400 }
    );
  }
  
  try {
    const body = await request.json();
    const { requires_js_interaction, js_click_sequence } = body;
    
    if (requires_js_interaction === undefined) {
      return NextResponse.json(
        { success: false, error: "requires_js_interaction field is required" },
        { status: 400 }
      );
    }
    
    // If JS interaction is required, make sure click sequence is provided
    if (requires_js_interaction && (!js_click_sequence || !Array.isArray(js_click_sequence))) {
      return NextResponse.json(
        { success: false, error: "JavaScript click sequence is required and must be an array" },
        { status: 400 }
      );
    }
    
    const supabase = createAdminClient();
    
    // Check if config exists for this variant
    const { data: existingConfig, error: existingConfigError } = await supabase
      .from('variant_extraction_config')
      .select('id')
      .eq('machine_id', machineId)
      .eq('variant_attribute', variantAttribute)
      .maybeSingle();
    
    if (existingConfigError) {
      console.error('Error checking existing variant configuration:', existingConfigError);
      return NextResponse.json(
        { success: false, error: existingConfigError.message },
        { status: 500 }
      );
    }
    
    // Prepare config data
    const configData = {
      machine_id: machineId,
      variant_attribute: variantAttribute,
      requires_js_interaction,
      js_click_sequence: requires_js_interaction ? js_click_sequence : null
    };
    
    let result;
    
    if (existingConfig) {
      // Update existing config
      const { data, error } = await supabase
        .from('variant_extraction_config')
        .update(configData)
        .eq('id', existingConfig.id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating variant configuration:', error);
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }
      
      result = data;
    } else {
      // Insert new config
      const { data, error } = await supabase
        .from('variant_extraction_config')
        .insert(configData)
        .select()
        .single();
      
      if (error) {
        console.error('Error inserting variant configuration:', error);
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }
      
      result = data;
    }
    
    return NextResponse.json({
      success: true,
      config: result
    });
    
  } catch (error) {
    console.error('Error saving variant configuration:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      },
      { status: 500 }
    );
  }
} 