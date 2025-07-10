#!/usr/bin/env python3
"""
Debug xTool S1 extraction to see why meta tags are still being used.
"""

import requests
import json
from urllib.parse import urlparse
from scrapers.site_specific_extractors import SiteSpecificExtractor

def debug_xtool_s1():
    """Debug xTool S1 machine-specific rules."""
    
    machine_id = "0f5f7679-e975-4286-b655-9799e24931b9"
    
    # Get machine data from the API
    try:
        response = requests.get(f'http://localhost:8000/api/v1/machines/{machine_id}')
        if response.ok:
            machine_data = response.json()
            print("=== MACHINE DATA ===")
            print(f"Machine ID: {machine_data.get('id')}")
            print(f"Machine Name: {machine_data.get('Machine Name')}")
            print(f"URL: {machine_data.get('product_link')}")
            print()
            
            # Test machine-specific rules
            extractor = SiteSpecificExtractor()
            machine_name = machine_data.get('Machine Name', '')
            url = machine_data.get('product_link', '')
            
            domain = urlparse(url).netloc.lower()
            if domain.startswith('www.'):
                domain = domain[4:]
            
            print(f"=== DOMAIN EXTRACTION ===")
            print(f"Full domain: {urlparse(url).netloc}")
            print(f"Cleaned domain: {domain}")
            print()
            
            print(f"=== MACHINE-SPECIFIC RULES TEST ===")
            rules = extractor.get_machine_specific_rules(domain, machine_name, url)
            
            if rules:
                print(f"✅ Found machine-specific rules for '{machine_name}'")
                print(f"Avoid meta tags: {rules.get('avoid_meta_tags', False)}")
                print(f"Price selectors: {rules.get('price_selectors', [])[:3]}")
                print(f"Expected range: {rules.get('expected_price_range', 'Not set')}")
            else:
                print(f"❌ No machine-specific rules found for '{machine_name}'")
                
                # Check if base site rules exist
                if domain in extractor.site_rules:
                    site_rule = extractor.site_rules[domain]
                    machine_rules = site_rule.get('machine_specific_rules', {})
                    print(f"Base site rules exist for {domain}")
                    print(f"Available machine patterns: {list(machine_rules.keys())}")
                    
                    # Test pattern matching
                    for pattern in machine_rules.keys():
                        if pattern.lower() in machine_name.lower():
                            print(f"✅ Pattern '{pattern}' matches machine name '{machine_name}'")
                            
                            # Check URL patterns
                            url_patterns = machine_rules[pattern].get('url_patterns', [])
                            print(f"URL patterns for {pattern}: {url_patterns}")
                            matching_patterns = [p for p in url_patterns if p in url.lower()]
                            print(f"Matching URL patterns: {matching_patterns}")
                        else:
                            print(f"❌ Pattern '{pattern}' does not match machine name '{machine_name}'")
                else:
                    print(f"❌ No site rules found for domain {domain}")
            
            print()
            
        else:
            print(f"Failed to get machine data: {response.status_code}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    debug_xtool_s1()