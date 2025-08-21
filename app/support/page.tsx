'use client';

import { useState } from 'react';
import { Search, Sparkles, FileText, MessageSquare, ChevronRight, Loader2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

// This is a mockup component for demonstration
export default function SupportPage() {
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'docs' | 'ai'>('docs');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  // Mock search function for demo
  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    // Simulate API call
    setTimeout(() => {
      setResults([
        {
          id: 1,
          title: 'Setting Up Your First Project in LightBurn',
          snippet: 'Learn how to import designs, set laser parameters, and configure your workspace for optimal cutting and engraving...',
          source: 'LightBurn Documentation',
          url: 'https://docs.lightburn.com/setup/first-project',
          relevance: 0.95,
          manufacturer: 'LightBurn'
        },
        {
          id: 2,
          title: 'Material Settings Guide',
          snippet: 'Comprehensive guide to laser settings for different materials including wood, acrylic, leather, and metal...',
          source: 'XTool Manual',
          url: 'https://support.xtool.com/materials',
          relevance: 0.89,
          manufacturer: 'XTool'
        },
        {
          id: 3,
          title: 'Troubleshooting Connection Issues',
          snippet: 'If your laser is not connecting to LightBurn, check these common solutions including driver updates and cable connections...',
          source: 'LightBurn Support',
          url: 'https://docs.lightburn.com/troubleshooting/connection',
          relevance: 0.82,
          manufacturer: 'LightBurn'
        }
      ]);
      setIsSearching(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Documentation Hub</h1>
                <p className="text-sm text-gray-500">Instant answers from manufacturer docs</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Powered by</span>
              <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded">
                <img src="/lightburn-logo.svg" alt="LightBurn" className="h-4" />
                <span className="text-xs">+5 more</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="max-w-4xl mx-auto px-4 pt-12 pb-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">How can we help you today?</h2>
          <p className="text-gray-600">Search across documentation from LightBurn, XTool, Glowforge, and more</p>
        </div>

        {/* Search Mode Toggle */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
            <button
              onClick={() => setSearchMode('docs')}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-md transition-all',
                searchMode === 'docs' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <FileText className="inline h-4 w-4 mr-2" />
              Documentation Search
            </button>
            <button
              onClick={() => setSearchMode('ai')}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-md transition-all',
                searchMode === 'ai' 
                  ? 'bg-purple-600 text-white shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <Sparkles className="inline h-4 w-4 mr-2" />
              AI Assistant
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={searchMode === 'ai' 
                ? "Ask me anything about your laser cutter..." 
                : "Search documentation (e.g., 'how to engrave acrylic')"
              }
              className="w-full pl-12 pr-32 py-4 text-lg border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2.5 rounded-lg font-medium transition-all",
                searchMode === 'ai'
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              )}
            >
              {isSearching ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                'Search'
              )}
            </button>
          </div>

          {/* Popular Searches */}
          <div className="flex gap-2 mt-3">
            <span className="text-sm text-gray-500">Popular:</span>
            {['First setup', 'Material settings', 'Connection issues', 'Speed & power'].map((term) => (
              <button
                key={term}
                onClick={() => {
                  setQuery(term);
                  handleSearch();
                }}
                className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Section */}
      {results.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 pb-12">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Found {results.length} relevant documents
            </p>
            <button className="text-sm text-blue-600 hover:text-blue-700">
              Filter by manufacturer
            </button>
          </div>

          <div className="space-y-4">
            {results.map((result) => (
              <div
                key={result.id}
                className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow cursor-pointer group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                        {result.manufacturer}
                      </span>
                      <span className="text-xs text-gray-500">{result.source}</span>
                      <div className="flex items-center gap-1">
                        <div className="h-1.5 w-1.5 bg-green-500 rounded-full" />
                        <span className="text-xs text-green-600">{Math.round(result.relevance * 100)}% match</span>
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold mb-2 group-hover:text-blue-600 transition-colors">
                      {result.title}
                    </h3>
                    <p className="text-gray-600 text-sm line-clamp-2">
                      {result.snippet}
                    </p>
                  </div>
                  <ExternalLink className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors ml-4" />
                </div>
              </div>
            ))}
          </div>

          {searchMode === 'ai' && (
            <div className="mt-6 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-5">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-600 rounded-lg">
                  <MessageSquare className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-2">AI Summary</h4>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    Based on the documentation, here\'s what you need to know: First, ensure your laser cutter is properly connected via USB or network. 
                    In LightBurn, go to Devices → Find My Laser to auto-detect your machine. For material settings, start with the recommended presets 
                    for your specific material type, then fine-tune the power and speed based on test cuts. Remember that darker materials typically 
                    require less power than lighter ones for engraving.
                  </p>
                  <div className="mt-3 flex items-center gap-4">
                    <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                      Ask follow-up question
                    </button>
                    <button className="text-sm text-gray-500 hover:text-gray-700">
                      View sources
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Features Section */}
      {results.length === 0 && !isSearching && (
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Search className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-2">Smart Search</h3>
              <p className="text-sm text-gray-600">
                Semantic search across all manufacturer documentation with relevance scoring
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Sparkles className="h-5 w-5 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">AI Assistant</h3>
              <p className="text-sm text-gray-600">
                Get instant answers with context from multiple documentation sources
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <FileText className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="font-semibold mb-2">Always Updated</h3>
              <p className="text-sm text-gray-600">
                Documentation automatically synced daily from manufacturer sources
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}