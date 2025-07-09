#!/usr/bin/env python3
"""Test Monport price extraction"""
import asyncio
from scrapers.web_scraper import WebScraper
from scrapers.price_extractor import PriceExtractor
from loguru import logger

async def test_monport_extraction():
    scraper = WebScraper()
    extractor = PriceExtractor()
    
    # Test URLs
    test_machines = [
        {
            'name': 'Monport GA 60W MOPA',
            'url': 'https://monportlaser.com/products/monport-60e2m7-integrated-175af-mopa-fiber-laser-engraver-marking-machine',
            'old_price': 15799.0
        }
    ]
    
    for machine in test_machines:
        print(f"\n{'='*60}")
        print(f"Testing: {machine['name']}")
        print(f"URL: {machine['url']}")
        print(f"Old price: ${machine['old_price']}")
        print('='*60)
        
        # Fetch page
        html, soup = await scraper.get_page_content(machine['url'])
        
        if not soup:
            print("Failed to fetch page")
            continue
            
        # Look for prices manually first
        print("\n--- Manual price search ---")
        price_selectors = [
            '.price',
            '.product-price',
            '.price__regular',
            '.price-item--regular',
            '[data-price]',
            'span.money',
            '.ProductItem__Price',
            '.ProductMeta__Price',
            '.product__price',
            '.price--main'
        ]
        
        found_prices = []
        for selector in price_selectors:
            elements = soup.select(selector)
            if elements:
                print(f"\nSelector '{selector}' found {len(elements)} elements:")
                for i, elem in enumerate(elements[:5]):
                    text = elem.text.strip()
                    if text:
                        print(f"  {i+1}. '{text}'")
                        if elem.get('data-price'):
                            print(f"     data-price: {elem.get('data-price')}")
                        # Check parent for context
                        parent = elem.parent
                        if parent and parent.get('class'):
                            print(f"     parent class: {parent.get('class')}")
        
        # Test extraction
        print("\n--- Price extractor test ---")
        price, method = await extractor.extract_price(
            soup, 
            html, 
            machine['url'], 
            machine['old_price'],
            machine['name'],
            {'old_price': machine['old_price']}
        )
        
        if price:
            print(f"SUCCESS: Extracted ${price} using {method}")
        else:
            print("FAILED: Could not extract price")
            
            # Check JSON-LD
            print("\n--- Checking JSON-LD ---")
            import json
            scripts = soup.find_all('script', type='application/ld+json')
            for script in scripts:
                try:
                    data = json.loads(script.string)
                    print(f"Found JSON-LD: {json.dumps(data, indent=2)[:500]}...")
                except:
                    pass

if __name__ == '__main__':
    asyncio.run(test_monport_extraction())