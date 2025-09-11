# Affiliate Tracking System - Implementation TODO

## Overview
Build a practical affiliate sales tracking system that leverages existing infrastructure and focuses on demonstrating partnership value through quarterly reports.

## Phase 1: Database & Core Infrastructure (Week 1)

### 1.1 Database Migrations
- [x] ~~Create migration file: `supabase/migrations/001_affiliate_tracking.sql`~~ **DONE: Applied step-by-step via SQL**
  - [x] ~~Create `affiliate_programs` table (linked to brands)~~ **DONE**
  - [x] ~~Create `affiliate_sales` table for imported data~~ **DONE**
  - [x] ~~Create `product_machine_matches` table for learning system~~ **DONE**
  - [x] ~~Create `import_batches` table for tracking imports~~ **DONE**
  - [x] ~~Add `machine_id` column to `short_links` table~~ **DONE**
  - [x] ~~Create basic indexes for performance~~ **DONE**

**Test:** 
- [x] ~~Run migration on local Supabase~~ **DONE: Applied via copy-paste SQL**
- [x] ~~Verify foreign keys work with existing brands/machines~~ **DONE: FK constraints in place**
- [ ] Test inserting sample data for xTool program

### 1.2 Affiliate Programs Setup
- [x] ~~Create `/app/(admin)/admin/affiliate-programs/page.tsx`~~ **DONE: Created at `/admin/affiliate/programs/`**
- [x] ~~Build simple CRUD interface:~~ **DONE**
  - [x] ~~List view showing all programs with commission rates~~ **DONE: Table with stats cards**
  - [x] ~~Create/Edit form with brand selector dropdown~~ **DONE: New program form**
  - [ ] CSV column mapping configuration (stored as JSON) **DEFERRED: Will configure during import**
- [x] ~~Create API routes:~~ **DONE**
  - [x] ~~`/api/admin/affiliate-programs` - GET/POST~~ **DONE: Full CRUD API**
  - [ ] `/api/admin/affiliate-programs/[id]` - PUT/DELETE **TODO: Edit/Delete endpoints**
- [x] ~~Added navigation to admin sidebar~~ **DONE: Marketing section with submenu**

**Test:**
- [ ] Create xTool program linked to xTool brand
- [ ] Set commission rate to 6%
- [ ] Configure CSV mappings for xTool format
- [ ] Verify program appears in list

## Phase 2: CSV Import & Machine Matching ✅ COMPLETE

### 2.1 Import Interface ✅
- [x] ~~Create `/app/(admin)/admin/affiliate-import/page.tsx`~~ **DONE: Created at `/admin/affiliate/import/`**
  - [x] ~~Drag-and-drop CSV upload area~~ **DONE: React-dropzone implementation**
  - [x] ~~Program selector dropdown~~ **DONE: Loads active programs**
  - [x] ~~Preview first 5 rows after upload~~ **DONE: CSV preview with column detection**
  - [x] ~~Show import progress/status~~ **DONE: Multi-step wizard with progress**

### 2.2 Machine Matching System ✅
- [x] ~~Create `/lib/services/affiliate-matching.ts`~~ **DONE: AI-powered pattern matching**
  - [x] ~~Pattern matching for xTool products (F2 Ultra, P2S, etc.)~~ **DONE: Full model support**
  - [x] ~~Normalize product strings for comparison~~ **DONE: Token-based matching**
  - [x] ~~Check existing matches in `product_machine_matches`~~ **DONE: Confidence scoring**
  - [x] ~~Return suggestions with confidence scores~~ **DONE: High/Medium/Low confidence**

- [x] ~~Build matching UI component:~~ **DONE: Advanced matching interface with performance fixes**
  - [x] ~~Show unmatched products from CSV~~ **DONE: Table view with filtering**
  - [x] ~~Display suggested machine matches~~ **DONE: With confidence badges**
  - [x] ~~Allow manual selection via searchable dropdown~~ **DONE: Override capability**
  - [x] ~~"Confirm All" and individual confirm buttons~~ **DONE: Auto-Match + Accept buttons**
  - [x] ~~Save confirmed matches for future use~~ **DONE: Stores with machine_id**
  - [x] ~~Batch selection with shift+click~~ **DONE: Fast selection for 500+ rows**
  - [x] ~~Test import mode (10 records)~~ **DONE: Preview before full import**
  - [x] ~~Session caching~~ **DONE: Survives page reloads**

