# Price Extraction Investigation Report

## Summary

I investigated two specific URLs that had price extraction failures using browser automation. The issues are clear patterns that can be fixed with site-specific extraction rules.

## Problem Analysis

### 1. Commarker B4 50W - WRONG PRICE: $8,888 (Should be ~$2,400)

**URL:** `https://commarker.com/product/b4-50w-fiber-laser-engraver/?ref=snlyaljc`

**Root Cause:** The extractor is picking up the highest price from a product comparison section instead of the main product price.

**Evidence:**
- Multiple `.price` elements found with values: `$8,888`, `$6,666`, `$2,399`, `$1,799`, etc.
- The first `.price` element contains: `"$8,888 $6,666 Save:$2,222"`
- The actual product price is lower in the list: `"$2,399 $1,799 Save:$600"`
- This is a WooCommerce site with standard price structure

**Current Extractor Behavior:**
The common selector method finds `.price` elements and returns the first one, which happens to be from a "related products" or "compare" section showing a more expensive model.

**Solution:**
Need to prioritize the main product price over comparison/related product prices.

### 2. Cloudray QS-30 - WRONG PRICE: $259 (Should be ~$2,590)

**URL:** `https://www.cloudraylaser.com/collections/cloudray-engraver-machine/products/qs-30-litemarker-30w-split-laser-engraver-fiber-marking-machine-with-4-3-x-4-3-7-9-x-7-9-working-area`

**Root Cause:** The extractor is extracting a price from addon/accessory selection dropdowns instead of the main product price.

**Evidence:**
- Main product price in JSON-LD: `hasVariant.0.offers.price: 2599.00`
- But `data-price` attributes contain addon prices: `259900` (representing $25.99 for accessories)
- The main visible price is `$2,599.00 USD` but extractor picks up `data-price="259900"` from form elements
- This is a Shopify site with product variants/addons

**Current Extractor Behavior:**
The common selector method finds `[data-price]` attributes first, but these belong to addon selection forms, not the main product.

## Specific Technical Findings

### Commarker.com (WooCommerce)
```html
<!-- WRONG: First .price element (from comparison section) -->
<span class="price">$8,888 $6,666 Save:$2,222</span>

<!-- CORRECT: Main product price (further down) -->
<span class="price">$2,399 $1,799 Save:$600</span>
```

### Cloudraylaser.com (Shopify)
```html
<!-- WRONG: Addon dropdown data-price -->
<select data-price="259900" data-cpprice="399900">
  <option>USA Warehouse/ 3-5 Business Day / American Plug</option>
</select>

<!-- CORRECT: JSON-LD structured data -->
"hasVariant":[{
  "offers":{
    "price":"2599.00",
    "priceCurrency":"USD"
  }
}]

<!-- CORRECT: Visible price text -->
$2,599.00 USD
```

## Recommended Solutions

### 1. Enhanced Site-Specific Rules

Create domain-specific extraction rules:

```python
SITE_SPECIFIC_RULES = {
    'commarker.com': {
        'avoid_selectors': ['.related-products .price', '.comparison .price'],
        'prefer_selectors': ['.product-summary .price', '.single-product .price'],
        'context_filters': ['single-product', 'product-summary']
    },
    'cloudraylaser.com': {
        'avoid_selectors': ['[name*="items"] [data-price]', '.addon [data-price]'],
        'prefer_json_ld': True,
        'json_ld_path': 'hasVariant.0.offers.price',
        'fallback_selectors': ['.product-price', '.price-current']
    }
}
```

### 2. Context-Aware Extraction

Prioritize price elements that are in the main product context:

```python
def _extract_with_context_priority(self, soup, url):
    """Extract price with context awareness."""
    domain = urlparse(url).netloc
    
    # Check for main product containers first
    main_containers = [
        '.product-summary', '.product-main', '.product-details',
        '.single-product', '.product-info', '#product'
    ]
    
    for container_selector in main_containers:
        container = soup.select_one(container_selector)
        if container:
            # Look for price within main product context only
            price_elements = container.select('.price, [data-price], .product-price')
            for element in price_elements:
                price = self._parse_price(element.get_text() or element.get('data-price'))
                if price and 100 <= price <= 50000:  # Reasonable range
                    return price, f"Context-aware ({container_selector})"
    
    return None, None
```

### 3. Improved JSON-LD Handling

For Shopify sites, prioritize JSON-LD structured data:

```python
def _extract_shopify_price(self, soup):
    """Shopify-specific price extraction."""
    # Look for product JSON-LD first
    json_scripts = soup.find_all('script', type='application/ld+json')
    for script in json_scripts:
        try:
            data = json.loads(script.string)
            if isinstance(data, dict) and 'hasVariant' in data:
                variants = data['hasVariant']
                if variants and len(variants) > 0:
                    offers = variants[0].get('offers', {})
                    if 'price' in offers:
                        price = float(offers['price'])
                        return price, "Shopify JSON-LD"
        except (json.JSONDecodeError, ValueError, KeyError):
            continue
    return None, None
```

### 4. Validation Rules

Add price validation based on expected ranges:

```python
def _validate_extracted_price(self, price, url, context=""):
    """Validate if extracted price makes sense."""
    if not price:
        return False
        
    # Reject obviously wrong prices
    if price < 50 or price > 50000:
        logger.warning(f"Price {price} outside reasonable range for {url}")
        return False
    
    # Site-specific validation
    domain = urlparse(url).netloc
    if 'laser' in url.lower() or 'engraver' in url.lower():
        if price < 200:  # Laser engravers typically cost more than $200
            logger.warning(f"Price {price} too low for laser engraver at {url}")
            return False
    
    return True
```

## Implementation Priority

1. **High Priority:** Add site-specific rules for `commarker.com` and `cloudraylaser.com`
2. **Medium Priority:** Implement context-aware extraction for all sites
3. **Low Priority:** Add comprehensive validation rules

## Expected Results

After implementing these fixes:
- **Commarker B4 50W:** Should extract ~$2,399 instead of $8,888
- **Cloudray QS-30:** Should extract $2,599 instead of $259

## Files Generated During Investigation

- `investigation-Cloudray-QS-30.png` - Screenshot of Cloudray page
- `investigation-Cloudray-QS-30-results.json` - Detailed extraction data
- `commarker-investigation.png` - Screenshot of Commarker page  
- `commarker-results.json` - Detailed extraction data
- `investigate-prices.js` - Main investigation script
- `investigate-commarker.js` - Focused Commarker script