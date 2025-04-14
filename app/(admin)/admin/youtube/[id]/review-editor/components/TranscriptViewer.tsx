'use client';

import { useState, useEffect, ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, ListTree, RefreshCw } from 'lucide-react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';

interface TranscriptViewerProps {
  transcript: string;
  onSelectText?: (selectedText: string) => void;
  isLoading?: boolean;
  onRegenerateTranscript?: () => void;
}

export default function TranscriptViewer({ 
  transcript, 
  onSelectText,
  isLoading = false,
  onRegenerateTranscript
}: TranscriptViewerProps) {
  const [chapters, setChapters] = useState<any[]>([]);
  const [generatingChapters, setGeneratingChapters] = useState(false);
  const [regeneratingTranscript, setRegeneratingTranscript] = useState(false);
  const params = useParams<{ id: string }>();
  const videoId = params?.id;

  // Fetch chapter data when component mounts
  useEffect(() => {
    if (videoId) {
      fetchChapters(videoId as string);
    }
  }, [videoId]);

  const fetchChapters = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/youtube/videos/${id}/chapters`);
      if (response.ok) {
        const data = await response.json();
        if (data.chapters && Array.isArray(data.chapters)) {
          setChapters(data.chapters);
        }
      }
    } catch (error) {
      console.error('[TranscriptViewer] Error fetching chapters:', error);
    }
  };

  const generateChapters = async () => {
    if (!videoId) return;
    
    try {
      setGeneratingChapters(true);
      
      const response = await fetch(`/api/admin/youtube/videos/${videoId}/chapters/generate`, {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.json();
        setChapters(data.chapters);
        toast.success('Chapters generated successfully');
      } else {
        toast.error('Failed to generate chapters');
      }
    } catch (error) {
      console.error('[TranscriptViewer] Error generating chapters:', error);
      toast.error('Error generating chapters');
    } finally {
      setGeneratingChapters(false);
    }
  };

  const handleRegenerateTranscript = () => {
    setRegeneratingTranscript(true);
    if (onRegenerateTranscript) {
      onRegenerateTranscript();
    }
    
    setTimeout(() => {
      setRegeneratingTranscript(false);
    }, 3000);
  };

  // Format time in seconds to MM:SS format
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTranscriptTextForChapter = (chapterIndex: number) => {
    if (!transcript || chapters.length === 0) return '';
    
    const startTime = chapters[chapterIndex].start_time;
    const endTime = chapterIndex < chapters.length - 1 
      ? chapters[chapterIndex + 1].start_time 
      : Infinity;
    
    // Find timestamps in the transcript that fall within this chapter's range
    const timeRegex = /\[(\d+):(\d+)(?:\.(\d+))?\]/g;
    
    const lines = transcript.split('\n');
    let currentChapterText = '';
    let currentTimeSec = 0;
    let currentParagraph = '';
    let paragraphs = [];
    
    for (const line of lines) {
      // Check if line contains timestamp
      const timeMatch = line.match(/\[(\d+):(\d+)(?:\.(\d+))?\]/);
      
      if (timeMatch) {
        // Calculate seconds
        const minutes = parseInt(timeMatch[1]);
        const seconds = parseInt(timeMatch[2]);
        currentTimeSec = minutes * 60 + seconds;
        
        // Check if this timestamp falls within our chapter
        if (currentTimeSec >= startTime && currentTimeSec < endTime) {
          // Add line without timestamp
          const cleanLine = line.replace(timeRegex, '').trim();
          if (cleanLine) {
            // If we hit a significant sentence end, create a paragraph
            if (cleanLine.match(/[.!?]$/) && currentParagraph.length > 100) {
              currentParagraph += cleanLine;
              paragraphs.push(currentParagraph);
              currentParagraph = '';
            } else {
              currentParagraph += cleanLine + ' ';
            }
          }
        }
      } else if (line.trim() && currentTimeSec >= startTime && currentTimeSec < endTime) {
        // Add non-timestamp lines if we're in the correct chapter
        currentParagraph += line.trim() + ' ';
        
        // Create paragraph on empty lines or significant natural breaks
        if (line.trim() === '' && currentParagraph.trim().length > 0) {
          paragraphs.push(currentParagraph.trim());
          currentParagraph = '';
        }
      }
    }
    
    // Add any remaining text as final paragraph
    if (currentParagraph.trim().length > 0) {
      paragraphs.push(currentParagraph.trim());
    }
    
    // Join paragraphs with proper spacing
    return paragraphs
      .map(p => p.replace(/\s{2,}/g, ' ').trim())
      .join('\n\n');
  };

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader className="py-2 px-3 flex-shrink-0">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base">Transcript</CardTitle>
          <div className="flex gap-2">
            {transcript && onRegenerateTranscript && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRegenerateTranscript}
                disabled={regeneratingTranscript || isLoading}
              >
                {regeneratingTranscript ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Regenerate
                  </>
                )}
              </Button>
            )}
            {chapters.length === 0 && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={generateChapters}
                disabled={generatingChapters || !transcript}
              >
                {generatingChapters ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <ListTree className="mr-2 h-4 w-4" />
                    Generate Chapters
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto p-3 pb-4 text-sm">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
            <span className="text-muted-foreground">Loading transcript...</span>
          </div>
        ) : !transcript ? (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-muted-foreground mb-2">No transcript available</p>
            <p className="text-xs text-muted-foreground">Use the "Generate Transcript" button to create one</p>
          </div>
        ) : chapters.length > 0 ? (
          // Display transcript organized by chapters
          <div className="space-y-6">
            {chapters.map((chapter, index) => (
              <div key={index} className="pb-4">
                <h3 className="text-base font-semibold text-primary mb-2 flex items-center gap-2 pb-1 border-b">
                  <span className="text-sm text-muted-foreground font-mono">
                    {formatTime(chapter.start_time)}
                  </span>
                  <span>{chapter.title}</span>
                </h3>
                <div className="whitespace-pre-line text-gray-700 mt-2 leading-relaxed">
                  {getTranscriptTextForChapter(index)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // If we have transcript but no chapters, show the full transcript
          <div>
            <p className="text-muted-foreground mb-4">
              No chapters available. Generate chapters for a better reading experience.
            </p>
            <div className="whitespace-pre-line leading-relaxed text-gray-700">
              {transcript
                .replace(/\[\d+:\d+(?:\.\d+)?\]/g, '')
                .replace(/\n\s*\n/g, '\n\n')
                .replace(/\s{2,}/g, ' ')
                .trim()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 