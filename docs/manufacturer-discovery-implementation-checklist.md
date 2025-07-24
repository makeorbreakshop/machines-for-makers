# Manufacturer Discovery & Import System - Implementation Checklist

## Overview
This checklist provides a comprehensive task list for implementing the Manufacturer Website Discovery & Import System as defined in the PRD. Tasks are organized by phase and include technical details, dependencies, and verification steps.

## Pre-Implementation Tasks

### Code & Database Analysis ✓
- [x] Review existing database schema
- [x] Analyze price extraction service architecture
- [x] Understand admin interface patterns
- [x] Identify potential conflicts with existing systems
- [x] Document legacy field naming conventions

### Research & Planning
- [x] **Manufacturer Research (Phase 0)**
  - [x] Research 5 laser manufacturers (we already know specs)
  - [x] Research 5 3D printer manufacturers
    - [x] Bambu Lab product pages
    - [x] Prusa product pages
    - [x] Creality product pages
    - [x] Anycubic product pages
    - [x] Elegoo product pages
  - [x] Research 3-5 CNC manufacturers
    - [x] Shapeoko product pages
    - [x] Onefinity product pages
    - [x] Avid CNC product pages
  - [x] Research 3-4 UV/DTF printer manufacturers
  - [x] Document specification patterns for each type
  - [x] Create specification mapping templates

## Phase 1: Foundation (Week 1-2)

### Database Schema Updates
- [x] **Create new tables**
  ```sql
  - [x] manufacturer_sites table
  - [x] discovered_machines table
  - [x] site_scan_logs table
  - [x] machine_type_specifications table
  ```
- [x] **Update machines table**
  ```sql
  - [x] Add parent_machine_id column
  - [x] Add is_variant column
  - [x] Add variant_name column
  - [x] Add variant_order column
  - [x] Add lifecycle_status column
  - [x] Add last_seen_at column
  - [x] Add discontinued_at column
  - [x] Add discovery_source column
  - [x] Add specifications jsonb column
  ```
- [x] **Create database migrations**
  - [x] Write migration scripts
  - [x] Test migrations on development database
  - [x] Create rollback scripts
  - [x] Document migration process

### Admin UI - Manufacturer Site Management
- [x] **Create manufacturer sites page** (`/app/(admin)/admin/manufacturer-sites/page.tsx`)
  - [x] List view with existing sites
  - [x] Add/Edit modal
  - [x] Configuration editor (JSON)
  - [x] Crawl history display
  - [x] Manual crawl trigger button
  - [ ] **Update for Scrapfly workflow**
    - [ ] Add category URL fields to site configuration
    - [ ] Show credit cost estimates
    - [ ] Display last discovery credit usage
- [x] **API endpoints for site management**
  - [x] GET `/api/admin/manufacturer-sites`
  - [x] POST `/api/admin/manufacturer-sites`
  - [x] PUT `/api/admin/manufacturer-sites/[id]`
  - [x] DELETE `/api/admin/manufacturer-sites/[id]`
  - [x] POST `/api/admin/manufacturer-sites/[id]/crawl`

### Discovery Infrastructure (Scrapfly-based)
- [x] **Scrapfly Integration**
  - [x] Create Scrapfly service module (`services/scrapfly_service.py`)
  - [x] Implement automatic site detection (xTool, ComMarker, etc.)
  - [x] Add cost tracking per request
  - [x] Create test script (`test_scrapfly.py`)
  - [x] Set up environment variables for API key
- [x] **Simplified Discovery Service** (`services/simplified_discovery.py`)
  - [x] Category-based product discovery
  - [x] Scrapfly AI extraction integration
  - [x] Basic data transformation
  - [ ] **Fix data transformation issues**
    - [ ] Properly extract product names from Scrapfly data
    - [ ] Transform nested `offers` array to price field
    - [ ] Convert `specifications` array to flat key-value pairs
    - [ ] Handle multiple images properly
    - [ ] Map Scrapfly fields to normalizer expected fields
