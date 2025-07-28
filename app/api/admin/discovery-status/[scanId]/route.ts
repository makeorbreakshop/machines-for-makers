import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

interface ScanStatus {
  scan_id: string
  status: 'running' | 'completed' | 'failed'
  total_urls: number
  processed_urls: number
  discovered_products: number
  errors: string[]
  created_at: string
  completed_at?: string
  current_stage?: string
  credits_used?: number
  status_message?: string
  scan_metadata?: {
    total_urls?: number
    processed_urls?: number
    current_stage?: string
    status_message?: string
    discovery_method?: string
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ scanId: string }> }
) {
  try {
    const { scanId } = await params
    
    // Call the Python discovery service status endpoint
    const response = await fetch(`http://localhost:8001/api/v1/discovery-status/${scanId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })
    
    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Scan not found' },
          { status: 404 }
        )
      }
      throw new Error('Failed to get discovery status')
    }
    
    const status: ScanStatus = await response.json()
    
    // Extract metadata if available
    const metadata = status.scan_metadata || {}
    
    // Use metadata values if available, otherwise fall back to calculated values
    let current_stage = metadata.current_stage || 'Initializing...'
    let status_message = metadata.status_message || ''
    const total_urls = metadata.total_urls || status.total_urls
    const processed_urls = metadata.processed_urls || status.processed_urls
    
    // Provide fallback context if metadata is missing
    if (!metadata.current_stage) {
      if (status.status === 'running') {
        if (total_urls === 0) {
          current_stage = 'Checking sitemap...'
          status_message = 'Looking for sitemap.xml to discover URLs efficiently'
        } else if (processed_urls < total_urls) {
          current_stage = 'Processing URLs...'
          status_message = `Found ${total_urls} URLs, processed ${processed_urls}`
        } else {
          current_stage = 'Finalizing...'
          status_message = 'Categorizing and storing discovered products'
        }
      } else if (status.status === 'completed') {
        current_stage = 'Complete'
        status_message = `Successfully discovered ${status.discovered_products} products`
      } else if (status.status === 'failed') {
        current_stage = 'Failed'
        status_message = status.errors.length > 0 ? status.errors[0] : 'Discovery failed'
      }
    }
    
    return NextResponse.json({
      ...status,
      total_urls,
      processed_urls,
      current_stage,
      status_message,
      credits_used: status.credits_used || (processed_urls * 2), // Use actual or approximate
      discovery_method: metadata.discovery_method
    })
    
  } catch (error) {
    console.error('Discovery status error:', error)
    return NextResponse.json(
      { error: 'Failed to get discovery status' },
      { status: 500 }
    )
  }
}