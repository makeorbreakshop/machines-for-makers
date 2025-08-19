# Product Requirements Document: Manufacturer Website Discovery & Import System

## Executive Summary

Expand the Machines for Makers platform to track entire manufacturer websites, automatically discover products, and import them into our database with improved data normalization. This system will support multiple machine types beyond lasers (3D printers, CNCs, UV printers, DTF printers, etc.) while maintaining backward compatibility with existing systems.

## Goals & Objectives

### Primary Goals
1. Track ~50 manufacturer websites to discover and import their full product catalogs
2. Expand machine type support beyond lasers to include 3D printers, CNCs, and other manufacturing equipment
3. Create a reliable data normalization layer to handle format mismatches
4. Maintain backward compatibility with existing price tracking system

### Success Metrics
- Successfully import products from 50 manufacturer sites
- 90%+ accuracy in automated data extraction
- Zero disruption to existing price tracking functionality
- Reduce manual data entry time by 80%

## Scope

### In Scope
- Website crawler for product discovery
- Enhanced data extraction and normalization
- Admin approval workflow for discovered products
- Support for multiple machine types
- Variant grouping system (non-breaking)

### Out of Scope
- Retailer website tracking (Amazon, etc.)
- Real-time product updates
- Breaking changes to existing database schema
- Automated price selector discovery (V1)
- Complex bundle/kit detection

## User Stories

### As an Admin, I want to:
1. Add a manufacturer website and discover all their products
2. Review discovered products in a grid with key information visible
3. Bulk approve/reject discovered products
4. Have products automatically categorized by machine type
5. See when products match existing entries in our database
6. Have all scraped data properly formatted for our database

## System Architecture

### Updated Architecture with Scrapfly API

With the shift to Scrapfly's API service, the architecture has evolved to leverage their AI extraction capabilities:

**Key Changes:**
1. **No Manual Crawling**: Scrapfly handles JavaScript rendering and anti-bot measures
2. **AI Product Extraction**: Built-in `extraction_model='product'` for automatic data extraction
3. **Category-Based Discovery**: Instead of sitemaps, we discover from category/collection pages
4. **Credit-Based Pricing**: Each extraction costs credits (base + multipliers for features)

### Database Schema Additions

```sql
-- Track manufacturer websites
CREATE TABLE manufacturer_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES brands(id),
  base_url text NOT NULL,
  sitemap_url text,
  scraping_config jsonb DEFAULT '{}',
  last_full_scan timestamp,
  scan_frequency interval DEFAULT '30 days',
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now()
);

-- Discovery queue for new products
CREATE TABLE discovered_machines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid REFERENCES manufacturer_sites(id),
  discovered_url text NOT NULL UNIQUE,
  page_title text,
  raw_html text, -- Cache for reprocessing
  extracted_data jsonb, -- AI extraction result
  normalized_data jsonb, -- After normalization
  validation_status text DEFAULT 'pending', -- pending, passed, failed
  validation_errors jsonb,
  import_status text DEFAULT 'pending', -- pending, approved, rejected, duplicate, imported
  machine_id uuid REFERENCES machines(id), -- if imported
  duplicate_of_id uuid REFERENCES machines(id), -- if duplicate
  similarity_score float, -- 0-1 score for duplicate detection
  discovered_at timestamp DEFAULT now(),
  reviewed_at timestamp,
  reviewed_by text,
  notes text
);

-- Track scraping runs
CREATE TABLE site_scan_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid REFERENCES manufacturer_sites(id),
  scan_type text NOT NULL, -- 'discovery', 'update'
  status text DEFAULT 'running', -- running, completed, failed
  products_found integer DEFAULT 0,
  new_products integer DEFAULT 0,
  pages_crawled integer DEFAULT 0,
  started_at timestamp DEFAULT now(),
  completed_at timestamp,
  error_log jsonb,
  cost_usd decimal(10,4) -- Track AI costs
);

-- Simple variant grouping (non-breaking)
ALTER TABLE machines ADD COLUMN IF NOT EXISTS parent_machine_id uuid REFERENCES machines(id);
ALTER TABLE machines ADD COLUMN IF NOT EXISTS is_variant boolean DEFAULT false;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS variant_name text;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS variant_order integer DEFAULT 0;

-- Product lifecycle tracking
ALTER TABLE machines ADD COLUMN IF NOT EXISTS lifecycle_status text DEFAULT 'active';
-- Values: 'active', 'discontinued', 'coming_soon', 'archived'
ALTER TABLE machines ADD COLUMN IF NOT EXISTS last_seen_at timestamp DEFAULT now();
ALTER TABLE machines ADD COLUMN IF NOT EXISTS discontinued_at timestamp;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS discovery_source text DEFAULT 'manual';
-- Values: 'manual', 'crawler', 'api'
```

