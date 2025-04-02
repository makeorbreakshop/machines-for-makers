'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import type { ClaudeModel } from '@/lib/services/claude-service';
import ClaudeChat from './ClaudeChat';
import ScreenshotTool from './ScreenshotTool';
import TranscriptViewer from './TranscriptViewer';

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
  videoId: string;
  transcript?: string;
  selectedText?: string;
  onCopyToEditor?: (content: string) => void;
  onScreenshotInsert?: (imageUrl: string) => void;
  onRegenerateTranscript?: () => void;
  isRegeneratingTranscript?: boolean;
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
  costEstimate,
  videoId,
  transcript = '',
  selectedText = '',
  onCopyToEditor,
  onScreenshotInsert,
  onRegenerateTranscript,
  isRegeneratingTranscript = false
}: ToolsPanelProps) {
  const [activeTab, setActiveTab] = useState<string>('chat');

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Tabs 
        defaultValue="chat" 
        className="h-full flex flex-col overflow-hidden"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList className="grid grid-cols-3 mb-2">
          <TabsTrigger value="chat">Claude Chat</TabsTrigger>
          <TabsTrigger value="screenshots">Screenshots</TabsTrigger>
          <TabsTrigger value="transcript">Transcript</TabsTrigger>
        </TabsList>
        
        <TabsContent value="chat" className="flex-1 overflow-auto m-0 p-0">
          <ClaudeChat 
            draftId={draftId}
            transcript={transcript}
            transcriptLength={transcriptLength}
            videoData={videoData}
            selectedText={selectedText}
            onCopyToEditor={onCopyToEditor}
          />
        </TabsContent>
        
        <TabsContent value="screenshots" className="flex-1 overflow-auto m-0 p-0">
          <ScreenshotTool 
            draftId={draftId}
            videoId={videoId}
            onScreenshotInsert={onScreenshotInsert}
          />
        </TabsContent>
        
        <TabsContent value="transcript" className="flex-1 overflow-auto m-0 p-0">
          <TranscriptViewer 
            transcript={transcript} 
            onSelectText={onCopyToEditor} 
            onRegenerateTranscript={onRegenerateTranscript}
            isLoading={isRegeneratingTranscript}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
} 