'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Check, X, RefreshCw, FileText, Send } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';

type ReviewDraft = {
  id: string;
  youtube_video_id: string;
  machine_id: string | null;
  title: string | null;
  structure: any;
  content: string | null;
  rating: number | null;
  generation_status: string;
  version: number;
  created_at: string;
  updated_at: string;
};

type ReviewGenerationProps = {
  videoId: string;
  hasTranscript: boolean;
  machines: Array<{ id: string, name: string }>;
};

export default function ReviewGeneration({
  videoId,
  hasTranscript,
  machines
}: ReviewGenerationProps) {
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<ReviewDraft[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [generatingStructure, setGeneratingStructure] = useState<boolean>(false);
  const [generatingContent, setGeneratingContent] = useState<boolean>(false);
  const [publishing, setPublishing] = useState<boolean>(false);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<string>('structure');
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [rating, setRating] = useState<number>(4);

  useEffect(() => {
    if (videoId) {
      fetchDrafts();
    }
  }, [videoId]);

  useEffect(() => {
    // When drafts change, select the most recent one automatically
    if (drafts.length > 0 && !selectedDraftId) {
      setSelectedDraftId(drafts[0].id);
      
      // If a draft has content, switch to content tab
      if (drafts[0].content) {
        setSelectedTab('content');
      }
      
      // Set form values from the selected draft
      if (drafts[0].title) {
        setTitle(drafts[0].title);
      }
      
      if (drafts[0].rating) {
        setRating(drafts[0].rating);
      }
      
      if (drafts[0].machine_id) {
        setSelectedMachineId(drafts[0].machine_id);
      }
    }
  }, [drafts]);

  const fetchDrafts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/youtube/videos/${videoId}/review-drafts`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch review drafts');
      }
      
      const data = await response.json();
      setDrafts(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Failed to fetch review drafts: ${error.message}`,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateStructure = async () => {
    try {
      setGeneratingStructure(true);
      
      const response = await fetch(`/api/admin/youtube/videos/${videoId}/generate-review/structure`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate review structure');
      }
      
      const data = await response.json();
      toast({
        title: 'Success',
        description: 'Review structure generated successfully',
      });
      
      // Redirect to the new editor page
      window.location.href = `/admin/youtube/${videoId}/review-editor`;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Failed to generate review structure: ${error.message}`,
        variant: 'destructive'
      });
    } finally {
      setGeneratingStructure(false);
    }
  };

  const handleGenerateContent = async () => {
    if (!selectedDraftId) return;
    
    try {
      setGeneratingContent(true);
      
      const response = await fetch(`/api/admin/reviews/drafts/${selectedDraftId}/generate-content`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate review content');
      }
      
      const data = await response.json();
      toast({
        title: 'Success',
        description: 'Review content generated successfully',
      });
      
      // Refresh drafts list
      await fetchDrafts();
      
      // Switch to content tab
      setSelectedTab('content');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Failed to generate review content: ${error.message}`,
        variant: 'destructive'
      });
    } finally {
      setGeneratingContent(false);
    }
  };

  const handlePublishReview = async () => {
    if (!selectedDraftId || !selectedMachineId) return;
    
    try {
      setPublishing(true);
      
      const response = await fetch(`/api/admin/reviews/drafts/${selectedDraftId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          machineId: selectedMachineId
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to publish review');
      }
      
      const data = await response.json();
      toast({
        title: 'Success',
        description: 'Review published successfully',
      });
      
      // Refresh drafts list
      await fetchDrafts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Failed to publish review: ${error.message}`,
        variant: 'destructive'
      });
    } finally {
      setPublishing(false);
    }
  };

  const selectedDraft = selectedDraftId 
    ? drafts.find(draft => draft.id === selectedDraftId) 
    : null;

  const formatStructure = (structure: any) => {
    if (!structure) return null;

    try {
      // If it's a string, try to parse it
      const structureObj = typeof structure === 'string' ? JSON.parse(structure) : structure;
      return (
        <pre className="p-4 text-sm overflow-auto bg-slate-100 rounded-md whitespace-pre-wrap">
          {JSON.stringify(structureObj, null, 2)}
        </pre>
      );
    } catch (error) {
      // If it's not valid JSON, just display as text
      return (
        <pre className="p-4 text-sm overflow-auto bg-slate-100 rounded-md whitespace-pre-wrap">
          {structure}
        </pre>
      );
    }
  };

  const formatContent = (content: string | null) => {
    if (!content) return null;
    
    return (
      <div className="p-4 text-sm overflow-auto bg-slate-100 rounded-md whitespace-pre-wrap">
        {content}
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'structure_generated':
        return <Badge className="bg-blue-500">Structure Generated</Badge>;
      case 'content_generated':
        return <Badge className="bg-purple-500">Content Generated</Badge>;
      case 'published':
        return <Badge className="bg-green-500">Published</Badge>;
      default:
        return <Badge className="bg-slate-500">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">AI Review Generation</h2>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDrafts}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh
          </Button>
        </div>
      </div>

      {/* Initial state when no transcript is available */}
      {!hasTranscript && (
        <Card className="p-4 flex flex-col items-center justify-center text-center">
          <FileText className="h-12 w-12 text-slate-400 mb-2" />
          <h3 className="text-lg font-medium">No Transcript Available</h3>
          <p className="text-sm text-slate-500 mb-4">
            A transcript is required before generating an AI review.
          </p>
          <Button variant="secondary" disabled>
            Request Transcription First
          </Button>
        </Card>
      )}

      {/* When transcript is available but no drafts exist yet */}
      {hasTranscript && drafts.length === 0 && !loading && (
        <Card className="p-4 flex flex-col items-center justify-center text-center">
          <FileText className="h-12 w-12 text-slate-400 mb-2" />
          <h3 className="text-lg font-medium">Generate AI Review</h3>
          <p className="text-sm text-slate-500 mb-4">
            Generate a structured review based on the video transcript.
          </p>
          <Button 
            onClick={handleGenerateStructure} 
            disabled={generatingStructure}
          >
            {generatingStructure ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generating...
              </>
            ) : 'Generate Structure'}
          </Button>
        </Card>
      )}

      {/* When drafts exist, show the review draft workflow */}
      {hasTranscript && drafts.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {/* Draft selection dropdown */}
          <div className="flex gap-2 items-center">
            <Label htmlFor="draft-select" className="whitespace-nowrap">Draft Version:</Label>
            <Select 
              value={selectedDraftId || ''}
              onValueChange={setSelectedDraftId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a draft" />
              </SelectTrigger>
              <SelectContent>
                {drafts.map((draft) => (
                  <SelectItem key={draft.id} value={draft.id}>
                    {new Date(draft.created_at).toLocaleString()} 
                    {draft.version > 1 ? ` (v${draft.version})` : ''}
                    {' - '}{draft.generation_status.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedDraft && getStatusBadge(selectedDraft.generation_status)}
          </div>
          
          {/* Selected draft content */}
          {selectedDraft && (
            <>
              <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="structure">Structure</TabsTrigger>
                  <TabsTrigger value="content" disabled={!selectedDraft.content}>Content</TabsTrigger>
                </TabsList>
                
                <TabsContent value="structure" className="p-4 border rounded-md">
                  <div className="flex justify-end mb-4">
                    <Button 
                      onClick={handleGenerateContent}
                      disabled={!selectedDraft.structure || generatingContent || selectedDraft.generation_status === 'published'}
                    >
                      {generatingContent ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Generating Content...
                        </>
                      ) : 'Generate Content'}
                    </Button>
                  </div>
                  {formatStructure(selectedDraft.structure)}
                </TabsContent>
                
                <TabsContent value="content" className="space-y-4">
                  <div className="p-4 border rounded-md">
                    {formatContent(selectedDraft.content)}
                  </div>
                  
                  {/* Publishing form */}
                  {selectedDraft.content && selectedDraft.generation_status !== 'published' && (
                    <div className="p-4 border rounded-md">
                      <h3 className="text-lg font-bold mb-4">Publish Review</h3>
                      
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="title">Review Title</Label>
                            <Input 
                              id="title" 
                              value={title} 
                              onChange={(e) => setTitle(e.target.value)}
                              placeholder="Enter review title" 
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="rating">Rating (1-5)</Label>
                            <Input 
                              id="rating" 
                              type="number" 
                              min="1" 
                              max="5" 
                              value={rating} 
                              onChange={(e) => setRating(Number(e.target.value))}
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="machine">Machine</Label>
                          <Select
                            value={selectedMachineId}
                            onValueChange={setSelectedMachineId}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a machine" />
                            </SelectTrigger>
                            <SelectContent>
                              {machines.map((machine) => (
                                <SelectItem key={machine.id} value={machine.id}>
                                  {machine.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <Button 
                          className="w-full" 
                          onClick={handlePublishReview}
                          disabled={!selectedMachineId || publishing}
                        >
                          {publishing ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Publishing...
                            </>
                          ) : 'Publish Review'}
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Published confirmation */}
                  {selectedDraft.generation_status === 'published' && (
                    <div className="p-4 border rounded-md bg-green-50">
                      <div className="flex items-center gap-2 mb-2">
                        <Check className="h-5 w-5 text-green-500" />
                        <h3 className="text-lg font-bold">Review Published</h3>
                      </div>
                      <p className="text-sm text-slate-600 mb-4">
                        This review has been published and is now visible on the machine page.
                      </p>
                      {selectedDraft.machine_id && (
                        <Link 
                          href={`/admin/reviews?machine_id=${selectedDraft.machine_id}`}
                          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                        >
                          View Published Review
                          <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </Link>
                      )}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      )}
      
      {/* Loading skeleton */}
      {loading && !drafts.length && (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}
    </div>
  );
} 