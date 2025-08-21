# Documentation Search Tool

A proof-of-concept documentation search interface that searches through laser cutter documentation and provides relevant results with links to official sources.

## Features

- **Real Content**: 15 chunks of actual LightBurn documentation
- **Keyword Search**: Simple but effective keyword matching algorithm
- **Source Links**: Opens official documentation in new tabs
- **Chat Interface**: Conversational UI with follow-up questions
- **AI/Docs Modes**: Toggle between documentation search and AI-assisted responses

## Running the Demo

```bash
npm run dev
# Navigate to http://localhost:3000/doc-search
```

## Test Searches

Try these searches to see the system in action:

| Search Term | Expected Results |
|------------|------------------|
| `birch` | Material settings for birch plywood (15mm/s at 80% power) |
| `acrylic` | Cast acrylic cutting settings (20mm/s at 60% power) |
| `focus` | Focus adjustment and calibration information |
| `camera` | Camera calibration setup instructions |
| `not cutting` | Troubleshooting guide for cutting issues |
| `rotary` | Rotary attachment setup |
| `leather` | Leather engraving settings |
| `15mm/s` | Specific speed setting matches |
| `80%` | Power setting matches |

## Testing

```bash
# Run all tests
npm test

# Run unit tests only
npm test -- search-algorithm.test.ts

# Run with coverage
npm test:coverage
```

## Test Results

- **17/17** Unit tests passing (search algorithm)
- **30/36** Integration tests passing (UI components)
- **100%** Search algorithm coverage

## Architecture

### Search Algorithm
```javascript
// Simple keyword scoring
- Text matches: 2 points
- Title matches: 3 points (higher priority)
- Section matches: 2 points
- Results sorted by score, top 5 returned
```

### Data Structure
```json
{
  "id": "lb-001",
  "text": "Full text content...",
  "title": "Section title",
  "section": "Subsection",
  "source_url": "https://docs.site.com",
  "page": 47,
  "manufacturer": "LightBurn"
}
```

## Next Steps for Production

1. **Add Real Embeddings**
   - Use Sentence Transformers or OpenAI embeddings
   - Implement cosine similarity for semantic search

2. **Vector Database**
   - Local: ChromaDB, LanceDB, or SQLite-VSS
   - Cloud: Pinecone, Weaviate, or Qdrant

3. **Full PDF Processing**
   - Extract all pages from documentation
   - Smart chunking with overlap
   - Preserve formatting and structure

4. **Web Scraping**
   - Pull from manufacturer websites
   - Keep documentation up-to-date
   - Handle versioning

5. **Performance**
   - Implement caching layer
   - Pre-compute embeddings
   - Optimize search response time

## Legal Considerations

- Links to official documentation only
- No republishing of copyrighted content
- Always attribute sources
- Respect robots.txt and terms of service