#!/usr/bin/env python3
import asyncio
import re
import json
import html
from scrapers.scrapfly_web_scraper import ScrapflyWebScraper
from services.database import DatabaseService

async def test():
    db = DatabaseService()
    scraper = ScrapflyWebScraper(database_service=db)
    html_content, soup = await scraper.get_page_content('https://commarker.com/product/commarker-b6')
    
    # Look for data-product_variations
    match = re.search(r'data-product_variations=["\']([^"\']+)["\']', html_content)
    if match:
        variations_json = html.unescape(match.group(1))
        variations = json.loads(variations_json)
        
        print('=== WooCommerce Variations Found ===')
        print(f'Total variations: {len(variations)}')
        
        # Look for 30W variant
        found_30w = False
        for v in variations:
            attrs = v.get('attributes', {})
            power = attrs.get('attribute_pa_effect-power', '')
            package = attrs.get('attribute_pa_package', '')
            
            if power == 'b6-30w' and package == 'b6-basic-bundle':
                print(f'\n✅ Found B6 30W Basic Bundle:')
                print(f'SKU: {v.get("sku")}')
                print(f'Display Price: ${v.get("display_price")}')
                print(f'Regular Price: ${v.get("display_regular_price")}')
                print(f'Variation ID: {v.get("variation_id")}')
                print(f'Is on sale: {v.get("on_sale")}')
                print(f'Price HTML (decoded):')
                price_html = html.unescape(v.get('price_html', ''))
                print(price_html[:500])
                found_30w = True
                break
                
        # Always show all variations
        print('\n=== All Available Variations ===')
        for v in variations:
            attrs = v.get('attributes', {})
            power = attrs.get('attribute_pa_effect-power', '')
            package = attrs.get('attribute_pa_package', '')
            price = v.get('display_price', 'N/A')
            reg_price = v.get('display_regular_price', 'N/A')
            if price != reg_price:
                print(f'- {power} + {package}: ${price} (was ${reg_price})')
            else:
                print(f'- {power} + {package}: ${price}')
    else:
        print('No variations data found')

if __name__ == '__main__':
    asyncio.run(test())