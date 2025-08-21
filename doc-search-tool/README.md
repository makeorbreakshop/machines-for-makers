# Documentation Search Tool

A smart documentation search system for laser cutter support, designed to reduce support tickets and improve user experience.

## Project Structure

```
doc-search-tool/
├── components/          # React components
│   ├── SearchBar.tsx   # Main search input with suggestions
│   ├── ResultCard.tsx  # Individual search result display
│   ├── AIResponse.tsx  # Enhanced AI answer component
│   └── FilterBar.tsx   # Filter by manufacturer, doc type
├── lib/                # Core functionality
│   ├── pinecone.ts     # Pinecone vector DB integration
│   ├── embeddings.ts   # OpenAI embeddings
│   ├── search.ts       # Search orchestration
│   └── parser.ts       # PDF/HTML parsing utilities
├── pages/              # Next.js pages
│   └── search.tsx      # Main search interface
├── types/              # TypeScript types
│   └── index.ts        # Shared type definitions
├── styles/             # Component styles
│   └── search.module.css
└── data/               # Mock data for development
    └── mock-results.json
```

## Design Principles

1. **Trust Through Transparency** - Always show sources
2. **Human-First Language** - Natural queries, no technical jargon
3. **Delightful Efficiency** - Minimal steps to answers
4. **Progressive Disclosure** - Simple by default, powerful when needed
5. **Mobile-First** - Works perfectly on all devices

## Features

### Phase 1 (Current)
- [x] Mock data search interface
- [x] Two-tier results (documentation links + AI summaries)
- [ ] Relevance scoring visualization
- [ ] Source credibility indicators

### Phase 2 (Planned)
- [ ] Real documentation ingestion pipeline
- [ ] Pinecone vector search integration
- [ ] Analytics dashboard for manufacturers
- [ ] Multi-language support

### Phase 3 (Future)
- [ ] Image/screenshot support
- [ ] Voice interface integration
- [ ] Direct support ticket creation
- [ ] Manufacturer white-label version

## Tech Stack

- **Frontend**: Next.js, TypeScript, Tailwind CSS
- **Vector DB**: Pinecone
- **Embeddings**: OpenAI text-embedding-3-small
- **LLM**: GPT-4 for enhanced answers
- **Parsing**: PDF.js, Cheerio for HTML