### 2.3 Import Processing ✅
- [x] ~~Create `/api/admin/affiliate-import/process` endpoint~~ **DONE: Full CSV processing**
  - [x] ~~Parse CSV based on program's column mappings~~ **DONE: Auto-detect columns**
  - [x] ~~Insert sales records with machine IDs~~ **DONE: With machine matching**
  - [x] ~~Handle duplicates (check order number + program)~~ **DONE: Skip existing orders**
  - [x] ~~Return import summary~~ **DONE: Detailed results with counts**
  - [x] ~~Match products to machines (auto + confirmed)~~ **DONE: Full matching system**

**Test Scenarios:**
- [ ] Import xTool CSV with 10 orders
  - [ ] Verify "xTool F2 Ultra" auto-matches correctly
  - [ ] Confirm match and re-import - should remember
  - [ ] Check sales appear in database with correct machine_id
- [ ] Import OneLaser CSV (no products)
  - [ ] Should prompt for manual machine assignment
  - [ ] Test assigning different machines to orders
- [ ] Test duplicate prevention
  - [ ] Import same CSV twice, verify no duplicates

## Phase 3: Link Management Integration (Week 2)

### 3.1 Extend Link Creation
- [ ] Update `/app/(admin)/admin/links/new/page.tsx`
  - [ ] Add machine selector dropdown (searchable)
  - [ ] Auto-populate program based on machine's brand
  - [ ] Show only when type = "affiliate"

- [ ] Update `/app/(admin)/admin/links/[id]/edit/page.tsx`
  - [ ] Add machine field to edit form
  - [ ] Show related click stats if available

### 3.2 Automatic Website Links
- [ ] Create `/lib/services/affiliate-links.ts`
  - [ ] `getOrCreateMachineAffiliateLink(machineId)` function
  - [ ] Auto-generate slug: `buy-{machine-slug}`
  - [ ] Set UTM source as "website"

- [ ] Update machine detail pages:
  - [ ] Replace static affiliate link with dynamic `/go/` link
  - [ ] Track clicks through existing system

**Test:**
- [ ] Create affiliate link for xTool F2 Ultra
  - [ ] Verify machine association saved
  - [ ] Test redirect works correctly
  - [ ] Check click tracking captures machine_id
- [ ] Visit machine page on website
  - [ ] Verify auto-generated link created
  - [ ] Test click tracking from product page

## Phase 4: Reporting System (Week 2)

### 4.1 Report Generation
- [ ] Create `/app/(admin)/admin/affiliate-reports/page.tsx`
  - [ ] List existing reports with share links
  - [ ] "Generate Report" button with options:
    - [ ] Program selector
    - [ ] Quarter selector (Q1-Q4 2024, 2025)
    - [ ] Include/exclude unmatched products

- [ ] Create `/lib/services/affiliate-reports.ts`
  - [ ] Calculate metrics per machine:
    - [ ] Total sales, revenue, commission
    - [ ] Click data from `link_clicks` table
    - [ ] Click-to-sale ratio
  - [ ] Aggregate by traffic source
  - [ ] Generate shareable slug
  - [ ] Cache metrics in `affiliate_reports` table

### 4.2 Public Report Pages
- [ ] Create `/app/partners/[program]/[slug]/page.tsx`
  - [ ] Clean, professional layout with MFM branding
  - [ ] Overview cards (revenue, orders, commission)
  - [ ] Machine performance table
  - [ ] Traffic source breakdown
  - [ ] Simple bar charts (using Recharts)
  - [ ] Mobile responsive

**Test Scenarios:**
- [ ] Generate Q4 2024 report for xTool
  - [ ] Import test data for Oct-Dec 2024
  - [ ] Verify calculations are correct
  - [ ] Test shareable link works without auth
