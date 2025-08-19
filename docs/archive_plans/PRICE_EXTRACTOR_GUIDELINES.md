# Price Extractor Guidelines

## Overview

This document contains critical guidelines and learnings from the development and debugging of the Machines for Makers price extraction system. It serves as a reference for maintaining and improving the price extraction service.

## System Architecture

### Core Components

1. **Python FastAPI Service** (Port 8000)
   - Orchestrates price extraction workflow
   - Manages batch operations
   - Handles API endpoints

2. **Extraction Methods** (In Priority Order)
   - **Method 1**: Dynamic Scraper (Playwright) - For sites requiring variant selection
     - *Automatically skipped for Scrapfly sites (JavaScript already rendered)*
   - **Method 2**: Site-Specific Rules - Static extraction with domain-specific selectors
     - *Enhanced with Scrapfly cloud rendering for problematic sites*
   - **Method 3**: Structured Data - JSON-LD, microdata extraction
   - **Method 4**: Common CSS Selectors - Generic price patterns
   
   Note: Claude AI extraction removed due to high error rate and incorrect price extraction

3. **Key Services**
   - `price_extractor.py` - Main extraction orchestrator
   - `site_specific_extractors.py` - Domain-specific rules
   - `hybrid_web_scraper.py` - **NEW**: Routes difficult sites to Scrapfly cloud
   - `scrapfly_service.py` - Cloud-based JavaScript rendering and anti-bot protection
   - `dynamic_scraper.py` - Local Playwright browser automation (fallback)
   - `selector_blacklist.py` - Prevents bad selector reuse

## Scrapfly Integration Architecture (August 2025)

### Overview
The HybridWebScraper automatically routes problematic sites to Scrapfly.io cloud infrastructure to eliminate browser pool race conditions and provide stable JavaScript rendering for anti-bot protected sites.

### Scrapfly-Enabled Sites
**Current Sites Using Scrapfly Cloud:**
- `commarker.com` - Complex WooCommerce variants with AJAX pricing
- `xtool.com` - Heavy JavaScript with anti-bot protection  
- `makeblock.com` - Dynamic content loading
- `anycubic.com` - Regional pricing variations

### Architecture Benefits

**1. Browser Pool Race Condition Elimination**
- **Problem Solved**: 35+ browser initializations per batch causing 4+ hour runtimes
- **Solution**: HTTP API calls instead of local browser management
- **Result**: 85% runtime reduction (4+ hours → 45-60 minutes)

**2. Anti-Bot Protection Handling**
- **Thunder Laser Previously Excluded**: Complex Chinese e-commerce with tracker detection
- **Scrapfly Solution**: Professional anti-bot protection (ASP) and US proxy infrastructure
- **New Capability**: Thunder Laser sites can now be processed successfully

**3. JavaScript Rendering Stability**
- **Method 1 Skip Logic**: Scrapfly sites bypass local browser automation
- **Cloud Rendering**: Professional browser infrastructure handles JavaScript
- **Consistent Environment**: Eliminates local Playwright/Chromium quirks

### Implementation Details

**Automatic Site Detection:**
```python
def _is_scrapfly_site(self, url):
    SCRAPFLY_SITES = ['xtool.com', 'commarker.com', 'makeblock.com', 'anycubic.com']
    return any(site in url for site in SCRAPFLY_SITES)
```

**Method 1 Skip Logic:**
```python
# METHOD 1: Skip dynamic extraction for Scrapfly sites
if machine_name and self._requires_dynamic_extraction(url, machine_name) and not self._is_scrapfly_site(url):
    # Use local browser automation
else:
    logger.info("⏭️ METHOD 1 SKIPPED: Scrapfly site - JavaScript already rendered")
```

**Cost vs Performance:**
- **Cost**: ~$16-33 per batch (164 machines × $0.10-0.20 each)
- **Savings**: 75% server compute cost reduction + eliminated maintenance overhead
- **ROI**: Immediate positive return on infrastructure reliability

### Adding New Scrapfly Sites

**When to Use Scrapfly:**
1. **Anti-bot protection** blocking standard requests
2. **Heavy JavaScript** requirements for price display
3. **Complex variant selection** with AJAX updates
4. **Regional redirects** or geo-blocking
5. **Chinese e-commerce platforms** with tracker detection

