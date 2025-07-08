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
   - **Method 3**: Claude AI Fallback - For complex pages when other methods fail

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

### 4. API Response Transparency

**Always show what price was extracted, even in error cases:**

```python
if result.get("requires_approval"):
    logger.info(f"Price requires approval - Old: ${result.get('old_price')}, New: ${result.get('new_price')}")
    return result  # Return full result, not just error message
```

### 5. Consistency Between Individual and Batch Updates

**CRITICAL**: Individual machine updates and batch updates MUST use identical extraction logic.

- Remove any extraction methods from individual updates that aren't in batch updates
- Ensure both code paths use the same validation thresholds
- Test both update methods when making changes

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