'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RefreshCw, Send, Copy, Wand2, Save, Plus, InfoIcon, Clipboard } from 'lucide-react';
import { toast } from 'sonner';
import type { ClaudeModel } from '@/lib/services/claude-service';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

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

// Helper function to format numbers with commas
const formatNumber = (num: number): string => {
  return new Intl.NumberFormat().format(num);
};

// Helper function to calculate cost estimates
const calculateCost = (contentLength: number, model: ClaudeModel): string => {
  // Estimate tokens (rough approximation - 1 token ≈ 4 characters)
  const inputTokens = Math.ceil(contentLength / 4);
  const outputTokens = Math.ceil(inputTokens * 1.5); // Assuming 1.5x the input for output
  
  // Calculate costs based on pricing
  const pricing = CLAUDE_PRICING[model];
  const inputCost = (inputTokens / 1000000) * pricing.input;
  const outputCost = (outputTokens / 1000000) * pricing.output;
  const totalCost = inputCost + outputCost;
  
  // Format to currency with 4 decimal places for small amounts
  return totalCost.toFixed(4);
};

// Format cost to display in currency format
const formatCost = (cost: number): string => {
  return `$${cost.toFixed(4)}`;
};

type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
};

// Add interface for usage info
interface UsageInfo {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
}

interface ClaudeChatProps {
  draftId: string;
  transcript?: string;
  transcriptLength?: number;
  videoData?: any;
  selectedText?: string;
  onSave?: () => Promise<void>;
  isSaving?: boolean;
  onCopyToEditor?: (content: string) => void;
}

