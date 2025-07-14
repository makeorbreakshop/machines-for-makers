# xTool F1 Lite Price Extraction Troubleshooting

## Issue Summary
The xTool F1 Lite price extraction consistently fails to extract the correct $799 price, instead returning $1,169 from the regular F1 variant.

## Problem Analysis

### Current Status (July 14, 2025)
- **Target Machine**: xTool F1 Lite 
- **Expected Price**: $799.00
- **Currently Extracted**: $1,169.00 (46.3% higher than expected)
- **Issue**: F1 Lite variants showing as "Out of Stock" in HTML structure

### Root Cause
The HTML structure shows F1 Lite variants as "Out of Stock":
```html
<div class="mt-40 product-options__section--version">
    <div>
        <div>Out of Stock</div>
        <div>F1</div>
    </div>
    <div>
        <div>Out of Stock</div>
        <div>F1 Lite</div>
    </div>
</div>
```

However, the F1 Lite Standalone option appears to be available with empty price fields:
```html
<div>F1 Lite Standalone</div>
<!-- Price fields are empty -->
```

## Attempted Solutions

### 1. Site-Specific Rules Enhancement (July 14, 2025)
**Approach**: Added comprehensive site-specific rules in `site_specific_extractors.py`
```python
'xTool F1 Lite': {
    'url_patterns': ['/f1', '/xtool-f1'],
    'requires_dynamic': True,
    'force_dynamic': True,
    'variant_selection': {
        'method': 'button',
        'selectors': [
            '[data-variant*="Lite"]',
            'button:contains("F1 Lite")',
            '.variant-selector[data-option*="Lite"]',
            'input[value*="Lite"]'
        ]
    },
    'expected_price_range': [700, 900],
    'preferred_price': 799
}
```
**Result**: Failed - Dynamic scraper could not find F1 Lite variant selectors

### 2. Dynamic Scraper Variant Selection (July 14, 2025)
**Approach**: Enhanced `dynamic_scraper.py` with `_select_xtool_variant` method
```python
async def _select_xtool_variant(self, machine_name, variant_rules):
    """Select the correct xTool variant based on machine name."""
    try:
        # Look for F1 Lite specific selectors
        if 'Lite' in machine_name:
            lite_selectors = [
                'button:contains("F1 Lite")',
                '[data-variant*="Lite"]',
                '.variant-selector[data-option*="Lite"]',
                'input[value*="Lite"]'
            ]
            
            for selector in lite_selectors:
                elements = await self.page.query_selector_all(selector)
                if elements:
                    await elements[0].click()
                    await self.page.wait_for_timeout(2000)
                    return True
        return False
    except Exception as e:
        logger.error(f"Error selecting xTool variant: {str(e)}")
        return False
```
**Result**: Failed - No valid F1 Lite variant selectors found on page

### 3. Shopify Variant Selection (July 14, 2025)
**Approach**: Implemented Shopify-specific variant selection with exact variant ID
```python
'xTool F1 Lite': {
    'url_patterns': ['/f1', '/xtool-f1'],
    'requires_dynamic': True,
    'force_dynamic': True,
    'shopify_variant_selection': True,
    'target_variant_id': '46187559157999',
    'variant_selection': {
        'method': 'shopify_options',
        'option1': 'F1 Lite',
        'option2': 'F1 Lite Standalone',
        'selectors': [
            'select[name="id"] option[value="46187559157999"]',
            'input[name="id"][value="46187559157999"]',
            'button[data-variant-id="46187559157999"]'
        ]
    },
    'expected_price_range': [700, 900],
    'preferred_price': 799
}
```
**Result**: Failed - Variant ID selectors not found in current page structure

## Current Page Analysis (July 14, 2025)

### Available Variants
1. **F1 Standalone** - $1,169.00 (discounted from $1,499.00)
2. **F1 + Slide Extension** - $1,369.00 (discounted from $1,742.00)
3. **F1 Deluxe Bundle** - $1,879.00 (discounted from $2,373.00)
4. **F1 Lite Standalone** - OUT OF STOCK (empty price fields)
5. **F1 Lite + RA2 Pro** - OUT OF STOCK (empty price fields)
6. **F1 Lite Deluxe Bundle** - OUT OF STOCK (empty price fields)