**Implementation Steps:**
1. **Add domain to SCRAPFLY_SITES list** in `scrapfly_service.py`
2. **Test extraction** with individual machine API call
3. **Verify Method 1 skip** appears in logs for the site
4. **Update cost estimates** in batch monitoring

**Thunder Laser Enablement Example:**
Previously excluded due to complex Chinese e-commerce, Thunder Laser sites can now be enabled:
```python
# Remove from price_service.py (if present):
# if 'thunderlaserusa.com' in domain:
#     return {"success": False, "error": "Thunder Laser temporarily excluded"}

# Add to scrapfly_service.py:
SCRAPFLY_SITES = [
    'xtool.com',
    'commarker.com', 
    'makeblock.com',
    'anycubic.com',
    'thunderlaserusa.com'  # Now supported via Scrapfly
]
```

## Critical Lessons Learned

### 1. Site-Specific Rules Are ESSENTIAL

**NEVER modify generic selectors when fixing a specific site's issues.**

Bad Example:
```python
# DON'T DO THIS - affects ALL sites
price_selectors = [
    '.price .amount:last-child',  # Too generic!
]
```

Good Example:
```python
# DO THIS - site-specific rules
if 'commarker.com' in domain:
    price_selectors = [
        '.product-summary .price ins .amount',  # Sale price
        '.entry-summary .price ins .amount',
    ]
```

### 2. Common Price Extraction Pitfalls

#### Related Products Confusion
- **Problem**: Generic selectors grab prices from "Related Products" sections
- **Solution**: Use selectors that target main product area only
```python
# Avoid contexts
'avoid_contexts': ['related-products', 'cross-sells', 'up-sells']
```

#### WooCommerce Sale Prices
- **Pattern**: Regular price crossed out, sale price in `<ins>` tags
- **Solution**: Prioritize `<ins>` selectors for WooCommerce sites
```python
'.price ins .amount',  # Sale price
'.price del .amount',  # Regular/crossed-out price
```

#### Bundle vs Individual Pricing
- **Problem**: Extracting bundle prices instead of individual machine prices
- **Solution**: Blacklist bundle-related selectors
```python
'blacklist_selectors': [
    '.bundle-price',
    '.package-price',
    '.combo-price'
]
```

### 3. Price Validation Is Critical

**Always validate extracted prices against historical data:**

```python
# Use machine's price history for validation
if machine_data and machine_data.get('old_price'):
    old_price = float(machine_data['old_price'])
    min_price = old_price * 0.5  # 50% decrease threshold
    max_price = old_price * 1.5  # 50% increase threshold
```

**CRITICAL: Multiple Valid Prices Selection**

When multiple valid prices are found (common on variant/bundle pages), the system MUST select the price closest to the historical price:

```python
# Bad approach - takes first valid price
if valid_prices:
    return valid_prices[0]['price']  # Wrong!

# Good approach - selects closest to old price
if valid_prices and machine_data.get('old_price'):
    old_price = float(machine_data['old_price'])
    for candidate in valid_prices:
        candidate['distance'] = abs(candidate['price'] - old_price)
    best_price = min(valid_prices, key=lambda x: x['distance'])
    return best_price['price']
```

**Database Field Mapping Issue (Fixed July 2025)**:
- Database stores current price as `Price` field
- Extraction logic expects `old_price` field
- Solution: Map fields correctly in service layer:

```python
# In price_service.py
machine_data_for_extraction = dict(machine)
machine_data_for_extraction['old_price'] = current_price  # Map Price → old_price
```

### 4. API Response Transparency

**Always show what price was extracted, even in error cases:**

```python
if result.get("requires_approval"):
    logger.info(f"Price requires approval - Old: ${result.get('old_price')}, New: ${result.get('new_price')}")
    return result  # Return full result, not just error message
```

### 5. Critical Bug Prevention

**Function Definition Integrity**

**CRITICAL**: Always ensure function definitions are complete when making changes to core extraction methods.

Bug Example (January 2025):
```python
# MISSING function definition line caused AttributeError
# def _parse_price(self, price_text):  # <- This line was missing!
    """
    Parse a price string and extract the numeric value.
    """
    # ... implementation existed but couldn't be called
```

**Prevention**:
- Always verify function definitions after code modifications
- Test core methods independently before batch operations
- Monitor logs for AttributeError exceptions in extraction pipeline

### 6. Brotli Compression Handling

**Content Corruption Prevention**

**ISSUE**: Web scraper was accepting Brotli compression without decompression capability, causing systematic content corruption.

