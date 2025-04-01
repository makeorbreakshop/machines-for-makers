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

    const draftId = params.id;
    if (!draftId) {
      return NextResponse.json(
        { error: 'Draft ID is required' },
        { status: 400 }
      );
    }

    // Generate review content using Claude
    const result = await claudeService.generateReviewContent(draftId);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Error generating review content:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred while generating the review content' },
      { status: 500 }
    );
  }
} 