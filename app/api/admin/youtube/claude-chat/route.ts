import { NextRequest, NextResponse } from 'next/server';
import { ClaudeService, ClaudeModel } from '@/lib/services/claude-service';
import { createAdminClient } from '@/lib/supabase/admin';

const supabaseAdmin = createAdminClient();

// Define the message type
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

interface ApiMessage {
  role: string;
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const { draftId, message, model, context, messages } = await request.json();

    // Validate required fields
    if (!draftId || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: draftId and message are required' },
        { status: 400 }
      );
    }

    // Check if model is valid (fallback to claude-3.5-sonnet-20240620 if not)
    const validModels: ClaudeModel[] = [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      'claude-3-5-sonnet-20240620',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-7-sonnet-20250219'
    ];
    
    const selectedModel = model && validModels.includes(model as ClaudeModel) 
      ? model as ClaudeModel 
      : 'claude-3-5-sonnet-20241022';

    // Initialize Claude service with the selected model
    const claudeService = new ClaudeService(selectedModel);

    // Get draft data
    const { data: draft, error: draftError } = await supabaseAdmin
      .from('review_drafts')
      .select('*, youtube_videos(*)')
      .eq('id', draftId)
      .single();

    if (draftError) {
      console.error('Error fetching draft:', draftError);
      return NextResponse.json(
        { error: `Error fetching draft: ${draftError.message}` },
        { status: 500 }
      );
    }

    // Format the conversation for Claude API
    const formattedMessages: ApiMessage[] = messages.map((msg: ChatMessage) => ({
      role: msg.role,
      content: msg.content
    }));

    // Create a system message if it doesn't exist in the provided messages
    const systemMessageContent = `You are an AI assistant specialized in helping users write high-quality laser machine reviews for MachinesForMakers.com. 
You have access to a video transcript and other information about a laser machine being reviewed.
Be helpful, concise, and focus on providing valuable content that would be useful in a review.
Your responses should be well-formatted and ready to be added to a review with minimal editing.
Focus on facts from the transcript and video, not speculation. If asked about something not in the data, admit it's not covered.
When creating content, use clear headings, bullet points, and organized paragraphs where appropriate.`;

    // Prepare transcript content if available
    let transcript = '';
    if (context && context.transcript) {
      transcript = context.transcript;
    }

    // Add video information to systemMessage if available
    let videoInfo = '';
    if (context && context.videoData) {
      videoInfo = `\n\n# VIDEO INFORMATION\nTitle: ${context.videoData.title || 'N/A'}\n`;
      
      if (context.videoData.description) {
        videoInfo += `Description: ${context.videoData.description}\n`;
      }
      
      if (context.videoData.chapters && Array.isArray(context.videoData.chapters)) {
        videoInfo += `Chapters: ${JSON.stringify(context.videoData.chapters, null, 2)}\n`;
      }
    }

    // Add videoInfo to systemMessage
    const fullSystemMessage = systemMessageContent + videoInfo;

    // Calculate estimated tokens for input
    const inputContent = [...formattedMessages.map(msg => msg.content), message, fullSystemMessage, transcript].join(' ');
    const inputTokens = Math.ceil(inputContent.length / 4); // Rough approximation
    
    // Estimate output tokens (rough approximation)
    const expectedOutputTokens = Math.min(inputTokens * 1.5, 4000); // Cap at 4k tokens
    
    // Get cost estimate
    let costEstimate = claudeService.estimateCost(inputTokens, expectedOutputTokens);

    // Initialize formatted user messages array (excluding system message)
    const userMessages = formattedMessages.filter(msg => msg.role !== 'system');
    
    // Add the current user message
    userMessages.push({
      role: 'user',
      content: message
    });

    // Call Claude API with the chat messages using transcript caching
    console.log(`Sending message to Claude with model ${selectedModel}, input tokens: ~${inputTokens}`);
    
    // Use the new caching API method if transcript is available
    let response, usage;
    if (transcript && transcript.length > 0) {
      console.log('Using transcript caching for Claude API call');
      const result = await claudeService.sendChatMessageWithTranscriptCaching(
        userMessages,
        fullSystemMessage,
        transcript
      );
      response = result.text;
      usage = result.usage;
      
      if (usage) {
        console.log('Claude API response with usage info:', usage);
        
        // Update cost estimate with actual usage if available
        if (usage.input_tokens && usage.output_tokens) {
          costEstimate = claudeService.estimateCost(usage.input_tokens, usage.output_tokens);
        }
      }
    } else {
      // Fallback to regular API if no transcript
      console.log('No transcript available, using regular Claude API call');
      
      // Add system message if needed
      if (!userMessages.some(msg => msg.role === 'system')) {
        userMessages.unshift({
          role: 'system',
          content: fullSystemMessage
        });
      }
      
      response = await claudeService.sendChatMessage(userMessages);
    }

    // Save conversation to the database
    const conversationData = {
      draft_id: draftId,
      messages: [...messages, {
        role: 'user',
        content: message,
        timestamp: new Date()
      }, {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      }],
      model: selectedModel,
      metadata: {
        last_context: context ? true : false,
        last_cost: costEstimate,
        usage: usage || null
      },
      updated_at: new Date()
    };

    // Check if the conversation already exists
    const { data: existingConversation } = await supabaseAdmin
      .from('claude_conversations')
      .select('id')
      .eq('draft_id', draftId)
      .maybeSingle();

    if (existingConversation) {
      // Update existing conversation
      await supabaseAdmin
        .from('claude_conversations')
        .update(conversationData)
        .eq('id', existingConversation.id);
    } else {
      // Create new conversation
      await supabaseAdmin
        .from('claude_conversations')
        .insert(conversationData);
    }

    return NextResponse.json({
      response,
      costEstimate,
      usage
    });
  } catch (error: any) {
    console.error('Error processing chat request:', error);
    return NextResponse.json(
      { error: `Error processing chat request: ${error.message}` },
      { status: 500 }
    );
  }
} 