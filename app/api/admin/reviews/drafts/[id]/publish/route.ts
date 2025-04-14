import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth-utils';
import claudeService from '@/lib/services/claude-service';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function POST(
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

    // Parse request body to get machine ID
    const { machineId } = await request.json();
    if (!machineId) {
      return NextResponse.json(
        { error: 'Machine ID is required' },
        { status: 400 }
      );
    }

    // Publish the review
    const result = await claudeService.createFinalReview(draftId, machineId);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Error publishing review:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred while publishing the review' },
      { status: 500 }
    );
  }
} 