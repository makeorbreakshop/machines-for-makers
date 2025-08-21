'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Sparkles, FileText, AlertCircle, ChevronRight, Clock, ThumbsUp, ExternalLink, BookOpen, Shield } from 'lucide-react';
import mockData from '../data/mock-results.json';

// Airbnb-inspired design system
const design = {
  colors: {
    primary: '#FF385C',        // Airbnb red for primary actions
    primaryHover: '#E31C3D',
    secondary: '#00A699',      // Teal for secondary elements  
    text: {
      primary: '#222222',
      secondary: '#717171',
      muted: '#B0B0B0'
    },
    background: {
      primary: '#FFFFFF',
      secondary: '#F7F7F7',
      elevated: '#FFFFFF'
    },
    border: '#DDDDDD',
    success: '#008A05',
    warning: '#F59E0B',
    info: '#0084FF'
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px'
  },
  borderRadius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    full: '9999px'
  },
  shadow: {
    sm: '0 1px 2px rgba(0,0,0,0.08)',
    md: '0 2px 8px rgba(0,0,0,0.12)',
    lg: '0 4px 16px rgba(0,0,0,0.16)',
    xl: '0 8px 28px rgba(0,0,0,0.20)'
  }
};

export default function SearchInterface() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<typeof mockData.searchResults>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [selectedResult, setSelectedResult] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Simulate search with mock data
  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    setResults([]);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 600));
    
    // Filter mock results based on query
    const filtered = mockData.searchResults.filter(result => 
      result.snippet.toLowerCase().includes(query.toLowerCase()) ||
      result.title.toLowerCase().includes(query.toLowerCase()) ||
      result.matchedKeywords.some(kw => kw.toLowerCase().includes(query.toLowerCase()))
    );
    
    setResults(filtered.length > 0 ? filtered : mockData.searchResults.slice(0, 3));
    setIsSearching(false);
  };

  // Focus search on mount
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: design.colors.background.secondary }}>
      {/* Header */}
      <header style={{
        backgroundColor: design.colors.background.primary,
        borderBottom: `1px solid ${design.colors.border}`,
        padding: `${design.spacing.md} 0`,
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backdropFilter: 'blur(10px)',
        background: 'rgba(255,255,255,0.95)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: `0 ${design.spacing.lg}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: design.spacing.md }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: design.borderRadius.sm,
                background: `linear-gradient(135deg, ${design.colors.primary}, ${design.colors.secondary})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <BookOpen size={20} color="white" />
              </div>
              <div>
                <h1 style={{ 
                  fontSize: '20px', 
                  fontWeight: '600',
                  color: design.colors.text.primary,
                  margin: 0
                }}>
                  Documentation Hub
                </h1>
                <p style={{
                  fontSize: '14px',
                  color: design.colors.text.secondary,
                  margin: 0
                }}>
                  Instant answers from official manufacturer docs
                </p>
              </div>
            </div>
            <div style={{
              display: 'flex',
              gap: design.spacing.sm,
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '12px', color: design.colors.text.muted }}>
                Trusted by 10,000+ makers
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Search Section */}
      <section style={{
        padding: `${design.spacing.xxl} ${design.spacing.lg}`,
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F7F7F7 100%)'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '32px',
            fontWeight: '600',
            textAlign: 'center',
            marginBottom: design.spacing.sm,
            color: design.colors.text.primary
          }}>
            What can we help you with?
          </h2>
          <p style={{
            textAlign: 'center',
            color: design.colors.text.secondary,
            marginBottom: design.spacing.xl
          }}>
            Search across LightBurn, XTool, Glowforge, and 20+ manufacturer docs
          </p>

          {/* Search Bar */}
          <div style={{
            position: 'relative',
            marginBottom: design.spacing.lg
          }}>
            <div style={{
              position: 'relative',
              boxShadow: design.shadow.lg,
              borderRadius: design.borderRadius.full,
              backgroundColor: design.colors.background.primary,
              border: `2px solid ${query ? design.colors.primary : 'transparent'}`,
              transition: 'all 0.2s ease'
            }}>
              <Search 
                size={20} 
                style={{
                  position: 'absolute',
                  left: '24px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: design.colors.text.secondary
                }}
              />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Try 'my laser won't cut through wood' or 'camera alignment'"
                style={{
                  width: '100%',
                  padding: '18px 140px 18px 56px',
                  fontSize: '16px',
                  border: 'none',
                  borderRadius: design.borderRadius.full,
                  outline: 'none',
                  color: design.colors.text.primary
                }}
              />
              <button
                onClick={handleSearch}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  padding: '10px 20px',
                  backgroundColor: design.colors.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: design.borderRadius.full,
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = design.colors.primaryHover}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = design.colors.primary}
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{
            display: 'flex',
            gap: design.spacing.sm,
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            {mockData.suggestedQueries.slice(0, 4).map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => {
                  setQuery(suggestion);
                  handleSearch();
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: design.colors.background.primary,
                  border: `1px solid ${design.colors.border}`,
                  borderRadius: design.borderRadius.full,
                  fontSize: '14px',
                  color: design.colors.text.secondary,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = design.colors.text.primary;
                  e.currentTarget.style.color = design.colors.text.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = design.colors.border;
                  e.currentTarget.style.color = design.colors.text.secondary;
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Results Section */}
      {results.length > 0 && (
        <section style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: `0 ${design.spacing.lg} ${design.spacing.xxl}`
        }}>
          {/* Results Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: design.spacing.lg
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: design.spacing.md }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: design.colors.text.primary,
                margin: 0
              }}>
                {results.length} relevant results
              </h3>
              <button
                onClick={() => setShowAI(!showAI)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: design.spacing.xs,
                  padding: '6px 12px',
                  backgroundColor: showAI ? design.colors.secondary : 'transparent',
                  color: showAI ? 'white' : design.colors.secondary,
                  border: `1px solid ${design.colors.secondary}`,
                  borderRadius: design.borderRadius.full,
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <Sparkles size={16} />
                AI Summary {showAI ? 'On' : 'Off'}
              </button>
            </div>
          </div>

          {/* AI Summary (if enabled) */}
          {showAI && (
            <div style={{
              backgroundColor: 'linear-gradient(135deg, #F0F9FF, #E0F2FE)',
              background: 'linear-gradient(135deg, #F0F9FF, #E0F2FE)',
              border: `1px solid ${design.colors.info}`,
              borderRadius: design.borderRadius.md,
              padding: design.spacing.lg,
              marginBottom: design.spacing.lg
            }}>
              <div style={{ display: 'flex', gap: design.spacing.md }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: design.borderRadius.sm,
                  backgroundColor: design.colors.info,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Sparkles size={20} color="white" />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: design.colors.text.primary,
                    marginBottom: design.spacing.sm
                  }}>
                    AI Summary
                  </h4>
                  <p style={{
                    fontSize: '14px',
                    lineHeight: '1.6',
                    color: design.colors.text.primary,
                    marginBottom: design.spacing.md
                  }}>
                    Based on the documentation, your issue with cutting might be related to power and speed settings. 
                    For 3mm birch plywood, the recommended settings are 15mm/s at 80% power. Make sure to:
                    1) Check your focus is properly set
                    2) Clean your lens if it hasn\'t been done recently
                    3) Ensure air assist is running at 20-30 PSI
                    4) Perform a test cut on scrap material first
                  </p>
                  <div style={{
                    display: 'flex',
                    gap: design.spacing.md,
                    fontSize: '14px'
                  }}>
                    <button style={{
                      color: design.colors.info,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}>
                      View sources (3)
                    </button>
                    <button style={{
                      color: design.colors.text.secondary,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer'
                    }}>
                      Copy answer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search Results */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.md }}>
            {results.map((result) => (
              <div
                key={result.id}
                onClick={() => setSelectedResult(result.id)}
                style={{
                  backgroundColor: design.colors.background.primary,
                  border: `1px solid ${selectedResult === result.id ? design.colors.primary : design.colors.border}`,
                  borderRadius: design.borderRadius.md,
                  padding: design.spacing.lg,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: selectedResult === result.id ? design.shadow.md : design.shadow.sm
                }}
                onMouseEnter={(e) => {
                  if (selectedResult !== result.id) {
                    e.currentTarget.style.boxShadow = design.shadow.md;
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedResult !== result.id) {
                    e.currentTarget.style.boxShadow = design.shadow.sm;
                  }
                }}
              >
                {/* Result Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: design.spacing.md
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: design.spacing.sm,
                      marginBottom: design.spacing.xs
                    }}>
                      {/* Source Badge */}
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        backgroundColor: result.source.type === 'official' ? '#E3F2FD' : '#FFF3E0',
                        color: result.source.type === 'official' ? '#1976D2' : '#F57C00',
                        borderRadius: design.borderRadius.sm,
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {result.source.type === 'official' && <Shield size={12} />}
                        {result.source.manufacturer}
                      </span>
                      
                      {/* Relevance Score */}
                      <span style={{
                        fontSize: '12px',
                        color: design.colors.success,
                        fontWeight: '500'
                      }}>
                        {Math.round(result.relevanceScore * 100)}% match
                      </span>

                      {/* Last Updated */}
                      <span style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        color: design.colors.text.muted
                      }}>
                        <Clock size={12} />
                        {new Date(result.source.lastUpdated).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      color: design.colors.text.primary,
                      marginBottom: design.spacing.sm,
                      display: 'flex',
                      alignItems: 'center',
                      gap: design.spacing.sm
                    }}>
                      {result.title}
                      <ExternalLink size={16} style={{ color: design.colors.text.muted }} />
                    </h3>

                    {/* Snippet */}
                    <p style={{
                      fontSize: '14px',
                      lineHeight: '1.6',
                      color: design.colors.text.secondary,
                      marginBottom: design.spacing.md
                    }}>
                      {result.snippet}
                    </p>

                    {/* Metadata */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: design.spacing.lg,
                      fontSize: '13px',
                      color: design.colors.text.muted
                    }}>
                      <span>{result.source.documentTitle}</span>
                      {result.source.section && (
                        <>
                          <ChevronRight size={14} />
                          <span>{result.source.section}</span>
                        </>
                      )}
                      {result.source.pageNumber && (
                        <>
                          <ChevronRight size={14} />
                          <span>Page {result.source.pageNumber}</span>
                        </>
                      )}
                    </div>

                    {/* Helpfulness Stats */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: design.spacing.md,
                      marginTop: design.spacing.md,
                      paddingTop: design.spacing.md,
                      borderTop: `1px solid ${design.colors.border}`
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '13px',
                        color: design.colors.text.secondary
                      }}>
                        <ThumbsUp size={14} />
                        <span>{result.helpfulnessMetrics.helpful.toLocaleString()} found helpful</span>
                      </div>
                      <div style={{
                        fontSize: '13px',
                        color: design.colors.success,
                        fontWeight: '500'
                      }}>
                        {Math.round((result.helpfulnessMetrics.resolved / result.helpfulnessMetrics.views) * 100)}% resolution rate
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Common Issues Section (when no search) */}
      {results.length === 0 && !isSearching && (
        <section style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: `0 ${design.spacing.lg} ${design.spacing.xxl}`
        }}>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '600',
            marginBottom: design.spacing.lg,
            color: design.colors.text.primary
          }}>
            Common Issues
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: design.spacing.md
          }}>
            {mockData.commonIssues.map((issue) => (
              <div
                key={issue.issue}
                style={{
                  backgroundColor: design.colors.background.primary,
                  border: `1px solid ${design.colors.border}`,
                  borderRadius: design.borderRadius.md,
                  padding: design.spacing.lg,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => {
                  setQuery(issue.issue);
                  handleSearch();
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = design.shadow.md;
                  e.currentTarget.style.borderColor = design.colors.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = design.colors.border;
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: design.spacing.md
                }}>
                  <AlertCircle size={20} style={{ color: design.colors.warning, flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <h4 style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      marginBottom: design.spacing.xs,
                      color: design.colors.text.primary
                    }}>
                      {issue.issue}
                    </h4>
                    <span style={{
                      fontSize: '12px',
                      padding: '2px 8px',
                      backgroundColor: issue.frequency === 'Very Common' ? '#FEE2E2' : '#FEF3C7',
                      color: issue.frequency === 'Very Common' ? '#DC2626' : '#D97706',
                      borderRadius: design.borderRadius.sm,
                      fontWeight: '500'
                    }}>
                      {issue.frequency}
                    </span>
                    <p style={{
                      fontSize: '13px',
                      color: design.colors.text.secondary,
                      marginTop: design.spacing.sm
                    }}>
                      Quick fix: {issue.quickFix}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}