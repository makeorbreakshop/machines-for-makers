#!/usr/bin/env python3
"""
Test script to verify the ComMarker B4 100W MOPA price extraction fix.

Should now extract $6,666 instead of $8,888 using machine-specific selectors.
"""

import asyncio
import logging
import requests
from bs4 import BeautifulSoup
from scrapers.site_specific_extractors import SiteSpecificExtractor

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

async def test_commarker_b4_fix():
    """Test the fixed ComMarker B4 100W MOPA price extraction"""
    
    url = "https://commarker.com/product/b4-100w-jpt-mopa"
    machine_data = {
        'Machine Name': 'ComMarker B4 100W MOPA Fiber Laser Marking Machine',
        'url': url
    }
    
    logger.info("="*70)
    logger.info("TESTING COMMARKER B4 100W MOPA PRICE EXTRACTION FIX")
    logger.info("="*70)
    logger.info(f"URL: {url}")
    logger.info(f"Machine: {machine_data['Machine Name']}")
    logger.info("")
    
    # Initialize extractor
    extractor = SiteSpecificExtractor()
    
    # Get machine-specific rules to verify they're correct
    domain = 'commarker.com'
    rules = extractor.get_machine_specific_rules(domain, machine_data['Machine Name'], url)
    
    logger.info("STEP 1: Verify machine-specific rules")
    logger.info("-"*50)
    if rules and 'price_selectors' in rules:
        logger.info(f"✅ Machine-specific selectors: {rules['price_selectors']}")
        expected_selectors = [
            '.entry-summary .price ins .amount',  # Sale price selector
            '[data-price]',
            '.product-summary .price ins .amount'
        ]
        if rules['price_selectors'] == expected_selectors:
            logger.info("✅ Selectors match expected values")
        else:
            logger.warning(f"❌ Selectors don't match. Expected: {expected_selectors}")
    else:
        logger.error("❌ No machine-specific rules found!")
        return
    
    logger.info("")
    
    # Fetch the page
    logger.info("STEP 2: Fetch page content")
    logger.info("-"*50)
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        html_content = response.text
        soup = BeautifulSoup(html_content, 'html.parser')
        logger.info(f"✅ Page fetched successfully ({len(html_content)} characters)")
    except Exception as e:
        logger.error(f"❌ Failed to fetch page: {e}")
        return
    
    logger.info("")
    
    # Test price extraction with the fixed method
    logger.info("STEP 3: Test price extraction")
    logger.info("-"*50)
    
    try:
        price, method = extractor._extract_commarker_main_price(soup, rules)
        
        if price:
            logger.info(f"✅ EXTRACTED PRICE: ${price}")
            logger.info(f"✅ METHOD: {method}")
            
            if price == 6666:
                logger.info("🎉 SUCCESS! Extracted correct sale price $6,666")
            elif price == 8888:
                logger.error("❌ FAIL! Still extracting original price $8,888")
            else:
                logger.warning(f"⚠️  UNEXPECTED! Extracted ${price} (neither 6666 nor 8888)")
        else:
            logger.error("❌ FAIL! No price extracted")
            
    except Exception as e:
        logger.error(f"❌ Extraction failed with error: {e}")
        import traceback
        traceback.print_exc()
    
    logger.info("")
    
    # Manual verification of selectors
    logger.info("STEP 4: Manual selector verification")
    logger.info("-"*50)
    
    for i, selector in enumerate(rules['price_selectors']):
        elements = soup.select(selector)
        logger.info(f"Selector {i+1}: '{selector}'")
        logger.info(f"  Found {len(elements)} elements")
        
        for j, elem in enumerate(elements):
            price_text = elem.get_text().strip()
            logger.info(f"  Element {j+1}: '{price_text}'")
            
            # Try to parse the price
            import re
            price_match = re.search(r'[\$]?([\d,]+(?:\.\d{2})?)', price_text.replace(',', ''))
            if price_match:
                try:
                    price_value = float(price_match.group(1))
                    logger.info(f"    Parsed price: ${price_value}")
                    if price_value == 6666:
                        logger.info("    🎯 This is the CORRECT sale price!")
                    elif price_value == 8888:
                        logger.info("    ❌ This is the original price (should avoid)")
                except:
                    pass
        logger.info("")
    
    print("\n" + "="*70)
    print("SUMMARY")
    print("="*70)
    print("Expected behavior:")
    print("- Should use machine-specific selectors")
    print("- Should extract $6,666 from <ins> tag (sale price)")
    print("- Should NOT extract $8,888 from <del> tag (original price)")
    print("- Method should indicate machine-specific selector used")

if __name__ == "__main__":
    asyncio.run(test_commarker_b4_fix())