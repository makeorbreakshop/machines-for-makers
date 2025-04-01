'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wand2, RefreshCw, Save, SendHorizonal, InfoIcon, Eye } from 'lucide-react';
import { toast } from 'sonner';
import type { ClaudeModel } from '@/lib/services/claude-service';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Claude model pricing (per 1M tokens, in USD) - copied from claude-service.ts
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
  'claude-3.5-sonnet-20240620': {
    input: 3.0, // $3 per 1M input tokens
    output: 15.0 // $15 per 1M output tokens
  },
  'claude-3-7-sonnet-20240620': {
    input: 5.0, // $5 per 1M input tokens
    output: 25.0 // $25 per 1M output tokens
  }
};

// Helper function to calculate cost based on character count
const calculateCost = (charCount: number, model: ClaudeModel): string => {
  // Approximate tokens based on character count (4 chars ≈ 1 token)
  const approxTokens = Math.ceil(charCount / 4);
  
  // Convert to millions of tokens
  const tokensInMillions = approxTokens / 1000000;
  
  // Calculate input cost
  const pricing = CLAUDE_PRICING[model as keyof typeof CLAUDE_PRICING];
  
  // Check if pricing exists for the model, if not, fall back to sonnet
  if (!pricing) {
    console.warn(`Model ${model} not found in pricing data, falling back to claude-3-sonnet-20240229`);
    const fallbackPricing = CLAUDE_PRICING['claude-3-sonnet-20240229'];
    const cost = tokensInMillions * fallbackPricing.input;
    return cost.toFixed(4);
  }
  
  const cost = tokensInMillions * pricing.input;
  
  // Format to 4 decimal places
  return cost.toFixed(4);
};

// Helper function to format numbers with commas
const formatNumber = (num: number): string => {
  return new Intl.NumberFormat().format(num);
};

interface ToolsPanelProps {
  draftId: string;
  structure: any;
  onGenerateContent: (section?: string, model?: ClaudeModel) => Promise<void>;
  onGenerateStructure: (model?: ClaudeModel) => Promise<void>;
  onSave: () => Promise<void>;
  isGenerating: boolean;
  isGeneratingStructure: boolean;
  isSaving: boolean;
  videoData?: any;
  transcriptPreview?: string;
  transcriptLength?: number;
  costEstimate?: {
    inputCost: number;
    outputCost: number;
    totalCost: number;
  };
}

