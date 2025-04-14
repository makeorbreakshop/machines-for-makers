import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth-utils';
import { ClaudeService, ClaudeModel } from '@/lib/services/claude-service';
import { createAdminClient } from '@/lib/supabase/admin';

const supabaseAdmin = createAdminClient();
const claudeService = new ClaudeService();

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

    // Parse request body to get section and context if available
    const requestBody = await request.json().catch(() => ({}));
    const { section, context, model } = requestBody;

    // Get draft data
    const { data: draft, error: draftError } = await supabaseAdmin
      .from('review_drafts')
      .select('*')
      .eq('id', draftId)
      .single();

    if (draftError || !draft) {
      return NextResponse.json(
        { error: draftError?.message || 'Draft not found' },
        { status: 404 }
      );
    }

    // Set the model if provided
    if (model) {
      claudeService.setModel(model as ClaudeModel);
    }

    let result;
    if (section) {
      // Generate content for specific section
      result = await claudeService.generateSectionContent(draftId, section, context);
    } else {
      // Generate content for the entire review
      result = await claudeService.generateReviewContent(draftId);
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Error generating review content:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred while generating the review content' },
      { status: 500 }
    );
  }
} 