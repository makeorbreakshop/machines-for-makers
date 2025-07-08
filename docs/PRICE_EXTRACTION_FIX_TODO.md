# Price Extraction System Fix Todo List

## Overview
This document tracks all tasks needed to systematically fix the price extraction issues identified in the January 7, 2025 batch run where 52% of machines failed or extracted incorrect prices.

---

## Phase 1: Diagnostic Analysis (1-2 hours)

### Selector Performance Analysis
- [x] Query database for all CSS selectors currently in use
- [x] Calculate success/failure rates for each selector pattern
- [x] Identify selectors producing incorrect prices (>50% deviation)
- [x] Document selector drift patterns (previously working, now failing)
- [x] Create report of top 10 problematic selectors

### Pattern Recognition
- [x] Group failures by extraction method (CSS, Claude AI, MCP, site-specific)
- [x] Create domain-level failure analysis report
- [x] Verify blacklist system is preventing bad selector re-learning
- [x] Check if site-specific rules are being properly applied
- [x] Document common failure patterns across brands

### Variant Detection Analysis
- [x] Review all machines with >50% price changes from manual corrections
- [x] Document variant selection logic failures
- [x] Identify bundle price contamination instances
- [x] Create mapping of machine names to expected variants

---

## Phase 2: Immediate Critical Fixes (2-3 hours)

### Fix ComMarker MCP Automation Bug
- [x] Locate the regex bug in `claude_mcp_client.py` (line ~170)
- [x] Replace naive `r'\$([0-9,]+)'` regex with targeted element selection
- [x] Implement proper variant selection for ComMarker B4/B6 models
- [x] Add price validation to ensure reasonable values
- [ ] Test fix on all 5 affected ComMarker machines

### Update Blacklist System
- [x] Add newly identified bad selectors to blacklist:
  - [x] `.bundle-price` variations
  - [x] `.price-box .price` (when capturing wrong variant)
  - [x] Generic `.price` selectors on multi-variant pages
- [x] Verify blacklist is loaded on startup
- [x] Ensure blacklist prevents both usage and learning of bad patterns
- [x] Add logging when blacklisted selectors are blocked

### Fix xTool Variant Selection
- [ ] Implement machine name → variant mapping for xTool products
- [ ] Fix xTool S1 extraction (currently getting $999 instead of $1,899)
- [ ] Fix xTool F1/F1 Lite variant confusion
- [ ] Fix xTool P2S extraction (getting $4,499 instead of $3,899)
- [ ] Add variant validation before accepting price

---

## Phase 3: Test Infrastructure (3-4 hours)

### Create Automated Test Script
- [x] Create `test_price_extraction.py` in price-extractor-python
- [x] Import all extraction modules without modification
- [x] Define test cases for all 54 manually corrected machines
- [ ] Implement mock mode to use cached page content
- [x] Add parallel testing with asyncio

### Test Data Setup
- [x] Create `test_data/extraction_test_cases.json` with:
  - [x] Machine name, URL, expected price
  - [x] Last extracted price and known issues
  - [x] Historical price range for validation
- [ ] Add page content caching mechanism
- [x] Include both passing and failing test cases

### Test Execution Features
- [ ] Test each extraction method independently
- [ ] Record which price each method returns
- [ ] Calculate accuracy metrics per method
- [ ] Generate detailed diagnostics for failures
- [ ] Create visual diff for price locations

### Reporting System
- [ ] Console summary with pass/fail counts
- [ ] Detailed JSON report with full diagnostics
- [ ] CSV export for spreadsheet analysis
- [ ] Pattern analysis identifying systematic issues
- [ ] Recommendations for each failed extraction

---

## Phase 4: Systematic Improvements (3-4 hours)

### Price Reasonableness Checks
- [ ] Implement >50% deviation flagging from historical average
- [ ] Create price range expectations by machine category:
  - [ ] Entry-level lasers: $100-$1,000
  - [ ] Mid-range lasers: $1,000-$5,000
  - [ ] Professional lasers: $5,000-$20,000
  - [ ] Fiber lasers: typically >$1,500
- [ ] Add shipping cost detection ($50, $99, common values)
- [ ] Flag suspiciously round numbers in wrong range

### Enhanced Extraction Validation
- [ ] When multiple prices found, implement selection heuristics:
  - [ ] Prefer prices near historical value (±20%)
  - [ ] Avoid prices matching known shipping costs
  - [ ] Skip prices with "bundle", "kit", "package" context
  - [ ] Prefer "base" or "starting at" prices
- [ ] Add context analysis for surrounding text
- [ ] Implement confidence scoring for each extraction

