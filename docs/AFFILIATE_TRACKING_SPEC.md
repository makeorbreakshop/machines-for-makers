# Affiliate Sales Tracking System - Technical Specification

## Executive Summary

A comprehensive affiliate sales tracking and reporting system for Machines for Makers to track performance across multiple affiliate programs, provide transparent reporting to brand partners, and demonstrate partnership value for sponsorship negotiations.

## Business Objectives

1. **Track affiliate performance** across multiple laser/CNC brand programs
2. **Demonstrate partnership value** with data-driven reports
3. **Streamline reporting** for quarterly business reviews
4. **Build sponsor confidence** for 2026 sponsorship negotiations
5. **Centralize data** from fragmented affiliate platforms

## System Architecture

### Core Components

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Click Tracking │────▶│  Data Processing │────▶│  Partner Reports│
│  (/go/ links)   │     │  & Attribution   │     │  (Public URLs)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Genius Link    │     │  Sales Import    │     │  Admin Dashboard│
│  Historical API │     │  (CSV Upload)    │     │  (Management)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## Database Schema

### Integration with Existing Systems

The affiliate tracking system leverages the existing link tracking infrastructure:

#### Existing Tables (Already in Production)
- **`short_links`** - Already tracks type='affiliate' links with UTM parameters
- **`link_clicks`** - Captures full click data including device, location, referrer
- **`machines`** - Product database with affiliate_link field

#### Minimal Modifications Needed
```sql
-- Extend existing short_links table
ALTER TABLE short_links ADD COLUMN IF NOT EXISTS 
  machine_id UUID REFERENCES machines(id);

-- Note: program_id can be derived from machine->brand->affiliate_program relationship
-- This avoids data duplication and maintains consistency
```

### New Tables Required

