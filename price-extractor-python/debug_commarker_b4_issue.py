#!/usr/bin/env python3
"""
Debug script to investigate ComMarker B4 100W MOPA price extraction issue.

Issue: Extracting $8,888 instead of $6,666
URL: https://commarker.com/product/b4-100w-jpt-mopa
"""

import asyncio
import logging
import sys
from scrapers.site_specific_extractors import SiteSpecificExtractor

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

async def debug_commarker_b4():
    """Debug the ComMarker B4 100W MOPA price extraction issue"""
    
    url = "https://commarker.com/product/b4-100w-jpt-mopa"
    machine_data = {
        'Machine Name': 'ComMarker B4 100W MOPA Fiber Laser Marking Machine',
        'url': url
    }
    
    logger.info("="*60)
    logger.info("DEBUGGING COMMARKER B4 100W MOPA PRICE EXTRACTION")
    logger.info("="*60)
    logger.info(f"URL: {url}")
    logger.info(f"Machine Name: {machine_data['Machine Name']}")
    logger.info("")
    
    # Initialize extractor
    extractor = SiteSpecificExtractor()
    
    # Test machine-specific rule matching
    logger.info("STEP 1: Testing machine-specific rule matching")
    logger.info("-"*50)
    
    domain = 'commarker.com'
    machine_name = machine_data['Machine Name']
    
    # Get the machine-specific rules
    rules = extractor.get_machine_specific_rules(domain, machine_name, url)
    
    if rules:
        logger.info(f"✅ Machine-specific rules found!")
        if 'price_selectors' in rules:
            logger.info(f"Price selectors: {rules['price_selectors']}")
        else:
            logger.info("❌ No price_selectors in rules")
    else:
        logger.info("❌ No machine-specific rules found")
        # Get default site rules
        default_rules = extractor.site_rules.get(domain, {})
        logger.info(f"Default site rules: {default_rules.get('price_selectors', [])}")
    
    logger.info("")
    
    # Test pattern matching manually
    logger.info("STEP 2: Manual pattern matching test")
    logger.info("-"*50)
    
    site_rules = extractor.site_rules.get(domain, {})
    machine_rules = site_rules.get('machine_specific_rules', {})
    
    logger.info(f"Available machine patterns: {list(machine_rules.keys())}")
    
    for machine_pattern, specific_rules in machine_rules.items():
        pattern_match = machine_pattern.lower() in machine_name.lower()
        url_patterns = specific_rules.get('url_patterns', [])
        url_match = any(pattern in url.lower() for pattern in url_patterns) if url_patterns else True
        
        logger.info(f"Pattern '{machine_pattern}':")
        logger.info(f"  - Pattern match: {pattern_match} ('{machine_pattern.lower()}' in '{machine_name.lower()}')")
        logger.info(f"  - URL patterns: {url_patterns}")
        logger.info(f"  - URL match: {url_match}")
        logger.info(f"  - Overall match: {pattern_match and url_match}")
        
        if pattern_match and url_match:
            logger.info(f"  ✅ MATCH! Price selectors: {specific_rules.get('price_selectors', [])}")
            break
        logger.info("")
    
    logger.info("")
    logger.info("STEP 3: Expected behavior")
    logger.info("-"*50)
    logger.info("Expected:")
    logger.info("- Should match pattern 'ComMarker B4 100W MOPA'")
    logger.info("- Should use price selectors: ['.entry-summary .price ins .amount', '[data-price]', '.product-summary .price ins .amount']")
    logger.info("- Should extract $6,666 from <ins> tag (sale price)")
    logger.info("- Should NOT extract $8,888 from <del> tag (original price)")
    
    logger.info("")
    logger.info("STEP 4: Current selector analysis")
    logger.info("-"*50)
    logger.info("Current logged selector: '.summary-inner .price .woocommerce-Price-amount.amount'")
    logger.info("This selector is:")
    logger.info("- NOT in the machine-specific rules")
    logger.info("- Appears to be from the general ComMarker site rules")
    logger.info("- Would pick up both <del> and <ins> prices, likely the first one (original)")
    
    print("\n" + "="*60)
    print("CONCLUSION")
    print("="*60)
    print("The issue is likely one of:")
    print("1. Machine name matching is failing")
    print("2. URL pattern matching is failing") 
    print("3. Machine-specific rules are not being applied")
    print("4. General site rules are being used instead")
    print("")
    print("Next steps:")
    print("1. Check exact machine name being passed")
    print("2. Verify URL pattern matching")
    print("3. Add logging to see which rules are actually being used")
    print("4. Test the specific selectors on the actual page")

if __name__ == "__main__":
    asyncio.run(debug_commarker_b4())