import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { BatchResultsResponse } from '@/app/api/types/batch';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = params.id;
    
    // Parse filter params
    const showSuccessful = searchParams.get('showSuccessful') === 'true';
    const showFailed = searchParams.get('showFailed') === 'true';
    const showUnchanged = searchParams.get('showUnchanged') === 'true';
    const showUpdated = searchParams.get('showUpdated') === 'true';
    const showNeedsReview = searchParams.get('showNeedsReview') === 'true';
    const showAll = !showSuccessful && !showFailed && !showUnchanged && !showUpdated && !showNeedsReview;
    
    // Pagination params
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const offset = (page - 1) * pageSize;

    const supabase = createClient();
    
    // Get batch summary
    const { data: batchData, error: batchError } = await supabase
      .from('batches')
      .select('*')
      .eq('id', batchId)
      .single();
      
    if (batchError) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }
    
    // Query batch results with filters
    let query = supabase
      .from('batch_results')
      .select('*')
      .eq('batch_id', batchId);
    
    // Apply filters if not showing all
    if (!showAll) {
      if (showSuccessful) {
        query = query.eq('success', true);
      }
      
      if (showFailed) {
        query = showSuccessful 
          ? query.or(`success.eq.false`) 
          : query.eq('success', false);
      }
      
      if (showNeedsReview) {
        query = query.eq('needs_review', true);
      }
      
      if (showUpdated) {
        query = query.not('price_change', 'is', null).gt('price_change', 0);
      }
      
      if (showUnchanged) {
        query = query.or(`price_change.is.null,price_change.eq.0`);
      }
    }
    
    // Add pagination
    query = query.range(offset, offset + pageSize - 1);
    
    // Execute the query
    const { data: resultsData, error: resultsError } = await query;
    
    if (resultsError) {
      return NextResponse.json({ error: 'Failed to fetch batch results' }, { status: 500 });
    }
    
    // Get aggregate counts for summary
    const { data: countData, error: countError } = await supabase
      .from('batch_results')
      .select(`
        success,
        needs_review,
        price_change
      `)
      .eq('batch_id', batchId);
      
    if (countError) {
      return NextResponse.json({ error: 'Failed to fetch batch summary counts' }, { status: 500 });
    }
    
    // Calculate summary statistics
    const completedMachines = countData.length;
    const successfulMachines = countData.filter(item => item.success).length;
    const failedMachines = countData.filter(item => !item.success).length;
    const needsReviewMachines = countData.filter(item => item.needs_review).length;
    const updatedMachines = countData.filter(item => 
      item.price_change !== null && item.price_change !== 0
    ).length;
    const unchangedMachines = countData.filter(item => 
      item.price_change === null || item.price_change === 0
    ).length;
    
    // Get estimated cost from llm_usage_tracking table
    const { data: costData, error: costError } = await supabase
      .rpc('get_batch_llm_cost', { batch_id_param: batchId });
    
    const estimatedCost = costError ? null : costData;
    
    // Format response
    const response: BatchResultsResponse = {
      summary: {
        id: batchData.id,
        status: batchData.status,
        startTime: batchData.start_time,
        endTime: batchData.end_time,
        totalMachines: batchData.total_machines,
        completedMachines,
        successfulMachines,
        failedMachines,
        needsReviewMachines,
        updatedMachines,
        unchangedMachines,
        daysThreshold: batchData.days_threshold,
        createdBy: batchData.created_by,
        batchType: batchData.batch_type,
        metadata: batchData.metadata || {},
        estimatedCost: estimatedCost
      },
      results: resultsData.map(item => ({
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
        extractionAttempts: item.extraction_attempts,
        variantAttribute: item.variant_attribute,
        tier: item.tier || item.extraction_method, // Fallback to extraction_method if tier is not available
        extractedConfidence: item.extracted_confidence,
        validationConfidence: item.validation_confidence,
        needsReview: item.needs_review || false,
        reviewReason: item.review_reason,
        confidence: item.confidence
      }))
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching batch results:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 