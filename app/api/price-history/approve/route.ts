import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recordId, action, reviewReason } = body;
    
    if (!recordId || !action) {
      return NextResponse.json({ 
        error: 'Record ID and action are required' 
      }, { status: 400 });
    }
    
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ 
        error: 'Action must be "approve" or "reject"' 
      }, { status: 400 });
    }
    
    // First, get the price history record to understand what we're approving
    const { data: priceRecord, error: fetchError } = await supabase
      .from('price_history')
      .select('*')
      .eq('id', recordId)
      .single();
    
    if (fetchError || !priceRecord) {
      console.error('Error fetching price record:', fetchError);
      return NextResponse.json({ 
        error: 'Price history record not found' 
      }, { status: 404 });
    }
    
    // Check if record is in a state that can be approved/rejected
    if (priceRecord.status !== 'PENDING_REVIEW' && 
        !(priceRecord.status === 'FAILED' && priceRecord.failure_reason === 'Rejected in review')) {
      return NextResponse.json({ 
        error: 'Record is not in a reviewable state' 
      }, { status: 400 });
    }
    
    const now = new Date().toISOString();
    
    if (action === 'approve') {
      // Update the price history record to SUCCESS
      const { error: updateHistoryError } = await supabase
        .from('price_history')
        .update({
          status: 'SUCCESS',
          failure_reason: null,
          reviewed_by: 'admin',
          reviewed_at: now,
          review_result: 'approved'
        })
        .eq('id', recordId);
      
      if (updateHistoryError) {
        console.error('Error updating price history:', updateHistoryError);
        return NextResponse.json({ 
          error: 'Failed to approve price change' 
        }, { status: 500 });
      }
      
      // Apply the new price to the machines table
      const { error: updateMachineError } = await supabase
        .from('machines')
        .update({
          'Price': priceRecord.price
        })
        .eq('id', priceRecord.machine_id);
      
      if (updateMachineError) {
        console.error('Error updating machine price:', updateMachineError);
        // Revert the price history update
        await supabase
          .from('price_history')
          .update({
            status: 'FAILED',
            failure_reason: 'Rejected in review',
            reviewed_by: null,
            reviewed_at: null,
            review_result: null
          })
          .eq('id', recordId);
        
        return NextResponse.json({ 
          error: 'Failed to update machine price' 
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'Price change approved and applied',
        newPrice: priceRecord.price,
        machineId: priceRecord.machine_id
      });
      
    } else { // action === 'reject'
      // Update the price history record to mark as reviewed but rejected
      const { error: updateError } = await supabase
        .from('price_history')
        .update({
          status: 'REVIEWED',
          reviewed_by: 'admin', 
          reviewed_at: now,
          review_result: 'rejected',
          review_reason: reviewReason || 'Manually rejected by admin'
        })
        .eq('id', recordId);
      
      if (updateError) {
        console.error('Error rejecting price change:', updateError);
        return NextResponse.json({ 
          error: 'Failed to reject price change' 
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'Price change rejected',
        machineId: priceRecord.machine_id
      });
    }
    
  } catch (error) {
    console.error('Error in price approval:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}