import { createAdminClient } from '@/lib/supabase/admin';

const supabaseAdmin = createAdminClient();

// Claude model pricing (per 1M tokens, in USD)
const CLAUDE_PRICING = {
  'claude-3-opus-20240229': {
    input: 15.0, // $15 per 1M input tokens
    output: 75.0 // $75 per 1M output tokens
  },
  'claude-3-sonnet-20240229': {
    input: 3.0, // $3 per 1M input tokens
    output: 15.0 // $15 per 1M output tokens
  },
  'claude-3-haiku-20240307': {
    input: 0.25, // $0.25 per 1M input tokens
    output: 1.25 // $1.25 per 1M output tokens
  },
  'claude-3-5-sonnet-20240620': {
    input: 3.0, // $3 per 1M input tokens
    output: 15.0 // $15 per 1M output tokens
  },
  'claude-3-5-sonnet-20241022': {
    input: 3.0, // $3 per 1M input tokens
    output: 15.0 // $15 per 1M output tokens
  },
  'claude-3-5-haiku-20241022': {
    input: 0.80, // $0.80 per 1M input tokens
    output: 4.0 // $4.00 per 1M output tokens
  },
  'claude-3-7-sonnet-20250219': {
    input: 3.0, // $3 per 1M input tokens
    output: 15.0 // $15 per 1M output tokens
  }
};

export type ClaudeModel = 'claude-3-opus-20240229' | 'claude-3-sonnet-20240229' | 'claude-3-haiku-20240307' | 'claude-3-5-sonnet-20240620' | 'claude-3-5-sonnet-20241022' | 'claude-3-5-haiku-20241022' | 'claude-3-7-sonnet-20250219';

export interface PriceEstimate {
  inputTokens: number;
  outputTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

export class ClaudeService {
  private apiKey: string;
  private baseUrl: string = 'https://api.anthropic.com/v1';
  private model: ClaudeModel = 'claude-3-opus-20240229';

  constructor(model?: ClaudeModel) {
    // Get API key from environment variables
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    this.apiKey = apiKey;
    
    // Set model if provided
    if (model) {
      this.model = model;
    }
  }

  /**
   * Set the model to use for API calls
   * @param model - The Claude model to use
   */
  setModel(model: ClaudeModel) {
    this.model = model;
  }

  /**
   * Get the current model being used
   * @returns The current Claude model
   */
  getModel(): ClaudeModel {
    return this.model;
  }

  /**
   * Estimate the cost of a Claude API call
   * @param promptLength - Length of the prompt in tokens (estimated)
   * @param expectedResponseLength - Expected length of the response in tokens
   * @returns The estimated cost breakdown
   */
  estimateCost(promptLength: number, expectedResponseLength: number): PriceEstimate {
    const pricing = CLAUDE_PRICING[this.model];
    
    // Convert to millions of tokens for pricing calculation
    const inputTokensInMillions = promptLength / 1000000;
    const outputTokensInMillions = expectedResponseLength / 1000000;
    
    const inputCost = inputTokensInMillions * pricing.input;
    const outputCost = outputTokensInMillions * pricing.output;
    
    return {
      inputTokens: promptLength,
      outputTokens: expectedResponseLength,
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost
    };
  }