- [ ] Test with mixed data:
  - [ ] Some matched products (shows per machine)
  - [ ] Some unmatched (shows in separate section)
  - [ ] Verify totals add up correctly

## Phase 5: Testing & Validation (Week 2-3)

### 5.1 End-to-End Testing
- [ ] Complete flow for xTool:
  1. [ ] Create affiliate program
  2. [ ] Import October 2024 sales CSV
  3. [ ] Confirm machine matches
  4. [ ] Create YouTube affiliate links
  5. [ ] Generate Q4 report
  6. [ ] Verify partner can access report

- [ ] Test OneLaser flow:
  1. [ ] Create program for OneLaser brand
  2. [ ] Import CSV without product data
  3. [ ] Manually assign machines
  4. [ ] Generate report

### 5.2 Data Validation
- [ ] Commission calculations:
  - [ ] xTool at 6% - verify $100 sale = $6 commission
  - [ ] Test with different rates
- [ ] Machine matching accuracy:
  - [ ] Import real xTool data
  - [ ] Verify >80% auto-match rate
- [ ] Report accuracy:
  - [ ] Cross-check totals with original CSVs
  - [ ] Verify no data loss or duplication

## Phase 6: Polish & Documentation (Week 3)

### 6.1 User Experience
- [ ] Add loading states for all async operations
- [ ] Error handling with user-friendly messages
- [ ] Success notifications after imports
- [ ] Tooltips for complex features

### 6.2 Performance
- [ ] Index optimization for large datasets
- [ ] Implement pagination for sales list
- [ ] Cache report metrics to avoid recalculation

### 6.3 Documentation
- [ ] Admin guide: How to import sales data
- [ ] Partner guide: Understanding your report
- [ ] Technical notes for future maintenance

## Current Status (2025-09-11)

### ✅ Completed
- **Phase 1**: Database foundation, affiliate programs CRUD
- **Phase 2**: Full CSV import with AI machine matching
- **Performance**: Optimized for 500+ row imports with fast selection

### 🚧 In Progress  
- **Importing**: User actively importing 537 xTool sales records

### 📋 Next Priority
- **Phase 4**: Reporting System (needed to see imported data)
  - Sales dashboard
  - Partner reports
  - Public shareable links

## Success Criteria

### Must Have (80/20)
- ✅ Import xTool sales data with machine matching
- 🚧 Generate quarterly reports showing revenue per machine
- 🚧 Shareable partner links that work without login
- ✅ Track affiliate link clicks through existing system

### Nice to Have (Future)
- ⏳ Genius Link historical data import
- ⏳ Automated monthly reports
- ⏳ Email notifications for partners
- ⏳ PDF export functionality

## Testing Checklist

### Before Each Release
- [ ] Import 100+ sales records - no errors
- [ ] Generate report - loads in <3 seconds
- [ ] Share link with partner - accessible and accurate
- [ ] Mobile test - report displays correctly
- [ ] Data integrity - no duplicate sales, correct totals

## Quick Start Commands

```bash
# Run migrations
npm run supabase:migrations

# Start dev server
npm run dev

# Test CSV import (use sample files)
# /affiliate-tracking/data/orders_export_xcviehou.csv (xTool)
# /affiliate-tracking/data/One_laser_commisions.csv (OneLaser)
```

## Key Files to Create

```
/supabase/migrations/
  001_affiliate_tracking.sql

/app/(admin)/admin/
  affiliate-programs/
    page.tsx
    new/page.tsx
    [id]/edit/page.tsx
  affiliate-import/
    page.tsx
    import-wizard.tsx
    machine-matcher.tsx
  affiliate-reports/
    page.tsx
    [id]/page.tsx

/app/partners/
  [program]/
    [slug]/
      page.tsx

/lib/services/
  affiliate-matching.ts
  affiliate-import.ts
  affiliate-reports.ts
  affiliate-links.ts

/api/admin/
  affiliate-programs/
    route.ts
    [id]/route.ts
  affiliate-import/
    process/route.ts
  affiliate-reports/
    generate/route.ts
```

---

*Last Updated: 2025-09-11*
*Focus: 80/20 implementation with test-driven validation*