```sql
-- Affiliate Programs Registry (linked to existing brands)
CREATE TABLE affiliate_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID REFERENCES brands(id) UNIQUE,    -- One program per brand
    name VARCHAR(255) NOT NULL,                    -- "xTool Affiliate Program"
    platform VARCHAR(50),                          -- "impact", "shareasale", "direct"
    commission_rate DECIMAL(5,2) DEFAULT 5.00,     -- Default commission %
    commission_structure JSONB,                    -- {"tiers": [...], "special_rates": {...}}
    cookie_window_days INTEGER DEFAULT 30,
    import_config JSONB,                          -- CSV column mappings per platform
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Imported Sales Data
CREATE TABLE affiliate_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID REFERENCES affiliate_programs(id),
    order_number VARCHAR(255),
    order_date TIMESTAMPTZ NOT NULL,
    customer_identifier VARCHAR(255),              -- hashed email or ID
    products JSONB NOT NULL,                       -- array of products
    subtotal DECIMAL(10,2),
    shipping DECIMAL(10,2),
    tax DECIMAL(10,2),
    total DECIMAL(10,2) NOT NULL,
    commission DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    coupon_code VARCHAR(100),
    status VARCHAR(50),                           -- "approved", "pending", "rejected"
    raw_import_data JSONB,                        -- preserve original row
    import_batch_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes for performance
    INDEX idx_program_date (program_id, order_date),
    INDEX idx_coupon (coupon_code),
    UNIQUE (program_id, order_number)
);

-- Product String to Machine Matching (Learning System)
CREATE TABLE product_machine_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID REFERENCES affiliate_programs(id),
    product_string TEXT NOT NULL,                 -- "xTool F2 Ultra 40W Laser Engraver"
    normalized_string TEXT NOT NULL,              -- "xtool f2 ultra 40w"
    machine_id UUID REFERENCES machines(id),
    match_confidence DECIMAL(3,2) DEFAULT 1.00,   -- 1.00 for manual confirms
    matched_by VARCHAR(50),                       -- "auto", "manual", "learned"
    confirmed_at TIMESTAMPTZ,
    confirmed_by TEXT,                            -- Admin email/name
    usage_count INTEGER DEFAULT 0,                -- Times this match was used
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(program_id, normalized_string)
);

-- Partner Reports
CREATE TABLE affiliate_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID REFERENCES affiliate_programs(id),
    report_type VARCHAR(50),                      -- "quarterly", "monthly", "custom"
    name VARCHAR(255) NOT NULL,                   -- "Q4 2024 Performance Report"
    date_start DATE NOT NULL,
    date_end DATE NOT NULL,
    share_slug VARCHAR(100) UNIQUE NOT NULL,      -- "2024-q4-7x9mK2p"
    metrics_snapshot JSONB,                       -- cached metrics
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    generated_by UUID,
    last_accessed_at TIMESTAMPTZ,
    access_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    INDEX idx_share_slug (share_slug)
);

-- Click Attribution (extends existing link_clicks)
CREATE TABLE affiliate_click_attribution (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    link_click_id UUID REFERENCES link_clicks(id),
    program_id UUID REFERENCES affiliate_programs(id),
    machine_id UUID REFERENCES machines(id),
    attribution_confidence DECIMAL(3,2),          -- 0.00 to 1.00
    attributed_sale_id UUID REFERENCES affiliate_sales(id),
    attribution_method VARCHAR(50),               -- "coupon", "time_window", "manual"
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Historical Data Imports
CREATE TABLE import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID REFERENCES affiliate_programs(id),
    import_type VARCHAR(50),                      -- "sales", "clicks", "genius_link"
    filename VARCHAR(255),
    row_count INTEGER,
    success_count INTEGER,
    error_count INTEGER,
    errors JSONB,
    imported_by UUID,
    imported_at TIMESTAMPTZ DEFAULT NOW(),
    processing_time_ms INTEGER
);

-- Genius Link Import Mapping
CREATE TABLE genius_link_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    genius_url VARCHAR(255) UNIQUE,               -- "geni.us/xtool-f2"
    link_title TEXT,
    
    -- Machine matching (nullable for non-machine links)
    machine_id UUID REFERENCES machines(id),
    auto_match_confidence DECIMAL(3,2),           -- 0.00 to 1.00
    match_status VARCHAR(50),                     -- 'auto', 'manual', 'none', 'skipped'
    
    -- For non-machine affiliate links
    link_category VARCHAR(50),                    -- 'machine', 'material', 'course', 'accessory'
    affiliate_program VARCHAR(100),               -- 'amazon', 'xtool', 'shareasale'
    product_description TEXT,
    
    -- Click data from Genius Link
    total_clicks INTEGER,
    first_click_date DATE,
    last_click_date DATE,
    click_data JSONB,                            -- Full historical data
    
    -- Admin tracking
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID,
    import_batch_id UUID REFERENCES import_batches(id)
);

-- Google Analytics Correlation (Optional)
CREATE TABLE analytics_correlation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE,
    machine_id UUID REFERENCES machines(id),
    
    -- Three data sources for correlation
    genius_clicks INTEGER,
    ga_sessions INTEGER,                         -- From GA4 API
    affiliate_sales DECIMAL(10,2),
    
    -- Correlation metrics
    click_to_session_rate DECIMAL(5,2),          -- GA sessions / Genius clicks
    session_to_sale_rate DECIMAL(5,2),           -- Sales / GA sessions
    correlation_score DECIMAL(3,2),              -- 0.00 to 1.00 confidence
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    INDEX idx_date_machine (date, machine_id)
);
```

## Functional Requirements

### 1. Affiliate Program Management

#### Admin Functions
- Add/edit affiliate programs
- Configure commission structures
- Map CSV import columns
- Set cookie windows and attribution rules

#### Supported Programs (Phase 1)
- xTool (Impact platform)
- OneLaser (Direct)
- Omtech (Direct)
- Commarker (Direct)
- ShareASale (Multiple brands)

### 2. Data Import System

#### CSV Import
- Drag-and-drop file upload
- Column mapping interface with auto-detection
- Machine matching with confirmation UI
- Data validation and error reporting
- Duplicate detection
- Batch processing with progress indicators

