# Price Extractor Troubleshooting Guide

## Batch Run Analysis (2025-04-18)

A recent batch dry run revealed several critical issues with the price extraction system. This document outlines the problems identified and proposed solutions.

## Summary of Issues

- **148 machines processed**
- **134 successful** extractions (but many with incorrect prices)
- **14 failed** extractions (unable to fetch product pages)
- **80 updated** prices (many updates were incorrect)
- **54 unchanged** prices

## Critical Issues

### 1. Incorrect Price Parsing

#### Examples:
- **ComMarker B4 100W MOPA**: 
  - Reported: $600.00
  - Actual: $6,666.00
  - Error: 91% price drop (missing leading digit)

- **Atomstack X70 Max**:
  - Reported: $184.00
  - Actual: $1,849.00 
  - Error: 90% price drop (missing trailing digits)

- **Aeon MIRA 7 Pro S**:
  - Reported: $699.00
  - Actual: $6,995.00
  - Error: 90% price drop (decimal/comma parsing error)

#### Root Cause:
- Generic CSS selectors (`.price`) capturing wrong elements
- Inadequate decimal/comma parsing
- No validation against previous price or merchant price ranges
- Merchant-specific selectors not being properly applied

### 2. Page Fetch Failures

#### Examples:
- All Thunder Laser products failed with "Failed to fetch product page"

#### Root Cause:
- Anti-scraping measures blocking requests
- Network timeouts or connection issues
- No fallback mechanisms for failed requests

### 3. Validation Issues

- Price changes of >90% not being flagged for manual review
- Sanity check threshold (25%) not being applied
- Validation confidence scores not properly utilized

### 4. Structured Data Handling

- JSON-LD data found but not properly parsed
- Missing structured data extraction for specific merchant formats

## Proposed Solutions

### 1. Improve CSS Selectors and Price Parsing

```python
# Update merchant-specific CSS selectors
merchant_settings = {
    "commarker.com": {
        "css_selectors": [
            ".price ins .woocommerce-Price-amount bdi",
            ".product .price:not(del) .woocommerce-Price-amount",
            "form.cart .price .woocommerce-Price-amount",
            "h1 + .woocommerce-product-details__price span.price ins .woocommerce-Price-amount"
        ]
    },
    "atomstack.net": {
        "css_selectors": [
            ".product__price .price-item--regular",
            "span[data-product-price]"
        ]
    },
    "aeonlaser.us": {
        "css_selectors": [
            ".product-single__price",
            "[data-product-price]",
            ".price .money"
        ]
    }
}
```

### 2. Enhanced Price Validation

```python
def _verify_and_correct_price(self, price, previous_price, url=None, method=None):
    """Verify the extracted price and correct if necessary."""
    if previous_price is None:
        return price, False
        
    # Calculate percentage change
    percentage_change = abs((price - previous_price) / previous_price) * 100
    
    # Check for suspiciously large changes (>50%)
    if percentage_change > 50:
        # Check for missing leading digit
        if price < previous_price * 0.2:
            # Try adding leading digit(s)
            corrected = price * 10
            while corrected < previous_price * 0.5:
                corrected *= 10
                
            if abs((corrected - previous_price) / previous_price) * 100 < 20:
                logger.info(f"Corrected missing leading digit: {price} -> {corrected}")
                return corrected, True
                
        # Check for missing trailing digit
        if price * 10 < previous_price * 1.2 and price * 10 > previous_price * 0.8:
            corrected = price * 10
            logger.info(f"Corrected missing trailing digit: {price} -> {corrected}")
            return corrected, True
            
    return price, False
```

### 3. Improved Web Scraping Resilience

```python
# Implement rotating user agents
user_agents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0"
]

# Add proxy support for problematic merchants
proxies = {
    "thunder-laser.com": "http://proxy1.example.com:8080",
    "creality.com": "http://proxy2.example.com:8080"
}
```

### 4. Enforce AI Fallback for Suspicious Results

```python
# Always use Claude AI verification for large price changes
if percentage_change > 25:
    verified_price = self._verify_price_with_claude(html_content, url, price, previous_price)
    if verified_price and verified_price != price:
        return verified_price, "Claude AI Verification"
```

## Implementation Plan

1. **Immediate Fixes**:
   - Update CSS selectors for ComMarker, Atomstack, and Aeon
   - Implement enhanced price validation and correction
   - Add retry mechanism with rotating user agents

2. **Short-term Improvements**:
   - Add forced manual review for >50% price changes
   - Implement structured logging of all extraction attempts
   - Create a "correction history" to track automatic corrections

3. **Long-term Solutions**:
   - Develop a machine learning model to detect price anomalies
   - Create auto-generated selectors based on page analysis
   - Implement a feedback loop to improve extraction over time

## Monitoring

After implementing changes, we'll run another batch dry run to:
1. Verify fixes for identified issues
2. Measure improvement in extraction accuracy
3. Document any new issues that emerge 