import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

interface UpdateDuplicateStatusRequest {
  id: string
  duplicate_status: 'pending' | 'duplicate' | 'unique' | 'manual_review'
  confirmed?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body: UpdateDuplicateStatusRequest = await request.json()
    
    const { id, duplicate_status, confirmed } = body
    
    if (!id || !duplicate_status) {
      return NextResponse.json(
        { error: 'Missing required fields: id and duplicate_status' },
        { status: 400 }
      )
    }
    
    // Prepare update data based on the new status
    const updateData: any = {
      duplicate_status,
      checked_at: new Date().toISOString()
    }
    
    // If marking as unique, clear the existing machine link
    if (duplicate_status === 'unique') {
      updateData.existing_machine_id = null
      updateData.similarity_score = null
      updateData.duplicate_reason = null
    }
    
    // If confirming a duplicate, keep existing data but mark as confirmed
    if (duplicate_status === 'duplicate' && confirmed) {
      updateData.duplicate_reason = 'confirmed'
    }
    
    // Update the discovered URL
    const { data, error } = await supabase
      .from('discovered_urls')
      .update(updateData)
      .eq('id', id)
      .select()
    
    if (error) {
      console.error('Error updating duplicate status:', error)
      return NextResponse.json(
        { error: 'Failed to update duplicate status' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: `Duplicate status updated to ${duplicate_status}`,
      data: data?.[0] || null
    })
    
  } catch (error) {
    console.error('Error in update-url-duplicate-status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}