import { NextResponse } from 'next/server';
import { updateAreaScalingParameters } from '@/app/tools/ink-calculator/migrations/update-area-scaling';
import { requireAdminAuth } from '@/lib/auth-utils';

export async function POST(request: Request) {
  console.log('[API-DEBUG] POST /api/admin/ink-calculator/update-area-scaling called');
  
  try {
    // Verify admin authentication
    await requireAdminAuth();
    console.log('[API-DEBUG] Admin auth verified for update-area-scaling');
    
    // Run the migration
    const result = await updateAreaScalingParameters();
    
    if (result.success) {
      console.log('[API-DEBUG] Area scaling parameters updated successfully');
      return NextResponse.json({ 
        message: result.message,
        success: true 
      });
    } else {
      console.error('[API-DEBUG] Error updating area scaling parameters:', result.message);
      return NextResponse.json({ 
        error: result.message,
        success: false 
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('[API-DEBUG] Unexpected error in update-area-scaling:', error);
    return NextResponse.json({ 
      error: error.message || 'Unknown error',
      success: false 
    }, { status: 500 });
  }
}

// Only allow POST requests
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
} 