### Learned Selector Quality System
- [ ] Add success rate tracking to learned selectors table
- [ ] Implement automatic deprecation for <50% success rate
- [ ] Create selector performance dashboard
- [ ] Add last successful use timestamp
- [ ] Implement gradual trust degradation

### Site-Specific Enhancements
- [ ] Update Monport extractor for content corruption handling
- [ ] Fix Glowforge variant detection for all models
- [ ] Enhance OMTech rules for consistent extraction
- [ ] Add Gweike multi-variant handling
- [ ] Improve AtomStack domain change detection

### Regression Prevention System
- [ ] Create baseline test cases for all currently working extractions
  - [ ] Document known working machines with expected prices
  - [ ] Include machines from different domains/extraction methods
  - [ ] Save as regression_test_baseline.json
- [ ] Implement pre-fix validation
  - [ ] Run extraction on test cases before making changes
  - [ ] Document current success/failure rates
  - [ ] Save baseline results for comparison
- [ ] Implement post-fix validation
  - [ ] Run same test cases after implementing fixes
  - [ ] Compare results to ensure no regressions
  - [ ] Flag any machines that were working but now fail
- [ ] Create fix isolation testing
  - [ ] Test each fix in isolation before combining
  - [ ] Ensure ComMarker fix doesn't break xTool
  - [ ] Ensure blacklist updates don't break learned selectors
  - [ ] Ensure variant detection doesn't break single-product pages
- [ ] Implement continuous regression monitoring
  - [ ] Add regression test to batch run process
  - [ ] Alert if previously working extraction fails
  - [ ] Track extraction method changes over time

---

## Phase 5: Validation & Testing (2-3 hours)

### Pre-Implementation Testing
- [ ] Run current extraction on test set
- [ ] Document baseline accuracy metrics
- [ ] Identify top 20 most problematic machines
- [ ] Create before/after comparison framework

### Post-Fix Validation
- [ ] Run updated extraction on same test set
- [ ] Calculate improvement metrics
- [ ] Verify no regression on previously working machines
- [ ] Document remaining issues for future work

### Integration Testing
- [ ] Test with actual batch processing code
- [ ] Verify database updates work correctly
- [ ] Test manual correction workflow
- [ ] Ensure logging and monitoring work

### Continuous Monitoring Setup
- [ ] Create pre-batch validation script
- [ ] Implement post-batch analysis tool
- [ ] Add automated alerts for >20% failure rate
- [ ] Create extraction accuracy dashboard

---

## Phase 6: Documentation & Deployment (1-2 hours)

### Code Documentation
- [ ] Document all bug fixes with inline comments
- [ ] Update extraction method documentation
- [ ] Create troubleshooting guide for common issues
- [ ] Document new validation rules

### Deployment Preparation
- [ ] Create rollback plan if issues arise
- [ ] Test on staging/development environment
- [ ] Prepare deployment checklist
- [ ] Schedule deployment during low-usage period

### Knowledge Transfer
- [ ] Update CLAUDE.md with new extraction patterns
- [ ] Document systematic issues and solutions
- [ ] Create runbook for handling extraction failures
- [ ] Update admin interface documentation

---

## Success Metrics

### Primary Goals
- [ ] Reduce false positive rate from 73% to <20%
- [ ] Achieve 90%+ accuracy on price extraction
- [ ] Zero instances of $50 ComMarker prices
- [ ] Proper variant selection for all multi-config products

### Secondary Goals
- [ ] Reduce Claude API usage by 50% through better selectors
- [ ] Decrease manual correction time to <10 minutes per batch
- [ ] Improve extraction speed by 30% through optimization
- [ ] Create reusable test framework for future updates

---

## Future Improvements (Backlog)

### Machine Learning Approach
- [ ] Collect training data from successful extractions
- [ ] Build price prediction model
- [ ] Implement anomaly detection
- [ ] Create feedback loop from corrections

### Visual Verification System
- [ ] Implement screenshot capture of price areas
- [ ] Build visual diff system
- [ ] Create audit trail with visual proof
- [ ] Add manual review interface

### Vendor Integration
- [ ] Research available vendor APIs
- [ ] Build relationship with key vendors
- [ ] Implement API-based extraction where possible
- [ ] Create hybrid scraping/API approach

---

## Notes

- Priority order: ComMarker fix → Price validation → Variant detection → Test framework
- Each phase should be tested independently before moving to next
- Keep detailed logs of what changes fixed which issues
- Consider creating feature flags for gradual rollout

Last Updated: January 8, 2025