import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Default to localhost:8000 if no API URL is set
const API_URL = process.env.NEXT_PUBLIC_PRICE_TRACKER_API_URL || 'http://localhost:8000';

export async function POST(request: Request) {
  try {
    const { machineId, variantAttribute = 'DEFAULT' } = await request.json();
    
    if (!machineId) {
      return NextResponse.json({ error: 'Machine ID is required' }, { status: 400 });
    }

    const supabase = createClient();

    // Get the machine details
    const { data: machine, error: machineError } = await supabase
      .from('machines')
      .select('*')
      .eq('id', machineId)
      .single();

    if (machineError || !machine) {
      return NextResponse.json({ error: 'Machine not found' }, { status: 404 });
    }

    if (!machine.product_link) {
      return NextResponse.json({ error: 'No product link found for this machine' }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(machine.product_link);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid product link format' }, { status: 400 });
    }

    // Use the debug-extraction endpoint with save_to_db=true and dry_run=false
    const pythonApiResponse = await fetch(`${API_URL}/api/v1/debug-extraction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        machine_id: machineId,
        save_to_db: true,
        dry_run: false,
        flags_for_review: true,
        sanity_check_threshold: 25.0,
        variant_attribute: variantAttribute
      }),
    });

    if (!pythonApiResponse.ok) {
      const error = await pythonApiResponse.json();
      return NextResponse.json({ 
        error: error.message || 'Failed to extract price',
        status: pythonApiResponse.status 
      }, { status: pythonApiResponse.status });
    }

    const result = await pythonApiResponse.json();
    
    // Process result using the same logic as debug
    if (result.success) {
      // Calculate price changes dynamically based on validation_basis_price
      const oldPrice = result.validation_basis_price || result.old_price || machine.current_price;
      const newPrice = result.price || result.new_price || parseFloat(JSON.stringify(result).match(/"price":\s*(\d+(\.\d+)?)/)?.[1] || '0');
      const priceChange = newPrice - (oldPrice || 0);
      const percentageChange = oldPrice ? (priceChange / oldPrice) * 100 : 0;

      // Return the same structure as debug for consistency
      return NextResponse.json({
        success: true,
        machine_id: machineId,
        machine_name: machine["Machine Name"],
        url: machine.product_link,
        new_price: newPrice,
        old_price: oldPrice,
        price_change: priceChange,
        percentage_change: percentageChange,
        extraction_method: result.extraction_method || result.tier || "Unknown method",
        extraction_confidence: result.extraction_confidence,
        validation_confidence: result.validation_confidence,
        needs_review: result.needs_review,
        review_reason: result.review_reason,
        extraction_attempts: result.extraction_attempts,
        duration_seconds: result.duration_seconds,
        http_status: result.http_status,
        html_size: result.html_size
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || result.failure_reason || 'Failed to extract price',
        machine_id: machineId,
        machine_name: machine["Machine Name"],
        url: machine.product_link
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in price extraction:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      }, 
      { status: 500 }
    );
  }
} 