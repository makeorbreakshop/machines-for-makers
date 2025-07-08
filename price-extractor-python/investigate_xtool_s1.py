#!/usr/bin/env python3
"""
Investigate xTool S1 pricing extraction failure
"""

import asyncio
from playwright.async_api import async_playwright
import json
import re

async def investigate_xtool_s1():
    """Investigate xTool S1 pricing extraction failure"""
    url = 'https://www.xtool.com/products/xtool-s1-laser-cutter'
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()
        
        print(f'Navigating to: {url}')
        await page.goto(url, wait_until='networkidle')
        await page.wait_for_timeout(3000)
        
        # Get page title to confirm we loaded correctly
        title = await page.title()
        print(f'Page title: {title}')
        
        # Look for all price-related elements
        print('\n=== Searching for all price elements ===')
        
        # Common price selectors
        price_selectors = [
            '[class*="price"]',
            '[class*="Price"]',
            '[id*="price"]',
            '[data-testid*="price"]',
            '.money',
            '.cost',
            '.amount',
            '[class*="dollar"]',
            '[class*="currency"]'
        ]
        
        all_price_elements = []
        for selector in price_selectors:
            try:
                elements = await page.query_selector_all(selector)
                for element in elements:
                    text = await element.text_content()
                    if text and ('$' in text or text.replace(',', '').replace('.', '').isdigit()):
                        all_price_elements.append({
                            'selector': selector,
                            'text': text.strip(),
                            'html': await element.inner_html()
                        })
            except:
                continue
        
        # Also search for any text containing dollar signs
        print('\n=== Searching for all dollar amounts ===')
        page_content = await page.content()
        dollar_matches = re.findall(r'\$[\d,]+(?:\.?\d{2})?', page_content)
        print(f'Found dollar amounts: {set(dollar_matches)}')
        
        # Look specifically for $999 and $4589
        print('\n=== Looking for specific prices ===')
        print(f'$999 found: {"$999" in page_content}')
        print(f'$4589 found: {"$4589" in page_content}') 
        print(f'$4,589 found: {"$4,589" in page_content}')
        
        # Try to find elements containing specific amounts
        target_prices = ['999', '4589', '4,589']
        for price in target_prices:
            print(f'\n--- Looking for ${price} ---')
            
            # Search in all text
            if f'${price}' in page_content:
                print(f'Found ${price} in page content')
                
                # Try to locate elements
                try:
                    # Method 1: XPath text search
                    xpath_expr = f'//*[contains(text(), "${price}")]'
                    elements = await page.query_selector_all(f'xpath={xpath_expr}')
                    
                    if elements:
                        print(f'Found {len(elements)} elements with ${price}:')
                        for i, elem in enumerate(elements):
                            try:
                                text = await elem.text_content()
                                tag_name = await elem.evaluate('el => el.tagName')
                                class_name = await elem.get_attribute('class') or 'no-class'
                                
                                print(f'  {i+1}. <{tag_name}> class="{class_name}": {text.strip()[:100]}')
                                
                                # Get parent context
                                parent = await elem.query_selector('xpath=..')
                                if parent:
                                    parent_text = await parent.text_content()
                                    parent_tag = await parent.evaluate('el => el.tagName')
                                    parent_class = await parent.get_attribute('class') or 'no-class'
                                    print(f'     Parent <{parent_tag}> class="{parent_class}": {parent_text.strip()[:150]}')
                                    
                            except Exception as e:
                                print(f'     Error getting element details: {e}')
                except Exception as e:
                    print(f'Error finding elements with ${price}: {e}')
        
        # Look for bundle/configuration options
        print('\n=== Looking for bundle/configuration options ===')
        bundle_keywords = ['bundle', 'configuration', 'option', 'kit', 'package']
        for keyword in bundle_keywords:
            if keyword.lower() in page_content.lower():
                print(f'Found "{keyword}" in page content')
        
        await browser.close()
        
        return {
            'price_elements': all_price_elements,
            'dollar_amounts': list(set(dollar_matches))
        }

if __name__ == "__main__":
    result = asyncio.run(investigate_xtool_s1())
    print(f'\nInvestigation complete. Found {len(result["price_elements"])} price elements.')
    print(f'Unique dollar amounts found: {result["dollar_amounts"]}')