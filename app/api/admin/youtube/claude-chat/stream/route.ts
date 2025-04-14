import { NextRequest } from 'next/server';
import { ClaudeService, ClaudeModel } from '@/lib/services/claude-service';
import { createAdminClient } from '@/lib/supabase/admin';

const supabaseAdmin = createAdminClient();

// Define the message type
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export async function POST(request: NextRequest) {
  try {
    const { draftId, message, model, context, messages } = await request.json();

    // Validate required fields
    if (!draftId || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: draftId and message are required' }),
        { status: 400 }
      );
    }

    // Check if model is valid (fallback to claude-3-5-sonnet-20241022 if not)
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
      return new Response(
        JSON.stringify({ error: `Error fetching draft: ${draftError.message}` }),
        { status: 500 }
      );
    }

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

    // Initialize formatted user messages array (excluding system message)
    const userMessages = messages.filter((msg: ChatMessage) => msg.role !== 'system');
    
    // Add the current user message
    userMessages.push({
      role: 'user',
      content: message
    });

    // Record the user message in the database immediately
    let partialConversationData = {
      draft_id: draftId,
      messages: [...messages, {
        role: 'user',
        content: message,
        timestamp: new Date()
      }],
      model: selectedModel,
      metadata: {
        last_context: context ? true : false,
        streaming: true
      },
      updated_at: new Date()
    };

    // Check if the conversation already exists and update it with the user message
    const { data: existingConversation } = await supabaseAdmin
      .from('claude_conversations')
      .select('id')
      .eq('draft_id', draftId)
      .maybeSingle();

    let conversationId;
    if (existingConversation) {
      conversationId = existingConversation.id;
      await supabaseAdmin
        .from('claude_conversations')
        .update(partialConversationData)
        .eq('id', existingConversation.id);
    } else {
      const { data: newConversation } = await supabaseAdmin
        .from('claude_conversations')
        .insert(partialConversationData)
        .select('id')
        .single();
      
      if (!newConversation) {
        throw new Error('Failed to create new conversation');
      }
      
      conversationId = newConversation.id;
    }

    // Stream the response
    let stream;
    if (transcript && transcript.length > 0) {
      console.log('Using transcript caching with streaming for Claude API call');
      stream = await claudeService.sendChatMessageWithTranscriptCachingStream(
        userMessages,
        fullSystemMessage,
        transcript
      );
    } else {
      console.log('No transcript available, using regular streaming API call');
      // Add system message if needed
      if (!userMessages.some(msg => msg.role === 'system')) {
        userMessages.unshift({
          role: 'system',
          content: fullSystemMessage
        });
      }
      
      stream = await claudeService.sendChatMessageStream(userMessages);
    }

    // Maintain the full response to save later
    let fullResponse = '';
    
    // Create a transform stream to parse the SSE data and extract content
    const transformStream = new TransformStream({
      transform: async (chunk, controller) => {
        // Convert chunk to text
        const text = new TextDecoder().decode(chunk);
        
        try {
          // The stream is a series of JSON objects, each starting with "data: "
          const lines = text.split('\n').filter(line => line.trim() !== '');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonData = line.slice(5); // Remove "data: " prefix
              
              // Check for [DONE] which indicates the end of the stream
              if (jsonData.trim() === '[DONE]') {
                // Save the complete conversation at the end of streaming
                const finalConversationData = {
                  messages: [...partialConversationData.messages, {
                    role: 'assistant',
                    content: fullResponse,
                    timestamp: new Date()
                  }],
                  metadata: {
                    ...partialConversationData.metadata,
                    streaming: false,
                    streaming_completed: true
                  },
                  updated_at: new Date()
                };
                
                await supabaseAdmin
                  .from('claude_conversations')
                  .update(finalConversationData)
                  .eq('id', conversationId);
                
                console.log('Streaming complete, saved conversation to database');
                controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
                return;
              }
              
              try {
                const parsedData = JSON.parse(jsonData);
                
                if (parsedData.type === 'content_block_delta' || 
                    parsedData.type === 'message_delta') {
                  if (parsedData.delta && parsedData.delta.text) {
                    const content = parsedData.delta.text;
                    fullResponse += content;
                    
                    // Send the content chunk to the client
                    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
                  }
                }
              } catch (parseError) {
                console.error('Error parsing SSE JSON:', parseError);
              }
            }
          }
        } catch (error) {
          console.error('Error processing stream chunk:', error);
          controller.error(error);
        }
      }
    });

    // Return the transformed stream
    const readableStream = stream.pipeThrough(transformStream);
    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
    
  } catch (error: any) {
    console.error('Error processing streaming chat request:', error);
    return new Response(
      JSON.stringify({ error: `Error processing streaming chat request: ${error.message}` }),
      { status: 500 }
    );
  }
} 