#!/usr/bin/env python3
import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from scrapers.dynamic_scraper import DynamicScraper

async def debug_commarker():
    async with DynamicScraper() as scraper:
        url = 'https://commarker.com/product/commarker-b6'
        print(f"Navigating to: {url}")
        await scraper.page.goto(url, wait_until='domcontentloaded', timeout=30000)
        await scraper.page.wait_for_timeout(3000)
        
        print('=== DEBUGGING COMMARKER B6 PAGE ===')
        
        # Check for any clickable elements with power text
        clickable_selectors = [
            'button', 'a', 'span[role="button"]', 'div[role="button"]', 
            'input[type="radio"]', 'label', '.variant-option', '.variation-option'
        ]
        
        for selector in clickable_selectors:
            elements = await scraper.page.query_selector_all(selector)
            power_elements = []
            
            for i, elem in enumerate(elements[:8]):  # Check first 8 of each type
                try:
                    text = await elem.text_content()
                    if text and ('30W' in text or '20W' in text or '60W' in text or 'W' in text):
                        classes = await elem.get_attribute('class') or ''
                        data_attrs = {}
                        for attr in ['data-value', 'value', 'data-variant', 'data-option']:
                            val = await elem.get_attribute(attr)
                            if val:
                                data_attrs[attr] = val
                        power_elements.append(f"  [{i}] '{text.strip()}' class='{classes}' attrs={data_attrs}")
                except:
                    pass
            
            if power_elements:
                print(f"\n{selector} elements with power text:")
                for elem_info in power_elements:
                    print(elem_info)

if __name__ == "__main__":
    asyncio.run(debug_commarker())