### Stock Status Issue
The key problem is that all F1 Lite variants are showing as "Out of Stock" with empty price fields. This suggests either:
1. xTool has temporarily discontinued F1 Lite
2. There's a display issue with the F1 Lite variants
3. The page structure has changed since our last successful extraction

## Extraction Log Analysis

### Current Extraction Flow
1. **Dynamic Scraper**: Attempts to find F1 Lite variant selectors
   - Finds 19 potential elements containing "F1 Lite" text
   - All elements show "Out of Stock" status
   - No valid price extraction possible

2. **Site-Specific Rules**: Falls back to learned selectors
   - Uses `.product-badge-price` selector
   - Extracts $1,169.00 from regular F1 variant

3. **Price Validation**: 
   - Compares against historical $799.00 price
   - 46.3% increase exceeds 20% threshold
   - Flags for manual approval

## Recommendations

### Immediate Actions
1. **Verify F1 Lite Availability**: Check if xTool has actually discontinued F1 Lite or if it's a temporary stock issue
2. **Monitor Page Changes**: Set up alerts for when F1 Lite variants return to stock
3. **Update Database**: Consider marking F1 Lite as temporarily unavailable if confirmed out of stock

### Long-term Solutions
1. **Implement Stock Status Detection**: Add logic to detect "Out of Stock" status and handle accordingly
2. **Alternative Price Sources**: Look for F1 Lite pricing on other xTool sales channels
3. **Historical Price Fallback**: Use last known good price with "Out of Stock" flag

### Code Improvements
1. **Stock Status Handling**:
```python
async def _check_stock_status(self, machine_name, page):
    """Check if a variant is in stock."""
    stock_indicators = [
        'Out of Stock',
        'Sold Out',
        'Unavailable',
        'Coming Soon'
    ]
    
    page_content = await page.content()
    for indicator in stock_indicators:
        if indicator in page_content and machine_name in page_content:
            return False
    return True
```

2. **Graceful Degradation**:
```python
if not await self._check_stock_status(machine_name, self.page):
    return {
        'success': False,
        'error': f'{machine_name} is currently out of stock',
        'stock_status': 'out_of_stock',
        'last_known_price': machine_data.get('old_price')
    }
```

## Testing Commands

### Manual Testing
```bash
# Test individual machine update
curl -X POST http://localhost:8000/api/v1/update-price \
  -H "Content-Type: application/json" \
  -d '{"machine_id": "0b5f958f-5b8b-4881-96d3-15924ea095e8"}' | jq

# Check current page structure
curl -s "https://www.xtool.com/products/xtool-f1" | grep -A 10 -B 10 "F1 Lite"
```

### Monitoring
```bash
# Check for F1 Lite stock status changes
watch -n 300 'curl -s "https://www.xtool.com/products/xtool-f1" | grep -c "Out of Stock"'
```

## Historical Context

### Previous Successful Extractions
- **Last Success**: July 7, 2025 - $799.00 (manual correction)
- **Extraction Method**: Manual correction suggests automated methods were failing even then
- **Stock Status**: F1 Lite was available at time of manual correction

### Pattern Analysis
The consistent failure to extract F1 Lite pricing suggests this has been an ongoing issue, not a recent development. The manual correction on July 7th indicates human intervention was already required.

## Latest Fix Implementation (July 14, 2025)

**Root Cause Identified**: Two critical issues prevented F1 Lite extraction:

1. **Pattern Matching Issue**: The system was matching "xTool F1" pattern before "xTool F1 Lite", so it used regular F1 rules
2. **No xTool-specific handling**: When dynamic extraction failed, no fallback logic existed for xTool F1 Lite

**Solution Implemented**:

### Fix 1: Pattern Matching Priority
```python
# Sort patterns by specificity (longer patterns first) to match "xTool F1 Lite" before "xTool F1"
sorted_patterns = sorted(machine_rules.items(), key=lambda x: len(x[0]), reverse=True)
```

