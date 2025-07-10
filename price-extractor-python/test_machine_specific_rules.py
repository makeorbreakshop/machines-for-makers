#!/usr/bin/env python3
"""
Test script to verify machine-specific extraction rules work correctly.
"""

import sys
import json
import requests
from scrapers.site_specific_extractors import SiteSpecificExtractor

def test_machine_specific_rules():
    """Test machine-specific rules for problematic machines."""
    
    # Test cases based on the manual corrections from the screenshot
    test_machines = [
        {
            'machine_id': 'test-s1',
            'machine_name': 'xTool S1',
            'url': 'https://www.xtool.com/products/xtool-s1',
            'expected_range': [1800, 2000]
        },
        {
            'machine_id': 'test-f1',
            'machine_name': 'xTool F1',
            'url': 'https://www.xtool.com/products/xtool-f1',
            'expected_range': [1100, 1300]
        },
        {
            'machine_id': 'test-f2',
            'machine_name': 'xTool F2 Ultra',
            'url': 'https://www.xtool.com/products/xtool-f2-ultra-60w-mopa-40w-diode-dual-laser-engraver',
            'expected_range': [5900, 6100]
        },
        {
            'machine_id': 'test-b6-mopa',
            'machine_name': 'ComMarker B6 MOPA 60W',
            'url': 'https://commarker.com/product/commarker-b6-jpt-mopa/',
            'expected_range': [4500, 4700]
        },
        {
            'machine_id': 'test-b4-mopa',
            'machine_name': 'ComMarker B4 100W MOPA',
            'url': 'https://commarker.com/product/b4-100w-jpt-mopa',
            'expected_range': [6500, 6800]
        },
        {
            'machine_id': 'test-b6-30w',
            'machine_name': 'ComMarker B6 30W',
            'url': 'https://commarker.com/product/commarker-b6',
            'expected_range': [2300, 2500]
        }
    ]
    
    extractor = SiteSpecificExtractor()
    
    print("=== Testing Machine-Specific Rules ===\n")
    
    for test_machine in test_machines:
        machine_name = test_machine['machine_name']
        url = test_machine['url']
        expected_range = test_machine['expected_range']
        
        print(f"Testing: {machine_name}")
        print(f"URL: {url}")
        
        # Parse domain
        from urllib.parse import urlparse
        domain = urlparse(url).netloc.lower()
        if domain.startswith('www.'):
            domain = domain[4:]
        
        # Create mock machine data
        machine_data = {
            'Machine Name': machine_name,
            'id': test_machine['machine_id']
        }
        
        # Test machine-specific rules
        rules = extractor.get_machine_specific_rules(domain, machine_name, url)
        
        if rules:
            print(f"✅ Machine-specific rules found for {machine_name}")
            print(f"  - Price selectors: {rules.get('price_selectors', [])[:3]}...")  # Show first 3
            if 'expected_price_range' in rules:
                print(f"  - Expected range: ${rules['expected_price_range'][0]}-${rules['expected_price_range'][1]}")
            if 'avoid_selectors' in rules and rules['avoid_selectors']:
                print(f"  - Avoiding selectors: {rules['avoid_selectors'][:2]}...")  # Show first 2
        else:
            print(f"❌ No machine-specific rules found for {machine_name}")
        
        print()
    
    # Test actual API endpoint for one machine
    print("=== Testing Actual API Call ===")
    test_machine_id = "b10e7166-527c-4c8a-a9a3-dbb55469a61e"  # xTool F2 Ultra from batch
    print(f"Testing API call for machine ID: {test_machine_id}")
    
    try:
        response = requests.post(
            'http://localhost:8000/api/v1/update-price',
            json={'machine_id': test_machine_id},
            timeout=30
        )
        
        if response.ok:
            result = response.json()
            print(f"✅ API Response: {json.dumps(result, indent=2)}")
        else:
            print(f"❌ API Error: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ API Call failed: {str(e)}")

if __name__ == '__main__':
    test_machine_specific_rules()