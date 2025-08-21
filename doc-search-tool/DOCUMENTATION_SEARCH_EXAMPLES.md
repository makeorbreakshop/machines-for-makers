# Documentation Search Examples

A curated list of documentation sites with different search implementations, from simple keyword search to advanced AI-powered solutions.

## Hybrid Search (Keyword + Smart Features)

### Vercel Documentation
- **URL**: https://vercel.com/docs
- **Technology**: Likely Algolia or custom hybrid search
- **Features**: Instant results, fuzzy matching, categorized results
- **Notable**: Extremely fast, keyboard navigation (Cmd+K), contextual results

### Stripe Documentation
- **URL**: https://stripe.com/docs
- **Technology**: Algolia DocSearch
- **Features**: Multi-product search, code examples in results, API reference search
- **Notable**: Searches across docs, API references, and guides simultaneously

### Tailwind CSS
- **URL**: https://tailwindcss.com/docs
- **Technology**: Algolia DocSearch
- **Features**: Instant search, keyboard shortcuts, utility class search
- **Notable**: Excellent for finding specific CSS utilities quickly

## Pure Algolia Implementations

### Algolia's Own Documentation (Meta Example)
- **URL**: https://www.algolia.com/doc/
- **Technology**: Algolia (obviously)
- **Features**: AI-powered "Ask AI" feature, traditional search results, categorized documentation
- **Notable**: Perfect example of hybrid approach - shows both instant keyword results AND optional AI assistance
- **UI Pattern**: Split interface with:
  - Top section: "Ask AI" for natural language queries (e.g., "how do I build something cool")
  - Bottom section: Traditional documentation results showing instant matches
  - Clear "Powered by Algolia" branding
  - Keyboard navigation (arrow keys to navigate, ESC to close)
- **Example Query Response**: When asking "how do I build something cool", the interface shows:
  - AI interpretation at top understanding the natural language
  - Below that, actual documentation matches about searchable attributes, API references, custom ranking, etc.

### React Documentation
- **URL**: https://react.dev
- **Technology**: Algolia DocSearch
- **Features**: Version-specific search, categorized results, search suggestions
- **Notable**: Free tier of Algolia for open source

### Vue.js Documentation
- **URL**: https://vuejs.org/guide/
- **Technology**: Algolia DocSearch
- **Features**: Multi-version docs, API search, guide search
- **Notable**: Clean implementation of Algolia's standard DocSearch

### Laravel Documentation
- **URL**: https://laravel.com/docs
- **Technology**: Algolia
- **Features**: Version switching, instant results, weighted search
- **Notable**: Searches across multiple doc versions simultaneously

## Third-Party Search Platforms

### Inkeep
- **URL**: https://inkeep.com/
- **Customers**: Anthropic, Pinecone, PostHog, and others
- **Technology**: Hybrid AI search platform as a service
- **Features**: Dual-mode interface, LLM integration, analytics dashboard
- **Notable**: Becoming the go-to solution for AI-powered documentation search
- **Pricing**: Custom pricing, focused on enterprise

## AI/Semantic Search

### Supabase Documentation
- **URL**: https://supabase.com/docs
- **Technology**: AI-powered search with GPT integration
- **Features**: Natural language queries, AI summaries, semantic understanding
- **Notable**: "Ask AI" feature alongside traditional search

