import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

// Use Node.js runtime for Supabase operations
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const machineId = params.id;
  
  if (!machineId) {
    return NextResponse.json(
      { success: false, error: "Machine ID is required" },
      { status: 400 }
    );
  }
  
  try {
    const supabase = createAdminClient();
    
    // Get machine configuration
    const { data: configData, error: configError } = await supabase
      .from('variant_extraction_config')
      .select('*')
      .eq('machine_id', machineId)
      .eq('variant_attribute', 'DEFAULT');
    
    if (configError) {
      console.error('Error fetching machine configuration:', configError);
      return NextResponse.json(
        { success: false, error: configError.message },
        { status: 500 }
      );
    }
    
    const config = configData && configData.length > 0 ? configData[0] : null;
    
    // Get variants
    const { data: variants, error: variantsError } = await supabase
      .from('machines_latest')
      .select('variant_attribute, machines_latest_price, last_checked, tier, confidence')
      .eq('machine_id', machineId);
    
    if (variantsError) {
      console.error('Error fetching variants:', variantsError);
      return NextResponse.json(
        { success: false, error: variantsError.message },
        { status: 500 }
      );
    }
    
    // Get variant configs
    const { data: variantConfigs, error: variantConfigsError } = await supabase
      .from('variant_extraction_config')
      .select('*')
      .eq('machine_id', machineId)
      .neq('variant_attribute', 'DEFAULT');
    
    if (variantConfigsError) {
      console.error('Error fetching variant configurations:', variantConfigsError);
      return NextResponse.json(
        { success: false, error: variantConfigsError.message },
        { status: 500 }
      );
    }
    
    // Merge variant data with configuration
    const variantsWithConfig = variants.map(variant => {
      const config = variantConfigs.find(c => c.variant_attribute === variant.variant_attribute);
      return {
        ...variant,
        config
      };
    });
    
    return NextResponse.json({
      success: true,
      config,
      variants: variantsWithConfig
    });
    
  } catch (error) {
    console.error('Error fetching machine configuration:', error);
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
  { params }: { params: { id: string } }
) {
  const machineId = params.id;
  
  if (!machineId) {
    return NextResponse.json(
      { success: false, error: "Machine ID is required" },
      { status: 400 }
    );
  }
  
  try {
    const body = await request.json();
    const { config, js_config } = body;
    
    // Validate inputs
    if (!config) {
      return NextResponse.json(
        { success: false, error: "Configuration is required" },
        { status: 400 }
      );
    }
    
    const supabase = createAdminClient();
    
    // Check if config exists for this machine
    const { data: existingConfig, error: existingConfigError } = await supabase
      .from('variant_extraction_config')
      .select('id')
      .eq('machine_id', machineId)
      .eq('variant_attribute', 'DEFAULT')
      .maybeSingle();
    
    if (existingConfigError) {
      console.error('Error checking existing configuration:', existingConfigError);
      return NextResponse.json(
        { success: false, error: existingConfigError.message },
        { status: 500 }
      );
    }
    
    // Prepare config data
    const configData = {
      machine_id: machineId,
      variant_attribute: 'DEFAULT',
      min_extraction_confidence: config.min_extraction_confidence || 0.85,
      min_validation_confidence: config.min_validation_confidence || 0.9,
      sanity_check_threshold: config.sanity_check_threshold || 0.25,
      css_price_selector: config.css_price_selector || null,
      requires_js_interaction: config.requires_js_interaction || false,
      js_click_sequence: js_config || null,
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
        console.error('Error updating configuration:', error);
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
        console.error('Error inserting configuration:', error);
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
    console.error('Error saving machine configuration:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      },
      { status: 500 }
    );
  }
} 