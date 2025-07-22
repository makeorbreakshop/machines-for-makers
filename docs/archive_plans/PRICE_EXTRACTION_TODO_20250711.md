# Price Extraction System TODO List
*Generated: July 11, 2025*

## Overview
This document contains a comprehensive list of issues identified during the July 11 batch price update and the required fixes to prevent these systematic failures from recurring.

## Task Tracking

### Critical Baseline Logic Bug
- [ ] Fix `_get_effective_current_price` to use MOST RECENT price instead of ANY manual correction
- [ ] Quick fix: Update July 7th Monport manual correction from $3,499.00 to $3,499.99
- [ ] Add order by created_at DESC to manual correction query
- [ ] Test that approved prices take precedence over older manual corrections

### ComMarker Variant Selection Failures
- [ ] Fix B4 100W variant selection (currently selecting 50W - $4,499 instead of $6,666)
- [ ] Fix B6 MOPA 60W variant selection (extracting $4,499 instead of $4,589)
- [ ] Fix B6 30W price extraction ($2,299 instead of $2,399)
- [ ] Update `_select_commarker_variant` to better match power variants
- [ ] Remove hardcoded price validation ranges ($1,000-$3,000 too low for B4 100W)

### xTool Price Extraction Failures
- [ ] Fix S1 extracting strikethrough price ($2,199) instead of sale price ($1,899)
- [ ] Fix M1 Ultra extracting bundle price ($1,099) instead of base price ($999)
- [ ] Update xTool selectors to prioritize `.price__sale` over `.price--compare`
- [ ] Add better sale price detection for xTool products

### Configuration & Validation Issues
- [ ] Update MAX_PRICE_INCREASE_PERCENT from 0 to 15-20%
- [ ] Update MAX_PRICE_DECREASE_PERCENT from 0 to 15-20%
- [ ] Remove/expand ComMarker hardcoded price ranges (B4 100W needs up to $7,000)
- [ ] Fix machine-specific rule domain isolation (xTool rules applying to ComMarker)

### Testing & Verification
- [ ] Test individual price updates for all affected machines
- [ ] Verify Monport GA 30W MOPA shows no change after fix
- [ ] Run small batch test before full batch
- [ ] Document any new issues discovered

## Critical Issues Identified

### 1. ComMarker Variant Selection Failures

#### ComMarker B4 100W MOPA
- **Current Issue**: Extracting $4,499 instead of $6,666
- **Root Cause**: Dynamic scraper is selecting the 50W variant instead of 100W
- **Evidence**: `Found power element: 'ComMarker B4 50W Fiber Laser Engraver quantity'`
- **Fix Required**: Update variant selection logic to correctly identify and select 100W variant

#### ComMarker B6 MOPA 60W
- **Current Issue**: Extracting $4,499 instead of $4,589
- **Root Cause**: Likely selecting wrong power variant or bundle price
- **Fix Required**: Ensure 60W variant is selected, not 30W or bundle options

#### ComMarker B6 30W
- **Current Issue**: Extracting $2,299 instead of $2,399
- **Root Cause**: Minor variant selection or sale/regular price confusion
- **Fix Required**: Verify correct variant and price type selection

### 2. xTool Price Extraction Failures

#### xTool S1
- **Current Issue**: Extracting $2,199 (strikethrough price) instead of $1,899 (sale price)
- **Root Cause**: Price selectors grabbing `.price--compare` instead of current price
- **Evidence**: Site-specific rules exist but not working: `avoid_selectors: ['.price--compare']`
- **Fix Required**: Ensure sale price selectors have higher priority than compare prices

#### xTool M1 Ultra
- **Current Issue**: Extracting $1,099 instead of $999
- **Root Cause**: Possible bundle price or wrong configuration selected
- **Fix Required**: Update selectors to avoid bundle prices and select base configuration

### 3. Hardcoded Validation Ranges

#### ComMarker Price Validation
- **Current Issue**: Valid prices being rejected as "unreasonable"
- **Evidence**: `ComMarker B4 price $6666.0 outside reasonable range $1,000-$3,000`
- **Fix Required**: Remove or significantly expand hardcoded ranges for ComMarker machines
  - B4 100W MOPA: Should allow up to $7,000
  - B6 MOPA 60W: Should allow up to $5,000

