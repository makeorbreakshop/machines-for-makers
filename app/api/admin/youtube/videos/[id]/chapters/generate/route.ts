import { NextRequest, NextResponse } from 'next/server';
import { YouTubeDbService } from '@/lib/services/youtube-db-service';
import { YouTubeChapter } from '@/lib/types/youtube';

/**
 * Helper function to generate chapters from transcript content
 */
async function generateChaptersFromTranscript(
  videoId: string, 
  transcript: string
): Promise<YouTubeChapter[]> {
  try {
    // Get the Claude API key from environment variables
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      console.error('[Chapter Generation] Missing ANTHROPIC_API_KEY');
      throw new Error('Claude API key not configured');
    }
    
    console.log(`[Chapter Generation] Analyzing transcript to generate chapters for video ${videoId}`);
    
    // Prepare the prompt for Claude
    // We'll ask Claude to identify natural chapter breaks based on content changes
    const prompt = `You are an expert at analyzing video transcripts and creating chapter markers. 
I need you to analyze this transcript and create 5-10 logical chapters based on topic transitions.

For each chapter, provide:
1. A short, descriptive title (max 50 chars)
2. The timestamp where the chapter starts (in seconds from the beginning)

Format your response as a JSON array:
[
  {"title": "Introduction", "start_time": 0},
  {"title": "Topic 1", "start_time": 120},
  ...
]

Important:
- The first chapter should always start at 0 seconds
- Only include title and start_time in your JSON (no end_time)
- Focus on major topic transitions
- Be concise in titles
- Look for natural breaks in the content
- If timestamps are mentioned in the transcript, use them as hints
- Make sure chapters are chronological
- ONLY respond with the JSON array, nothing else

Transcript:
${transcript}`;

    // Call the Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2000,
        temperature: 0.2,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Chapter Generation] Claude API error:', errorData);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.content[0].text;
    
    // Extract JSON array from Claude's response
    const jsonMatch = assistantMessage.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('[Chapter Generation] Failed to extract JSON from Claude response');
      throw new Error('Invalid response format from Claude');
    }
    
    // Parse the JSON array
    const chapters = JSON.parse(jsonMatch[0]);
    
    // Validate the chapters format
    if (!Array.isArray(chapters)) {
      throw new Error('Invalid chapters format from Claude');
    }
    
    // Make sure chapters are sorted by start_time
    chapters.sort((a, b) => a.start_time - b.start_time);
    
    // Set end times for chapters
    for (let i = 0; i < chapters.length - 1; i++) {
      chapters[i].end_time = chapters[i + 1].start_time;
    }
    
    // For the last chapter, set an arbitrary end time (30 minutes after start)
    const lastChapter = chapters[chapters.length - 1];
    lastChapter.end_time = lastChapter.start_time + 1800;
    
    console.log(`[Chapter Generation] Generated ${chapters.length} chapters successfully`);
    
    return chapters;
  } catch (error: any) {
    console.error('[Chapter Generation] Error generating chapters:', error);
    throw new Error(`Failed to generate chapters: ${error.message}`);
  }
}

/**
 * POST /api/admin/youtube/videos/[id]/chapters/generate
 * 
 * Automatically generates chapters from the transcript
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    console.log(`[Chapters API] Generating chapters from transcript for video ID: ${id}`);
    
    if (!id) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }
    
    // Get database services
    const youtubeDbService = new YouTubeDbService();
    
    // Check if video exists and get transcript
    const video = await youtubeDbService.getVideo(id);
    
    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }
    
    // Get the transcript
    const transcript = await youtubeDbService.getTranscript(id);
    
    if (!transcript || !transcript.content) {
      return NextResponse.json(
        { error: 'No transcript available for this video' },
        { status: 400 }
      );
    }
    
    // Generate chapters from transcript
    const chapters = await generateChaptersFromTranscript(id, transcript.content);
    
    // Save chapters to database
    await youtubeDbService.saveChapters(id, chapters);
    
    console.log(`[Chapters API] Successfully generated and saved ${chapters.length} chapters`);
    
    // Return success
    return NextResponse.json({ 
      success: true, 
      message: `Generated and saved ${chapters.length} chapters`,
      chapters
    });
  } catch (error: any) {
    console.error('Error generating chapters from transcript:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate chapters' },
      { status: 500 }
    );
  }
} 