#### Machine Matching System
```javascript
// Auto-matching with learning
const machineMatching = {
  // First time: Auto-suggest with confirmation
  autoMatch: async (productString) => {
    // Pattern matching for common formats
    const patterns = [
      { regex: /F2\s*Ultra/i, machineSlug: 'xtool-f2-ultra' },
      { regex: /P2S?(?:\s|$)/i, machineSlug: 'xtool-p2s' },
      { regex: /S1\s*40W/i, machineSlug: 'xtool-s1-40w' },
      { regex: /Polar\s*(?:350|550)/i, machineSlug: 'omtech-polar-$1' }
    ];
    
    // Return match with confidence score
    return { 
      suggestedMachine, 
      confidence: 0.85,
      requiresConfirmation: true 
    };
  },
  
  // Store confirmed matches for future use
  learnedMatches: new Map(), // productString -> machineId
  
  // Once confirmed, auto-apply to future imports
  rememberMatch: (productString, machineId) => {
    learnedMatches.set(normalizeProduct(productString), machineId);
  }
};
```

#### Sample CSV Mappings

**xTool Format:**
```javascript
{
  "date": "Date",
  "order_number": "Order Number",
  "subtotal": "Sub-total",
  "total": "Total",
  "commission": "Earning",
  "coupon_code": "Coupon Code",
  "products": "Products",
  "status": "Status"
}
// Example: "10-Sep-2025,320325,USD,8067,0,492.09,8559.09,484.02,approved,XT5HBD1000,xTool F2 Ultra..."
```

**OneLaser Format:**
```javascript
{
  "date": "Create at",
  "order_number": "Order number",
  "customer_name": "Customer",
  "total": "Total sales",
  "quantity": "Quantity",
  "commission": "Commission",
  "status": "Status",
  "referral_id": "Referral ID"
}
// Example: "Sep 8, 2025 3:03 PM,#2186,DAVID RUMBARGER,$6,450.46,4,$322.52,Pending,21320429"
// Note: No product details in OneLaser CSV - requires manual machine assignment
```

### 3. Click Tracking Integration

#### Leveraging Existing `/go/` System

The current link tracking system already captures:
- **Full click data** via `logClickImmediate()` function
- **Device/browser/OS** detection via user agent parsing
- **Geographic data** from Vercel headers (country, region, city)
- **UTM parameters** preservation and tracking
- **Bot detection** with comprehensive pattern matching
- **IP hashing** for privacy-compliant tracking
- **Background enrichment** via `after()` for additional data

#### Link Creation for Affiliates

**Admin-Created Links (YouTube, Email, Social):**
```javascript
// Extended link creation form in /admin/links
const affiliateLink = {
  slug: "f2-ultra-review",
  destination_url: "https://xtool.com/products/f2-ultra?ref=brandon",
  type: "affiliate",  // Already supported
  
  // New fields for affiliate tracking
  machine_id: "uuid-of-f2-ultra",  // Dropdown selector in UI
  program_id: "uuid-of-xtool",     // Auto-set based on machine's brand
  
  // Existing UTM tracking
  utm_source: "youtube",
  utm_medium: "video",
  utm_campaign: "f2-ultra-review",
  utm_content: "description",
  append_utms: true
};
```

**Website Auto-Generated Links:**
```javascript
// Automatic affiliate link generation for machine pages
// When displaying "Affiliate Link" on machine pages:
async function getOrCreateMachineAffiliateLink(machineId) {
  // Check if link exists
  const existingLink = await supabase
    .from('short_links')
    .select('*')
    .eq('machine_id', machineId)
    .eq('type', 'affiliate')
    .eq('utm_source', 'website')
    .single();
    
  if (existingLink) return existingLink;
  
  // Auto-create if not exists
  const machine = await getMachine(machineId);
  return await supabase.from('short_links').insert({
    slug: `buy-${machine.slug}`,  // e.g., "buy-xtool-f2-ultra"
    destination_url: machine.affiliate_link,
    type: 'affiliate',
    machine_id: machineId,
    program_id: machine.affiliate_program_id,
    utm_source: 'website',
    utm_medium: 'product-page',
    utm_campaign: 'organic',
    append_utms: true
  });
}
```

#### Example Flow
```
1. Create link: /go/f2-ultra-yt
2. User clicks from YouTube video description
3. System captures (existing):
   - Click timestamp
   - Referrer: youtube.com
   - Device: mobile/desktop
   - Location: US/CA/San Francisco
   - UTM parameters
4. Redirect to: https://xtool.com/products/f2-ultra?ref=brandon
5. Later: Import sales CSV and correlate
```

