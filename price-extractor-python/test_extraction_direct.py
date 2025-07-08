#!/usr/bin/env python3
"""
Test extraction directly without API to see what price we get
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from bs4 import BeautifulSoup
import requests

# Test if our fixes are even being used
def test_direct_extraction():
    """Test what price we extract directly"""
    
    url = "https://commarker.com/product/b4-30w-laser-engraver-machine/"
    
    print("DIRECT EXTRACTION TEST")
    print("="*60)
    print(f"Testing URL: {url}")
    print("Expected: $1799")
    print()
    
    # Fetch the page
    response = requests.get(url, headers={
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    })
    
    print(f"HTTP Status: {response.status_code}")
    
    if response.status_code == 200:
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Test various selectors
        selectors = [
            '.price .amount',
            '.price',
            '.woocommerce-Price-amount',
            '.product-price',
            'meta[property="product:price:amount"]',
            '.entry-summary .price',
            '.product-summary .price'
        ]
        
        print("\nTesting CSS selectors:")
        for selector in selectors:
            elements = soup.select(selector)
            if elements:
                print(f"  {selector}: Found {len(elements)} matches")
                for i, elem in enumerate(elements[:3]):
                    if elem.name == 'meta':
                        content = elem.get('content', 'No content')
                        print(f"    [{i}] content='{content}'")
                    else:
                        text = elem.get_text(strip=True)
                        print(f"    [{i}] {text}")
            else:
                print(f"  {selector}: No matches")
        
        # Look for any price patterns
        import re
        price_pattern = re.compile(r'\$[\d,]+(?:\.\d{2})?')
        
        # Search in text
        text_content = soup.get_text()
        prices_found = price_pattern.findall(text_content)
        
        print(f"\nAll prices found in page text: {prices_found[:10]}")
        
        # Test the buggy regex
        first_match = re.search(r'\$([0-9,]+)', text_content)
        if first_match:
            print(f"\nBuggy regex would extract: ${first_match.group(1)}")
        
        # Check for JavaScript data
        scripts = soup.find_all('script', type='application/ld+json')
        print(f"\nFound {len(scripts)} JSON-LD scripts")
        
        # Check WooCommerce variation forms
        forms = soup.find_all('form', class_='variations_form')
        print(f"Found {len(forms)} variation forms")
        
        # Look for data attributes
        data_price_elements = soup.find_all(attrs={'data-product_variations': True})
        if data_price_elements:
            print("\nFound product variation data!")
            
    # Now test with our actual extractor
    print("\n" + "="*60)
    print("Testing with actual price extractor...")
    
    try:
        from scrapers.selector_blacklist import is_selector_blacklisted
        
        # Test if blacklist is working
        test_selectors = ['.bundle-price', '.price']
        for sel in test_selectors:
            blacklisted = is_selector_blacklisted(sel)
            print(f"Selector '{sel}' blacklisted: {blacklisted}")
            
    except Exception as e:
        print(f"Error testing blacklist: {e}")
    
    try:
        from scrapers.site_specific_extractors import SiteSpecificExtractor
        extractor = SiteSpecificExtractor()
        
        if 'commarker.com' in extractor.site_rules:
            rules = extractor.site_rules['commarker.com']
            print(f"\nComMarker rules loaded:")
            print(f"  - Min price: ${rules.get('min_expected_price', 0)}")
            print(f"  - Max price: ${rules.get('max_expected_price', 0)}")
            print(f"  - Blacklisted selectors: {rules.get('blacklist_selectors', [])[:3]}")
    except Exception as e:
        print(f"Error loading site-specific rules: {e}")


if __name__ == "__main__":
    test_direct_extraction()