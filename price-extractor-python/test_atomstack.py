#!/usr/bin/env python3
"""Test Atomstack price extraction"""
import asyncio
from scrapers.web_scraper import WebScraper
from scrapers.price_extractor import PriceExtractor
from loguru import logger

async def test_atomstack_extraction():
    scraper = WebScraper()
    extractor = PriceExtractor()
    
    # Test URL
    test_machine = {
        'name': 'Atomstack M4',
        'url': 'https://atomstack.com/products/atomstack-m4-infrared-laser-marking-machine',
        'old_price': 579.0
    }
    
    print(f"\n{'='*60}")
    print(f"Testing: {test_machine['name']}")
    print(f"URL: {test_machine['url']}")
    print('='*60)
    
    # Fetch page
    html, soup = await scraper.get_page_content(test_machine['url'])
    
    if not soup:
        print("Failed to fetch page")
        return
        
    # Look for prices manually
    print("\n--- Manual price search ---")
    
    # Check meta tags
    meta_price = soup.find('meta', property='og:price:amount')
    if meta_price:
        print(f"Found og:price:amount: {meta_price.get('content')}")
    
    # Check for Shopify-specific selectors
    price_selectors = [
        '.price',
        '.product-price',
        '.price__current',
        '.price-item--regular',
        '[data-price]',
        'span.money',
        '.product__price',
        '.price--main',
        '.ProductItem__Price',
        '.ProductMeta__Price'
    ]
    
    for selector in price_selectors:
        elements = soup.select(selector)
        if elements:
            print(f"\nSelector '{selector}' found {len(elements)} elements:")
            for i, elem in enumerate(elements[:3]):
                text = elem.text.strip()
                if text:
                    print(f"  {i+1}. '{text}'")
                    if elem.get('data-price'):
                        print(f"     data-price: {elem.get('data-price')}")
    
    # Check JSON-LD
    print("\n--- Checking JSON-LD ---")
    import json
    scripts = soup.find_all('script', type='application/ld+json')
    for i, script in enumerate(scripts):
        try:
            data = json.loads(script.string)
            print(f"\nJSON-LD script {i}:")
            if '@type' in data:
                print(f"  Type: {data['@type']}")
            if 'offers' in data:
                print(f"  Offers: {json.dumps(data['offers'], indent=2)[:200]}...")
        except:
            pass

if __name__ == '__main__':
    asyncio.run(test_atomstack_extraction())