### 4. Attribution Logic

#### Primary Methods (in order)
1. **Coupon Code Match** (highest confidence)
   - Direct match: "xToolBrandon" = 100% attribution
   
2. **Time Window Correlation** (medium confidence)
   - Click → Sale within 24 hours = 80% confidence
   - Click → Sale within 7 days = 60% confidence
   - Click → Sale within 30 days = 40% confidence

3. **Manual Assignment** (admin override)
   - For known correlations without tracking

### 5. Partner Reporting

#### Report Types
- **Quarterly**: Automatic Q1-Q4 ranges
- **Monthly**: Calendar month views  
- **Custom**: Any date range

#### Shareable URLs
Format: `/partners/{program-slug}/{report-type}-{identifier}`
Example: `/partners/xtool/2024-q4-7x9mK2p`

#### Report Metrics
```javascript
{
  "overview": {
    "total_revenue": 125000,
    "total_orders": 87,
    "total_commission": 7500,
    "avg_order_value": 1437,
    "conversion_rate": 0.023
  },
  
  "machine_performance": [
    {
      "machine_id": "uuid",
      "machine_name": "xTool F2 Ultra",
      "machine_slug": "xtool-f2-ultra",
      "units_sold": 34,
      "revenue": 67000,
      "commission": 4020,
      "avg_price": 1970,
      "total_clicks": 1214,
      "click_to_sale_ratio": 0.028,
      "top_traffic_source": "youtube"
    },
    {
      "machine_name": "xTool P2S",
      "units_sold": 12,
      "revenue": 45000,
      // ... etc
    }
  ],
  
  "traffic_sources": {
    "youtube": { "clicks": 3200, "sales": 45, "revenue": 89000 },
    "instagram": { "clicks": 827, "sales": 12, "revenue": 18000 },
    "email": { "clicks": 800, "sales": 30, "revenue": 18000 },
    "website": { "clicks": 450, "sales": 8, "revenue": 12000 }
  },
  
  "unmatched_products": [
    // Products from CSV that couldn't be matched to machines
    { "product_string": "xTool Accessories Bundle", "orders": 15, "revenue": 2500 }
  ],
  
  "timeline": {
    "daily_sales": [...],
    "daily_clicks": [...],
    "daily_revenue": [...]
  }
}
```

### 6. Admin Dashboard

#### Key Pages

**Programs Overview** (`/admin/affiliate-programs`)
- List all programs with key metrics
- Quick stats: YTD revenue, commissions, conversion rates
- Add new program button

**Sales Management** (`/admin/affiliate-sales`)
- View all imported sales
- Filter by program, date, status
- Bulk actions: approve, reject, reassign

**Import Center** (`/admin/affiliate-import`)
- Upload CSV interface
- Import history log
- Error resolution tools

**Reports Generator** (`/admin/affiliate-reports`)
- Create new reports
- View existing reports
- Copy shareable links
- Preview before sharing

## Technical Implementation

### Technology Stack
- **Frontend**: Next.js 15 (existing), React, Tailwind CSS
- **Backend**: Next.js API routes with Edge runtime where possible
- **Database**: Supabase PostgreSQL
- **File Storage**: Supabase Storage for CSV uploads
- **Authentication**: Existing admin auth system

### API Integrations

#### Genius Link API (Historical Data Import)

**Available Data:**
- Click metrics by hour/day/month/lifetime
- Device/OS/Browser breakdown
- Geographic data (country/region)
- Referrer sources
- Product-level data for iTunes/Amazon
- **Note**: No direct sales/conversion data available

**Authentication:**
```javascript
// Headers required for all requests
const headers = {
  'X-Api-Key': process.env.GENIUS_LINK_API_KEY,
  'X-Api-Secret': process.env.GENIUS_LINK_API_SECRET
};

// Store credentials in .env.local
GENIUS_LINK_API_KEY=xxx
GENIUS_LINK_API_SECRET=xxx
```

