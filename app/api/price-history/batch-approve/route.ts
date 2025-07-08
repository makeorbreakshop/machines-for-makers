import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recordIds } = body;
    
    if (!recordIds || !Array.isArray(recordIds) || recordIds.length === 0) {
      return NextResponse.json({ error: 'Record IDs array is required' }, { status: 400 });
    }
    
    // Validate that we don't have too many IDs (safety limit)
    if (recordIds.length > 100) {
      return NextResponse.json({ error: 'Too many records to approve at once (max 100)' }, { status: 400 });
    }
    
    const now = new Date().toISOString();
    const results = {
      successful: [] as string[],
      failed: [] as { id: string, error: string }[],
      skipped: [] as { id: string, reason: string }[]
    };
    
    // First, get all the price history records to validate and process
    const { data: priceRecords, error: fetchError } = await supabase
      .from('price_history')
      .select('*')
      .in('id', recordIds);
    
    if (fetchError) {
      console.error('Error fetching price records:', fetchError);
      return NextResponse.json({ 
        error: 'Failed to fetch price history records',
        details: fetchError.message 
      }, { status: 500 });
    }
    
    if (!priceRecords || priceRecords.length === 0) {
      return NextResponse.json({ error: 'No valid records found' }, { status: 404 });
    }
    
    // Filter records that can be approved (only PENDING_REVIEW status)
    const approvableRecords = priceRecords.filter(record => record.status === 'PENDING_REVIEW');
    const nonApprovableRecords = priceRecords.filter(record => record.status !== 'PENDING_REVIEW');
    
    // Mark non-approvable records as skipped
    nonApprovableRecords.forEach(record => {
      results.skipped.push({
        id: record.id,
        reason: `Record status is ${record.status}, not PENDING_REVIEW`
      });
    });
    
    if (approvableRecords.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No records were eligible for approval',
        results
      });
    }
    
    // Process each approvable record
    for (const record of approvableRecords) {
      try {
        // Start a transaction-like operation by updating history first
        const { error: updateHistoryError } = await supabase
          .from('price_history')
          .update({
            status: 'SUCCESS',
            failure_reason: null,
            reviewed_by: 'admin',
            reviewed_at: now,
            review_result: 'approved'
          })
          .eq('id', record.id);
        
        if (updateHistoryError) {
          throw new Error(`Failed to update price history: ${updateHistoryError.message}`);
        }
        
        // Apply the new price to the machines table
        const { error: updateMachineError } = await supabase
          .from('machines')
          .update({
            'Price': record.price
          })
          .eq('id', record.machine_id);
        
        if (updateMachineError) {
          // Revert the price history update
          await supabase
            .from('price_history')
            .update({
              status: 'PENDING_REVIEW',
              failure_reason: null,
              reviewed_by: null,
              reviewed_at: null,
              review_result: null
            })
            .eq('id', record.id);
          
          throw new Error(`Failed to update machine price: ${updateMachineError.message}`);
        }
        
        results.successful.push(record.id);
        
      } catch (error) {
        console.error(`Error approving record ${record.id}:`, error);
        results.failed.push({
          id: record.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Batch approval completed: ${results.successful.length} approved, ${results.failed.length} failed, ${results.skipped.length} skipped`,
      results
    });
    
  } catch (error) {
    console.error('Error in batch approve price history:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}