  /**
   * Generate a review structure based on video transcript and chapters
   * @param videoId - UUID of the YouTube video
   * @param model - Optional model to use for this call
   * @returns The generated review structure and cost estimate
   */
  async generateReviewStructure(videoId: string, model?: ClaudeModel) {
    // Set model for this call if provided
    const originalModel = this.model;
    if (model) {
      this.model = model;
    }
    
    try {
      console.log(`Starting structure generation for video: ${videoId}, model: ${this.model}`);
      
      // Get video data including transcript and chapters
      const { data: video, error: videoError } = await supabaseAdmin
        .from('youtube_videos')
        .select('*')
        .eq('id', videoId)
        .single();

      if (videoError || !video) {
        console.error('Failed to get video data:', videoError?.message || 'Video not found');
        throw new Error(`Failed to get video data: ${videoError?.message || 'Video not found'}`);
      }
      
      console.log(`Retrieved video data for: ${video.title}`);

      // Get transcript
      const { data: transcript, error: transcriptError } = await supabaseAdmin
        .from('transcripts')
        .select('content')
        .eq('youtube_video_id', videoId)
        .single();

      if (transcriptError || !transcript || !transcript.content) {
        console.error('Failed to get transcript:', transcriptError?.message || 'Transcript not found or empty');
        throw new Error(`Failed to get transcript: ${transcriptError?.message || 'Transcript not found or empty'}`);
      }
      
      console.log(`Retrieved transcript, length: ${transcript.content.length} characters`);

      // Prepare prompt for Claude
      const prompt = this.createStructurePrompt(video, transcript.content);
      
      // Estimate tokens for prompt (rough estimate: 1 token ≈ 4 characters)
      const promptTokens = Math.ceil(prompt.length / 4);
      const expectedResponseTokens = 2000; // Expected response size
      
      // Estimate cost
      const costEstimate = this.estimateCost(promptTokens, expectedResponseTokens);
      
      console.log(`Prompt prepared, estimated tokens: ${promptTokens}, calling Claude API...`);
      
      // Call Claude API
      const generatedStructure = await this.callClaudeAPI(prompt);
      
      console.log(`Claude API responded, structure generated. Length: ${generatedStructure.length} characters`);

      // Process the generated structure to ensure it's valid JSON
      let parsedStructure;
      try {
        // First check if it's already valid JSON
        try {
          parsedStructure = JSON.parse(generatedStructure);
          console.log('Structure successfully parsed as JSON');
        } catch (jsonError) {
          console.log('Structure is not direct JSON, checking for JSON code blocks...');
          // Try to extract JSON from markdown code blocks
          const jsonMatch = generatedStructure.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (jsonMatch && jsonMatch[1]) {
            try {
              parsedStructure = JSON.parse(jsonMatch[1]);
              console.log('JSON successfully extracted from code block and parsed');
            } catch (err) {
              console.error('Failed to parse JSON from code block:', err);
              throw new Error('Generated structure contains code block but not valid JSON');
            }
          } else {
            console.error('No JSON code blocks found in response');
            throw new Error('Generated structure is not valid JSON and does not contain code blocks');
          }
        }
      } catch (parseError) {
        console.error('Error parsing generated structure:', parseError);
        
        // Fall back to a default structure if parsing fails
        console.log('Using default structure as fallback');
        parsedStructure = {
          introduction: { 
            title: "Introduction",
            key_points: ["Overview of the laser machine", "Key specifications", "Target audience"]
          },
          specifications: { 
            title: "Specifications and Features",
            key_points: ["Technical specifications", "Software compatibility", "Key features"]
          },
          strengths: { 
            title: "Key Strengths",
            key_points: ["Main advantages", "Notable features", "Performance highlights"]
          },
          weaknesses: { 
            title: "Limitations",
            key_points: ["Main drawbacks", "Areas for improvement"]
          },
          conclusion: { 
            title: "Conclusion",
            key_points: ["Overall assessment", "Recommendations", "Value proposition"]
          }
        };
      }

      // Store the generated structure (as a draft)
      const { data: draft, error: draftError } = await supabaseAdmin
        .from('review_drafts')
        .insert({
          youtube_video_id: videoId,
          structure: parsedStructure,
          generation_status: 'structure_generated',
          version: 1,
          metadata: {
            model: this.model,
            cost_estimate: costEstimate
          }
        })
        .select()
        .single();

      if (draftError) {
        console.error('Failed to store review draft:', draftError);
        throw new Error(`Failed to store review draft: ${draftError.message}`);
      }
      
      console.log(`Draft created with ID: ${draft.id}`);

      // Reset model if it was temporarily changed
      if (model) {
        this.model = originalModel;
      }

      return {
        ...draft,
        cost_estimate: costEstimate
      };
    } catch (error: any) {
      console.error('Error generating review structure:', error);
      
      // Reset model if it was temporarily changed
      if (model) {
        this.model = originalModel;
      }
      
      throw error;
    }
  }