**Import Strategy:**
```javascript
// 1. Fetch all Genius Links
const geniusLinks = await fetchGeniusLinks();

// 2. Auto-match to machines with confirmation UI
const matches = geniusLinks.map(link => ({
  url: link.url,
  autoMatch: autoMatchToMachine(link.url, link.title),
  category: detectLinkCategory(link.url)
}));

// 3. Import as historical click data
for (const link of confirmedMatches) {
  // Create placeholder short_link
  await createHistoricalShortLink({
    slug: `genius-import-${link.id}`,
    destination_url: link.url,
    machine_id: link.matched_machine_id,
    type: 'affiliate'
  });
  
  // Import click history to link_clicks table
  await importClickHistory(link.clicks);
}
```

**Auto-Match Logic:**
```javascript
function autoMatchGeniusLink(url, title) {
  const patterns = {
    'f2-ultra|f2ultra': 'xTool F2 Ultra',
    'p2s|p2-s': 'xTool P2S',
    's1-40w|s1-40': 'xTool S1 40W',
    'glowforge-pro': 'Glowforge Pro',
    'omtech-polar': 'OMTech Polar'
  };
  
  // Return match with confidence score
  for (const [pattern, machine] of Object.entries(patterns)) {
    if (new RegExp(pattern, 'i').test(url + title)) {
      return { machine, confidence: 0.85 };
    }
  }
  return { machine: null, confidence: 0 };
}
```

#### Google Analytics 4 Integration (Optional)

**Purpose**: Enhance attribution confidence by correlating traffic data

**Data Points:**
```javascript
// GA4 Report for correlation
{
  dimensions: ['date', 'landingPage', 'sessionSource'],
  metrics: ['sessions', 'activeUsers'],
  filters: {
    sessionSource: 'contains geni.us OR genius'
  }
}
```

**Correlation Scoring:**
```javascript
function calculateAttributionConfidence(date, machine) {
  const signals = {
    couponMatch: 1.0,      // Direct attribution
    clickAndSale: 0.7,     // Click + sale same day
    gaSessionMatch: 0.8,   // GA session + sale
    timeWindow: 0.4        // Sale within 30 days
  };
  
  // Calculate weighted confidence score
  return Math.min(weightedAverage(signals), 1.0);
}
```

### Security Considerations
- API credentials encrypted at rest
- Shareable report URLs use non-guessable slugs
- No PII in reports (hash customer identifiers)
- Admin-only access to raw sales data
- Rate limiting on public report endpoints

## User Interface Design

### Admin Views

#### Import Wizard
```
┌──────────────────────────────────────┐
│  Import Sales Data                   │
├──────────────────────────────────────┤
│  Program: [xTool        ▼]           │
│                                      │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐        │
│  │  Drop CSV file here       │       │
│  │  or click to browse       │       │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘        │
│                                      │
│  [Cancel]            [Next: Map →]   │
└──────────────────────────────────────┘
```

#### Report Builder
```
┌──────────────────────────────────────┐
│  Generate Partner Report             │
├──────────────────────────────────────┤
│  Program:     xTool                  │
│  Type:        ○ Monthly              │
│               ● Quarterly             │
│               ○ Custom Range          │
│  Period:      Q4 2024                │
│                                      │
│  Include:     ☑ Sales Metrics        │
│               ☑ Traffic Sources       │
│               ☑ Product Breakdown     │
│               ☐ Detailed Timeline     │
│                                      │
│  [Generate Report]                   │
└──────────────────────────────────────┘
```

### Partner-Facing Reports

#### Report Layout
- Machines for Makers branding header
- Executive summary cards
- Interactive charts (using Recharts)
- Expandable detailed sections
- Mobile-responsive design

## Implementation Phases

### Phase 1: MVP (Week 1-2)
- [ ] Database schema setup
  - [ ] Create affiliate_programs table
  - [ ] Create affiliate_sales table
  - [ ] Extend short_links with machine_id, program_id
  - [ ] Create import_batches table
- [ ] Admin pages
  - [ ] /admin/affiliate-programs - CRUD operations
  - [ ] /admin/affiliate-import - CSV upload interface
  - [ ] /admin/affiliate-sales - View and manage sales
- [ ] CSV import for xTool format
  - [ ] Parse xTool export format
  - [ ] Validate and deduplicate orders
  - [ ] Store raw data in JSONB