### Anthropic Documentation
- **URL**: https://docs.anthropic.com
- **Technology**: Powered by Inkeep (https://inkeep.com/)
- **Features**: Dual-mode search interface, natural language understanding, contextual results
- **Notable**: Uses Inkeep's hybrid search platform (ironically not their own Claude directly)
- **UI Pattern**: 
  - **Search Bar**: Standard keyword search with instant results
  - **"Ask Claude" Tab**: Natural language AI assistance for complex queries (via Inkeep)
  - **Categorized Results**: Docs, Support, Home, GitHub sections with result counts
  - **Smart Snippets**: Shows relevant context from documentation
- **Example Query**: "how do i make something cool" returns:
  - Claude Code quickstart and common workflows
  - Prompt Library examples (Direction decoder, Email extractor, Culinary creator)
  - Each result shows breadcrumb navigation and relevant snippet
- **Key Innovation**: Inkeep provides the infrastructure for both search modes

### Pinecone Documentation
- **URL**: https://docs.pinecone.io
- **Technology**: Vector search (eating their own dog food)
- **Features**: Semantic search, similarity matching
- **Notable**: Uses their own vector database for docs search

## Self-Hosted Solutions

### Meilisearch Demo
- **URL**: https://www.meilisearch.com/docs
- **Technology**: Meilisearch (self-hosted)
- **Features**: Typo tolerance, instant search, faceted search
- **Notable**: Open source alternative to Algolia

### Typesense Showcase
- **URL**: https://typesense.org/docs/
- **Technology**: Typesense
- **Features**: Typo tolerance, instant search, geo search
- **Notable**: Lightning fast, self-hosted option

## Traditional But Effective

### MDN Web Docs
- **URL**: https://developer.mozilla.org
- **Technology**: Custom ElasticSearch implementation
- **Features**: Comprehensive web API search, browser compatibility data
- **Notable**: Massive scale, excellent categorization

### PostgreSQL Documentation
- **URL**: https://www.postgresql.org/docs/
- **Technology**: PostgreSQL full-text search
- **Features**: Version-specific search, comprehensive indexing
- **Notable**: Dogfooding - uses PostgreSQL's own search capabilities

### Python Documentation
- **URL**: https://docs.python.org
- **Technology**: Sphinx search
- **Features**: Module index, general index, full-text search
- **Notable**: Simple but effective for technical documentation

## Specialized Search Implementations

### GitHub Docs
- **URL**: https://docs.github.com
- **Technology**: Custom search with filtering
- **Features**: Product filtering, version selection, instant results
- **Notable**: Excellent filtering by product area

### AWS Documentation
- **URL**: https://docs.aws.amazon.com
- **Technology**: Custom implementation
- **Features**: Service filtering, multi-language support
- **Notable**: Handles massive documentation corpus

### Kubernetes Documentation
- **URL**: https://kubernetes.io/docs/
- **Technology**: Algolia + custom filters
- **Features**: Version switching, concept/task/reference categorization
- **Notable**: Complex technical documentation made searchable

## Laser/Maker-Specific Documentation

### Thunder Laser Support
- **URL**: https://support.thunderlaserusa.com
- **Technology**: Zoho Desk knowledge base
- **Features**: Category browsing, ticket integration, basic search
- **Notable**: Traditional support portal approach

### Glowforge Support
- **URL**: https://support.glowforge.com
- **Technology**: Zendesk Guide
- **Features**: Article search, community forums, troubleshooting guides
- **Notable**: Well-organized troubleshooting trees

### LightBurn Documentation
- **URL**: https://docs.lightburnsoftware.com
- **Technology**: GitBook
- **Features**: Version-specific docs, searchable manual
- **Notable**: PDF export available, comprehensive manual approach

## Key Observations

### The UI Dichotomy Pattern
Based on the Algolia and Anthropic/Inkeep examples, modern doc search is converging on a **dual approach**:
1. **Primary**: Fast keyword search for users who know what they want
2. **Secondary**: AI/semantic layer for complex natural language queries

**Industry Standard Emerging**: 
- Major players (Algolia, Inkeep) offer nearly identical UI patterns
- Tab or toggle to switch between "Search" and "Ask AI"
- Same query can be processed both ways
- Results show traditional matches AND offer AI interpretation

**The Irony**: Even Anthropic, maker of Claude, uses a third-party service (Inkeep) for their documentation search rather than building their own. This shows the complexity of building good documentation search and the value of specialized platforms.

This isn't an either/or decision - the best implementations offer both, letting users choose their preferred interaction style. The pattern is becoming so common it's essentially the new standard for modern documentation.

### For Simple Documentation Sites
- **Algolia DocSearch** dominates (free for open source)
- Fast, reliable, minimal setup
- Good enough for 90% of use cases

### For Advanced Use Cases
- **Semantic/AI search** for complex technical queries
- **Hybrid approaches** combining keyword + semantic
- Custom implementations for specific needs

### For Laser Cutter Documentation
- Current solutions are basic (Zendesk, Zoho)
- Opportunity for unified cross-manufacturer search
- Users struggle with terminology differences between brands

## Implementation Recommendations

1. **Start Simple**: Algolia DocSearch or Meilisearch
2. **Add Intelligence**: Semantic search for "no results" fallback
3. **Focus on UX**: Instant results, keyboard navigation, mobile-friendly
4. **Consider Hybrid**: Best of both worlds for technical documentation

## Cost Considerations

- **Algolia DocSearch**: Free for open source/documentation
- **Meilisearch/Typesense**: Self-hosted, infrastructure costs only
- **Semantic Search**: Embedding costs + vector database storage
- **Hybrid**: Can be cost-optimized with caching and smart routing