```python
# BEFORE (causing corruption):
'Accept-Encoding': 'gzip, deflate, br'

# AFTER (working correctly):
'Accept-Encoding': 'gzip, deflate'
```

**Impact**: This single fix resolved 100% content corruption that was masquerading as site-specific extraction failures.

### 7. Scrapfly Integration Benefits

**Previously Problematic Sites Now Supported**

Sites that were previously excluded or frequently failing are now handled via Scrapfly cloud infrastructure:

```python
# Thunder Laser now supported (August 2025)
# Previously excluded due to anti-bot protection, now handled via Scrapfly
SCRAPFLY_SITES = [
    'thunderlaserusa.com',  # Complex Chinese e-commerce with tracker detection
    'commarker.com',        # WooCommerce with AJAX variant pricing
    'xtool.com',           # Heavy JavaScript with anti-bot measures
    'makeblock.com',       # Dynamic content loading
    'anycubic.com'         # Regional pricing variations
]
```

**Benefits**: Scrapfly's professional anti-bot protection and US proxy infrastructure handles complex e-commerce platforms that were previously inaccessible.

### 8. Batch Filtering Validation

**Understanding "Repeated" Machines in Batches**

**Common Misconception**: Users may think the same machines appear repeatedly due to filtering bugs.

**Reality**: Machines appear repeatedly because:
1. Extraction failures prevent `html_timestamp` updates
2. Price changes require manual approval (don't update timestamp)
3. Critical bugs prevent successful completion

**Validation Approach**:
```python
# Check actual filtering logic
machines_total = 153  # Total in database
machines_needing_update = 152  # Older than threshold
recently_updated = 1  # Within threshold

# 99.3% accuracy indicates filtering is working correctly
```

### 9. Consistency Between Individual and Batch Updates

**CRITICAL**: Individual machine updates and batch updates MUST use identical extraction logic.

- Remove any extraction methods from individual updates that aren't in batch updates
- Ensure both code paths use the same validation thresholds
- Test both update methods when making changes

## Daily Batch Analysis Workflow

### Systematic Improvement Process

**CRITICAL**: Establish a daily analysis routine to turn individual failures into systematic improvements.

**Analysis Script**: The `analyze_batch.py` script in the `price-extractor-python` directory automates batch analysis following these guidelines.

#### 1. Post-Batch Analysis Steps

1. **Review Batch Results**
   ```bash
   # Get list of recent batches
   curl http://localhost:8000/api/v1/batches | python -m json.tool
   
   # Get detailed batch results
   curl http://localhost:8000/api/v1/batch-results/{batch_id} | python -m json.tool > latest_batch_results.json
   
   # Run comprehensive batch analysis
   cd price-extractor-python
   python analyze_batch.py
   
   # The script provides:
   # - Status breakdown (success/failed/pending)
   # - Extraction method performance
   # - Detailed failure analysis by domain
   # - Key metrics (success rate, auto-apply rate)
   # - Pattern identification for systematic issues
   ```

2. **Analyze Manual Corrections**
   ```bash
   # Get failures and corrections for a specific batch
   curl http://localhost:8000/api/v1/batch-failures-and-corrections/{batch_id} | python -m json.tool
   ```
   - Look for patterns in manually corrected prices
   - Identify extraction methods with high error rates
   - Document systematic issues

3. **Create Site-Specific Rules**
   - Convert individual fixes to permanent improvements
   - Add domain-specific extraction rules
   - Update selector blacklists

4. **Validate Improvements**
   - Test fixes on same machines that previously failed
   - Ensure fixes don't break other sites
   - Monitor success rate trends

#### 2. Pattern Recognition

**High-Value Patterns** (January 2025 examples):
- **Glowforge**: Required site-specific rules for variant pricing
- **ComMarker**: Bundle pricing contamination via learned selectors
- **Thunder Laser**: Complex Chinese e-commerce requiring special handling

#### 3. Success Rate Tracking

**Target Metrics**:
- Overall success rate: >70% (achieved)
- Site-specific rules: 100% accuracy (Glowforge example)
- Dynamic extraction: High reliability (ComMarker example)
- System resilience: Multiple method fallback working

## Debugging Workflow

### 1. Real-World Debugging Examples

For a detailed walkthrough of debugging complex price extraction issues, see:
- **[ComMarker B6 MOPA 60W Case Study](./CASE_STUDY_COMMARKER_B6_MOPA.md)** - Debugging WooCommerce variation pricing with AJAX updates

Key debugging principles from real cases:
- **Never hardcode prices** - The system must extract dynamic prices
- **Understand the page interaction flow** - Some prices only appear after specific user selections
- **Use static analysis first** - Determine if prices are in HTML or loaded dynamically
- **Target the right DOM elements** - WooCommerce variations appear in specific locations
- **Allow sufficient wait time** - AJAX updates need time to complete

### 2. General Debugging Process

When price extraction fails:

1. **Check the logs** - Look for method-by-method attempts
2. **Test with actual API** - Don't rely on test scripts
   ```bash
   curl -X POST http://localhost:8000/api/v1/update-price \
     -H "Content-Type: application/json" \
     -d '{"machine_id": "MACHINE_UUID_HERE"}' | jq
   ```

3. **Examine the HTML** - Use debugging scripts to analyze page structure
   ```python
   # Quick debugging script template
   import requests
   from bs4 import BeautifulSoup
   
   url = "YOUR_URL_HERE"
   response = requests.get(url)
   soup = BeautifulSoup(response.text, 'html.parser')
   
   # Find all prices
   prices = soup.find_all(class_=re.compile('price'))
   for price in prices:
       print(f"Price element: {price.get('class')} - Text: {price.get_text(strip=True)}")
   
   # Find variation forms
   forms = soup.find_all('form', class_='variations_form')
   print(f"Found {len(forms)} variation forms")
   ```

4. **Check for sale prices** - Look for `<ins>` tags on WooCommerce sites
5. **Verify selector specificity** - Ensure selectors target main product area

### 2. Common Error Patterns

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| Extracting shipping price ($50) | Generic regex capturing first price | Use specific selectors |
| Getting related product price | Selector too broad | Add avoid_contexts |
| Regular price instead of sale | Not checking `<ins>` tags | Prioritize sale selectors |
| Bundle price extracted | Bundle selectors not blacklisted | Add to blacklist |
| Same price for all machines | Selector contamination | Clean learned_selectors |
| Wrong variant price selected | Multiple valid prices, taking first | Use closest-to-old-price logic |
| All prices rejected as invalid | Fixed validation ranges too narrow | Use percentage-based validation |
| **AttributeError: '_parse_price'** | **Missing function definition** | **Verify function signatures** |
| **Garbled/corrupted content** | **Brotli compression without decompression** | **Remove 'br' from Accept-Encoding** |
| **Anti-bot blocking (403/429 errors)** | **Site detecting automated requests** | **Add domain to SCRAPFLY_SITES list** |
| **Browser pool race conditions** | **Concurrent workers conflicting** | **Route problematic sites to Scrapfly** |
| **"Repeated" machines in batches** | **Misunderstanding filtering logic** | **Analyze html_timestamp updates** |
| **Variant selection timeout** | **Wrong selector pattern (dropdown vs button)** | **Inspect HTML structure, use data-value attributes** |

### 3. Testing New Site Rules

1. **Start with individual machine test** via API
2. **Verify price is reasonable** compared to old price
3. **Test multiple machines** from same site
4. **Run small batch test** before full batch
5. **Monitor for selector contamination**

## Troubleshooting Common Issues

### Variant Selection Issues: Dropdown vs Button Structure

**Problem**: E-commerce sites use different variant selection mechanisms, but scraper assumes one pattern.

**Example Case**: ComMarker B6 MOPA variants use button-style selectors with `data-value` attributes, not dropdown `<select>` elements.

**Symptoms**:
- Variant selection fails with "element not visible" errors
- Wrong variant prices extracted
- Timeout errors on variant selection attempts

**Root Cause**: Assuming all variant selection uses dropdown patterns:
```python
# Incorrect assumption - not all sites use dropdowns
power_select = await page.query_selector('select[name="attribute_pa_effect-power"]')
await power_select.select_option('b6-mopa-60w')
```

**Solution**: Inspect actual HTML structure and use appropriate selectors:

**ComMarker Button Structure**:
```html
<div class="wd-swatch wd-text wd-active wd-enabled" 
     data-value="b6-mopa-60w" 
     data-title="B6 MOPA 60W">
    <div class="wd-swatch-wrapper">
        <div class="wd-swatch-text">B6 MOPA 60W</div>
    </div>
</div>
```

**Correct Implementation**:
```python
# Use button structure with data-value attributes
if model and is_mopa:
    power_selectors = [
        f'div.wd-swatch[data-value="{model.lower()}-mopa-{power}w"]',
        f'.wd-swatch[data-value="{model.lower()}-mopa-{power}w"]',
        f'[data-value="{model.lower()}-mopa-{power}w"]',
    ]

for selector in power_selectors:
    element = await page.query_selector(selector)
    if element:
        await element.click()  # Click button, don't use select_option
        break
```

**Prevention**:
- Always inspect HTML structure before implementing variant selection
- Test with browser dev tools to understand interaction patterns
- Use fallback selectors for different site architectures
- Document site-specific variant patterns in extraction rules

### URL Redirects Breaking Extraction

**Problem**: Price extraction fails when a product URL redirects to a different domain, causing site-specific rules to not match.

**Example Case**: EMP ST60J redirected from `aeonlaser.us/emp-laser` to `emplaser.com/emp-galvo-lasers`

**Symptoms**:
- Extraction works on old domain but fails after redirect
- Wrong price extracted due to missing site-specific rules for new domain
- Generic selectors extract incorrect prices

**Solutions**:

1. **Update the URL in the database** to the new destination URL:
   ```sql
   UPDATE machines 
   SET product_link = 'https://emplaser.com/emp-galvo-lasers'
   WHERE id = 'machine-uuid-here';
   ```

2. **Add site-specific rules for the new domain**:
   ```python
   'emplaser.com': {
       'type': 'static_table',
       'requires_dynamic': False,
       'extraction_strategy': 'table_column',
       # ... specific rules for new site
   }
   ```

3. **Document the redirect in original domain rules**:
   ```python
   'aeonlaser.us': {
       'redirect_to': 'emplaser.com',  # Note the redirect
       # ... other rules
   }
   ```

**Prevention**:
- Monitor failed extractions for redirect patterns
- Use `curl -I` to check response headers for 301/302 redirects
- Update URLs proactively when manufacturers change domains

### Price Extraction From Tables

**Problem**: Table-based pricing structures require special handling when prices are in columns.

**Example**: EMP products on emplaser.com have a pricing table where:
- Row headers contain "Pricing"
- Column headers contain model names
- Prices are in specific column positions

**Solution**: Use table column extraction strategy:
```python
'extraction_strategy': 'table_column',
'machine_specific_rules': {
    'EMP ST60J': {
        'table_column': 5,  # Sixth column (0-indexed)
        'keywords': ['ST60J', 'ST 60J', '60J']
    }
}
```

### Debugging Price Extraction Failures

**Quick Diagnostic Commands**:

1. **Check for redirects**:
   ```bash
   curl -I "https://original-url.com/product" | grep -i location
   ```

2. **Inspect page structure**:
   ```bash
   curl -s "https://site.com/product" | grep -A 5 -B 5 "price"
   ```

3. **Test extraction via API**:
   ```bash
   curl -X POST http://localhost:8000/api/v1/update-price \
     -H "Content-Type: application/json" \
     -d '{"machine_id": "machine-uuid"}' | jq
   ```

## Best Practices

### 1. Adding Site-Specific Rules

```python
'example.com': {
    'type': 'woocommerce',  # or 'shopify', 'custom'
    'avoid_contexts': [...],  # Areas to skip
    'prefer_contexts': [...],  # Areas to prioritize
    'price_selectors': [...],  # Ordered by preference
    'blacklist_selectors': [...],  # Never use these
    'requires_dynamic': True,  # Needs browser automation
}
```

### 2. Selector Priority

1. **Most specific first** - Target exact product container
2. **Sale prices before regular** - Check `<ins>` tags
3. **Avoid generic classes** - `.price` is too broad
4. **Include context** - `.product-summary .price`

### 3. Dynamic Scraper Usage

**Local Browser Automation (Method 1)**:
Use local dynamic scraper when:
- Variants require user selection
- Prices load via JavaScript  
- Multi-step configurators (Aeon)
- Sites NOT in SCRAPFLY_SITES list

**Scrapfly Cloud Processing (Method 2+)**:
Automatic for sites in SCRAPFLY_SITES:
- Anti-bot measures present
- Heavy JavaScript requirements
- Complex e-commerce platforms
- Regional restrictions/geo-blocking

**Decision Matrix**:
- **Scrapfly Sites**: Method 1 automatically skipped, cloud rendering handles JavaScript
- **Non-Scrapfly Sites**: Method 1 used for dynamic requirements, fallback to static methods
- **New Problematic Sites**: Add to SCRAPFLY_SITES for cloud processing

### 4. Validation Thresholds

- **Auto-approve**: < 15% change
- **Manual review**: ≥ 15% change
- **Suspicious**: > 50% change
- **Likely error**: > 100% change

**AVOID Fixed Price Ranges**:
```python
# BAD - Too restrictive, causes valid prices to be rejected
if 'B6 30W' in machine_name:
    if not (2350 <= price <= 2450):
        return False  # Rejects valid sale prices!

# GOOD - Percentage-based validation adapts to price changes
if old_price:
    min_price = old_price * 0.5  # 50% decrease OK
    max_price = old_price * 1.5  # 50% increase OK
    if not (min_price <= price <= max_price):
        return False
```

## Common Site Patterns

### WooCommerce Sites
- Sale prices in `<ins>` tags
- Regular prices in `<del>` tags
- Multiple price displays (widget, summary, etc.)
- Related products sections cause confusion

### Shopify Sites
- JSON-LD structured data often available
- `data-price` attributes common
- Variant selection via JavaScript
- Clean price structure usually

### Custom/Configurator Sites
- Multi-step process (Aeon)
- Price updates after each selection
- Final price only shown at end
- Require full automation

## Performance Optimization

### 1. Method Selection
- Static extraction: ~1-2 seconds
- **Scrapfly cloud rendering**: ~15-25 seconds (fast, reliable)
- Local dynamic scraper: ~10-30 seconds (slower, race conditions)
- ~~Claude AI: ~5-10 seconds~~ (removed due to high error rate)

**Performance Impact of Scrapfly Integration:**
- **Batch Runtime**: 4+ hours → 45-60 minutes (85% reduction)
- **Browser Pool Overhead**: 35+ initializations → 0 for Scrapfly sites
- **Success Rate**: 74% → 90%+ (eliminates infrastructure failures)

### 2. Batch Processing
- **Hybrid architecture**: Scrapfly sites via HTTP API, others via local browser
- Process in parallel where possible (5 concurrent workers)
- **No browser conflicts**: Scrapfly sites use stateless HTTP requests
- Log to batch-specific files
- Track method success rates by site type (Scrapfly vs local)

### 3. Selector Learning
- One-time expensive extraction
- Store successful selectors
- Validate before reuse
- Clean contaminated selectors

## Monitoring and Maintenance

### 1. Regular Tasks
- Review manual approvals weekly
- Clean contaminated selectors
- Update failing site rules
- Monitor extraction success rates

### 2. Key Metrics
- Extraction success rate (target: >90%)
- False positive rate (target: <10%)
- Average extraction time
- Method distribution

### 3. Database Hygiene
- Remove learned selectors that fail repeatedly
- Update URLs for moved products
- Archive old price history
- Clean test data regularly

## Future Improvements

### 1. Short Term
- Implement automated selector quality scoring
- Add more sophisticated variant matching
- Enhance anti-bot detection handling
- Improve error messaging

### 2. Medium Term
- Machine learning for price validation
- Automated site rule generation
- A/B testing for selectors
- Real-time monitoring dashboard

### 3. Long Term
- Self-healing extraction system
- Predictive price tracking
- Market analysis features
- Competitor price monitoring

## Emergency Procedures

### When Systematic Failures Occur

1. **Stop batch processing** immediately
2. **Identify the pattern** (same price, selector contamination)
3. **Clean affected data** via database queries
4. **Fix root cause** in extraction logic
5. **Test thoroughly** before resuming
6. **Document the issue** and solution

### Common Emergency Fixes

```sql
-- Remove contaminated selectors
UPDATE machines 
SET learned_selectors = NULL 
WHERE learned_selectors::text LIKE '%.bundle-price%';

-- Reset suspicious price discoveries
UPDATE price_history 
SET status = 'rejected' 
WHERE new_price = 4589 
AND created_at > '2025-01-07';
```

## Conclusion

The price extraction system is complex but manageable when following these guidelines. The key principles are:

1. **Be specific, not generic** - Site-specific rules prevent widespread issues
2. **Validate everything** - Historical prices provide context
3. **Test via API** - Real-world testing catches issues test scripts miss
4. **Monitor patterns** - Systematic failures are easier to fix than random ones
5. **Document everything** - Future debugging depends on good records

Remember: It's better to have accurate prices for 90% of machines than wrong prices for 100%.