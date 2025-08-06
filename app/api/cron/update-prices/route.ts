import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Define secret key for authentication
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // Check for secret to ensure this is a valid request
  const searchParams = request.nextUrl.searchParams;
  const secret = searchParams.get('secret');
  
  if (secret !== CRON_SECRET && secret !== 'admin-panel') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Call the Python FastAPI service to run batch processing
    const pythonServiceUrl = 'http://localhost:8000';
    
    console.log('Calling Python service for batch price extraction...');
    
    const response = await fetch(`${pythonServiceUrl}/api/v1/batch-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        days_threshold: 0,    // Update all machines regardless of last update
        limit: null,         // No limit - process all machines
        max_workers: 8,      // Use 8 concurrent workers
        use_scrapfly: true   // Use Scrapfly pipeline by default
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Python service error:', errorText);
      return NextResponse.json({ 
        error: `Python service failed: ${response.status} ${errorText}` 
      }, { status: 500 });
    }
    
    const results = await response.json();
    
    console.log(`Batch update started: ${results.message}`);
    
    return NextResponse.json({ 
      success: true, 
      message: results.message,
      python_service_response: results
    });
  } catch (error) {
    console.error('Error in update-prices:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

 