### Component Architecture (Updated with Scrapfly)

```
┌─────────────────────────────────────────────────────────────┐
│                     Admin Interface                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ Site Manager │  │  Discovery   │  │  Import Review  │ │
│  │              │  │   Trigger    │  │      Grid       │ │
│  └──────────────┘  └──────────────┘  └─────────────────┘ │
│                            │                    │          │
└────────────────────────────┼────────────────────┼──────────┘
                             │                    │
┌────────────────────────────┼────────────────────┼──────────┐
│                            ▼                    ▼          │
│  ┌──────────────────────────────────────────────────────┐ │
│  │          Scrapfly-Powered Discovery Service           │ │
│  ├──────────────────────────────────────────────────────┤ │
│  │                                                      │ │
│  │  ┌──────────┐  ┌────────────┐  ┌────────────────┐  │ │
│  │  │ Category │→ │  Scrapfly  │→ │   Normalizer   │  │ │
│  │  │ Discovery│  │AI Extract  │  │                │  │ │
│  │  └──────────┘  └────────────┘  └────────────────┘  │ │
│  │       │             │                │              │ │
│  │       │      ┌──────────────┐       │              │ │
│  │       └─────→│ Credit Mgmt  │←──────┘              │ │
│  │              └──────────────┘                      │ │
│  └──────────────────────────────────────────────────────┘ │
│                            ▼                              │
│  ┌──────────────────────────────────────────────────┐ │
│  │              Database Tables                      │ │
│  │  - manufacturer_sites                            │ │
│  │  - discovered_machines                           │ │
│  │  - machines (existing)                          │ │
│  └──────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Research-First Approach

### Why Research Matters

Instead of guessing what specifications each machine type needs, we'll discover them by studying actual manufacturer websites. This ensures:

1. **Accurate Data Model**: We capture what manufacturers actually track
2. **Better Normalization**: We know the variations to expect
3. **Reduced Manual Work**: Less fixing during import
4. **Future-Proof**: Easy to add new machine types

### Research Process

For each new machine type:

1. **Site Analysis** (2-3 hours per manufacturer)
   - Visit 3-5 major manufacturer websites
   - Screenshot their product pages
   - Note specification tables
   - Document filter options
   - Identify unique features

2. **Pattern Recognition**
   - Which specs appear on all sites?
   - Which are manufacturer-specific?
   - How are units formatted?
   - What terminology varies?

3. **Build Specification Map**
   ```javascript
   // Example from 3D printer research
   const discovered = {
     'build_volume': {
       variations: ['Build Volume', 'Print Size', 'Max Build Dimensions'],
       formats: ['256x256x256mm', '256 × 256 × 256 mm', '10.08" x 10.08" x 10.08"'],
       appears_on: ['bambulab.com', 'prusa3d.com', 'creality.com'],
       frequency: '100%',
       make_required: true
     },
     'auto_bed_leveling': {
       variations: ['ABL', 'Auto-leveling', 'Automatic Bed Leveling'],
       formats: ['Yes/No', 'Standard', 'Not included'],
       appears_on: ['bambulab.com', 'prusa3d.com'],
       frequency: '67%',
       make_required: false
     }
   };
   ```

## Detailed Features

### 1. Manufacturer Site Management

**Admin UI Features:**
- Add/edit manufacturer websites
- Set custom crawl configurations per site
- View crawl history and statistics
- Manual trigger for discovery crawl

**Configuration Options:**
```javascript
{
  "crawl_delay": 3000, // milliseconds
  "user_agent": "MachinesForMakers/1.0",
  "respect_robots": true,
  "product_url_patterns": [
    "/products/*",
    "/laser-engravers/*",
    "/machines/*"
  ],
  "exclude_patterns": [
    "/blog/*",
    "/support/*"
  ],
  "use_sitemap": true
}
```

### 2. Product Discovery with Scrapfly (Updated)

**Discovery Process:**
1. Load manufacturer site configuration with category URLs
2. Use Scrapfly to render JavaScript-heavy category pages
3. Extract product URLs from rendered HTML
4. Use Scrapfly's AI extraction on each product page
5. Store extracted data for normalization

**Scrapfly Integration Details:**
- API-based extraction (no local Puppeteer needed)
- Automatic JavaScript rendering with `render_js=True`
- Anti-bot protection bypass with `asp=True`
- AI product extraction with `extraction_model='product'`
- Credit tracking per request

**Credit Cost Structure:**
```javascript
// Base cost: 1 credit
// Multipliers:
// - JavaScript rendering (render_js): 5x
// - Anti-bot bypass (asp): 10x
// - AI extraction: 10x
// Total for product page: 1 × 5 × 10 × 10 = 500 credits
// Actual observed: ~50-100 credits per product
```

### 3. Enhanced Data Extraction

**Extraction Pipeline:**
1. Use existing scraper code
2. Try structured data first (JSON-LD, microdata)
3. Fall back to CSS selectors
4. Use Claude AI for complex extractions
5. Cache all AI responses

**Cost Management:**
- Track cost per extraction (~$0.01-0.02)
- Monthly budget alerts
- Reuse cached extractions

### 4. Data Normalization System

**Normalization Pipeline:**

```javascript
class MachineDataNormalizer {
  // Main normalization flow
  normalize(rawData, machineType) {
    let normalized = rawData;
    
    // Step 1: Clean and standardize fields
    normalized = this.standardizeUnits(normalized);
    normalized = this.cleanPrices(normalized);
    
    // Step 2: Map to database columns
    normalized = this.mapFieldNames(normalized);
    
    // Step 3: Transform data types
    normalized = this.transformBooleans(normalized);
    normalized = this.transformDates(normalized);
    
    // Step 4: Handle relationships
    normalized = this.matchBrands(normalized);
    normalized = this.assignCategories(normalized, machineType);
    
    // Step 5: Validate
    const validation = this.validate(normalized, machineType);
    
    return { normalized, validation };
  }
}
```

**Key Transformations:**

1. **Boolean Conversion:**
```javascript
// Input: true/false, 1/0, "yes"/"no", "on"/"off"
// Output: "Yes"/"No" for database
wifi: true → "Wifi": "Yes"
has_enclosure: false → "Enclosure": "No"
```

2. **Field Name Mapping:**
```javascript
const fieldMap = {
  'machine_name': 'Machine Name',
  'laser_power_a': 'LaserPower A', // Note: no space
  'excerpt_short': 'Excerpt (Short)',
  'is_featured': 'Is A Featured Resource?',
  'work_area': 'Work Area',
  'max_speed': 'Engraving Speed Max'
};
```

3. **Unit Standardization:**
```javascript
// Power: Convert all to watts with "W" suffix
"60 watts" → "60W"
"0.06kW" → "60W"
"60000mW" → "60W"

