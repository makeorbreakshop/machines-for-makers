import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { BatchResultItem } from '@/app/api/types/batch';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = params.id;
    const format = searchParams.get('format') || 'json';
    
    const supabase = createClient();
    
    // Get batch data
    const { data: batchData, error: batchError } = await supabase
      .from('batches')
      .select('*')
      .eq('id', batchId)
      .single();
      
    if (batchError) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }
    
    // Get all results for this batch (no pagination or filtering)
    const { data: resultsData, error: resultsError } = await supabase
      .from('batch_results')
      .select('*')
      .eq('batch_id', batchId);
      
    if (resultsError) {
      return NextResponse.json({ error: 'Failed to fetch batch results' }, { status: 500 });
    }
    
    // Format the results
    const formattedResults: any[] = resultsData.map(item => ({
      id: item.id,
      batchId: item.batch_id,
      machineId: item.machine_id,
      machineName: item.machine_name,
      url: item.url,
      success: item.success,
      oldPrice: item.old_price,
      newPrice: item.new_price,
      priceChange: item.price_change,
      percentageChange: item.percentage_change,
      error: item.error,
      startTime: item.start_time,
      endTime: item.end_time,
      durationSeconds: item.duration_seconds,
      extractionMethod: item.extraction_method,
      httpStatus: item.http_status,
      htmlSize: item.html_size,
      variantAttribute: item.variant_attribute,
      tier: item.tier || item.extraction_method,
      extractedConfidence: item.extracted_confidence,
      validationConfidence: item.validation_confidence,
      needsReview: item.needs_review || false,
      reviewReason: item.review_reason,
      confidence: item.confidence
    }));
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `batch-results-${batchId}-${timestamp}`;
    
    if (format === 'csv') {
      return exportCsv(formattedResults, filename);
    } else {
      return exportJson(formattedResults, filename);
    }
    
  } catch (error) {
    console.error('Error exporting batch results:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function exportJson(data: any[], filename: string) {
  const jsonData = JSON.stringify(data, null, 2);
  
  return new NextResponse(jsonData, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}.json"`
    }
  });
}

function exportCsv(data: any[], filename: string) {
  if (data.length === 0) {
    return new NextResponse('No data to export', {
      status: 404
    });
  }
  
  // Get headers from the first data item
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  let csvContent = headers.join(',') + '\n';
  
  // Add data rows
  data.forEach(item => {
    const row = headers.map(header => {
      const value = item[header];
      
      // Handle different value types
      if (value === null || value === undefined) {
        return '';
      } else if (typeof value === 'string') {
        // Escape quotes and wrap in quotes
        return `"${value.replace(/"/g, '""')}"`;
      } else if (typeof value === 'object') {
        // Convert objects to JSON strings
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      } else {
        return value;
      }
    }).join(',');
    
    csvContent += row + '\n';
  });
  
  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}.csv"`
    }
  });
} 