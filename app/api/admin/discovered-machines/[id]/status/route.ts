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
    const { status } = await request.json();
    const { id } = await params;
    
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Update the status first
    const { error } = await supabase
      .from('discovered_machines')
      .update({ status })
      .eq('id', id);

    if (error) {
      console.error('Update error:', error);
      return NextResponse.json(
        { error: 'Failed to update status' },
        { status: 500 }
      );
    }

    // If approved, automatically import the machine
    if (status === 'approved') {
      try {
        // Get the discovered machine data with manufacturer site and brand info
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
          .single();

        if (fetchError || !discoveredMachine) {
          console.error('Failed to fetch discovered machine for import:', fetchError);
          return NextResponse.json({ success: true, warning: 'Approved but failed to auto-import' });
        }

        // Check if already imported
        if (discoveredMachine.imported_machine_id) {
          return NextResponse.json({ success: true, message: 'Already imported' });
        }

        // Import the machine
        const data = discoveredMachine.normalized_data || discoveredMachine.raw_data;
        
        // Prioritize brand from manufacturer site, then from normalized data
        let brandSlug = null;
        let brandName = null;
        
        // Check if manufacturer site has a linked brand
        const siteInfo = discoveredMachine.site_scan_logs?.manufacturer_sites;
        if (siteInfo?.brands?.Slug) {
          brandSlug = siteInfo.brands.Slug;
          brandName = siteInfo.brands.Name;
          console.log(`Auto-import using brand from manufacturer site: ${brandName} (${brandSlug})`);
        } else {
          // Fallback to brand from normalized data
          brandName = data.company || data.brand || data.manufacturer || 'Unknown Brand';
          
          // Try to find an exact match first
          let { data: existingBrand, error: brandFetchError } = await supabase
            .from('brands')
            .select('"Name", "Slug"')
            .eq('"Name"', brandName)
            .single();

          // If exact match fails, try to find a partial match
          if (brandFetchError) {
            // For "Creality Falcon", try to match "Creality"
            const brandWords = brandName.split(' ');
            for (const word of brandWords) {
              const { data: partialBrand, error: partialError } = await supabase
                .from('brands')
                .select('"Name", "Slug"')
                .ilike('"Name"', word)
                .single();
              
              if (!partialError && partialBrand) {
                existingBrand = partialBrand;
                brandFetchError = null;
                console.log(`Found partial brand match: "${word}" matches "${partialBrand.Name}"`);
                break;
              }
            }
          }

          if (brandFetchError || !existingBrand) {
            console.error('Brand not found:', brandName, brandFetchError);
            return NextResponse.json({ 
              success: true, 
              warning: `Approved but failed to auto-import: Brand "${brandName}" not found in brands table` 
            });
          }
          
          brandSlug = existingBrand.Slug;
          brandName = existingBrand.Name; // Use the actual brand name from DB
        }
        
        // Helper function to ensure URLs use https
        const ensureHttps = (url: string | null): string | null => {
          if (!url) return null;
          if (typeof url !== 'string') return null;
          return url.replace(/^http:\/\//i, 'https://');
        };
        
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
        
        console.log(`Importing machine "${machineData['Machine Name']}" with brand: ${brandName} (slug: ${brandSlug})`);

        // Insert into machines table
        const { data: newMachine, error: insertError } = await supabase
          .from('machines')
          .insert(machineData)
          .select('id, "Machine Name"')
          .single();

        if (insertError) {
          console.error('Error importing machine:', insertError);
          return NextResponse.json({ success: true, warning: 'Approved but failed to auto-import' });
        }

        // Update discovered machine with imported machine ID (keep approved status)
        await supabase
          .from('discovered_machines')
          .update({ 
            imported_machine_id: newMachine.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        return NextResponse.json({ 
          success: true, 
          imported: true,
          machine: newMachine,
          message: 'Approved and automatically imported'
        });

      } catch (importError) {
        console.error('Auto-import error:', importError);
        return NextResponse.json({ success: true, warning: 'Approved but failed to auto-import' });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Status update error:', error);
    return NextResponse.json(
      { error: 'Failed to update status' },
      { status: 500 }
    );
  }
}