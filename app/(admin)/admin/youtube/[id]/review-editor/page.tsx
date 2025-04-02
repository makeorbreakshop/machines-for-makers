'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import TipTapEditor from './components/TipTapEditor';
import TranscriptViewer from './components/TranscriptViewer';
import ToolsPanel from './components/ToolsPanel';
import type { ClaudeModel } from '@/lib/services/claude-service';

export default function ReviewEditorPage() {
  const params = useParams<{ id: string }>();
  const videoId = params?.id;
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingStructure, setGeneratingStructure] = useState(false);
  const [generatingTranscript, setGeneratingTranscript] = useState(false);
  const [video, setVideo] = useState<any>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [draft, setDraft] = useState<any>(null);
  const [editorContent, setEditorContent] = useState<string>('');
  const [selectedTranscriptText, setSelectedTranscriptText] = useState<string>('');
  const [costEstimate, setCostEstimate] = useState<{
    inputCost: number;
    outputCost: number;
    totalCost: number;
  } | undefined>();

  // Fetch video and draft data on mount
  useEffect(() => {
    if (videoId) {
      fetchData();
    }
  }, [videoId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch video data
      const videoResponse = await fetch(`/api/admin/youtube/videos/${videoId}`);
      if (!videoResponse.ok) {
        throw new Error('Failed to fetch video data');
      }
      const videoData = await videoResponse.json();
      setVideo(videoData.video);
      
      // Handle transcript data - check if it exists and has content
      if (videoData.transcript && videoData.transcript.content) {
        setTranscript(videoData.transcript.content);
      } else {
        // No transcript found, try to fetch or generate one
        console.log('No transcript found, attempting to fetch or generate one...');
        try {
          setGeneratingTranscript(true);
          const transcriptResponse = await fetch(`/api/admin/youtube/videos/${videoId}/ensure-transcript`, {
            method: 'POST',
          });
          
          if (transcriptResponse.ok) {
            const transcriptData = await transcriptResponse.json();
            if (transcriptData.transcript && transcriptData.transcript.content) {
              setTranscript(transcriptData.transcript.content);
              toast.success('Transcript generated successfully');
            } else {
              setTranscript('');
              toast.error('Could not generate transcript');
            }
          } else {
            setTranscript('');
            toast.error('Failed to generate transcript');
          }
        } catch (transcriptError) {
          console.error('Error generating transcript:', transcriptError);
          setTranscript('');
          toast.error('Error generating transcript');
        } finally {
          setGeneratingTranscript(false);
        }
      }
      
      // Fetch latest draft
      const draftsResponse = await fetch(`/api/admin/youtube/videos/${videoId}/review-drafts`);
      if (!draftsResponse.ok) {
        throw new Error('Failed to fetch drafts');
      }
      const draftsData = await draftsResponse.json();
      
      // Get the latest draft
      if (draftsData && draftsData.length > 0) {
        const latestDraft = draftsData[0]; // Assuming drafts are sorted by date
        setDraft(latestDraft);
        
        // Set initial editor content based on draft
        if (latestDraft.content) {
          setEditorContent(latestDraft.content);
        } else if (latestDraft.structure) {
          // If no content yet, create a skeleton from structure
          let structure: Record<string, any> = {};
          try {
            // First check if structure is already an object
            if (typeof latestDraft.structure === 'object' && latestDraft.structure !== null) {
              structure = latestDraft.structure;
            }
            // If it's a string, try to parse it as JSON
            else if (typeof latestDraft.structure === 'string') {
              try {
                structure = JSON.parse(latestDraft.structure);
              } catch (parseError) {
                console.error('Error parsing structure as JSON:', parseError);
                
                // Try to extract JSON from markdown code blocks if it looks like a Claude response
                if (latestDraft.structure.includes('```json') || 
                    latestDraft.structure.startsWith('Here is') || 
                    latestDraft.structure.includes('I\'ve created')) {
                  const jsonMatch = latestDraft.structure.match(/```json\s*([\s\S]*?)\s*```/);
                  if (jsonMatch && jsonMatch[1]) {
                    try {
                      structure = JSON.parse(jsonMatch[1]);
                    } catch (err) {
                      throw new Error('Failed to parse extracted JSON from markdown');
                    }
                  } else {
                    throw new Error('Could not find JSON code block in structure');
                  }
                } else {
                  throw new Error('Structure is not valid JSON and does not contain JSON blocks');
                }
              }
            } else {
              throw new Error('Structure is neither an object nor a string');
            }
          } catch (error) {
            console.error('Error handling structure:', error);
            // Provide a default structure if all parsing attempts fail
            structure = {
              introduction: { title: "Introduction" },
              specifications: { title: "Specifications and Features" },
              strengths: { title: "Key Strengths" },
              weaknesses: { title: "Key Weaknesses" },
              performance: { title: "Performance" },
              usability: { title: "Usability" },
              value: { title: "Value for Money" },
              conclusion: { title: "Conclusion" }
            };
          }
          
          let skeleton = '';
          for (const [section, details] of Object.entries(structure)) {
            skeleton += `<h2>${section}</h2>\n<p>Content goes here...</p>\n\n`;
          }
          
          setEditorContent(skeleton);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!draft?.id) return;
    
    try {
      setSaving(true);
      
      const response = await fetch(`/api/admin/reviews/drafts/${draft.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: editorContent,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save draft');
      }
      
      const updatedDraft = await response.json();
      setDraft(updatedDraft);
      toast.success('Draft saved successfully');
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateContent = async (section?: string, model?: ClaudeModel) => {
    if (!draft?.id) return;
    
    try {
      setGenerating(true);
      
      const response = await fetch(`/api/admin/reviews/drafts/${draft.id}/generate-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          section,
          context: selectedTranscriptText,
          model
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate content');
      }
      
      const updatedDraft = await response.json();
      setDraft(updatedDraft);
      
      if (updatedDraft.content) {
        setEditorContent(updatedDraft.content);
      }
      
      // Update cost estimate if available
      if (updatedDraft.cost_estimate) {
        setCostEstimate(updatedDraft.cost_estimate);
      }
      
      toast.success('Content generated successfully');
    } catch (error) {
      console.error('Error generating content:', error);
      toast.error('Failed to generate content');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateStructure = async (model?: ClaudeModel) => {
    if (!videoId) return;
    
    try {
      setGeneratingStructure(true);
      toast.info('Generating review structure... This may take a moment.');
      
      const response = await fetch(`/api/admin/youtube/videos/${videoId}/generate-structure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model
        }),
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        console.error('Failed to generate structure:', responseData);
        throw new Error(`Failed to generate structure: ${responseData.error || 'Unknown error'}`);
      }
      
      const newDraft = responseData;
      if (!newDraft || !newDraft.id) {
        throw new Error('Invalid response: Draft data missing');
      }
      
      setDraft(newDraft);
      
      // Update cost estimate if available
      if (newDraft.cost_estimate) {
        setCostEstimate(newDraft.cost_estimate);
      }
      
      // Create a skeleton from the structure
      let structure: Record<string, any> = {};
      try {
        if (typeof newDraft.structure === 'object' && newDraft.structure !== null) {
          structure = newDraft.structure;
        } else if (typeof newDraft.structure === 'string') {
          try {
            structure = JSON.parse(newDraft.structure);
          } catch (parseError) {
            console.error('Error parsing structure as JSON:', parseError);
            // Try to extract JSON from markdown code blocks if needed
            if (newDraft.structure.includes('```json')) {
              const jsonMatch = newDraft.structure.match(/```json\s*([\s\S]*?)\s*```/);
              if (jsonMatch && jsonMatch[1]) {
                try {
                  structure = JSON.parse(jsonMatch[1]);
                } catch (err) {
                  console.error('Failed to parse JSON from code block:', err);
                  throw err;
                }
              } else {
                console.error('No JSON block found in structure');
                throw new Error('No JSON block found in structure');
              }
            } else {
              throw parseError;
            }
          }
        } else {
          console.error('Structure is neither an object nor a string:', newDraft.structure);
          throw new Error('Invalid structure format: neither object nor string');
        }
      } catch (error) {
        console.error('Error handling structure:', error);
        toast.error(`Error processing structure format: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return;
      }
      
      if (Object.keys(structure).length > 0) {
        let skeleton = '';
        for (const [section, details] of Object.entries(structure)) {
          const title = details.title || section;
          skeleton += `<h2>${title}</h2>\n`;
          
          if (details.key_points && Array.isArray(details.key_points)) {
            skeleton += '<ul>\n';
            for (const point of details.key_points) {
              skeleton += `<li>${point}</li>\n`;
            }
            skeleton += '</ul>\n\n';
          } else {
            skeleton += '<p>Content goes here...</p>\n\n';
          }
        }
        
        setEditorContent(skeleton);
      } else {
        console.error('Structure has no sections');
        toast.warning('Generated structure has no sections');
      }
      
      toast.success('Review structure generated successfully');
    } catch (error) {
      console.error('Error generating structure:', error);
      toast.error(`Failed to generate review structure: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setGeneratingStructure(false);
    }
  };

  const handleSelectedText = (text: string) => {
    setSelectedTranscriptText(text);
  };

  const handleCopyToEditor = (content: string) => {
    // Insert content at current cursor position or replace selected text
    // For simplicity, we're just appending it to the current content for now
    setEditorContent(prev => prev + content);
    toast.success('Content added to editor');
  };

  const handleScreenshotInsert = (imageUrl: string) => {
    // This will be triggered by the Screenshot Tool when an image is inserted via drag-and-drop
    // No action needed as the TipTap editor handles the insertion directly
    toast.success('Screenshot inserted');
  };

  const handleRegenerateTranscript = async () => {
    try {
      setGeneratingTranscript(true);
      toast.info('Regenerating transcript... This may take a while.');
      
      const response = await fetch(`/api/admin/youtube/videos/${videoId}/regenerate-transcript`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to regenerate transcript');
      }
      
      const data = await response.json();
      
      if (data.transcript && data.transcript.content) {
        setTranscript(data.transcript.content);
        toast.success('Transcript regenerated successfully');
      } else {
        throw new Error('No transcript content returned');
      }
    } catch (error) {
      console.error('Error regenerating transcript:', error);
      toast.error(`Failed to regenerate transcript: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setGeneratingTranscript(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <header className="p-4 border-b shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <h1 className="text-xl font-semibold">
              Review Editor: {video?.title || 'Loading...'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {!transcript && (
              <Button 
                variant="outline" 
                onClick={async () => {
                  try {
                    setGeneratingTranscript(true);
                    toast.info('Generating transcript...');
                    const transcriptResponse = await fetch(`/api/admin/youtube/videos/${videoId}/ensure-transcript`, {
                      method: 'POST',
                    });
                    
                    if (transcriptResponse.ok) {
                      const transcriptData = await transcriptResponse.json();
                      if (transcriptData.transcript?.content) {
                        setTranscript(transcriptData.transcript.content);
                        toast.success('Transcript generated successfully');
                      } else {
                        toast.error('Could not generate transcript');
                      }
                    } else {
                      toast.error('Failed to generate transcript');
                    }
                  } catch (error) {
                    console.error('Error generating transcript:', error);
                    toast.error('Error generating transcript');
                  } finally {
                    setGeneratingTranscript(false);
                  }
                }}
                disabled={loading || generatingTranscript}
              >
                {generatingTranscript ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Transcript'
                )}
              </Button>
            )}
            <Button onClick={handleSaveDraft} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save Draft'}
            </Button>
          </div>
        </div>
      </header>
      
      <main className="grid grid-cols-12 gap-6 p-4 h-[calc(100vh-4rem)] overflow-hidden">
        {/* Editor Panel */}
        <div className="col-span-8 flex flex-col bg-white rounded-md shadow-sm overflow-hidden">
          <div className="flex-1 overflow-auto">
            <TipTapEditor 
              content={editorContent}
              onChange={setEditorContent}
            />
          </div>
        </div>
        
        {/* Tools Panel with Tabs */}
        <div className="col-span-4 flex flex-col h-full overflow-hidden">
          <ToolsPanel
            draftId={draft?.id || ''}
            structure={draft?.structure || {}}
            onGenerateContent={handleGenerateContent}
            onGenerateStructure={handleGenerateStructure}
            onSave={handleSaveDraft}
            isGenerating={generating}
            isGeneratingStructure={generatingStructure}
            isSaving={saving}
            videoData={video}
            transcriptPreview={transcript?.substring(0, 1000)}
            transcriptLength={transcript?.length}
            costEstimate={costEstimate}
            videoId={videoId as string}
            transcript={transcript}
            selectedText={selectedTranscriptText}
            onCopyToEditor={handleCopyToEditor}
            onScreenshotInsert={handleScreenshotInsert}
            onRegenerateTranscript={handleRegenerateTranscript}
            isRegeneratingTranscript={generatingTranscript}
          />
        </div>
      </main>
    </div>
  );
} 