### Fix 2: xTool-specific Static Extraction
```python
# In _extract_with_site_rules method
if domain == 'xtool.com' and rules.get('requires_dynamic'):
    # Handle F1 Lite when dynamic extraction fails
    if machine_data and 'F1 Lite' in machine_data.get('name', ''):
        price, method = self._extract_xtool_f1_lite_price(soup, rules, machine_data)
        if price and self._validate_price(price, rules, machine_data):
            return price, f"xTool F1 Lite static ({method})"
```

### Fix 3: Historical Price Validation
- **Removed hardcoded price ranges** (700-900) 
- **Uses historical price** from database for validation
- **Validates against 50% range** of historical price instead of fixed ranges

**Key Changes**:
1. **Pattern priority**: "xTool F1 Lite" now matches before "xTool F1"
2. **Historical validation**: Uses actual $799 price from system instead of hardcoded ranges
3. **F1 Lite specific extraction**: Searches HTML for F1 Lite sections and JavaScript variant data
4. **Detailed logging**: Shows exactly which pattern matched and why

## Fix Attempt 4: Pattern Matching + xTool-Specific Handling (July 14, 2025 - STILL FAILING)

**Status**: Pattern matching now works correctly, but xTool-specific handling not triggered

**Log Analysis of Latest Run**:
```
2025-07-14 10:02:25 | INFO | get_machine_specific_rules:633 - 🎯 Using machine-specific rules for xTool F1 Lite (pattern: xTool F1 Lite)
2025-07-14 10:02:25 | INFO | extract_price_with_rules:727 - Applying machine-specific rules for xTool F1 Lite on xtool.com
2025-07-14 10:02:25 | INFO | extract_price:94 - ✅ METHOD 2 SUCCESS: Extracted price $1169.0 using site-specific method: Site-specific CSS (direct:.product-badge-price)
```

**Issue Identified**: 
- ✅ Pattern matching now works - correctly identifies "xTool F1 Lite" 
- ❌ But still extracts $1,169 using generic `.product-badge-price` selector
- ❌ My custom `_extract_xtool_f1_lite_price` method is never called

**Root Cause**: The xTool-specific handling in `_extract_with_site_rules` only triggers when `rules.get('requires_dynamic')` is True, but the F1 Lite rule processing must be happening before that check.

**Problem Flow**:
1. Gets F1 Lite specific rules ✅
2. Applies those rules with `_extract_with_context_filtering` ❌ (finds generic price)
3. Never reaches my custom xTool handling because extraction already "succeeded"

**Next Fix Needed**: 
The `_extract_with_context_filtering` method is finding a price using the generic `.product-badge-price` selector from the F1 Lite rules, so it considers the extraction successful and never tries the xTool-specific logic.

Need to either:
1. Remove `.product-badge-price` from F1 Lite selectors, OR
2. Move xTool handling earlier in the extraction pipeline, OR
3. Add F1 Lite-specific validation to reject the wrong price

## Fix Attempt 5: Remove Generic Selector from F1 Lite Rules (COMPLETED)

**Approach**: Remove `.product-badge-price` from F1 Lite price selectors so it doesn't find the wrong price and "succeed" prematurely.

**Changes Made**:
```python
# BEFORE (grabbing wrong price)
'price_selectors': [
    '.product-badge-price',  # This found regular F1 price $1,169
    '.product-info .price-current',
    # ... other generic selectors
],

# AFTER (F1 Lite specific selectors that won't match)
'price_selectors': [
    '.f1-lite-price .money',
    '.variant-price[data-variant*="lite"] .money', 
    '.product-options[data-variant*="lite"] .price',
    '.f1-lite-section .price .money'
],
```

**Expected Result**: These specific selectors won't find anything on the page, forcing the system to fail site-specific extraction and trigger the custom xTool F1 Lite handling logic.

## Fix Attempt 5 FAILED - Custom Logic Never Called

**Log Analysis**:
```
2025-07-14 10:07:01 | INFO | extract_price_with_rules:724 - Applying machine-specific rules for xTool F1 Lite on xtool.com
2025-07-14 10:07:01 | INFO | extract_price:100 - ❌ METHOD 2 FAILED: No price found with site-specific extraction
2025-07-14 10:07:01 | INFO | extract_price:135 - ✅ METHOD 4 SUCCESS: Extracted price $1169.0 using common selectors method: CSS Selector '.price'
```

