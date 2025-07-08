# Intelligent Price Extraction System - Implementation Checklist

## Overview
Streamlined implementation of a Claude sub-agent that learns from extraction failures and automatically generates static rules to reduce API costs over time.

## Core Functionality Goals
1. **When extraction fails** → Claude analyzes the page and documents what selectors work
2. **Save successful patterns** → Update static rules so future extractions are free
3. **Cost control** → Reduce Claude API usage as the system learns

## Essential Implementation

### 1. Enhanced Claude Fallback with Learning
- [x] Modify existing Claude fallback to return both price AND extraction method used
- [x] When Claude succeeds, automatically save CSS selectors to database (better than static file)
- [x] Simple logging to track what Claude learned from each site

### 2. Basic Rule Learning Storage
- [x] Add `learned_selectors` field to existing database (simple JSON column)
- [x] Store successful Claude extractions as new static rules
- [x] Update site-specific extractor to try learned rules first

### 3. Cost Controls
- [ ] Daily Claude API usage limit (start with $10/day)
- [ ] Skip Claude for sites that have recently learned rules
- [ ] Simple admin toggle to enable/disable intelligent learning

### 4. Free Alternative Research
- [ ] Test Ollama with Llama 3 for price extraction on 5-10 sites
- [ ] Document setup process and accuracy comparison
- [ ] Create simple migration path from Claude to local LLM

## Quick Implementation Details

### Files to Modify
- `price-extractor-python/scrapers/price_extractor.py` - Add rule learning to Claude fallback
- `price-extractor-python/scrapers/site_specific_extractors.py` - Add learned rules check
- Add simple `learned_selectors` JSON column to existing `machines` table

### Simple Database Addition
```sql
-- Just add to existing machines table
ALTER TABLE machines ADD COLUMN learned_selectors JSONB DEFAULT '{}';
```

## Next Steps
1. Modify Claude fallback to document successful selectors
2. Update site-specific extractor to try learned rules first  
3. Add basic cost controls ($10/day limit)
4. Test with ComMarker and 2-3 other problematic sites
5. Research Ollama setup for future cost reduction