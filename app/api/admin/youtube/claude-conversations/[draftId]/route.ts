import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const supabaseAdmin = createAdminClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { draftId: string } }
) {
  try {
    const draftId = await params.draftId;

    if (!draftId) {
      return NextResponse.json(
        { error: 'Draft ID is required' },
        { status: 400 }
      );
    }

    // Fetch conversation from database
    const { data, error } = await supabaseAdmin
      .from('claude_conversations')
      .select('*')
      .eq('draft_id', draftId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching conversation:', error);
      return NextResponse.json(
        { error: `Error fetching conversation: ${error.message}` },
        { status: 500 }
      );
    }

    // If no conversation found, return empty message array
    if (!data) {
      return NextResponse.json({
        id: null,
        draftId,
        messages: [],
        model: 'claude-3-7',
      });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error retrieving conversation:', error);
    return NextResponse.json(
      { error: `Error retrieving conversation: ${error.message}` },
      { status: 500 }
    );
  }
} 