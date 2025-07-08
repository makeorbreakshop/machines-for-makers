#!/usr/bin/env python3
"""
Direct test of ComMarker site-specific extraction logic.
"""

import re
import sys
from bs4 import BeautifulSoup
import requests
from loguru import logger

# Configure logging
logger.remove()
logger.add(sys.stdout, level="INFO", format="{time:HH:mm:ss} | {level} | {message}")

def test_commarker_extraction():
    """Test ComMarker price extraction logic directly."""
    
    test_urls = [
        ("ComMarker B4 30W", "https://www.commarker.com/products/commarker-b4-fiber-laser-engraver", 1799.0),
        ("ComMarker B6 30W", "https://www.commarker.com/products/b6-enclosed-fiber-laser-engraver", 2399.0),
    ]
    
    for name, url, expected_price in test_urls:
        logger.info(f"\n{'='*60}")
        logger.info(f"Testing: {name}")
        logger.info(f"URL: {url}")
        logger.info(f"Expected: ${expected_price}")
        
        try:
            # Fetch the page
            response = requests.get(url, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })
            
            if response.status_code != 200:
                logger.error(f"Failed to fetch page: {response.status_code}")
                continue
                
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find all price elements on the page
            logger.info("\nSearching for prices on page...")
            
            # Look for prices with dollar signs
            price_pattern = re.compile(r'\$[\d,]+(?:\.\d{2})?')
            all_prices = []
            
            for element in soup.find_all(text=price_pattern):
                match = price_pattern.search(element)
                if match:
                    price_str = match.group()
                    price_val = float(price_str.replace('$', '').replace(',', ''))
                    
                    # Get context
                    parent = element.parent
                    context = parent.get_text(strip=True) if parent else ""
                    
                    all_prices.append({
                        'price': price_val,
                        'text': price_str,
                        'context': context[:100],
                        'element': parent.name if parent else 'text'
                    })
            
            logger.info(f"Found {len(all_prices)} prices on page")
            
            # Show first 10 prices
            for i, price_info in enumerate(all_prices[:10]):
                logger.info(f"  Price {i+1}: {price_info['text']} in <{price_info['element']}> - Context: {price_info['context']}")
            
            # Test the old buggy regex
            logger.info("\nTesting buggy regex pattern:")
            first_match = re.search(r'\$([0-9,]+)', response.text)
            if first_match:
                buggy_price = float(first_match.group(1).replace(',', ''))
                logger.info(f"Buggy regex would extract: ${buggy_price}")
                if buggy_price == 50:
                    logger.error("❌ BUG CONFIRMED: Old regex extracts $50!")
            
            # Look for specific ComMarker price selectors
            logger.info("\nTesting site-specific selectors:")
            
            # ComMarker uses WooCommerce
            selectors = [
                '.product-summary .price .woocommerce-Price-amount',
                '.single-product .price .amount',
                '.entry-summary .price',
                '.price ins .amount',  # Sale price
                '.price > .amount',    # Direct price
            ]
            
            for selector in selectors:
                elements = soup.select(selector)
                if elements:
                    logger.info(f"  Selector '{selector}' found {len(elements)} matches")
                    for elem in elements[:3]:
                        text = elem.get_text(strip=True)
                        logger.info(f"    -> {text}")
                        
        except Exception as e:
            logger.error(f"Error: {str(e)}")


if __name__ == "__main__":
    test_commarker_extraction()