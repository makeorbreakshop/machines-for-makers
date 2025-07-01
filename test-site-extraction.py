#!/usr/bin/env python3
"""
Test script for site-specific price extraction.
This validates the extraction logic against the known problem URLs.
"""

import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import the site-specific extractor
exec(open('site-specific-extractors.py').read())
extractor_class = SiteSpecificExtractor
from bs4 import BeautifulSoup
import requests
import json

def test_price_parsing():
    """Test the price parsing logic with various formats."""
    extractor = extractor_class()
    
    test_cases = [
        # (input, expected_output, description)
        ("$2,599.00", 2599.00, "US format with comma separator"),
        ("2599.00", 2599.00, "Plain decimal"),
        ("259900", 2599.00, "Cents format (common in data attributes)"),
        ("$8,888 $6,666 Save:$2,222", 8888.00, "Multiple prices - should get first"),
        ("€2.599,00", 2599.00, "European format"),
        ("1799", 1799.00, "Integer format"),
        ("$50", 50.00, "Small amount"),
        ("invalid", None, "Invalid input"),
        ("", None, "Empty input"),
        ("5000000", 50000.00, "Very large cents amount"),
    ]
    
    print("Testing price parsing:")
    for input_val, expected, description in test_cases:
        result = extractor._parse_price_string(input_val)
        status = "✓" if result == expected else "✗"
        print(f"{status} {description}: '{input_val}' -> {result} (expected {expected})")

def test_site_rules():
    """Test that site rules are correctly defined."""
    extractor = extractor_class()
    
    print("\nTesting site rules:")
    
    # Test Commarker rules
    commarker_rules = extractor.site_rules.get('commarker.com')
    if commarker_rules:
        print("✓ Commarker rules found")
        print(f"  - Type: {commarker_rules['type']}")
        print(f"  - Avoid contexts: {commarker_rules['avoid_contexts']}")
        print(f"  - Price range: ${commarker_rules['min_expected_price']} - ${commarker_rules['max_expected_price']}")
    else:
        print("✗ Commarker rules missing")
    
    # Test Cloudray rules
    cloudray_rules = extractor.site_rules.get('cloudraylaser.com')
    if cloudray_rules:
        print("✓ Cloudray rules found")
        print(f"  - Type: {cloudray_rules['type']}")
        print(f"  - Avoid selectors: {cloudray_rules['avoid_selectors']}")
        print(f"  - JSON-LD paths: {cloudray_rules['json_ld_paths']}")
        print(f"  - Price range: ${cloudray_rules['min_expected_price']} - ${cloudray_rules['max_expected_price']}")
    else:
        print("✗ Cloudray rules missing")

def test_validation():
    """Test price validation logic."""
    extractor = extractor_class()
    
    print("\nTesting price validation:")
    
    # Test Commarker validation (min: 500, max: 15000)
    commarker_rules = extractor.site_rules['commarker.com']
    test_prices = [
        (100, False, "Below minimum"),
        (2399, True, "Valid range"),
        (8888, True, "Valid but high"),
        (20000, False, "Above maximum"),
    ]
    
    for price, expected, description in test_prices:
        result = extractor._validate_price(price, commarker_rules)
        status = "✓" if result == expected else "✗"
        print(f"{status} Commarker ${price}: {result} ({description})")
    
    # Test Cloudray validation (min: 200, max: 25000)
    cloudray_rules = extractor.site_rules['cloudraylaser.com']
    test_prices = [
        (259, True, "Valid (should be 2590)"),
        (2599, True, "Valid main price"),
        (50, False, "Below minimum"),
        (30000, False, "Above maximum"),
    ]
    
    for price, expected, description in test_prices:
        result = extractor._validate_price(price, cloudray_rules)
        status = "✓" if result == expected else "✗"
        print(f"{status} Cloudray ${price}: {result} ({description})")

def test_json_ld_parsing():
    """Test JSON-LD parsing with sample data."""
    extractor = extractor_class()
    
    print("\nTesting JSON-LD parsing:")
    
    # Sample Cloudray JSON-LD structure
    sample_data = {
        "hasVariant": [
            {
                "offers": {
                    "price": "2599.00",
                    "priceCurrency": "USD"
                }
            }
        ]
    }
    
    paths = ['hasVariant.0.offers.price', 'offers.price', 'price']
    
    for path in paths:
        value = extractor._get_nested_value(sample_data, path)
        print(f"Path '{path}': {value}")
        
        if value:
            parsed = extractor._parse_price_string(str(value))
            print(f"  -> Parsed: ${parsed}")

def simulate_html_extraction():
    """Simulate extraction from HTML snippets."""
    extractor = extractor_class()
    
    print("\nTesting HTML extraction simulation:")
    
    # Simulate Commarker HTML
    commarker_html = '''
    <div class="related-products">
        <span class="price">$8,888 $6,666 Save:$2,222</span>
    </div>
    <div class="product-summary">
        <span class="price">$2,399 $1,799 Save:$600</span>
    </div>
    '''
    
    soup = BeautifulSoup(commarker_html, 'html.parser')
    rules = extractor.site_rules['commarker.com']
    
    # This would need the actual extraction logic, but we can test the structure
    price_elements = soup.select('.price')
    print(f"Found {len(price_elements)} price elements in Commarker HTML")
    for i, elem in enumerate(price_elements):
        print(f"  {i+1}: {elem.get_text().strip()}")
    
    # Simulate Cloudray HTML
    cloudray_html = '''
    <select name="items[][id]" data-price="259900">
        <option>USA Warehouse</option>
    </select>
    <div class="product-price">
        <span class="price">$2,599.00 USD</span>
    </div>
    '''
    
    soup2 = BeautifulSoup(cloudray_html, 'html.parser')
    rules2 = extractor.site_rules['cloudraylaser.com']
    
    data_price_elements = soup2.select('[data-price]')
    price_elements = soup2.select('.price')
    
    print(f"\nFound {len(data_price_elements)} data-price elements in Cloudray HTML")
    for i, elem in enumerate(data_price_elements):
        print(f"  {i+1}: data-price='{elem.get('data-price')}' (should avoid)")
    
    print(f"Found {len(price_elements)} .price elements in Cloudray HTML")
    for i, elem in enumerate(price_elements):
        print(f"  {i+1}: {elem.get_text().strip()} (should prefer)")

if __name__ == "__main__":
    print("=== Site-Specific Price Extraction Test ===\n")
    
    test_price_parsing()
    test_site_rules()
    test_validation()
    test_json_ld_parsing()
    simulate_html_extraction()
    
    print("\n=== Test Complete ===")
    print("\nNext steps:")
    print("1. Integrate site_specific_extractors.py into the main price_extractor.py")
    print("2. Test with real URLs to validate extraction")
    print("3. Add more site-specific rules as needed")