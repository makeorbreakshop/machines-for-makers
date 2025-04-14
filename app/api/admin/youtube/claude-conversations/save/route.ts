import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const supabaseAdmin = createAdminClient();

export async function POST(request: NextRequest) {
  try {
    const { draftId, messages, model, metadata } = await request.json();

    // Validate required fields
    if (!draftId || !messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Missing required fields: draftId and messages array are required' },
        { status: 400 }
      );
    }

    // Check if a conversation already exists for this draft
    const { data: existingConversation } = await supabaseAdmin
      .from('claude_conversations')
      .select('id')
      .eq('draft_id', draftId)
      .maybeSingle();

    const conversationData = {
      draft_id: draftId,
      messages,
      model: model || 'claude-3-7-sonnet-20240620',
      metadata: metadata || {},
      updated_at: new Date()
    };

    let result;

    if (existingConversation) {
      // Update existing conversation
      const { data, error } = await supabaseAdmin
        .from('claude_conversations')
        .update(conversationData)
        .eq('id', existingConversation.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating conversation:', error);
        return NextResponse.json(
          { error: `Error updating conversation: ${error.message}` },
          { status: 500 }
        );
      }

      result = data;
    } else {
      // Create new conversation
      const { data, error } = await supabaseAdmin
        .from('claude_conversations')
        .insert({
          ...conversationData,
          created_at: new Date()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating conversation:', error);
        return NextResponse.json(
          { error: `Error creating conversation: ${error.message}` },
          { status: 500 }
        );
      }

      result = data;
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error saving conversation:', error);
    return NextResponse.json(
      { error: `Error saving conversation: ${error.message}` },
      { status: 500 }
    );
  }
} 