- [ ] Basic report generation
  - [ ] Quarterly date range reports
  - [ ] Simple metrics calculation
  - [ ] Generate shareable slugs
- [ ] Partner report page
  - [ ] /partners/[program]/[report-slug]
  - [ ] Machines for Makers branded
  - [ ] Mobile responsive

### Phase 2: Historical Data & Attribution (Week 3-4)
- [ ] Genius Link integration
  - [ ] API authentication setup
  - [ ] Fetch all historical links
  - [ ] Auto-match interface with confirmation
  - [ ] Import historical clicks to link_clicks
  - [ ] Handle non-machine affiliate links
- [ ] Attribution system
  - [ ] Coupon code matching (100% confidence)
  - [ ] Time-window correlation
  - [ ] Confidence scoring algorithm
- [ ] Enhanced reporting
  - [ ] Click funnel visualization
  - [ ] Attribution confidence breakdown
  - [ ] Product performance metrics
  - [ ] Traffic source analysis

### Phase 3: Scale & Polish (Month 2)
- [ ] Additional program support
  - [ ] OneLaser, Omtech, Commarker setup
  - [ ] ShareASale import adapter
  - [ ] Generic CSV mapper tool
- [ ] Google Analytics integration (optional)
  - [ ] GA4 API setup
  - [ ] Session correlation
  - [ ] Enhanced confidence scoring
- [ ] Advanced features
  - [ ] Bulk operations interface
  - [ ] Report templates
  - [ ] Automated monthly reports
  - [ ] Performance dashboard
- [ ] Export capabilities
  - [ ] PDF report generation
  - [ ] PowerPoint export for pitches
  - [ ] CSV data export

## Success Metrics

### Technical KPIs
- CSV import success rate > 95%
- Report generation < 3 seconds
- Attribution match rate > 60%
- Zero data loss during imports

### Business KPIs
- Generate first xTool Q4 report
- Track $100K+ in affiliate revenue
- Support 5+ affiliate programs
- Reduce reporting time by 80%

## Maintenance & Support

### Regular Tasks
- Monthly: Import new sales data
- Quarterly: Generate partner reports
- Ongoing: Monitor attribution accuracy
- As-needed: Add new affiliate programs

### Data Retention
- Sales data: Indefinite
- Click data: 2 years
- Reports: Indefinite
- Import logs: 1 year

## Appendix

### Sample Data Formats

#### xTool CSV Format (Impact Platform)
```csv
Date,Order Number,Currency,Sub-total,Shipping,Tax,Total,Earning,Status,Coupon Code,Products
10-Sep-2025,320325,USD,8067,0,492.09,8559.09,484.02,approved,XT5HBD1000,"xTool F2 Ultra..."
```
**Key features:** 
- Includes product details for machine matching
- Has coupon codes for direct attribution
- Currency and tax details included

#### OneLaser CSV Format (Direct)
```csv
"Create at","Referral ID","Order number","Customer","Customer address","Total sales","Quantity","Commission","Status"
"Sep 8, 2025 3:03 PM","21320429","#2186","DAVID RUMBARGER","[address]","$6,450.46","4","$322.52","Pending"
```
**Key differences:**
- NO product details (requires manual machine assignment)
- Includes customer info (will be ignored for privacy)
- Different date format and currency formatting
- Has quantity but no item breakdown

#### ShareASale Format
```csv
Transaction Date,Transaction ID,Amount,Commission,Status,Merchant,Sub-Affiliate
2024-09-10,123456,299.99,18.00,Approved,LaserCo,youtube-video-123
```
**Key features:**
- Sub-Affiliate field can track video/content source
- Simple format with essential data only

### Error Handling

#### Import Errors
- Duplicate order numbers → Skip with warning
- Invalid date formats → Attempt parsing, flag for review
- Missing required fields → Reject row, log error
- Currency mismatch → Convert or flag

### Future Enhancements
- API integration with Impact platform
- Automated commission reconciliation
- Predictive revenue modeling
- A/B test tracking for content
- Multi-currency support
- White-label partner portals

---

*Document Version: 1.0*  
*Last Updated: 2025-09-11*  
*Author: Machines for Makers Development Team*