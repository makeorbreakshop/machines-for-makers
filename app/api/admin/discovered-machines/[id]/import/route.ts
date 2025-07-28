import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Machine ID is required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Get the discovered machine
    const { data: discoveredMachine, error: fetchError } = await supabase
      .from('discovered_machines')
      .select('*')
      .eq('id', id)
      .eq('status', 'approved')
      .single();

    if (fetchError || !discoveredMachine) {
      return NextResponse.json(
        { error: 'Approved machine not found' },
        { status: 404 }
      );
    }

    // Check if already imported
    if (discoveredMachine.imported_machine_id) {
      return NextResponse.json(
        { error: 'Machine already imported' },
        { status: 400 }
      );
    }

    // Extract data from normalized_data or raw_data
    const data = discoveredMachine.normalized_data || discoveredMachine.raw_data;
    
    console.log('Discovered machine data:', JSON.stringify(data, null, 2));
    
    // Get the brand name from the normalized data (which should be selected from dropdown)
    const brandName = data.company || data.brand || data.manufacturer || 'OMTech';
    
    console.log('Brand name to use:', brandName);
    console.log('Available data fields:', Object.keys(data));
    
    // Find the brand slug from the brands table
    const { data: brandData, error: brandError } = await supabase
      .from('brands')
      .select('Slug')
      .eq('Name', brandName)
      .single();
    
    if (brandError || !brandData) {
      console.error('Brand not found:', brandName, brandError);
      return NextResponse.json(
        { error: `Brand "${brandName}" not found in brands table` },
        { status: 400 }
      );
    }
    
    console.log('Using brand slug:', brandData.Slug);
    
    // Map the data to machines table format
    const machineData = {
      'Machine Name': data.name || data.title || data.machine_name || 'Imported Machine',
      'Company': brandData.Slug,
      'Machine Category': data.machine_category || 'laser',
      'Laser Category': data.laser_category || null,
      'Price': data.price ? parseFloat(String(data.price).replace(/[^0-9.-]/g, '')) || null : null,
      'Laser Type A': data.laser_type_a || data.laser_type || null,
      'Laser Power A': data.laser_power_a || data.power || null,
      'Work Area': data.work_area || null,
      'Speed': data.speed || null,
      'Image': data.images?.[0] || data.image || data.image_url || null,
      'Description': data.description || null,
      'product_link': discoveredMachine.source_url,
      'Hidden': true, // Start as hidden/draft
      'Published On': null, // Start as draft
      'Created On': new Date().toISOString(),
      'Updated On': new Date().toISOString(),
    };

    // Insert into machines table
    const { data: newMachine, error: insertError } = await supabase
      .from('machines')
      .insert(machineData)
      .select('id, "Machine Name"')
      .single();

    if (insertError) {
      console.error('Error inserting machine:', insertError);
      return NextResponse.json(
        { error: 'Failed to import machine' },
        { status: 500 }
      );
    }

    // Update discovered machine with imported machine ID (keep existing status)
    const { error: updateError } = await supabase
      .from('discovered_machines')
      .update({ 
        imported_machine_id: newMachine.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating discovered machine:', updateError);
      // Don't fail the request since the machine was successfully created
    }

    return NextResponse.json({ 
      success: true, 
      machine: newMachine,
      message: 'Machine imported successfully'
    });

  } catch (error) {
    console.error('Error in import API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}