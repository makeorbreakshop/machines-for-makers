'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Sparkles, FileText, ChevronRight, Clock, ExternalLink, Shield, CheckCircle, X, Send, User, Bot, Book, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import mockData from '@/doc-search-tool/data/mock-results.json';
import lightburnChunks from '@/doc-search-tool/data/lightburn-chunks.json';

type Message = {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  results?: typeof mockData.searchResults;
  timestamp: Date;
};

export default function DocSearchPage() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [responseMode, setResponseMode] = useState<'docs' | 'ai'>('docs');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch logo on mount
  useEffect(() => {
    fetch('/api/logo')
      .then(res => res.json())
      .then(data => setLogoUrl(data.url))
      .catch(() => setLogoUrl(null));
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setHasSearched(true);
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: searchQuery,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 600));
    
    // Search through real LightBurn chunks using keyword matching
    const searchTerms = searchQuery.toLowerCase().split(' ');
    const scoredChunks = lightburnChunks.chunks.map(chunk => {
      const text = chunk.text.toLowerCase();
      const title = chunk.title.toLowerCase();
      const section = chunk.section.toLowerCase();
      
      // Calculate relevance score based on keyword matches
      let score = 0;
      searchTerms.forEach(term => {
        if (text.includes(term)) score += 2;
        if (title.includes(term)) score += 3;
        if (section.includes(term)) score += 2;
      });
      
      return { chunk, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
    
    // Convert chunks to result format
    const results = scoredChunks.map(({ chunk, score }) => ({
      id: chunk.id,
      title: chunk.title,
      snippet: chunk.text.substring(0, 200) + '...',
      source: {
        type: 'official' as const,
        manufacturer: chunk.manufacturer,
        documentTitle: `${chunk.title} - ${chunk.section}`,
        section: chunk.section,
        pageNumber: chunk.page,
        url: chunk.source_url,
        lastUpdated: '2024-01-15'
      },
      relevanceScore: Math.min(score / 10, 1),
      matchedKeywords: searchTerms.filter(term => chunk.text.toLowerCase().includes(term)),
      helpfulnessMetrics: {
        helpful: Math.floor(Math.random() * 500) + 100,
        notHelpful: Math.floor(Math.random() * 50),
        views: Math.floor(Math.random() * 2000) + 500,
        resolved: Math.floor(Math.random() * 300) + 50
      }
    }));
    
    // Add assistant response
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'assistant',
      content: responseMode === 'ai' 
        ? `Based on the LightBurn documentation, here's what I found about "${searchQuery}":

${results.length > 0 ? results[0].snippet.replace('...', '') : 'No specific information found.'}

${results.length > 1 ? `\nAdditional relevant information:\n• ${results[1].snippet.substring(0, 100)}...` : ''}

I found ${results.length} relevant documentation sections. Click on any result to view the source on LightBurn's official documentation.`
        : `I found ${results.length} relevant documentation sections for "${searchQuery}" in the LightBurn manual.`,
      results: results,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, assistantMessage]);
    setIsSearching(false);
    setQuery('');
  };

  const handleFollowUp = async (followUpQuery: string) => {
    if (!followUpQuery.trim()) return;
    
    setIsSearching(true);
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: followUpQuery,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setChatInput('');
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 600));
    
    // Mock follow-up response
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'assistant',
      content: `Regarding "${followUpQuery}":

The focal length is the distance between your laser lens and the material surface where the beam is most concentrated. For most diode lasers:

• Standard focal length is typically 50-60mm
• Use the focusing tool that came with your laser
• The beam should create the smallest possible dot on the material
• Some users prefer to focus slightly into the material (1-2mm) for cleaner cuts

Would you like me to show you documentation about lens types and their focal lengths?`,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, assistantMessage]);
    setIsSearching(false);
  };

  const openDocument = (docId: string) => {
    // Find the chunk data
    const chunk = lightburnChunks.chunks.find(c => c.id === docId);
    if (chunk) {
      // Open the official LightBurn documentation in a new tab
      window.open(chunk.source_url, '_blank');
      
      // Show a notification that we're opening the source
      const message: Message = {
        id: Date.now().toString(),
        type: 'system',
        content: `Opening LightBurn documentation (Page ${chunk.page}: ${chunk.section})...`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, message]);
    }
  };

  // Initial search screen
  if (!hasSearched) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        {/* Header with Logo */}
        <header className="border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-center">
              {logoUrl ? (
                <Image 
                  src={logoUrl} 
                  alt="Machines for Makers" 
                  width={180} 
                  height={54}
                  priority
                />
              ) : (
                <div className="w-[180px] h-[54px] bg-gray-100 rounded-lg animate-pulse" />
              )}
            </div>
          </div>
        </header>

        {/* Centered Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          {/* Title */}
          <div className="mb-12 text-center">
            <h1 className="text-4xl font-bold mb-4">
              Documentation Search
            </h1>
            <p className="text-lg text-gray-600">
              Search documentation from LightBurn, XTool, Glowforge, and 20+ manufacturers
            </p>
          </div>

          {/* Search Bar */}
          <div className="w-full max-w-3xl">
            <div className="bg-white rounded-xl shadow-lg border p-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <Input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
                    placeholder="Ask anything: 'My laser won't cut through wood' or 'How to align camera'"
                    className="h-12 border-0 pl-10 pr-4 text-base focus-visible:ring-0"
                    autoFocus
                  />
                </div>
                <Tabs value={responseMode} onValueChange={(v) => setResponseMode(v as 'docs' | 'ai')}>
                  <TabsList>
                    <TabsTrigger value="docs">
                      <FileText className="mr-2 h-4 w-4" />
                      Docs
                    </TabsTrigger>
                    <TabsTrigger value="ai">
                      <Sparkles className="mr-2 h-4 w-4" />
                      AI
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <Button 
                  onClick={() => handleSearch(query)}
                  disabled={isSearching}
                  className="h-10 px-6"
                >
                  Search
                </Button>
              </div>
            </div>

            {/* Quick Suggestions */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <span className="text-sm text-gray-500">Popular:</span>
              {mockData.suggestedQueries.slice(0, 4).map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setQuery(suggestion);
                    handleSearch(suggestion);
                  }}
                  className="h-8 text-sm"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Chat interface with split view
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header with Logo */}
      <header className="border-b z-50 relative bg-white">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <Image 
                  src={logoUrl} 
                  alt="Machines for Makers" 
                  width={160} 
                  height={48}
                  priority
                />
              ) : (
                <div className="w-[160px] h-[48px] bg-gray-100 rounded-lg animate-pulse" />
              )}
              <div className="h-8 w-px bg-gray-300" />
              <span className="text-sm font-medium text-gray-600">Documentation Assistant</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                <Sparkles className="mr-1 h-3 w-3" />
                {responseMode === 'ai' ? 'AI Mode' : 'Docs Mode'}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setHasSearched(false);
                  setMessages([]);
                }}
              >
                New Search
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Chat Panel (now full width) */}
        <div className="flex flex-col w-full max-w-4xl mx-auto h-full overflow-hidden">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6">
            <div ref={scrollAreaRef} className="space-y-6">
              {messages.map((message) => (
                <div key={message.id} className="flex gap-3">
                  {/* Avatar */}
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    message.type === 'user' ? "bg-gray-200" : "bg-blue-100"
                  )}>
                    {message.type === 'user' ? (
                      <User className="w-4 h-4 text-gray-600" />
                    ) : (
                      <Bot className="w-4 h-4 text-blue-600" />
                    )}
                  </div>

                  {/* Message Content */}
                  <div className="flex-1 space-y-3">
                    <div className="prose prose-sm max-w-none">
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>

                    {/* Results Cards */}
                    {message.results && (
                      <div className="space-y-3 mt-4">
                        {message.results.map((result) => (
                          <Card 
                            key={result.id} 
                            className="cursor-pointer transition-all hover:shadow-md"
                            onClick={() => openDocument(result.id)}
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge 
                                  variant={result.source.type === 'official' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {result.source.type === 'official' && <Shield className="mr-1 h-3 w-3" />}
                                  {result.source.manufacturer}
                                </Badge>
                                <span className="text-xs text-green-600 font-medium ml-auto">
                                  {Math.round(result.relevanceScore * 100)}% match
                                </span>
                              </div>
                              <CardTitle className="text-base flex items-center gap-2 hover:text-blue-600 transition-colors">
                                {result.title}
                                <Book className="h-4 w-4 opacity-50" />
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">
                                {result.snippet}
                              </p>
                              
                              <div className="flex items-center justify-between mt-3">
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {new Date(result.source.lastUpdated).toLocaleDateString()}
                                  </span>
                                  {result.source.pageNumber && (
                                    <span>Page {result.source.pageNumber}</span>
                                  )}
                                  {result.source.section && (
                                    <span>{result.source.section}</span>
                                  )}
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-7 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openDocument(result.id);
                                  }}
                                >
                                  View Source
                                  <ExternalLink className="ml-1 h-3 w-3" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isSearching && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="inline-flex items-center gap-2 text-sm text-gray-500">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-100" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-200" />
                      <span>Searching documentation...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Input Area */}
          <div className="border-t p-4">
            <div className="flex gap-2 max-w-4xl">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleFollowUp(chatInput)}
                placeholder="Ask a follow-up question..."
                className="flex-1"
                disabled={isSearching}
              />
              <Button
                onClick={() => handleFollowUp(chatInput)}
                disabled={isSearching || !chatInput.trim()}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}