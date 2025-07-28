import { NextRequest, NextResponse } from "next/server"

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { manufacturer_id } = body

    console.log(`Triggering duplicate detection${manufacturer_id ? ` for manufacturer ${manufacturer_id}` : ''}`)

    // Call Python duplicate detection service
    const response = await fetch('http://localhost:8000/api/v1/run-duplicate-detection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ manufacturer_id })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Duplicate detection failed')
    }

    const results = await response.json()
    console.log('Duplicate detection completed:', results)

    return NextResponse.json({
      success: true,
      ...results
    })

  } catch (error: any) {
    console.error("Error running duplicate detection:", error)
    return NextResponse.json(
      { error: "Duplicate detection failed", details: error?.message },
      { status: 500 }
    )
  }
}