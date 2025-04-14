import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth-utils';
import { createAdminClient } from '@/lib/supabase/admin';

const supabaseAdmin = createAdminClient();

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Admin authorization check
    const authorized = await requireAdminAuth();
    if (!authorized) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // In Next.js 15, params is a promise that must be awaited
    const unwrappedParams = await params;
    const draftId = unwrappedParams.id;
    if (!draftId) {
      return NextResponse.json(
        { error: 'Draft ID is required' },
        { status: 400 }
      );
    }

    // Get draft data
    const { data, error } = await supabaseAdmin
      .from('review_drafts')
      .select('*')
      .eq('id', draftId)
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('Error getting review draft:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred while getting the review draft' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Admin authorization check
    const authorized = await requireAdminAuth();
    if (!authorized) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // In Next.js 15, params is a promise that must be awaited
    const unwrappedParams = await params;
    const draftId = unwrappedParams.id;
    if (!draftId) {
      return NextResponse.json(
        { error: 'Draft ID is required' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    
    // Validate request body
    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: 'Request body is required' },
        { status: 400 }
      );
    }

    // Only allow certain fields to be updated
    const allowedFields = [
      'title',
      'content',
      'rating',
      'machine_id',
      'generation_status',
    ];

    const updateFields: Record<string, any> = {};
    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updateFields[field] = body[field];
      }
    });

    // Add updated_at timestamp
    updateFields.updated_at = new Date().toISOString();

    // If no valid fields are provided, return an error
    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields provided for update' },
        { status: 400 }
      );
    }

    // Update draft in database
    const { data, error } = await supabaseAdmin
      .from('review_drafts')
      .update(updateFields)
      .eq('id', draftId)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('Error updating review draft:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred while updating the review draft' },
      { status: 500 }
    );
  }
} 