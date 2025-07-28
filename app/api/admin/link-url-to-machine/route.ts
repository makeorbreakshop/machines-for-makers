import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

interface LinkUrlToMachineRequest {
  url_id: string
  machine_id: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body: LinkUrlToMachineRequest = await request.json()
    
    const { url_id, machine_id } = body
    
    if (!url_id || !machine_id) {
      return NextResponse.json(
        { error: 'Missing required fields: url_id and machine_id' },
        { status: 400 }
      )
    }
    
    // Update the discovered URL to link it to the specified machine
    const { data, error } = await supabase
      .from('discovered_urls')
      .update({
        existing_machine_id: machine_id,
        duplicate_status: 'duplicate', // Mark as duplicate since it's linked to an existing machine
        duplicate_reason: 'manual_link',
        similarity_score: 1.0, // Perfect match since manually linked
        checked_at: new Date().toISOString()
      })
      .eq('id', url_id)
      .select()
    
    if (error) {
      console.error('Error linking URL to machine:', error)
      return NextResponse.json(
        { error: 'Failed to link URL to machine' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'URL successfully linked to machine',
      data: data?.[0] || null
    })
    
  } catch (error) {
    console.error('Error in link-url-to-machine:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}