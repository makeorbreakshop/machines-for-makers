# ComMarker Price Extraction Fixes

## Issue Analysis

ComMarker products consistently show incorrect prices in the batch run:

| Machine | Reported Price | Actual Price | Error |
|---------|---------------|--------------|-------|
| B4 100W MOPA | $600.00 | $6,666.00 | -91% |
| B4 20W | $600.00 | $2,399.00 | -75% |

## Root Causes

1. **Generic CSS Selector**: Using `.price` selects wrong elements from the ComMarker product pages
2. **Discount Format**: ComMarker uses a specific WooCommerce discount format with strikethrough pricing
3. **Multiple Price Elements**: Both regular and sale prices appear on the same page
4. **Price Pattern**: ComMarker uses a specific format: `~~$2,299~~ $1,839`

## Inspection of ComMarker HTML

```html
<div class="woocommerce-product-details__price">
  <p class="price">
    <del aria-hidden="true">
      <span class="woocommerce-Price-amount amount">
        <bdi><span class="woocommerce-Price-currencySymbol">$</span>2,299.00</bdi>
      </span>
    </del> 
    <ins>
      <span class="woocommerce-Price-amount amount">
        <bdi><span class="woocommerce-Price-currencySymbol">$</span>1,839.00</bdi>
      </span>
    </ins>
  </p>
</div>
```

## Specific Fixes

### 1. Update CSS Selectors

Replace generic `.price` with ComMarker-specific selectors:

```python
# ComMarker-specific CSS selectors
commarker_selectors = [
    ".price ins .woocommerce-Price-amount bdi",              # Sale price (highest priority)
    ".product .price:not(del) .woocommerce-Price-amount",    # Non-deleted price
    "form.cart .price .woocommerce-Price-amount",            # Cart price
    "h1 + .woocommerce-product-details__price span.price ins .woocommerce-Price-amount" # Sale price near title
]
```

### 2. Add Special Regex Pattern

Add a pattern to specifically capture ComMarker's strikethrough price format:

```python
# ComMarker-specific price patterns
commarker_patterns = [
    r'~~\$(\d{1,3},?\d{3}(?:\.\d{2})?)~~\s+\$(\d{1,3},?\d{3}(?:\.\d{2})?)',  # Strikethrough format
    r'<del[^>]*>.*?\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?).*?</del>.*?<ins[^>]*>.*?\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?).*?</ins>',  # HTML markup format
]
```

### 3. Enhanced Claude AI Prompting

Update the Claude AI prompt specifically for ComMarker pages:

```python
def _get_commarker_prompt_enhancement(self):
    """Get ComMarker-specific prompt enhancement for Claude AI."""
    return """
    This is a ComMarker product page. ComMarker typically uses WooCommerce with sale pricing.
    
    Important pricing patterns to look for:
    1. Look for prices in the format "~~$2,299~~ $1,839"
    2. The actual price is typically in an <ins> tag, while the old price is in a <del> tag
    3. Find elements with class "woocommerce-product-details__price" and look for price inside
    4. ComMarker products typically cost between $1,000 and $7,000
    
    Be very careful to extract the CURRENT price (after discount), not the original price.
    """
```

### 4. Fix Price Validation For ComMarker

Add special validation logic for ComMarker prices:

```python
def _validate_commarker_price(self, price, previous_price):
    """Extra validation for ComMarker prices."""
    
    # ComMarker products typically cost between $1,000 and $7,000
    # If we get a price under $1,000, it's likely missing a digit
    if price < 1000 and previous_price > 1000:
        # Try multiplying by 10 until within reasonable range
        corrected = price
        while corrected < 1000:
            corrected *= 10
            
        # If corrected price is within 20% of previous price, accept it
        if previous_price * 0.8 <= corrected <= previous_price * 1.2:
            return corrected
            
    return price
```

### 5. Implementation Plan

1. **Update merchant_settings**:
   ```python
   self.merchant_settings["commarker.com"] = {
       "html_limit": 50000,  # Higher limit for ComMarker
       "price_patterns": commarker_patterns,
       "css_selectors": commarker_selectors,
       "price_range": [1000, 7000],  # Typical price range
       "requires_special_validation": True
   }
   ```

2. **Add custom extraction method**:
   ```python
   def _extract_commarker_price(self, soup, html_content):
       """Special extraction method for ComMarker."""
       # Try specific selectors first
       for selector in self.merchant_settings["commarker.com"]["css_selectors"]:
           price_element = soup.select_one(selector)
           if price_element:
               price_text = price_element.get_text(strip=True)
               price = self._parse_price(price_text)
               if price:
                   return price, f"ComMarker CSS Selector '{selector}'"
                   
       # Try specific regex patterns
       for pattern in self.merchant_settings["commarker.com"]["price_patterns"]:
           matches = re.search(pattern, html_content, re.DOTALL)
           if matches and len(matches.groups()) >= 2:
               # Get the second group (sale price) from the pattern
               price_text = matches.group(2)
               price = self._parse_price(price_text)
               if price:
                   return price, f"ComMarker Regex Pattern"
                   
       # Fallback to normal extraction
       return None, None
   ```

3. **Update extract_price method**:
   ```python
   async def extract_price(self, soup, html_content, url, product_category=None, previous_price=None, machine_id=None):
       # Reset selectors info for tracking this extraction
       self.reset_selectors_info()
       
       # Check if this is a ComMarker page
       domain = self._extract_domain(url)
       if "commarker.com" in domain:
           price, method = self._extract_commarker_price(soup, html_content)
           if price is not None:
               # Apply ComMarker-specific validation
               price = self._validate_commarker_price(price, previous_price)
               return price, method
       
       # Continue with regular extraction pipeline
       # ...
   ```

## Testing Plan

1. Run targeted tests on ComMarker products:
   ```bash
   python test_extraction.py https://commarker.com/product/b4-100w-jpt-mopa/ --previous-price 6666
   python test_extraction.py https://commarker.com/product/b4-laser-engraver/ --previous-price 2399
   ```

2. Compare extraction from multiple methods:
   ```bash
   python test_extraction.py https://commarker.com/product/b4-100w-jpt-mopa/ --tier STATIC
   python test_extraction.py https://commarker.com/product/b4-100w-jpt-mopa/ --tier SLICE_FAST
   ```

3. Add ComMarker-specific unit tests:
   ```python
   def test_commarker_extraction(self):
       """Test extraction from ComMarker product pages."""
       with open("tests/sample_data/commarker_b4.html", "r") as f:
           html_content = f.read()
           
       soup = BeautifulSoup(html_content, "html.parser")
       price, method = self.extractor._extract_commarker_price(soup, html_content)
       
       self.assertIsNotNone(price)
       self.assertEqual(price, 6666.0)
   ``` 