- [x] **Discovery API endpoints**
  - [x] POST `/api/v1/discover-products` (old sitemap-based)
  - [x] POST `/api/v1/discover-from-category` (new Scrapfly-based)
  - [x] GET `/api/v1/discovery-status/[scan_id]`
- [ ] **Credit Management**
  - [ ] Add credit usage to scan logs
  - [ ] Create credit usage tracking endpoint
  - [ ] Add budget limits configuration
  - [ ] Create credit usage dashboard

## Phase 2: Extraction & Normalization (Week 2-3)

### Data Extraction Enhancement
- [x] **Scrapfly AI Extraction**
  - [x] Use `extraction_model='product'` for automatic extraction
  - [x] Extract all product data in one API call
  - [x] Get structured data including specs, images, offers
  - [ ] **Fix extraction data flow**
    - [ ] Debug why product names show as "Unknown"
    - [ ] Ensure all Scrapfly data is properly captured
    - [ ] Add logging for data transformation steps
- [ ] **Cost tracking improvements**
  - [x] Track Scrapfly credits per extraction
  - [ ] Store credit usage in site_scan_logs
  - [ ] Add credit budget alerts
  - [ ] Show credits used in discovery UI

### Data Normalization System
- [x] **Create MachineDataNormalizer class** (`price-extractor-python/normalizers/`)
  - [x] **Field standardization**
    - [x] Unit converter (watts, kW, mW → W)
    - [x] Speed converter (mm/s → mm/min)
    - [x] Dimension parser (various formats → standard)
    - [x] Price cleaner ($, commas, ranges)
  - [x] **Field mapping**
    - [x] Create comprehensive field map for legacy columns
    - [x] Handle snake_case → "Title Case" conversion
    - [x] Map common variations (e.g., "wifi" → "Wifi")
  - [x] **Data type transformation**
    - [x] Boolean converter (true/false → "Yes"/"No")
    - [x] Date formatter
    - [x] Number parser with validation
  - [x] **Relationship handling**
    - [x] Brand fuzzy matching to UUIDs
    - [x] Category auto-assignment rules
    - [x] Duplicate detection algorithm
- [x] **Testing suite**
  - [x] Unit tests for each transformation
  - [x] Integration tests with real data
  - [x] Edge case handling

### Validation System
- [x] **Create validation rules engine**
  - [x] Common validations (required fields, formats)
  - [x] Machine-type specific rules
  - [x] Price reasonableness checks
  - [x] Image URL validation
  - [x] Specification range validation
- [x] **Error reporting**
  - [x] Detailed validation error messages
  - [x] Categorize errors by severity
  - [x] Suggest fixes for common issues

## Phase 3: Review Interface (Week 3-4) ✓

### Discovery Review Grid ✓
- [x] **Create discovery review page** (`/app/(admin)/admin/discovery/page.tsx`)
  - [x] Grid view with thumbnails
  - [x] Status badges (new, duplicate, invalid)
  - [x] Validation error display
  - [x] Similarity scores for duplicates
  - [x] Bulk selection checkboxes
- [ ] **Filtering and sorting**
  - [ ] Filter by status
  - [ ] Filter by machine type
  - [ ] Filter by manufacturer
  - [ ] Sort by discovery date
  - [ ] Search functionality
- [x] **Detail modal**
  - [x] Show all extracted data
  - [x] Show normalized data
  - [x] Validation errors with fixes
  - [ ] Edit capabilities
  - [x] Side-by-side comparison with potential duplicates

### Import Actions ✓
- [x] **Individual actions**
  - [x] Approve → Create as draft
  - [x] Reject with reason
  - [ ] Mark as duplicate (link to existing)
  - [ ] Edit and approve
  - [ ] Request re-extraction
- [x] **Bulk actions**
  - [x] Bulk approve selected
  - [x] Bulk reject selected
  - [ ] Bulk categorize
  - [ ] Bulk assign to brand
