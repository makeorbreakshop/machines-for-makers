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
   - **Method 2**: Site-Specific Rules - Static extraction with domain-specific selectors
   - **Method 3**: Structured Data - JSON-LD, microdata extraction
   - **Method 4**: Common CSS Selectors - Generic price patterns
   
   Note: Claude AI extraction removed due to high error rate and incorrect price extraction

3. **Key Services**
   - `price_extractor.py` - Main extraction orchestrator
   - `site_specific_extractors.py` - Domain-specific rules
   - `dynamic_scraper.py` - Playwright browser automation
   - `selector_blacklist.py` - Prevents bad selector reuse

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

### 7. Domain-Specific Exclusions

**Temporary Exclusions for Special Handling**

Some domains require special handling that isn't implemented yet and should be temporarily excluded:

```python
# Thunder Laser exclusion (January 2025)
if 'thunderlaserusa.com' in domain:
    logger.warning(f"⚠️ Skipping Thunder Laser machine {machine_id} - requires special handling")
    return {
        "success": False, 
        "error": "Thunder Laser machines temporarily excluded from batch updates"
    }
```

**Rationale**: Thunder Laser uses a complex Chinese e-commerce integration that requires specialized handling.

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

### 1. When Price Extraction Fails

1. **Check the logs** - Look for method-by-method attempts
2. **Test with actual API** - Don't rely on test scripts
   ```bash
   curl -X POST http://localhost:8000/api/v1/update-price \
     -H "Content-Type: application/json" \
     -d '{"machine_id": "MACHINE_UUID_HERE"}' | jq
   ```

3. **Examine the HTML** - Use Playwright to see actual page structure
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
| **Thunder Laser failures** | **Complex Chinese e-commerce** | **Temporarily exclude domain** |
| **"Repeated" machines in batches** | **Misunderstanding filtering logic** | **Analyze html_timestamp updates** |

### 3. Testing New Site Rules

1. **Start with individual machine test** via API
2. **Verify price is reasonable** compared to old price
3. **Test multiple machines** from same site
4. **Run small batch test** before full batch
5. **Monitor for selector contamination**

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

Use dynamic scraper when:
- Variants require user selection
- Prices load via JavaScript
- Multi-step configurators (Aeon)
- Anti-bot measures present

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
- Dynamic scraper: ~10-30 seconds
- Claude AI: ~5-10 seconds

### 2. Batch Processing
- Process in parallel where possible
- Log to batch-specific files
- Track method success rates
- Identify systematic failures

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