**Critical Issue Identified**: 
- ✅ Site-specific extraction correctly fails
- ❌ My custom `_extract_xtool_f1_lite_price` method is NEVER called (no log messages)
- ❌ System falls back to Method 4 (common selectors) which finds regular F1 price using generic `.price` selector

**Root Cause**: My xTool-specific handling is inside `_extract_with_site_rules`, but that method is returning `None, None` (failed) without ever reaching my custom logic. The custom logic must have a condition that's not being met.

**Debugging Needed**: 
1. Check if `machine_data` contains the right information
2. Verify the conditions for xTool-specific handling are met
3. Add debugging logs to see why the custom method isn't called

## Fix Attempt 6: Prevent Generic Fallback for Out-of-Stock F1 Lite (COMPLETED)

**Root Cause**: My custom xTool logic was inside site-specific extraction, but the system was falling back to Method 4 (common selectors) which used generic `.price` selector to find regular F1 price.

**Solution Implemented**: Added F1 Lite out-of-stock detection in the main extraction pipeline BEFORE Method 4.

**Changes Made**:

1. **Added special check between Method 3 and Method 4**:
```python
# Special handling for xTool F1 Lite - check if out of stock before generic extraction
if machine_name and 'F1 Lite' in machine_name and 'xtool.com' in url.lower():
    logger.info(f"🔍 SPECIAL CHECK: Checking if xTool F1 Lite is out of stock")
    if self._is_xtool_f1_lite_out_of_stock(soup):
        logger.warning(f"⚠️ xTool F1 Lite is out of stock - skipping generic extraction fallback")
        return None, "xTool F1 Lite out of stock"
```

2. **Added `_is_xtool_f1_lite_out_of_stock` method** that:
   - Searches for F1 Lite sections with "out of stock" indicators
   - Checks for empty price fields in F1 Lite sections
   - Returns `True` if F1 Lite appears out of stock
   - Prevents fallback to generic extraction that grabs wrong price

**Expected Result**: When F1 Lite is detected as out of stock, the system will return "out of stock" status instead of falling back to Method 4 and extracting the wrong regular F1 price.

## Next Steps

1. **Test the out-of-stock detection** - Run F1 Lite extraction to see if it detects out-of-stock status
2. **Verify prevention of generic fallback** - Confirm Method 4 is skipped when F1 Lite detected as out of stock
3. **Monitor extraction results** - Check if system returns "out of stock" instead of wrong price
4. **Refine detection logic if needed** - Adjust out-of-stock detection if it doesn't work correctly

## Conclusion

**Status**: Implemented out-of-stock detection to prevent generic extraction fallback
**Priority**: Test the fix to verify F1 Lite out-of-stock detection works
**Expected Result**: System should return "xTool F1 Lite out of stock" instead of extracting wrong regular F1 price

**Summary of All Fixes Applied**:
1. ✅ Fixed pattern matching priority (F1 Lite before F1)
2. ✅ Removed hardcoded price ranges, use historical validation  
3. ✅ Removed generic selectors from F1 Lite rules
4. ✅ Added debugging logs to troubleshoot custom logic
5. ✅ **Added out-of-stock detection before generic extraction fallback**

The fundamental issue was that F1 Lite is genuinely out of stock, but the system was falling back to generic extraction methods that found the regular F1 price. The final fix detects this out-of-stock condition and prevents the inappropriate fallback.

## Latest Test Result (July 14, 2025) - PARTIAL SUCCESS BUT NEW ERROR

**Out-of-Stock Detection Working ✅**:
```
2025-07-14 10:12:34 | INFO  | _is_xtool_f1_lite_out_of_stock:862 - 🚫 F1 Lite appears out of stock: found out of stock indicator and 31 empty price fields
2025-07-14 10:12:34 | WARNING | extract_price:133 - ⚠️ xTool F1 Lite is out of stock - skipping generic extraction fallback
```

**But Database Insert Failed ❌**:
```
ERROR | services.database:add_price_history:216 - Error adding price history for machine 0b5f958f-5b8b-4881-96d3-15924ea095e8:
{'message': 'null value in column "price" of relation "price_history" violates not-null constraint', 'code': '23502'}
```