### 4. Configuration Issues

#### Zero Tolerance Thresholds
- **Current Issue**: MAX_PRICE_INCREASE_PERCENT = 0, MAX_PRICE_DECREASE_PERCENT = 0
- **Impact**: Every single price change requires manual approval
- **Fix Required**: Update to reasonable thresholds (e.g., 15-20%)

### 5. Machine Rule Misapplication

#### Cross-Domain Rule Application
- **Current Issue**: xTool rules being applied to ComMarker machines
- **Evidence**: `Applying machine-specific rules for xTool P2S on xtool.com`
- **Fix Required**: Ensure machine-specific rules only apply to correct domains

### 6. Critical Baseline Price Logic Bug

#### _get_effective_current_price Using Wrong Baseline
- **Current Issue**: Method uses OLDEST manual correction within 30 days instead of MOST RECENT approved price
- **Evidence**: Monport GA 30W MOPA using July 7th manual correction ($3,499.00) instead of July 10th approved price ($3,499.99)
- **Impact**: System repeatedly detects "false" price changes and requires re-approval of already approved prices
- **Root Cause**: `_get_effective_current_price` in price_service.py prioritizes ANY manual correction from last 30 days
- **Fix Required**: Update logic to use the MOST RECENT price (whether manual correction OR approved) as baseline

## Action Items

### High Priority (Fix Immediately)

1. **Fix Baseline Price Logic Bug**
   - Update `_get_effective_current_price` in price_service.py
   - Change logic to use MOST RECENT price approval/correction, not just any manual correction
   - This is causing repeated false positives for already-approved prices
   - Quick fix: Update the July 7th Monport manual correction to $3,499.99

2. **Fix ComMarker Variant Selection Logic**
   - Update `_select_commarker_variant` in dynamic_scraper.py
   - Ensure power matching correctly identifies "100W" vs "50W"
   - Test with all ComMarker machines to verify correct variant selection

2. **Fix xTool Sale Price Extraction**
   - Update xTool site-specific rules to prioritize sale prices
   - Ensure `.price--compare` is properly avoided
   - Add more specific selectors for current/sale prices

3. **Remove/Update Hardcoded Price Ranges**
   - Find and update `_validate_commarker_price` method
   - Either remove hardcoded ranges or make them machine-specific
   - Consider using percentage-based validation instead

4. **Update Price Change Thresholds**
   - Set MAX_PRICE_INCREASE_PERCENT to 15 or 20
   - Set MAX_PRICE_DECREASE_PERCENT to 15 or 20
   - This will reduce manual review burden by ~80%

### Medium Priority

5. **Fix Machine Rule Domain Isolation**
   - Ensure machine-specific rules only apply on correct domains
   - Add domain validation before applying machine rules

6. **Investigate Atomstack Price Failures**
   - Atomstack X70 Max showing wrong price
   - Check if URL issues or selector problems

7. **Add Better Logging for Variant Selection**
   - Log which variant was selected and why
   - Help debug future variant selection issues

### Low Priority

8. **Consider Machine-Specific Extraction Hints**
   - Store extraction hints per machine in database
   - Include preferred variant, price type preferences
   - Make extraction more resilient to page changes

## Testing Requirements

After implementing fixes:

1. Run individual price updates for all affected machines
2. Verify correct prices are extracted
3. Run a small batch test before full batch
4. Monitor for any new issues introduced

## Success Criteria

- ComMarker B4 100W MOPA extracts $6,666 (not $4,499)
- ComMarker B6 MOPA 60W extracts $4,589 (not $4,499)
- ComMarker B6 30W extracts $2,399 (not $2,299)
- xTool S1 extracts $1,899 (not $2,199)
- xTool M1 Ultra extracts $999 (not $1,099)
- Monport GA 30W MOPA shows no change when price hasn't changed
- Manual review volume reduced by setting reasonable thresholds

## Notes

- The manual approval → machines.Price sync is working correctly (verified)
- The issue is with extraction selecting wrong variants/prices from vendor pages
- Consider implementing a feedback loop where manual corrections inform future extractions