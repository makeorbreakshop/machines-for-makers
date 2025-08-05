import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // Extract machine ID from query params
  const searchParams = request.nextUrl.searchParams;
  const machineId = searchParams.get('machineId');
  
  if (!machineId) {
    return NextResponse.json({ error: 'machineId is required' }, { status: 400 });
  }
  
  console.log(`Starting manual price update for machine ID: ${machineId}`);
  
  try {
    // Call the Python FastAPI service to update this specific machine
    const pythonServiceUrl = 'http://localhost:8000';
    
    console.log('Calling Python service for single machine price update...');
    
    const response = await fetch(`${pythonServiceUrl}/api/v1/update-price`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        machine_id: machineId
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Python service error:', errorText);
      return NextResponse.json({ 
        error: `Python service failed: ${response.status} ${errorText}` 
      }, { status: 500 });
    }
    
    const result = await response.json();
    
    console.log(`Manual price update completed for machine ${machineId}`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Price update completed using Scrapfly pipeline',
      python_service_response: result
    });
  } catch (error) {
    console.error('Error in manual update:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update price',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 