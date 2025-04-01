import { createAdminClient } from '@/lib/supabase/admin';

const supabaseAdmin = createAdminClient();

export class ClaudeService {
  private apiKey: string;
  private baseUrl: string = 'https://api.anthropic.com/v1';
  private model: string = 'claude-3-opus-20240229';

  constructor() {
    // Get API key from environment variables
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    this.apiKey = apiKey;
  }

  /**
   * Generate a review structure based on video transcript and chapters
   * @param videoId - UUID of the YouTube video
   * @returns The generated review structure
   */
  async generateReviewStructure(videoId: string) {
    try {
      // Get video data including transcript and chapters
      const { data: video, error: videoError } = await supabaseAdmin
        .from('youtube_videos')
        .select('*')
        .eq('id', videoId)
        .single();

      if (videoError || !video) {
        throw new Error(`Failed to get video data: ${videoError?.message || 'Video not found'}`);
      }

      // Get transcript
      const { data: transcript, error: transcriptError } = await supabaseAdmin
        .from('transcripts')
        .select('content')
        .eq('youtube_video_id', videoId)
        .single();

      if (transcriptError || !transcript) {
        throw new Error(`Failed to get transcript: ${transcriptError?.message || 'Transcript not found'}`);
      }

      // Prepare prompt for Claude
      const prompt = this.createStructurePrompt(video, transcript.content);
      
      // Call Claude API
      const generatedStructure = await this.callClaudeAPI(prompt);

      // Store the generated structure (as a draft)
      const { data: draft, error: draftError } = await supabaseAdmin
        .from('review_drafts')
        .insert({
          youtube_video_id: videoId,
          structure: generatedStructure,
          generation_status: 'structure_generated',
          version: 1
        })
        .select()
        .single();

      if (draftError) {
        throw new Error(`Failed to store review draft: ${draftError.message}`);
      }

      return draft;
    } catch (error: any) {
      console.error('Error generating review structure:', error);
      throw error;
    }
  }

  /**
   * Generate the full review content based on approved structure
   * @param draftId - UUID of the review draft
   * @returns The generated review content
   */
  async generateReviewContent(draftId: string) {
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

      // Prepare prompt for Claude
      const prompt = this.createContentPrompt(draft, transcript.content);
      
      // Call Claude API
      const generatedContent = await this.callClaudeAPI(prompt);

      // Update the draft with generated content
      const { data: updatedDraft, error: updateError } = await supabaseAdmin
        .from('review_drafts')
        .update({
          content: generatedContent,
          generation_status: 'content_generated',
          updated_at: new Date().toISOString()
        })
        .eq('id', draftId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update review draft: ${updateError.message}`);
      }

      return updatedDraft;
    } catch (error: any) {
      console.error('Error generating review content:', error);
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
Create a structured outline for a professional review of the laser machine featured in this video. The outline should include:

1. Introduction
2. Specifications and features
3. Key strengths (3-5 points)
4. Limitations or drawbacks (2-4 points)
5. Use cases and ideal customers
6. Value for money assessment
7. Conclusion with overall recommendation

For each section, provide 2-3 bullet points of key information to include, based on the transcript content.

Only include factual information mentioned in the transcript. Do not invent specifications or details not present in the source material.

Format your response as a structured JSON object with these sections clearly defined.
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
        const errorText = await response.text();
        throw new Error(`Claude API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      return data.content[0].text;
    } catch (error: any) {
      console.error('Error calling Claude API:', error);
      throw error;
    }
  }
}

export default new ClaudeService(); 