  /**
   * Generate the full review content based on approved structure
   * @param draftId - UUID of the review draft
   * @returns The generated review content
   */
  async generateReviewContent(draftId: string) {
    // Save original model to restore later if needed
    const originalModel = this.model;
    
    try {
      // Get draft data
      const { data: draft, error: draftError } = await supabaseAdmin
        .from('review_drafts')
        .select('*, youtube_videos(*)')
        .eq('id', draftId)
        .single();

      if (draftError || !draft) {
        throw new Error(`Failed to get draft data: ${draftError?.message || 'Draft not found'}`);
      }

      // Get transcript
      const { data: transcript, error: transcriptError } = await supabaseAdmin
        .from('transcripts')
        .select('content')
        .eq('youtube_video_id', draft.youtube_video_id)
        .single();

      if (transcriptError || !transcript) {
        throw new Error(`Failed to get transcript: ${transcriptError?.message || 'Transcript not found'}`);
      }

      // Check if the draft has a model stored in metadata, and use it if it exists
      if (draft.metadata?.model) {
        this.model = draft.metadata.model;
      }

      // Prepare prompt for Claude
      const prompt = this.createContentPrompt(draft, transcript.content);
      
      // Estimate tokens for prompt
      const promptTokens = Math.ceil(prompt.length / 4);
      const expectedResponseTokens = 15000; // Content generation has longer responses
      
      // Estimate cost
      const costEstimate = this.estimateCost(promptTokens, expectedResponseTokens);
      
      // Call Claude API
      const generatedContent = await this.callClaudeAPI(prompt);

      // Update the draft with generated content
      const { data: updatedDraft, error: updateError } = await supabaseAdmin
        .from('review_drafts')
        .update({
          content: generatedContent,
          generation_status: 'content_generated',
          updated_at: new Date().toISOString(),
          metadata: {
            ...draft.metadata,
            model: this.model,
            content_cost_estimate: costEstimate
          }
        })
        .eq('id', draftId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update review draft: ${updateError.message}`);
      }

      // Restore original model
      this.model = originalModel;

      return {
        ...updatedDraft,
        cost_estimate: costEstimate
      };
    } catch (error: any) {
      console.error('Error generating review content:', error);
      
      // Restore original model
      this.model = originalModel;
      
      throw error;
    }
  }

  /**
   * Create a final review from approved draft
   * @param draftId - UUID of the review draft
   * @param machineId - UUID of the machine being reviewed
   * @returns The created review
   */
  async createFinalReview(draftId: string, machineId: string) {
    try {
      // Get draft data
      const { data: draft, error: draftError } = await supabaseAdmin
        .from('review_drafts')
        .select('*')
        .eq('id', draftId)
        .single();

      if (draftError || !draft) {
        throw new Error(`Failed to get draft data: ${draftError?.message || 'Draft not found'}`);
      }

      // Extract pros and cons from the draft content
      const { pros, cons } = this.extractProsAndCons(draft.content);

      // Create the final review
      const { data: review, error: reviewError } = await supabaseAdmin
        .from('reviews')
        .insert({
          machine_id: machineId,
          youtube_video_id: draft.youtube_video_id,
          title: draft.title || 'YouTube Review',
          content: draft.content,
          author: 'Make or Break Shop',
          rating: draft.rating || 4,
          pros: pros,
          cons: cons,
          is_ai_generated: true,
          generation_status: 'published',
          verified_purchase: true,
          helpful_votes: 0,
          featured: true
        })
        .select()
        .single();

      if (reviewError) {
        throw new Error(`Failed to create review: ${reviewError.message}`);
      }

      // Update the draft status
      await supabaseAdmin
        .from('review_drafts')
        .update({
          generation_status: 'published',
          updated_at: new Date().toISOString()
        })
        .eq('id', draftId);

      return review;
    } catch (error: any) {
      console.error('Error creating final review:', error);
      throw error;
    }
  }

  /**
   * Extract pros and cons from the review content
   * @param content - The review content
   * @returns Object containing pros and cons arrays
   */
  private extractProsAndCons(content: string): { pros: string[], cons: string[] } {
    // This is a simple implementation - could be improved with a more sophisticated approach
    const pros: string[] = [];
    const cons: string[] = [];

    // Look for pros and cons sections in the content
    const prosSection = content.match(/pros:?\s*\n([\s\S]*?)(?=\n\s*cons:|\n\s*drawbacks:|\n\s*conclusion:|\n\s*summary:|\n\s*verdict:|\n\s*final thoughts:|\n\s*$)/i);
    const consSection = content.match(/(?:cons|drawbacks):?\s*\n([\s\S]*?)(?=\n\s*pros:|\n\s*conclusion:|\n\s*summary:|\n\s*verdict:|\n\s*final thoughts:|\n\s*$)/i);

    if (prosSection && prosSection[1]) {
      // Split by bullet points or numbered lists
      const prosList = prosSection[1].split(/\n\s*[-•*]|\n\s*\d+\.\s+/);
      pros.push(...prosList.filter(item => item.trim().length > 0).map(item => item.trim()));
    }

    if (consSection && consSection[1]) {
      // Split by bullet points or numbered lists
      const consList = consSection[1].split(/\n\s*[-•*]|\n\s*\d+\.\s+/);
      cons.push(...consList.filter(item => item.trim().length > 0).map(item => item.trim()));
    }

    return { pros, cons };
  }

  /**
   * Create a prompt for generating review structure
   * @param video - YouTube video data
   * @param transcript - Video transcript
   * @returns Prompt for Claude API
   */
  private createStructurePrompt(video: any, transcript: string): string {
    return `
You are an expert laser machine reviewer helping to create a structured review outline for a YouTube video review. 

# VIDEO INFORMATION
Title: ${video.title}
Description: ${video.description}
${video.chapters ? `Chapters: ${JSON.stringify(video.chapters, null, 2)}` : ''}

# TRANSCRIPT
${transcript.substring(0, 15000)}  // Truncate if needed

# TASK
Analyze the transcript thoroughly and create a structured outline for a professional review of the laser machine featured in this video. The outline should be comprehensive and reflect the specific content of this review.

Your analysis should consider:
1. Key technical specifications mentioned in the transcript
2. Unique features of this specific machine that deserve emphasis
3. Strengths and limitations as highlighted by the reviewer
4. Practical use cases and ideal customer profiles mentioned
5. Comparisons with competitors or alternative machines
6. The reviewer's overall assessment and recommendations

Your structure should include these standard sections (but can be modified based on the transcript content):
1. Introduction
2. Specifications and Features
3. Key Strengths (3-5 points)
4. Limitations or Drawbacks (2-4 points)
5. Use Cases and Ideal Customers
6. Value for Money Assessment
7. Conclusion with Overall Recommendation

For each section, provide 2-3 bullet points of key information to include, based on the transcript content.

Only include factual information mentioned in the transcript. Do not invent specifications or details not present in the source material.

Format your response as a structured JSON object with these sections clearly defined, like this example:
{
  "introduction": {
    "title": "Introduction",
    "key_points": [
      "Brief overview of the [Machine Name]",
      "Context about the manufacturer",
      "Main value proposition"
    ]
  },
  "specifications": {
    "title": "Specifications and Features",
    "key_points": [
      "Technical specs (power, size, etc.)",
      "Software compatibility",
      "Unique features compared to competitors"
    ]
  }
}

The structure should be comprehensive but focused on the most important aspects mentioned in this specific review.
`;
  }

  /**
   * Create a prompt for generating full review content
   * @param draft - Review draft data
   * @param transcript - Video transcript
   * @returns Prompt for Claude API
   */
  private createContentPrompt(draft: any, transcript: string): string {
    return `
You are an expert laser machine reviewer writing content for MachinesForMakers.com. Your task is to create a comprehensive, detailed review based on the approved structure and video transcript.

# APPROVED STRUCTURE
${JSON.stringify(draft.structure, null, 2)}

# VIDEO INFORMATION
Title: ${draft.youtube_videos.title}
Description: ${draft.youtube_videos.description}
${draft.youtube_videos.chapters ? `Chapters: ${JSON.stringify(draft.youtube_videos.chapters, null, 2)}` : ''}

# TRANSCRIPT
${transcript.substring(0, 15000)}  // Truncate if needed

# TASK
Write a complete, professional review following the approved structure. Your review should:

1. Be comprehensive and detailed while remaining factual and based on the transcript
2. Use a conversational but professional tone, similar to Brandon (the host)
3. Include specific examples and quotes from the video where relevant
4. Organize information clearly with appropriate headers and subheaders
5. Highlight pros and cons clearly in dedicated sections
6. Include a clear conclusion with recommendations
7. Match the style of MachinesForMakers.com

Format the content using Markdown syntax, with appropriate headers, lists, and emphasis.
`;
  }

  /**
   * Make an API call to Claude
   * @param prompt - The prompt to send to Claude
   * @returns Claude's response
   */
  private async callClaudeAPI(prompt: string): Promise<string> {
    try {
      // Verify the model ID is valid
      const validModels: ClaudeModel[] = [
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307',
        'claude-3-5-sonnet-20240620',
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022',
        'claude-3-7-sonnet-20250219'
      ];
      
      // Default to claude-3-5-sonnet if the current model is invalid
      if (!validModels.includes(this.model)) {
        console.warn(`Invalid model ID: ${this.model}. Defaulting to claude-3-5-sonnet.`);
        this.model = 'claude-3-5-sonnet-20241022';
      }
      
      console.log(`Calling Claude API with model: ${this.model}, prompt length: ${prompt.length}`);
      
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 4000,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error(`Claude API error (${response.status}):`, errorData);
        throw new Error(`Claude API error (${response.status}): ${errorData}`);
      }

      const data = await response.json();
      
      // Verify the data structure
      if (!data || !data.content || !Array.isArray(data.content) || data.content.length === 0) {
        console.error('Invalid response structure from Claude API:', JSON.stringify(data));
        throw new Error('Invalid response structure from Claude API');
      }
      
      // Extract the text from the first content item
      const text = data.content[0]?.text;
      if (!text) {
        console.error('No text content in Claude API response:', JSON.stringify(data));
        throw new Error('No text content in Claude API response');
      }
      
      return text;
    } catch (error: any) {
      console.error('Error calling Claude API:', error);
      throw new Error(`Error calling Claude API: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Generate content for a specific section of a review
   * @param draftId - UUID of the review draft
   * @param section - Section name to generate content for
   * @param additionalContext - Optional additional context to include
   * @returns The updated draft with the generated section content
   */
  async generateSectionContent(draftId: string, section: string, additionalContext?: string) {
    // Save original model to restore later if needed
    const originalModel = this.model;
    
    try {
      // Get draft data
      const { data: draft, error: draftError } = await supabaseAdmin
        .from('review_drafts')
        .select('*, youtube_videos(*)')
        .eq('id', draftId)
        .single();

      if (draftError || !draft) {
        throw new Error(`Failed to get draft data: ${draftError?.message || 'Draft not found'}`);
      }

      // Get transcript
      const { data: transcript, error: transcriptError } = await supabaseAdmin
        .from('transcripts')
        .select('content')
        .eq('youtube_video_id', draft.youtube_video_id)
        .single();

      if (transcriptError || !transcript) {
        throw new Error(`Failed to get transcript: ${transcriptError?.message || 'Transcript not found'}`);
      }

      // Check if the draft has a model stored in metadata, and use it if it exists
      if (draft.metadata?.model) {
        this.model = draft.metadata.model;
      }

      // Validate section exists in structure
      const structure = typeof draft.structure === 'string' 
        ? JSON.parse(draft.structure) 
        : draft.structure;
      
      if (!structure[section]) {
        throw new Error(`Section "${section}" not found in the review structure`);
      }

      // Prepare prompt for Claude
      const prompt = this.createSectionContentPrompt(draft, transcript.content, section, additionalContext);
      
      // Estimate tokens for prompt
      const promptTokens = Math.ceil(prompt.length / 4);
      const expectedResponseTokens = 5000; // Section generation has medium-length responses
      
      // Estimate cost
      const costEstimate = this.estimateCost(promptTokens, expectedResponseTokens);
      
      // Call Claude API
      const generatedContent = await this.callClaudeAPI(prompt);

      // Update the existing content with the new section content
      let updatedContent = draft.content || '';
      
      // If we have existing content, try to replace just the specific section
      if (updatedContent) {
        // This is a simplified approach - a more robust implementation would use a proper HTML parser
        const sectionRegex = new RegExp(`<h[1-6][^>]*>${section}[\\s\\S]*?(?=<h[1-6][^>]*>|$)`, 'i');
        const sectionMatch = updatedContent.match(sectionRegex);
        
        if (sectionMatch) {
          // Replace just the section content
          updatedContent = updatedContent.replace(sectionRegex, generatedContent);
        } else {
          // Append the new section content
          updatedContent += generatedContent;
        }
      } else {
        // No existing content, use the generated content directly
        updatedContent = generatedContent;
      }

      // Prepare section costs history
      const sectionCosts = draft.metadata?.section_costs || {};
      sectionCosts[section] = costEstimate;

      // Update the draft with generated content
      const { data: updatedDraft, error: updateError } = await supabaseAdmin
        .from('review_drafts')
        .update({
          content: updatedContent,
          generation_status: 'content_generated',
          updated_at: new Date().toISOString(),
          metadata: {
            ...draft.metadata,
            model: this.model,
            section_costs: sectionCosts
          }
        })
        .eq('id', draftId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update review draft: ${updateError.message}`);
      }

      // Restore original model
      this.model = originalModel;

      return {
        ...updatedDraft,
        cost_estimate: costEstimate
      };
    } catch (error: any) {
      console.error(`Error generating section content for ${section}:`, error);
      
      // Restore original model
      this.model = originalModel;
      
      throw error;
    }
  }

  /**
   * Create a section content prompt from the review draft, transcript, and specific section
   * @private
   */
  private createSectionContentPrompt(draft: any, transcript: string, section: string, additionalContext?: string): string {
    // Extract the structure for the specific section
    const structure = typeof draft.structure === 'string' 
      ? JSON.parse(draft.structure) 
      : draft.structure;
    
    const sectionStructure = structure[section];

    return `
You are an expert laser machine reviewer writing content for MachinesForMakers.com. Your task is to create content for the "${section}" section of a review based on the video transcript.

# SECTION STRUCTURE
${JSON.stringify(sectionStructure, null, 2)}

# VIDEO INFORMATION
Title: ${draft.youtube_videos.title}
Description: ${draft.youtube_videos.description}
${draft.youtube_videos.chapters ? `Chapters: ${JSON.stringify(draft.youtube_videos.chapters, null, 2)}` : ''}

# TRANSCRIPT
${transcript.substring(0, 15000)}  // Truncate if needed

${additionalContext ? `# ADDITIONAL CONTEXT\n${additionalContext}\n` : ''}

# TASK
Write the "${section}" section of a laser machine review. Your content should:

1. Specifically address only the "${section}" section, as this will be inserted into a larger review
2. Be comprehensive and detailed while remaining factual and based on the transcript
3. Use a conversational but professional tone, similar to Brandon (the host)
4. Include specific examples and quotes from the video where relevant
5. Follow the structure outline provided above for this section
6. Match the style of MachinesForMakers.com

Start with an appropriate heading for this section and format the content using Markdown syntax with appropriate lists and emphasis.
`;
  }

  /**
   * Send a chat-style message to Claude API
   * @param messages - Array of messages in the chat history
   * @returns Claude's response text
   */
  async sendChatMessage(messages: Array<{role: string, content: string}>): Promise<string> {
    try {
      // Verify the model ID is valid
      const validModels: ClaudeModel[] = [
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307',
        'claude-3-5-sonnet-20240620',
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022',
        'claude-3-7-sonnet-20250219'
      ];
      
      // Default to claude-3-5-sonnet if the current model is invalid
      if (!validModels.includes(this.model)) {
        console.warn(`Invalid model ID: ${this.model}. Defaulting to claude-3-5-sonnet.`);
        this.model = 'claude-3-5-sonnet-20241022';
      }
      
      console.log(`Sending chat message to Claude API with model: ${this.model}`);
      
      // Extract system message if present
      const systemMessage = messages.find(msg => msg.role === 'system');
      
      // Filter out system message from regular messages array
      const filteredMessages = messages.filter(msg => msg.role !== 'system');
      
      const requestBody: any = {
        model: this.model,
        max_tokens: 16000, // Increased from 4000 to 16000 for larger responses
        messages: filteredMessages.map(msg => ({
          role: msg.role,
          content: [{ type: "text", text: msg.content }]
        }))
      };
      
      // Add system message as a separate parameter if it exists
      if (systemMessage) {
        requestBody.system = [{ type: "text", text: systemMessage.content }];
      }
      
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error(`Claude API error (${response.status}):`, errorData);
        throw new Error(`Claude API error (${response.status}): ${errorData}`);
      }

      const data = await response.json();
      
      // Verify the data structure
      if (!data || !data.content || !Array.isArray(data.content) || data.content.length === 0) {
        console.error('Invalid response structure from Claude API:', JSON.stringify(data));
        throw new Error('Invalid response structure from Claude API');
      }
      
      // Extract the text from the first content item
      const text = data.content[0]?.text;
      if (!text) {
        console.error('No text content in Claude API response:', JSON.stringify(data));
        throw new Error('No text content in Claude API response');
      }
      
      return text;
    } catch (error: any) {
      console.error('Error calling Claude API in chat mode:', error);
      throw new Error(`Error calling Claude API in chat mode: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Send a chat-style message to Claude API with prompt caching for transcript
   * This reduces costs by caching the transcript context between requests
   * @param messages - Array of regular chat messages
   * @param systemMessage - Base system instructions
   * @param transcript - The transcript to be cached
   * @returns Claude's response text and usage information
   */
  async sendChatMessageWithTranscriptCaching(
    messages: Array<{role: string, content: string}>,
    systemMessage: string,
    transcript: string
  ): Promise<{text: string, usage?: any}> {
    try {
      // Verify the model ID is valid
      const validModels: ClaudeModel[] = [
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307',
        'claude-3-5-sonnet-20240620',
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022',
        'claude-3-7-sonnet-20250219'
      ];
      
      // Default to claude-3-5-sonnet if the current model is invalid
      if (!validModels.includes(this.model)) {
        console.warn(`Invalid model ID: ${this.model}. Defaulting to claude-3-5-sonnet.`);
        this.model = 'claude-3-5-sonnet-20241022';
      }
      
      console.log(`Sending chat message with transcript caching to Claude API with model: ${this.model}`);
      
      // Check if model supports prompt caching
      const supportedCachingModels = [
        'claude-3-7-sonnet-20250219',
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022',
        'claude-3-5-sonnet-20240620',
        'claude-3-haiku-20240307',
        'claude-3-opus-20240229'
      ];
      
      if (!supportedCachingModels.includes(this.model)) {
        console.warn('Selected model does not support prompt caching, falling back to regular method');
        const result = await this.sendChatMessage([
          { role: 'system', content: `${systemMessage}\n\n# TRANSCRIPT\n${transcript}` },
          ...messages
        ]);
        return { text: result };
      }
      
      // Format the system message with cache control
      const formattedSystem = {
        type: "text",
        text: systemMessage
      };
      
      // Format the transcript with cache control
      const formattedTranscript = {
        type: "text",
        text: `# TRANSCRIPT\n${transcript}`,
        cache_control: { type: "ephemeral" }
      };
      
      // Format the conversation messages
      const formattedMessages = messages.map(msg => ({
        role: msg.role,
        content: [{ type: "text", text: msg.content }]
      }));
      
      // Prepare the request body using the standard messages endpoint with cache control
      const requestBody = {
        model: this.model,
        max_tokens: 16000,
        system: [formattedSystem, formattedTranscript],
        messages: formattedMessages
      };
      
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error(`Claude API error (${response.status}):`, errorData);
        
        // If prompt caching fails, fall back to the regular API
        console.warn('Prompt caching failed, falling back to regular method');
        const fallbackResult = await this.sendChatMessage([
          { role: 'system', content: `${systemMessage}\n\n# TRANSCRIPT\n${transcript}` },
          ...messages
        ]);
        return { text: fallbackResult };
      }

      const data = await response.json();
      
      // Verify the data structure
      if (!data || !data.content || !Array.isArray(data.content) || data.content.length === 0) {
        console.error('Invalid response structure from Claude API:', JSON.stringify(data));
        throw new Error('Invalid response structure from Claude API');
      }
      
      // Extract the text from the first content item
      const text = data.content[0]?.text;
      if (!text) {
        console.error('No text content in Claude API response:', JSON.stringify(data));
        throw new Error('No text content in Claude API response');
      }
      
      // Log caching information if available
      if (data.usage) {
        const cacheRead = data.usage.cache_read_input_tokens || 0;
        const cacheCreation = data.usage.cache_creation_input_tokens || 0;
        console.log(`Prompt caching stats - Cache read: ${cacheRead} tokens, Cache creation: ${cacheCreation} tokens`);
      }
      
      return { 
        text, 
        usage: data.usage
      };
    } catch (error: any) {
      console.error('Error calling Claude API with transcript caching:', error);
      throw new Error(`Error calling Claude API with transcript caching: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Send a chat-style message to Claude API with streaming response
   * @param messages - Array of messages in the chat history
   * @returns A ReadableStream of the Claude response
   */
  async sendChatMessageStream(messages: Array<{role: string, content: string}>): Promise<ReadableStream<Uint8Array>> {
    try {
      // Verify the model ID is valid
      const validModels: ClaudeModel[] = [
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307',
        'claude-3-5-sonnet-20240620',
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022',
        'claude-3-7-sonnet-20250219'
      ];
      
      // Default to claude-3-5-sonnet if the current model is invalid
      if (!validModels.includes(this.model)) {
        console.warn(`Invalid model ID: ${this.model}. Defaulting to claude-3-5-sonnet.`);
        this.model = 'claude-3-5-sonnet-20241022';
      }
      
      console.log(`Sending streaming chat message to Claude API with model: ${this.model}`);
      
      // Extract system message if present
      const systemMessage = messages.find(msg => msg.role === 'system');
      
      // Filter out system message from regular messages array
      const filteredMessages = messages.filter(msg => msg.role !== 'system');
      
      const requestBody: any = {
        model: this.model,
        max_tokens: 16000,
        stream: true,
        messages: filteredMessages.map(msg => ({
          role: msg.role,
          content: [{ type: "text", text: msg.content }]
        }))
      };
      
      // Add system message as a separate parameter if it exists
      if (systemMessage) {
        requestBody.system = [{ type: "text", text: systemMessage.content }];
      }
      
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error(`Claude API error (${response.status}):`, errorData);
        throw new Error(`Claude API error (${response.status}): ${errorData}`);
      }

      // Return the stream directly
      return response.body!;
    } catch (error: any) {
      console.error('Error calling Claude API in streaming mode:', error);
      throw new Error(`Error calling Claude API in streaming mode: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Send a chat-style message to Claude API with prompt caching and streaming for transcript
   * This reduces costs by caching the transcript context between requests
   * @param messages - Array of regular chat messages
   * @param systemMessage - Base system instructions
   * @param transcript - The transcript to be cached
   * @returns A ReadableStream of the Claude response and usage information
   */
  async sendChatMessageWithTranscriptCachingStream(
    messages: Array<{role: string, content: string}>,
    systemMessage: string,
    transcript: string
  ): Promise<ReadableStream<Uint8Array>> {
    try {
      // Verify the model ID is valid
      const validModels: ClaudeModel[] = [
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307',
        'claude-3-5-sonnet-20240620',
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022',
        'claude-3-7-sonnet-20250219'
      ];
      
      // Default to claude-3-5-sonnet if the current model is invalid
      if (!validModels.includes(this.model)) {
        console.warn(`Invalid model ID: ${this.model}. Defaulting to claude-3-5-sonnet.`);
        this.model = 'claude-3-5-sonnet-20241022';
      }
      
      console.log(`Sending streaming chat message with transcript caching to Claude API with model: ${this.model}`);
      
      // Check if model supports prompt caching
      const supportedCachingModels = [
        'claude-3-7-sonnet-20250219',
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022',
        'claude-3-5-sonnet-20240620',
        'claude-3-haiku-20240307',
        'claude-3-opus-20240229'
      ];
      
      if (!supportedCachingModels.includes(this.model)) {
        console.warn('Selected model does not support prompt caching, falling back to regular streaming method');
        return this.sendChatMessageStream([
          { role: 'system', content: `${systemMessage}\n\n# TRANSCRIPT\n${transcript}` },
          ...messages
        ]);
      }
      
      // Format the system message with cache control
      const formattedSystem = {
        type: "text",
        text: systemMessage
      };
      
      // Format the transcript with cache control
      const formattedTranscript = {
        type: "text",
        text: `# TRANSCRIPT\n${transcript}`,
        cache_control: { type: "ephemeral" }
      };
      
      // Format the conversation messages
      const formattedMessages = messages.map(msg => ({
        role: msg.role,
        content: [{ type: "text", text: msg.content }]
      }));
      
      // Prepare the request body using the standard messages endpoint with cache control
      const requestBody = {
        model: this.model,
        max_tokens: 16000,
        stream: true,
        system: [formattedSystem, formattedTranscript],
        messages: formattedMessages
      };
      
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error(`Claude API error (${response.status}):`, errorData);
        
        // If prompt caching fails, fall back to the regular streaming API
        console.warn('Prompt caching failed, falling back to regular streaming method');
        return this.sendChatMessageStream([
          { role: 'system', content: `${systemMessage}\n\n# TRANSCRIPT\n${transcript}` },
          ...messages
        ]);
      }

      // Return the stream directly
      return response.body!;
    } catch (error: any) {
      console.error('Error calling Claude API with transcript caching stream:', error);
      throw new Error(`Error calling Claude API with transcript caching stream: ${error.message || 'Unknown error'}`);
    }
  }
}

export default new ClaudeService(); 