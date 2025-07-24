import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const { manufacturer_id, base_url, max_pages } = await request.json()
    
    // Call the Python URL discovery service
    const response = await fetch('http://localhost:8000/api/discover-urls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        manufacturer_id,
        base_url, 
        max_pages: max_pages || 5
      })
    })
    
    if (!response.ok) {
      throw new Error('URL discovery failed')
    }
    
    const results = await response.json()
    return NextResponse.json(results)
    
  } catch (error) {
    console.error('URL discovery error:', error)
    return NextResponse.json(
      { error: 'Failed to discover URLs' },
      { status: 500 }
    )
  }
}