**FUNDAMENTAL PROBLEM IDENTIFIED**:

The out-of-stock detection was INCORRECT - F1 Lite is actually IN STOCK at $799.00 as shown on the website. The system was finding unrelated "Out of Stock" text on the page and wrongly concluding F1 Lite was out of stock.

**The Real Issue**:
1. The `_is_xtool_f1_lite_out_of_stock` function was finding "Out of Stock" text from other variants
2. This prevented the system from even attempting to extract the actual $799 price
3. The F1 Lite is available for purchase at $799 (discounted from $899)

**What Was Fixed**:
1. Disabled the faulty out-of-stock detection that was preventing price extraction
2. Updated F1 Lite price selectors to use standard Shopify selectors that find the sale price
3. Enhanced dynamic scraper variant selection to properly click on "F1 Lite" and "F1 Lite Standalone"

**Current Status**:
- Out-of-stock detection has been commented out
- Price selectors updated to find the $799 sale price
- Dynamic variant selection improved to select both Version (F1 Lite) and Package (F1 Lite Standalone)

## ACTUAL FUNDAMENTAL PROBLEM (July 14, 2025)

**F1 Lite prices are NOT in the HTML - they're loaded dynamically via JavaScript!**

HTML analysis shows:
```html
<!-- F1 Regular HAS prices -->
F1 Standalone
<span class="money">$1,169.00</span>
<span class="money">$1,499.00</span>

<!-- F1 Lite has EMPTY price fields -->
F1 Lite Standalone  
<span class="money"></span>  <!-- EMPTY! -->
<span class="money"></span>  <!-- EMPTY! -->
```

**What's Actually Happening**:
1. F1 Lite variants have NO PRICES in the initial HTML
2. Prices are loaded dynamically via JavaScript AFTER variant selection
3. Our dynamic scraper clicks F1 Lite but doesn't wait for/trigger the JavaScript that loads prices
4. System finds no F1 Lite price, falls back to generic selector which finds F1 regular price ($1,169)

**Why User Sees $799 on Website**:
- Real browser executes JavaScript that loads F1 Lite prices
- This happens through AJAX/API calls after variant selection
- Our scraper isn't waiting for this dynamic price loading

**What Needs to be Fixed**:
The dynamic scraper must:
1. Click F1 Lite variant
2. Wait for JavaScript/AJAX to load the price data
3. Maybe intercept network requests or wait for specific DOM changes
4. Only then attempt price extraction

This is NOT a CSS selector problem - the price literally doesn't exist until JavaScript loads it!

## FINAL ROOT CAUSE (July 14, 2025)

**The F1 Lite button is NOT being clicked!**

After extensive debugging, the issue is simple:
1. xTool F1/F1 Lite page has a "Version" section with two buttons: "F1" and "F1 Lite"
2. The dynamic scraper SEES the F1 Lite button but FAILS to click it
3. Without clicking the button, F1 Lite prices remain empty in the HTML
4. System falls back to finding regular F1 price ($1,169)

**Why This Took So Long to Identify**:
- Wasted time thinking F1 Lite was out of stock
- Focused on CSS selectors when prices don't exist until button is clicked
- Created complex extraction rules that were pointless without the button click
- Should have recognized this is standard xTool behavior - ALL their machines with variants require button clicks

**Fix Applied**:
Updated dynamic scraper to:
1. Properly locate and click the "F1 Lite" button
2. Use multiple click methods (regular click, JS click)
3. Wait for prices to load after clicking
4. Verify price elements appear after variant selection

This is how ALL xTool machines work - variant buttons must be clicked to load prices dynamically.

## Latest Attempt Failed (July 14, 2025 - 10:40 AM)

**Error**: `'DynamicScraper' object has no attribute '_close_popups'`

The updated code called a method that doesn't exist, causing the variant selection to fail completely. The F1 Lite button still isn't being clicked.

**Result**: Still extracting $1,169 instead of $799

## ACTUAL ROOT CAUSE FINALLY IDENTIFIED (July 14, 2025 - 10:50 AM)

**The Real Problem - A Two-Step Process:**

Looking at the HTML structure, the issue is clear:

1. **Version Selection Section** (STEP 1 - NOT BEING DONE):
```html
<div class="mt-40 product-options__section--version">
    <div>
        <div>Out of Stock</div>
        <div>F1</div>
    </div>
    <div>
        <div>Out of Stock</div>  
        <div>F1 Lite</div>
    </div>
</div>
```

2. **Product Options Section** (STEP 2 - Where prices should appear):
```html
<!-- F1 options have prices -->
F1 Standalone
<span class="money">$1,169.00</span>
<span class="money">$1,499.00</span>

<!-- F1 Lite options have EMPTY prices until version is selected -->
F1 Lite Standalone
<span class="money"></span>  <!-- EMPTY! -->
<span class="money"></span>  <!-- EMPTY! -->
```

**What's Actually Happening:**
1. The page loads with F1 selected by default (prices visible)
2. F1 Lite prices are EMPTY in the HTML until the F1 Lite version button is clicked
3. Our scraper is NOT clicking the F1 Lite version button
4. Therefore, F1 Lite prices remain empty
5. The extractor only finds F1 prices ($1,169 and $1,499)
6. It picks $1,169 as "closest" to the expected $799

**Why the Dynamic Scraper is Failing:**
- The scraper finds "F1 Lite" text in element 19 (the version section)
- But it's not actually clicking on it to select that version
- Without selecting F1 Lite version, the product options never get populated with prices

**The Fix Needed:**
The dynamic scraper must:
1. First click on "F1 Lite" in the version selection section
2. Wait for JavaScript to populate the F1 Lite product prices
3. THEN extract the price from the now-populated F1 Lite Standalone option

This explains why the user sees $799 on the website - they click F1 Lite version first, which loads the prices dynamically.

## Critical Code Path Issue Discovered (July 14, 2025 - 11:15 AM)

**The Real Problem**: Our custom `_select_xtool_variant` code is STILL NOT RUNNING!

Looking at the logs, we're missing ALL of these expected debug messages:
- "DEBUG: Calling _select_xtool_variant (GOOD!)"
- "Detected F1 Lite - looking for Lite variant selector"
- "Looking for F1 Lite button to click..."
- "DEBUG: Found X elements with exact text 'F1 Lite'"
- Screenshots being saved

**What's Actually Happening**:
1. The server is not using our updated code
2. The F1 Lite variant button is never clicked
3. Prices remain empty in the HTML
4. System falls back to finding F1 prices ($1,169)

**Evidence from Latest Run**:
```
2025-07-14 11:11:38 | INFO | DEBUG: Found 0 elements with class='money'
```

The money elements are empty because the F1 Lite variant was never selected!

**Root Causes to Check**:
1. **Server Not Reloaded**: The Python server may still be running old code
2. **Import Cache**: Python may be using cached imports
3. **Wrong Code Path**: The variant_rules might still have shopify_variant_selection=True

**Immediate Actions Needed**:
1. Verify server was properly restarted
2. Check if our code changes are actually being executed
3. Add logging at the very start of extract_price_with_variants to confirm code version

## SUCCESSFUL WORKAROUND IMPLEMENTED (July 14, 2025 - 11:15 AM)

**Solution**: Instead of trying to click variant buttons, use the variant-specific URL!

**What Was Done**:
- Changed the product URL to point directly to the F1 Lite variant
- This bypasses the need for any variant selection clicks
- The F1 Lite price is immediately available in the HTML

**Result**: 
```
2025-07-14 11:14:46 | INFO | Multiple prices found [799.0, 899.0], selecting closest to old price $799.0: $799.0
2025-07-14 11:14:46 | INFO | ✅ METHOD 4 SUCCESS: Extracted price $799.0 using common selectors method: CSS Selector '.price'
2025-07-14 11:14:46 | INFO | Price unchanged for machine 0b5f958f-5b8b-4881-96d3-15924ea095e8: 799.0
```

**Why This Works**:
1. The variant-specific URL loads with F1 Lite already selected
2. Prices are present in the initial HTML (no JavaScript loading needed)
3. Standard price extraction methods work perfectly
4. Much more reliable than trying to automate button clicks

**Permanent Fix**:
Update the xTool F1 Lite product URL in the database to use the variant-specific URL instead of the generic F1 URL. This completely avoids the variant selection problem.