// Speed: Convert all to mm/min
"1000 mm/s" → "60000 mm/min"
"60 m/min" → "60000 mm/min"

// Dimensions: Standardize format
"400x400mm" → "400 x 400 mm"
"15.7 × 15.7 inches" → "400 x 400 mm"
```

4. **Brand Matching:**
```javascript
// Fuzzy match company names to existing brands
"Commarker" → UUID of "ComMarker"
"xTool" → UUID of "XTool"
// If no match, store original and flag for review
```

5. **Category Assignment:**
```javascript
const categoryRules = {
  'laser': {
    keywords: ['laser', 'engraver', 'cutter'],
    subcategories: {
      'diode': ['diode', 'blue laser', '450nm'],
      'co2': ['co2', 'glass tube'],
      'fiber': ['fiber', 'metal marking', 'mopa']
    }
  },
  '3d-printer': {
    keywords: ['3d printer', 'fdm', 'resin', 'sla'],
    subcategories: {
      'fdm': ['filament', 'fdm', 'fff'],
      'resin': ['resin', 'sla', 'msla', 'dlp']
    }
  }
};
```

### 5. Machine Type Support

**Research-Driven Specification Discovery:**

Instead of pre-defining specifications, we'll discover them through manufacturer research:

```javascript
// Phase 0: Research each machine type
const MACHINE_TYPE_RESEARCH = {
  'laser': {
    manufacturers_to_study: ['ComMarker', 'xTool', 'Atomstack', 'Ortur', 'Sculpfun'],
    existing_specs: true // We already know laser specs
  },
  '3d-printer': {
    manufacturers_to_study: ['Bambu Lab', 'Prusa', 'Creality', 'Anycubic', 'Elegoo'],
    research_questions: [
      "What specs do they highlight on product pages?",
      "What filters do they offer?",
      "What's in their comparison tables?",
      "What unique features do they track?"
    ]
  },
  'cnc': {
    manufacturers_to_study: ['Shapeoko', 'Onefinity', 'Avid CNC', 'OpenBuilds', 'Inventables'],
    research_questions: [
      "How do they describe cutting area?",
      "What motor/spindle specs matter?",
      "What differentiates models?"
    ]
  },
  'uv-printer': {
    manufacturers_to_study: ['Roland', 'Mimaki', 'Epson', 'Canon'],
    research_questions: [
      "What print specifications are standard?",
      "How is ink system described?",
      "What materials compatibility is listed?"
    ]
  }
};