export default function ToolsPanel({
  draftId,
  structure,
  onGenerateContent,
  onGenerateStructure,
  onSave,
  isGenerating,
  isGeneratingStructure,
  isSaving,
  videoData,
  transcriptPreview,
  transcriptLength = 0,
  costEstimate
}: ToolsPanelProps) {
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<ClaudeModel>('claude-3-sonnet-20240229');
  const [promptDialogOpen, setPromptDialogOpen] = useState(false);

  // Extract sections from the structure
  const getSections = () => {
    if (!structure) return [];
    
    try {
      let structureObj;
      
      // First check if structure is already an object
      if (typeof structure === 'object' && structure !== null) {
        structureObj = structure;
      }
      // If it's a string, try to parse it as JSON
      else if (typeof structure === 'string') {
        try {
          structureObj = JSON.parse(structure);
        } catch (parseError) {
          console.error('Error parsing structure JSON:', parseError);
          
          // Check if this looks like a Claude response with markdown
          if (structure.includes('```json') || 
              structure.startsWith('Here is') || 
              structure.includes('I\'ve created')) {
            // Try to extract JSON from markdown code blocks
            const jsonMatch = structure.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonMatch && jsonMatch[1]) {
              try {
                structureObj = JSON.parse(jsonMatch[1]);
              } catch (err) {
                console.error('Failed to parse extracted JSON from markdown');
                return ['introduction', 'specifications', 'strengths', 'weaknesses', 'conclusion'];
              }
            } else {
              console.error('Could not find JSON code block in structure');
              return ['introduction', 'specifications', 'strengths', 'weaknesses', 'conclusion'];
            }
          } else {
            // If structure is a string but not valid JSON, return default sections
            return ['introduction', 'specifications', 'strengths', 'weaknesses', 'conclusion'];
          }
        }
      } else {
        console.error('Structure is neither an object nor a string');
        return ['introduction', 'specifications', 'strengths', 'weaknesses', 'conclusion'];
      }
      
      if (!structureObj || typeof structureObj !== 'object') {
        console.error('Invalid structure format');
        return ['introduction', 'specifications', 'strengths', 'weaknesses', 'conclusion'];
      }
      
      return Object.keys(structureObj);
    } catch (error) {
      console.error('Unexpected error handling structure:', error);
      return ['introduction', 'specifications', 'strengths', 'weaknesses', 'conclusion'];
    }
  };

  const sections = getSections();
  
  const handleGenerateContent = async () => {
    try {
      await onGenerateContent(
        selectedSection !== 'all' ? selectedSection : undefined,
        selectedModel
      );
      toast.success(`Content generation for ${selectedSection !== 'all' ? selectedSection : 'all sections'} initiated`);
    } catch (error) {
      toast.error('Failed to generate content');
    }
  };

  const handleGenerateStructure = async () => {
    try {
      await onGenerateStructure(selectedModel);
      
      // Note: We don't show a success toast here because that's handled in the parent component
      // This prevents duplicate toasts
    } catch (error) {
      console.error('Error in ToolsPanel.handleGenerateStructure:', error);
      toast.error(`Failed to generate structure: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSave = async () => {
    try {
      await onSave();
      toast.success('Draft saved successfully');
    } catch (error) {
      toast.error('Failed to save draft');
    }
  };

  // Format cost as USD currency
  const formatCost = (cost: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4
    }).format(cost);
  };

  // Create a preview of the prompt that would be sent to Claude
  const getStructurePromptPreview = () => {
    if (!videoData || !transcriptPreview) {
      return "Loading video data and transcript...";
    }

    return `
You are an expert laser machine reviewer helping to create a structured review outline for a YouTube video review. 

# VIDEO INFORMATION
Title: ${videoData.title || 'N/A'}
Description: ${(videoData.description || 'N/A').substring(0, 200)}...
${videoData.chapters ? `Chapters: ${JSON.stringify(videoData.chapters, null, 2)}` : ''}

# TRANSCRIPT
${transcriptPreview.substring(0, 500)}...
[Transcript continues, truncated for preview]

# TASK
Analyze the transcript thoroughly and create a structured outline for a professional review of the laser machine featured in this video. The outline should be comprehensive and reflect the specific content of this review.

[Task description continues...]

Format your response as a structured JSON object with these sections clearly defined.
`;
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle>Generation Tools</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <Tabs defaultValue="generate">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="generate">Generate</TabsTrigger>
            <TabsTrigger value="context">Context</TabsTrigger>
          </TabsList>
          
          <TabsContent value="generate" className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="model">Claude Model</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <InfoIcon className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[350px]">
                      <p className="text-sm mb-2">
                        <strong>Opus:</strong> Most powerful, best for complex tasks<br />
                        <strong>3.7 Sonnet:</strong> Latest and most capable model<br />
                        <strong>3.5 Sonnet:</strong> Improved capabilities over 3.0<br />
                        <strong>Sonnet:</strong> Balanced power and speed, good for most tasks<br />
                        <strong>Haiku:</strong> Fastest, most cost-effective, good for simple tasks
                      </p>
                      {transcriptLength > 0 && (
                        <div className="border-t pt-2 mt-2">
                          <p className="text-xs font-medium mb-1">Estimated cost for this review:</p>
                          <div className="grid grid-cols-2 gap-x-3 text-xs mt-1">
                            <div>Opus:</div>
                            <div>${calculateCost(transcriptLength, 'claude-3-opus-20240229')}</div>
                            <div>3.7 Sonnet:</div>
                            <div>${calculateCost(transcriptLength, 'claude-3-7-sonnet-20240620')}</div>
                            <div>3.5 Sonnet:</div>
                            <div>${calculateCost(transcriptLength, 'claude-3.5-sonnet-20240620')}</div>
                            <div>Sonnet:</div>
                            <div>${calculateCost(transcriptLength, 'claude-3-sonnet-20240229')}</div>
                            <div>Haiku:</div>
                            <div>${calculateCost(transcriptLength, 'claude-3-haiku-20240307')}</div>
                          </div>
                          <p className="text-xs italic mt-1">Full transcript length: {formatNumber(transcriptLength)} characters</p>
                          <p className="text-xs italic">Approx. {formatNumber(Math.ceil(transcriptLength/4))} tokens</p>
                        </div>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select 
                value={selectedModel} 
                onValueChange={(value) => setSelectedModel(value as ClaudeModel)}
              >
                <SelectTrigger id="model">
                  <SelectValue placeholder="Select Claude model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="claude-3-opus-20240229">Claude 3 Opus (Highest quality)</SelectItem>
                  <SelectItem value="claude-3-7-sonnet-20240620">Claude 3.7 Sonnet (Latest)</SelectItem>
                  <SelectItem value="claude-3.5-sonnet-20240620">Claude 3.5 Sonnet (Improved)</SelectItem>
                  <SelectItem value="claude-3-sonnet-20240229">Claude 3 Sonnet (Balanced)</SelectItem>
                  <SelectItem value="claude-3-haiku-20240307">Claude 3 Haiku (Fast)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex space-x-2">
              <Button 
                className="flex-1" 
                onClick={handleGenerateStructure}
                disabled={isGeneratingStructure}
                variant="secondary"
              >
                {isGeneratingStructure ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Generating Structure...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Generate Review Structure
                  </>
                )}
              </Button>
              
              <Dialog open={promptDialogOpen} onOpenChange={setPromptDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon" title="View Claude Prompt">
                    <Eye className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Claude Prompt Preview</DialogTitle>
                    <DialogDescription>
                      This is the prompt that will be sent to Claude when generating a review structure.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-4 p-4 bg-muted rounded-md overflow-x-auto">
                    <pre className="text-xs whitespace-pre-wrap font-mono">{getStructurePromptPreview()}</pre>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-2">
              <Label htmlFor="section">Section to Generate</Label>
              <Select 
                value={selectedSection} 
                onValueChange={setSelectedSection}
              >
                <SelectTrigger id="section">
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {sections.map((section) => (
                    <SelectItem key={section} value={section}>
                      {section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              className="w-full mt-4" 
              onClick={handleGenerateContent}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Generate {selectedSection !== 'all' ? selectedSection : 'All Content'}
                </>
              )}
            </Button>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full mt-2" size="sm">
                  <Eye className="mr-2 h-4 w-4" />
                  View Content Generation Prompt
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Content Generation Prompt Preview</DialogTitle>
                  <DialogDescription>
                    This is the prompt that will be sent to Claude when generating review content.
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-4 p-4 bg-muted rounded-md overflow-x-auto">
                  <pre className="text-xs whitespace-pre-wrap font-mono">{`
You are an expert laser machine reviewer writing content for MachinesForMakers.com. Your task is to create a comprehensive, detailed review based on the approved structure and video transcript.

# APPROVED STRUCTURE
${structure ? JSON.stringify(structure, null, 2).substring(0, 300) + '...' : 'No structure available'}

# VIDEO INFORMATION
Title: ${videoData?.title || 'N/A'}
Description: ${videoData?.description ? videoData.description.substring(0, 200) + '...' : 'N/A'}
${videoData?.chapters ? `Chapters: ${JSON.stringify(videoData.chapters, null, 2)}` : ''}

# TRANSCRIPT
${transcriptPreview ? transcriptPreview.substring(0, 500) + '...\n[Transcript continues, truncated for preview]' : 'No transcript available'}

# TASK
${selectedSection !== 'all' 
  ? `Write the "${selectedSection}" section of a laser machine review.` 
  : 'Write a complete, professional review following the approved structure.'}
Your review should:

1. Be comprehensive and detailed while remaining factual and based on the transcript
2. Use a conversational but professional tone, similar to Brandon (the host)
3. Include specific examples and quotes from the video where relevant
4. Organize information clearly with appropriate headers and subheaders
5. Highlight pros and cons clearly in dedicated sections
6. Include a clear conclusion with recommendations
7. Match the style of MachinesForMakers.com

Format the content using Markdown syntax, with appropriate headers, lists, and emphasis.
                  `}</pre>
                </div>
              </DialogContent>
            </Dialog>

            {costEstimate && (
              <div className="mt-4 p-3 border rounded-md bg-muted">
                <h4 className="text-sm font-medium mb-1">Last Generation Cost</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>Input Cost:</div>
                  <div className="text-right">{formatCost(costEstimate.inputCost)}</div>
                  <div>Output Cost:</div>
                  <div className="text-right">{formatCost(costEstimate.outputCost)}</div>
                  <div className="font-medium">Total Cost:</div>
                  <div className="text-right font-medium">{formatCost(costEstimate.totalCost)}</div>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="context" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="selected-text">Selected Transcript Text</Label>
              <Textarea 
                id="selected-text" 
                placeholder="Highlight text in the transcript to use as context"
                value={selectedText}
                onChange={(e) => setSelectedText(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <Button
              variant="secondary"
              className="w-full"
              disabled={!selectedText.trim()}
              onClick={() => {
                // This would be used to add selected text as context for generation
                toast.info('Selected text will be used as context for the next generation');
              }}
            >
              <SendHorizonal className="mr-2 h-4 w-4" />
              Use as Context
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="pt-0">
        <Button 
          variant="outline" 
          className="w-full"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Draft
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
} 