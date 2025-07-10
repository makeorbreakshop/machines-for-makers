#!/usr/bin/env python3
"""
Simple debug of xTool S1 rules.
"""

from scrapers.site_specific_extractors import SiteSpecificExtractor

def debug_xtool_rules():
    """Debug xTool rules."""
    
    extractor = SiteSpecificExtractor()
    
    # Test data from batch results
    machine_name = "xTool S1"
    url = "https://www.xtool.com/products/xtool-s1-laser-cutter"
    
    print(f"Testing machine: {machine_name}")
    print(f"URL: {url}")
    
    from urllib.parse import urlparse
    domain = urlparse(url).netloc.lower()
    if domain.startswith('www.'):
        domain = domain[4:]
    
    print(f"Domain: {domain}")
    
    # Check if we have rules for this domain
    if domain in extractor.site_rules:
        print(f"✅ Site rules exist for {domain}")
        site_rule = extractor.site_rules[domain]
        machine_rules = site_rule.get('machine_specific_rules', {})
        print(f"Machine-specific rules available: {list(machine_rules.keys())}")
        
        # Test machine-specific rule matching
        rules = extractor.get_machine_specific_rules(domain, machine_name, url)
        if rules:
            print(f"✅ Machine-specific rules found!")
            print(f"Avoid meta tags: {rules.get('avoid_meta_tags', False)}")
        else:
            print(f"❌ No machine-specific rules found")
            
            # Debug the matching logic
            for pattern, specific_rules in machine_rules.items():
                print(f"\nTesting pattern: '{pattern}'")
                print(f"Machine name: '{machine_name}'")
                print(f"Pattern in name: {pattern.lower() in machine_name.lower()}")
                
                url_patterns = specific_rules.get('url_patterns', [])
                print(f"URL patterns: {url_patterns}")
                url_matches = [p for p in url_patterns if p in url.lower()]
                print(f"URL matches: {url_matches}")
    else:
        print(f"❌ No site rules for domain {domain}")

if __name__ == '__main__':
    debug_xtool_rules()