import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth-utils';
import { createAdminClient } from '@/lib/supabase/admin';

const supabaseAdmin = createAdminClient();

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(
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
    const videoId = unwrappedParams.id;
    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    // Get all review drafts for this video
    const { data, error } = await supabaseAdmin
      .from('review_drafts')
      .select('*')
      .eq('youtube_video_id', videoId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get review drafts: ${error.message}`);
    }

    // Process the data to ensure structure is valid JSON
    const processedData = data?.map(draft => {
      // If structure exists and is a string that looks like a Claude response
      if (draft.structure && typeof draft.structure === 'string' && 
          (draft.structure.startsWith('Here is') || draft.structure.includes('I\'ve created'))) {
        try {
          // Try to extract JSON from text response
          const jsonMatch = draft.structure.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch && jsonMatch[1]) {
            // Found JSON in markdown code block
            draft.structure = JSON.parse(jsonMatch[1]);
          } else {
            // If we can't extract JSON, use a default structure
            draft.structure = {
              introduction: { title: "Introduction", outline: [] },
              specifications: { title: "Specifications and Features", outline: [] },
              strengths: { title: "Key Strengths", outline: [] },
              weaknesses: { title: "Key Weaknesses", outline: [] },
              performance: { title: "Performance", outline: [] },
              usability: { title: "Usability", outline: [] },
              value: { title: "Value for Money", outline: [] },
              conclusion: { title: "Conclusion", outline: [] }
            };
          }
        } catch (parseError) {
          console.error('Error parsing Claude structure response:', parseError);
          // Fall back to default structure
          draft.structure = {
            introduction: { title: "Introduction", outline: [] },
            specifications: { title: "Specifications and Features", outline: [] },
            strengths: { title: "Key Strengths", outline: [] },
            weaknesses: { title: "Key Weaknesses", outline: [] },
            performance: { title: "Performance", outline: [] },
            usability: { title: "Usability", outline: [] },
            value: { title: "Value for Money", outline: [] },
            conclusion: { title: "Conclusion", outline: [] }
          };
        }
      }
      return draft;
    }) || [];

    return NextResponse.json(processedData, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching review drafts:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred while fetching review drafts' },
      { status: 500 }
    );
  }
} 