- [x] **API endpoints**
  - [x] POST `/api/admin/discovery/approve`
  - [x] POST `/api/admin/discovery/reject`
  - [ ] POST `/api/admin/discovery/bulk-action`
  - [ ] PUT `/api/admin/discovery/[id]`

### Duplicate Detection
- [ ] **Similarity algorithm**
  - [ ] Name similarity (Levenshtein distance)
  - [ ] Specification matching
  - [ ] Price range comparison
  - [ ] Image similarity (if feasible)
- [ ] **UI for duplicate management**
  - [ ] Show potential matches
  - [ ] Compare specifications side-by-side
  - [ ] Merge capabilities
  - [ ] Override duplicate detection

## Phase 4: Machine Type Expansion (Week 4-5) ✓

### Machine Type Infrastructure ✓
- [x] **Specification discovery system**
  - [x] Create SpecificationDiscovery class
  - [x] Pattern recognition for common specs
  - [x] Format variation detection
  - [x] Frequency analysis
- [x] **Database population**
  - [x] Create populate_specifications.py script
  - [x] Create database functions for category queries
  - [x] Test spec discovery functionality
- [ ] **Dynamic form generation**
  - [ ] Generate input fields based on machine type
  - [ ] Apply appropriate validations
  - [ ] Show/hide fields based on category

### Testing with Real Sites ✓
- [x] **Create real site testing framework**
  - [x] test_real_sites.py with all manufacturer URLs
  - [x] test_spec_discovery.py for running analysis
- [ ] **Laser manufacturers** (validate existing)
  - [ ] Test ComMarker discovery
  - [ ] Test xTool discovery
  - [ ] Test Atomstack discovery
- [ ] **3D printer manufacturers**
  - [ ] Test Bambu Lab discovery
  - [ ] Test Prusa discovery
  - [ ] Test Creality discovery
- [ ] **CNC manufacturers**
  - [ ] Test Shapeoko discovery
  - [ ] Test Onefinity discovery
- [ ] **Document issues and refine**
  - [ ] Track extraction success rates
  - [ ] Identify problem patterns
  - [ ] Refine normalizer rules

## Phase 5: Polish & Launch (Week 5-6)

### Monitoring & Reporting
- [ ] **Operational dashboard**
  - [ ] Discovery statistics
  - [ ] Success/failure rates by site
  - [ ] AI cost tracking
  - [ ] Import statistics
- [ ] **Alerting system**
  - [ ] Crawler failures
  - [ ] Budget exceeded
  - [ ] High failure rates
  - [ ] Manual review queue size
- [ ] **Logging enhancements**
  - [ ] Structured logging for analysis
  - [ ] Error categorization
  - [ ] Performance metrics

### Performance Optimization
- [ ] **Crawler optimization**
  - [ ] Implement request caching
  - [ ] Optimize HTML parsing
  - [ ] Batch database operations
- [ ] **UI optimization**
  - [ ] Lazy loading for grid
  - [ ] Pagination implementation
  - [ ] Image optimization
- [ ] **Database optimization**
  - [ ] Add appropriate indexes
  - [ ] Optimize complex queries
  - [ ] Implement data archiving

### Documentation
- [ ] **Technical documentation**
  - [ ] API documentation
  - [ ] Database schema docs
  - [ ] Architecture diagrams
  - [ ] Deployment guide
- [ ] **User documentation**
  - [ ] Admin user guide
  - [ ] Troubleshooting guide
  - [ ] Best practices
  - [ ] Video tutorials

### Production Deployment
- [ ] **Pre-deployment**
  - [ ] Security review
  - [ ] Performance testing
  - [ ] Load testing
  - [ ] Backup procedures
- [ ] **Deployment**
  - [ ] Database migrations
  - [ ] Deploy Python service updates
  - [ ] Deploy Next.js updates
  - [ ] Verify all services
- [ ] **Post-deployment**
  - [ ] Monitor for errors
  - [ ] Track performance metrics
  - [ ] Gather user feedback
  - [ ] Plan improvements