export default function ClaudeChat({
  draftId,
  transcript = '',
  transcriptLength = 0,
  videoData,
  selectedText = '',
  onSave,
  isSaving,
  onCopyToEditor
}: ClaudeChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ClaudeModel>('claude-3-5-sonnet-20240620');
  const [costEstimate, setCostEstimate] = useState<{
    inputCost: number;
    outputCost: number;
    totalCost: number;
  } | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [streamingResponse, setStreamingResponse] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  // Predefined prompt templates
  const promptTemplates = [
    { 
      name: "Generate Intro Section", 
      template: "Based on the transcript, write an engaging introduction section for my review. Focus on the overview of the machine and key highlights from the video." 
    },
    { 
      name: "Analyze Pros and Cons", 
      template: "Analyze the transcript and list the key pros and cons of the laser machine mentioned in the video. Format it with bullet points." 
    },
    { 
      name: "Compare to Competitors", 
      template: "Based on any mentions in the transcript, how does this machine compare to its competitors? What makes it stand out or fall behind?" 
    },
    { 
      name: "Write Conclusion", 
      template: "Write a conclusion section that summarizes the key points about the machine, who it's best for, and final recommendations." 
    }
  ];

  // More reliable scrolling function
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'end',
        inline: 'nearest'
      });
    }
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  // Auto-scroll to bottom when streaming response updates
  useEffect(() => {
    if (isStreaming && streamingResponse) {
      scrollToBottom();
    }
  }, [streamingResponse, isStreaming, scrollToBottom]);

  // Fetch existing conversation if available
  useEffect(() => {
    const fetchConversation = async () => {
      if (!draftId) return;
      
      try {
        const response = await fetch(`/api/admin/youtube/claude-conversations/${draftId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.messages && Array.isArray(data.messages)) {
            setMessages(data.messages);
            setSelectedModel(data.model || 'claude-3-5-sonnet-20240620');
          }
        }
      } catch (error) {
        console.error('Error fetching conversation:', error);
      }
    };
    
    fetchConversation();
  }, [draftId]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;
    
    const message = inputMessage.trim();
    setInputMessage('');
    
    // Add user message to chat
    setMessages(prev => [...prev, {
      role: 'user',
      content: message,
      timestamp: new Date()
    }]);
    
    setIsLoading(true);
    setIsStreaming(true);
    setStreamingResponse('');
    
    try {
      // Create AbortController to handle timeouts
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      const response = await fetch('/api/admin/youtube/claude-chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          draftId,
          message,
          model: selectedModel,
          context: {
            transcript: selectedText || transcript, // Use selected text if available, or the full transcript
            videoData: videoData ? {
              title: videoData.title,
              description: videoData.description,
              chapters: videoData.chapters
            } : null
          },
          messages: messages
        }),
        signal: controller.signal
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      clearTimeout(timeoutId);
      
      // Process the stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Stream reader not available');
      }
      
      const decoder = new TextDecoder();
      let streamedContent = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }
        
        // Decode the chunk and process SSE format
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            // Check for the end of the stream
            if (data.trim() === '[DONE]') {
              setIsStreaming(false);
              // Final streamed content added to messages
              setMessages(prev => [...prev, {
                role: 'assistant',
                content: streamedContent,
                timestamp: new Date()
              }]);
              break;
            }
            
            try {
              const parsedData = JSON.parse(data);
              if (parsedData.content) {
                streamedContent += parsedData.content;
                setStreamingResponse(streamedContent);
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
      
      // Set final usage and cost info 
      // Note: For streaming, we'll need to update these stats in a follow-up request
      // or include them in the final [DONE] message
      setTimeout(async () => {
        try {
          const statsResponse = await fetch(`/api/admin/youtube/claude-conversations/${draftId}`);
          if (statsResponse.ok) {
            const data = await statsResponse.json();
            if (data.metadata?.last_cost) {
              setCostEstimate({
                inputCost: data.metadata.last_cost.inputCost,
                outputCost: data.metadata.last_cost.outputCost,
                totalCost: data.metadata.last_cost.totalCost
              });
            }
            
            if (data.metadata?.usage) {
              setUsage(data.metadata.usage);
            }
          }
        } catch (error) {
          console.error('Error fetching usage stats:', error);
        }
      }, 1000);
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to get a response from Claude');
      setIsStreaming(false);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success('Copied to clipboard'))
      .catch(() => toast.error('Failed to copy'));
  };

  const copyToEditor = (text: string) => {
    if (onCopyToEditor) {
      onCopyToEditor(text);
      toast.success('Content copied to editor');
    } else {
      copyToClipboard(text);
      toast.info('Editor copy not available. Copied to clipboard instead.');
    }
  };

  const startNewChat = async () => {
    if (messages.length > 0) {
      const confirmed = window.confirm('Start a new chat? This will save the current conversation but clear the chat window.');
      if (!confirmed) return;
      
      // Save current conversation
      try {
        await saveConversation();
        toast.success('Previous conversation saved');
        setMessages([]);
        setCostEstimate(null);
      } catch (error) {
        toast.error('Failed to save conversation');
        console.error('Error saving conversation:', error);
      }
    } else {
      // No messages to save, just reset
      setMessages([]);
      setCostEstimate(null);
    }
  };

  const saveConversation = async () => {
    if (!draftId || messages.length === 0) return;
    
    try {
      const response = await fetch('/api/admin/youtube/claude-conversations/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          draftId,
          messages,
          model: selectedModel
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error saving conversation:', error);
      throw error;
    }
  };

  const insertPromptTemplate = (template: string) => {
    setInputMessage(template);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Send message on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  };

  // Calculate row height based on content
  const calculateRows = (content: string) => {
    const lines = content.split('\n').length;
    return Math.min(Math.max(3, lines), 8);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="pb-2 flex-shrink-0 border-b">
        <div className="flex justify-between items-center px-4 pt-2">
          <h3 className="font-medium">Claude</h3>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={startNewChat}
              title="Start a new chat"
              className="h-8 text-sm px-2"
            >
              <Plus className="h-4 w-4 mr-1" />
              New Chat
            </Button>
            {onSave && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onSave}
                disabled={isSaving}
                title="Save draft"
                className="h-8 px-2"
              >
                {isSaving ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
      <div className="p-3 flex flex-col gap-2 overflow-hidden h-[calc(100%-3rem)]">
        <div className="mb-2 flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <Label htmlFor="model" className="text-sm">Model</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <InfoIcon className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[350px] text-sm">
                  <p className="mb-2">
                    <strong>Opus:</strong> Most powerful, best for complex tasks<br />
                    <strong>3.7 Sonnet:</strong> Latest and most capable model<br />
                    <strong>3.5 Sonnet:</strong> Balanced power and lower cost<br />
                    <strong>Sonnet:</strong> Balanced power and speed<br />
                    <strong>Haiku:</strong> Fastest, most cost-effective
                  </p>
                  {transcriptLength > 0 && (
                    <div className="border-t pt-2 mt-1">
                      <p className="font-medium mb-1">Estimated cost for full transcript:</p>
                      <div className="grid grid-cols-2 gap-x-2 mt-1">
                        <div>Opus:</div>
                        <div>${calculateCost(transcriptLength, 'claude-3-opus-20240229')}</div>
                        <div>3.7 Sonnet:</div>
                        <div>${calculateCost(transcriptLength, 'claude-3-7-sonnet-20250219')}</div>
                        <div>3.5 Sonnet:</div>
                        <div>${calculateCost(transcriptLength, 'claude-3-5-sonnet-20240620')}</div>
                        <div>Sonnet:</div>
                        <div>${calculateCost(transcriptLength, 'claude-3-sonnet-20240229')}</div>
                        <div>Haiku:</div>
                        <div>${calculateCost(transcriptLength, 'claude-3-haiku-20240307')}</div>
                      </div>
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
            <SelectTrigger id="model" className="text-sm h-8">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="claude-3-7-sonnet-20250219">Claude 3.7 Sonnet (Most intelligent)</SelectItem>
              <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (Latest)</SelectItem>
              <SelectItem value="claude-3-5-haiku-20241022">Claude 3.5 Haiku (Fast)</SelectItem>
              <SelectItem value="claude-3-5-sonnet-20240620">Claude 3.5 Sonnet (Previous)</SelectItem>
              <SelectItem value="claude-3-opus-20240229">Claude 3 Opus (Legacy)</SelectItem>
              <SelectItem value="claude-3-sonnet-20240229">Claude 3 Sonnet (Legacy)</SelectItem>
              <SelectItem value="claude-3-haiku-20240307">Claude 3 Haiku (Legacy)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex flex-col flex-grow overflow-hidden">
          <div className="flex flex-wrap gap-1 mb-2 flex-shrink-0">
            {promptTemplates.map((template, index) => (
              <Button 
                key={index} 
                variant="outline" 
                size="sm" 
                className="text-sm h-7 px-2"
                onClick={() => insertPromptTemplate(template.template)}
              >
                <Wand2 className="h-3 w-3 mr-1" />
                {template.name}
              </Button>
            ))}
          </div>

          <div className="flex-1 border rounded-md p-2 bg-background mb-2 overflow-y-auto overflow-x-hidden" style={{ maxHeight: 'calc(100% - 10rem)' }}>
            <div className="space-y-3 text-sm h-full">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-6">
                  <p>No messages yet. Start a conversation with Claude.</p>
                  <div className="mt-3">
                    <div className="flex flex-col gap-1">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-sm h-7"
                        onClick={() => insertPromptTemplate("Summarize the key features and benefits of this laser machine based on the transcript.")}
                      >
                        Summarize features & benefits
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-sm h-7"
                        onClick={() => insertPromptTemplate("Write a detailed pros and cons section for this laser machine based on the video transcript.")}
                      >
                        Generate pros & cons
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-sm h-7"
                        onClick={() => insertPromptTemplate("Write a paragraph about the build quality and durability of this machine based on the video.")}
                      >
                        Write about build quality
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`rounded-lg p-2 max-w-[90%] ${
                        msg.role === 'user' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      }`}>
                        <div className="whitespace-pre-wrap break-words text-sm">
                          {msg.content}
                        </div>
                        <div className="mt-1 flex justify-between items-center">
                          <div className="text-xs opacity-70">
                            {msg.timestamp && new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                          {msg.role === 'assistant' && (
                            <div className="flex gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={() => copyToClipboard(msg.content)}
                                title="Copy to clipboard"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={() => copyToEditor(msg.content)}
                                title="Copy to editor"
                              >
                                <Clipboard className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Display streaming response */}
                  {isStreaming && streamingResponse && (
                    <div className="flex justify-start">
                      <div className="rounded-lg p-2 max-w-[90%] bg-muted">
                        <div className="whitespace-pre-wrap break-words text-sm">
                          {streamingResponse}
                        </div>
                        <div className="mt-1 flex items-center">
                          <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                          <span className="text-xs opacity-70">Generating...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
          </div>

          <div className="flex-shrink-0 flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              placeholder="Send a message to Claude..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={calculateRows(inputMessage)}
              className="resize-none min-h-[38px] text-sm py-2"
            />
            <Button 
              onClick={sendMessage} 
              size="icon" 
              disabled={isLoading || !inputMessage.trim()}
              className="h-9 w-9 flex-shrink-0"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {usage && (
          <div className="text-xs text-muted-foreground border rounded-md p-1 flex-shrink-0">
            <div className="font-medium mb-0.5">API Usage:</div>
            <div className="grid grid-cols-2 gap-x-2">
              <span>Input:</span>
              <span>{usage.input_tokens} tokens</span>
              <span>Output:</span>
              <span>{usage.output_tokens} tokens</span>
              {usage.cache_read_input_tokens !== undefined && (
                <>
                  <span>Cache Read:</span>
                  <span>{usage.cache_read_input_tokens} (saved {((usage.cache_read_input_tokens || 0) * 0.9).toFixed(0)})</span>
                </>
              )}
            </div>
          </div>
        )}
        
        {costEstimate && (
          <div className="text-xs text-muted-foreground border rounded-md p-1 flex-shrink-0">
            <div className="font-medium mb-0.5">Cost: ${formatCost(costEstimate.totalCost)}</div>
            <div className="grid grid-cols-2 gap-x-2">
              <span>Input:</span>
              <span>${formatCost(costEstimate.inputCost)}</span>
              <span>Output:</span>
              <span>${formatCost(costEstimate.outputCost)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 