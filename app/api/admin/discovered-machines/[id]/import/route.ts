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

    // Get the discovered machine with manufacturer site and brand info
    const { data: discoveredMachine, error: fetchError } = await supabase
      .from('discovered_machines')
      .select(`
        *,
        site_scan_logs (
          manufacturer_sites (
            name,
            brand_id,
            brands (
              Name,
              Slug
            )
          )
        )
      `)
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
    
    // Prioritize brand from manufacturer site, then from normalized data
    let brandSlug = null;
    let brandName = null;
    
    // Check if manufacturer site has a linked brand
    const siteInfo = discoveredMachine.site_scan_logs?.manufacturer_sites;
    if (siteInfo?.brands?.Slug) {
      brandSlug = siteInfo.brands.Slug;
      brandName = siteInfo.brands.Name;
      console.log(`Using brand from manufacturer site: ${brandName} (${brandSlug})`);
    } else {
      // Fallback to brand from normalized data
      brandName = data.company || data.brand || data.manufacturer || 'OMTech';
      console.log('Brand name from data:', brandName);
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
      
      brandSlug = brandData.Slug;
    }
    
    console.log('Using brand slug:', brandSlug);
    
    // Helper function to ensure URLs use https
    const ensureHttps = (url: string | null): string | null => {
      if (!url) return null;
      if (typeof url !== 'string') return null;
      return url.replace(/^http:\/\//i, 'https://');
    };
    
    // Map the data to machines table format
    const machineData = {
      'Machine Name': data.name || data.title || data.machine_name || 'Imported Machine',
      'Company': brandSlug,
      'Machine Category': data.machine_category || 'laser',
      'Laser Category': data.laser_category || null,
      'Price': data.price ? parseFloat(String(data.price).replace(/[^0-9.-]/g, '')) || null : null,
      'Laser Type A': data.laser_type_a || data.laser_type || null,
      'Laser Power A': data.laser_power_a || data.power || null,
      'Work Area': data.work_area || null,
      'Speed': data.speed || null,
      'Image': ensureHttps(data.images?.[0] || data.image || data.image_url || null),
      'Description': data.description || null,
      'product_link': ensureHttps(discoveredMachine.source_url),
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