## Verification Checklist

### Functionality Verification
- [ ] Can add and configure manufacturer sites
- [ ] Crawler respects robots.txt and rate limits
- [ ] Products are discovered from sitemaps and category pages
- [ ] AI extraction works for complex product pages
- [ ] Data normalization handles all field types correctly
- [ ] Validation catches common issues
- [ ] Duplicate detection identifies similar products
- [ ] Import creates proper draft machines
- [ ] Price tracking continues working for imported products
- [ ] All machine types are supported

### Integration Verification
- [ ] No disruption to existing price tracking
- [ ] Admin panel remains functional
- [ ] API endpoints are backward compatible
- [ ] Database migrations are reversible
- [ ] Performance remains acceptable
- [ ] Error handling is comprehensive

### Quality Metrics
- [ ] 95%+ product discovery rate
- [ ] <5% require manual correction
- [ ] <$0.02 average cost per product
- [ ] <10 minutes to review 100 products
- [ ] Zero breaking changes to existing features

## Risk Mitigation Tasks

### Technical Risks
- [ ] Implement crawler user agent rotation
- [ ] Add fallback for blocked sites
- [ ] Create manual import option
- [ ] Set up cost caps for AI usage
- [ ] Implement circuit breakers

### Data Quality
- [ ] Create data quality dashboard
- [ ] Implement automated quality checks
- [ ] Set up manual review queues
- [ ] Create correction workflows
- [ ] Track quality metrics

### Operational Risks
- [ ] Create runbooks for common issues
- [ ] Set up on-call procedures
- [ ] Document rollback procedures
- [ ] Create backup strategies
- [ ] Plan capacity management

## Next Steps After Launch

### Future Enhancements (V2)
- [ ] Automated price selector discovery
- [ ] Real-time webhook updates
- [ ] Multi-language support
- [ ] Advanced bundle detection
- [ ] API for manufacturers
- [ ] Regional variant handling

### Continuous Improvement
- [ ] Weekly quality reviews
- [ ] Monthly performance analysis
- [ ] Quarterly feature planning
- [ ] Annual architecture review

---

## Immediate Action Items (Scrapfly Integration)

### 1. Fix Data Transformation Pipeline
- [ ] Debug SimplifiedDiscoveryService data flow
  - [ ] Add comprehensive logging at each transformation step
  - [ ] Verify Scrapfly response structure matches expectations
  - [ ] Fix field mapping from Scrapfly to normalizer format
  - [ ] Test with real xTool products

### 2. Update Database Storage
- [ ] Ensure normalized_data is properly structured
- [ ] Fix the "Unknown" name issue in discovered_machines
- [ ] Store Scrapfly credit usage in scan logs
- [ ] Add validation_warnings field if missing

### 3. Enhance Review Interface
- [ ] Display actual product names from normalized_data
- [ ] Show all images in gallery view
- [ ] Display specifications in readable format
- [ ] Add credit usage indicator

### 4. Update Manufacturer Sites
- [ ] Add category_url to scraping_config for each site
- [ ] Update xTool with `/collections/all` URL
- [ ] Test other manufacturer category pages
- [ ] Document category URL patterns

### 5. Testing & Validation
- [ ] Run full discovery test with xTool
- [ ] Verify data flows correctly to review interface
- [ ] Test import to machines table
- [ ] Monitor credit usage

## Notes

### Dependencies
- Python FastAPI service must be running
- Supabase database access required
- Claude AI API key configured
- Sufficient server resources for crawling

### Important Considerations
- Always respect robots.txt
- Monitor AI costs closely
- Maintain backward compatibility
- Test thoroughly before production
- Document all custom configurations

### Success Criteria
✅ Complete when all Phase 1-5 tasks are checked
✅ All verification items pass
✅ Risk mitigation measures in place
✅ Documentation complete
✅ First 10 manufacturer sites imported successfully