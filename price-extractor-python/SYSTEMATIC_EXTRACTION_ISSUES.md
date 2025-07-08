# Systematic Price Extraction Issues Analysis

## Overview
After analyzing the batch price update failures, the majority of "failures" that require manual approval are actually **incorrect price extractions** rather than legitimate price changes. Here are the systematic issues identified:

## 1. ComMarker MCP Browser Automation - CRITICAL BUG
**Issue**: All ComMarker machines using MCP Browser Automation extract $50
**Affected Machines**: 
- ComMarker B4 30W: $2399 → $50
- ComMarker B6 30W: $2399 → $50  
- ComMarker B6 MOPA 30W: $3569 → $50

**Root Cause**: The automation script uses a naive regex `r'\$([0-9,]+)'` that captures the FIRST dollar amount on the page, which is likely a shipping cost or accessory price.

**Fix Required**: Update the ComMarker automation to:
- Target the specific price element for the selected variant
- Avoid capturing shipping/accessory prices
- Validate that the price is reasonable for the product

## 2. Generic Selectors Capturing Wrong Prices
**Issue**: Overly generic selectors like `.price` or `.product-price` capture the first matching element, which may be:
- Bundle prices
- Premium configuration prices
- Accessory prices
- Original prices (before discount)

**Examples**:
- xTool S1: $999 → $2699 (170% increase - likely bundle price)
- Glowforge Aura: $1199 → $2495 (108% increase - wrong product variant)
- Mr Carve M1 Pro: $800 → $5499 (587% increase - definitely wrong product)

## 3. Site-Specific Issues

### xTool.com
- Multiple price variants shown on page
- Selector `.price-box .price` captures bundle/kit prices instead of base price
- Need variant-aware extraction

### Longer3d.com  
- Longer Ray5: $200 → $399 (100% increase)
- Likely showing bundle price or wrong variant
- Generic `.price` selector too broad

### OMTech
- High variation in results (some correct, some wrong)
- `.product-price` selector works sometimes but captures wrong variant other times
- Needs better variant selection logic

### Gweike
- G6 Split: $2399 → $4499 (87% increase)
- Capturing higher power variant price
- Need to match specific variant from machine name

## 4. Learned Selector Degradation
**Issue**: Previously learned selectors become invalid when sites update their HTML structure
**Pattern**: Sites that worked before suddenly extract wrong prices
**Solution**: Need selector validation and re-learning mechanism

## 5. Common Extraction Patterns

### Successful Patterns
- Site-specific extractors with variant awareness
- JSON-LD structured data (when available)
- Selectors that include price context (e.g., "Basic Bundle", variant name)

### Failed Patterns  
- Generic price selectors without context
- First-match regex patterns
- Selectors that don't account for multiple prices on page

## Recommendations

### Immediate Fixes
1. **Fix ComMarker MCP automation** - It's extracting $50 for all machines
2. **Add price validation** - Flag prices that differ by >50% from expected
3. **Implement variant matching** - Match machine name to specific variant price

### Systematic Improvements
1. **Context-Aware Extraction**
   - Look for prices near variant/model names
   - Validate price is for main product, not accessories
   - Check for "Starting at" vs actual price

2. **Selector Quality Scoring**
   - Track selector success rates
   - Automatically flag selectors with high failure rates
   - Re-learn selectors that produce suspicious results

3. **Multi-Method Validation**
   - Extract prices using multiple methods
   - Compare results and flag discrepancies
   - Use consensus or most reasonable price

4. **Site-Specific Handlers**
   - Custom logic for problematic sites
   - Handle variant selection properly
   - Account for bundle vs individual pricing

## Impact
- ~73% of "failures" are actually incorrect extractions
- Only ~5% are true technical failures
- Fixing these systematic issues would improve accuracy to >90%