// Discovered specs will be stored in database
CREATE TABLE machine_type_specifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_type text NOT NULL,
  specification_key text NOT NULL,
  display_name text,
  data_type text, -- 'number', 'text', 'boolean', 'dimensions'
  unit text,
  is_required boolean DEFAULT false,
  validation_rules jsonb,
  discovered_from text[], -- Which sites we found this on
  created_at timestamp DEFAULT now(),
  UNIQUE(machine_type, specification_key)
);
```

**Dynamic Specification Learning:**

```javascript
class SpecificationDiscovery {
  async researchManufacturer(url, machineType) {
    // 1. Crawl product pages
    const products = await this.crawlProducts(url);
    
    // 2. Extract all specifications found
    const discoveredSpecs = {};
    for (const product of products) {
      const specs = await this.extractSpecs(product);
      // Track which specs appear and how often
      this.aggregateSpecs(discoveredSpecs, specs);
    }
    
    // 3. Identify patterns
    const patterns = {
      commonSpecs: [], // Specs that appear on >80% of products
      occasionalSpecs: [], // Specs that appear on 20-80%
      rareSpecs: [], // Specs that appear on <20%
      formatVariations: {} // Different ways same spec is presented
    };
    
    // 4. Store findings
    await this.storeDiscoveredSpecs(machineType, patterns);
    
    return patterns;
  }
}
```

### 6. Import Review Interface

**Grid View Features:**
- Thumbnail, name, model, price, category
- Status badges (new, duplicate, invalid)
- Similarity scores for potential duplicates
- Validation errors highlighted
- Bulk selection and actions

**Actions:**
- Approve → Create as draft machine
- Reject → Mark as rejected
- Mark as duplicate → Link to existing machine
- Edit → Open in modal for corrections
- Bulk approve/reject

**Smart Defaults:**
- Auto-assign categories based on keywords
- Pre-select for approval if validation passes
- Flag for review if missing required fields

### 7. Quality Validation

**Validation Rules:**
```javascript
const validationRules = {
  common: {
    required: ['name', 'price', 'image'],
    price: { min: 10, max: 1000000 },
    name: { minLength: 3, maxLength: 200 }
  },
  laser: {
    power: { min: 0.1, max: 10000 },
    work_area: { minDimension: 10, maxDimension: 10000 }
  }
};
```

**Quality Checks:**
- Price reasonableness (not $0, not $999999)
- Required fields present
- Image URL valid and accessible
- No placeholder/default values
- Machine-type specific validations

## Implementation Plan

### Phase 0: Machine Type Research (Week 1)
1. Research 3-5 manufacturers per machine type
2. Document common specifications and formats
3. Identify unique features per manufacturer
4. Create initial specification templates
5. Build specification discovery system

### Phase 1: Foundation (Week 1-2)
1. Create database tables (including machine_type_specifications)
2. Build manufacturer site management UI
3. Implement basic crawler
4. Set up discovered_machines storage

### Phase 2: Extraction & Normalization (Week 2-3)
1. Enhance existing scraper for full product data
2. Build comprehensive normalizer based on research findings
3. Add validation system
4. Create test suite with real manufacturer data

### Phase 3: Review Interface (Week 3-4)
1. Build discovery review grid
2. Implement bulk actions
3. Add duplicate detection
4. Create import workflow
5. Add specification preview/edit capabilities

### Phase 4: Machine Type Expansion (Week 4-5)
1. Start with lasers (existing knowledge)
2. Add 3D printers based on research
3. Add CNCs based on research
4. Test with real manufacturer sites
5. Refine normalizer based on discoveries

### Phase 5: Polish & Launch (Week 5-6)
1. Add monitoring and error reporting
2. Performance optimization
3. Documentation
4. Import first 10 manufacturer sites
5. Gather feedback and refine

## Scrapfly Integration Issues to Address

### Current Problems
1. **Data Flow Mismatch**: 
   - Scrapfly returns structured product data
   - Our normalizer expects different field names
   - The simplified discovery service isn't properly transforming between formats

2. **Missing Data Transformation**:
   - Scrapfly provides data like `offers`, `specifications`, `images` arrays
   - Our normalizer expects flat fields like `price`, `work_area`, etc.
   - Need intermediate transformation layer

3. **Category URL Configuration**:
   - Sites need category URLs instead of just base URLs
   - Different sites have different category structures
   - Need to update manufacturer_sites configuration

4. **Credit Usage Visibility**:
   - No UI indication of credit costs
   - No budget tracking or alerts
   - Need credit usage dashboard

### Required Updates
1. **Update SimplifiedDiscoveryService**:
   - Transform Scrapfly's nested data to flat structure
   - Extract prices from `offers` array
   - Convert `specifications` array to key-value pairs
   - Handle image arrays properly

2. **Update Manufacturer Sites**:
   - Add `category_urls` field to configuration
   - Update existing sites with proper category URLs
   - Support multiple categories per site

3. **Improve Data Display**:
   - Fix "Unknown" product names in review interface
   - Show extracted specifications properly
   - Display all images, not just first one

4. **Add Credit Management**:
   - Track credits used per discovery run
   - Show credit costs in UI
   - Add budget limits and warnings

## Technical Considerations

### Performance
- Process sites sequentially to avoid rate limits
- Cache AI extractions aggressively
- Batch database operations
- Use queue system for large crawls

### Error Handling
- Graceful failure for individual products
- Retry logic with exponential backoff
- Manual review queue for failures
- Detailed error logging

### Security
- Respect robots.txt
- Use proper user agent
- Rate limit requests
- No credential harvesting

### Monitoring
- Track success/failure rates
- Monitor AI costs
- Alert on crawler failures
- Dashboard for import statistics

## Success Criteria

1. Successfully import 95%+ of products from test manufacturers
2. Less than 5% require manual correction
3. No disruption to existing price tracking
4. Admin can review and import 100 products in < 10 minutes
5. System handles all planned machine types

## Future Enhancements (Post-V1)

1. Automated price selector discovery
2. Real-time product updates via webhooks
3. Automated duplicate merging
4. Multi-language support
5. API for manufacturer direct integration
6. Advanced bundle/kit detection
7. Regional variant handling
8. Historical product tracking

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|---------|------------|
| Manufacturer blocks crawler | High | Use respectful crawling, rotate user agents, manual fallback |
| AI costs exceed budget | Medium | Implement cost caps, cache aggressively, use AI selectively |
| Data quality issues | High | Comprehensive validation, manual review step, quality metrics |
| Breaking existing system | Critical | Non-breaking changes only, extensive testing, gradual rollout |
| Scope creep | Medium | Stick to MVP features, defer enhancements to V2 |

## Appendix: Example Workflows

### Adding a New Manufacturer
1. Admin adds "https://commarker.com" to manufacturer_sites
2. Triggers discovery crawl
3. System finds 47 products
4. Extracts data using AI + scraper
5. Normalizes all data
6. Shows review grid with 43 passed, 4 need review
7. Admin bulk approves 43, fixes 4
8. Creates 47 draft machines
9. Admin publishes to live site

### Handling Variants
1. Discovers "ComMarker B6 MOPA 20W", "30W", "60W"
2. Recognizes as variants (same model, different power)
3. Creates three separate machines (current approach)
4. Links them with parent_machine_id
5. Frontend can group for display
6. Price tracking continues independently