#!/usr/bin/env python3
"""
Debug script to inspect ComMarker B6 30W price extraction.
This will show us exactly what prices are found and where.
"""

import asyncio
import sys
import os
from pathlib import Path

# Add the current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from scrapers.dynamic_scraper import DynamicScraper
from bs4 import BeautifulSoup
import re

async def debug_commarker_extraction():
    """Debug ComMarker B6 30W extraction step by step."""
    
    url = "https://commarker.com/product/commarker-b6/"
    machine_name = "ComMarker B6 30W"
    
    print(f"🔍 DEBUGGING ComMarker extraction for: {machine_name}")
    print(f"🔗 URL: {url}")
    print("=" * 80)
    
    async with DynamicScraper() as scraper:
        try:
            # Navigate to the page
            print("📄 Step 1: Navigating to page...")
            await scraper.page.goto(url, wait_until='domcontentloaded', timeout=30000)
            await scraper.page.wait_for_timeout(2000)
            
            # Get initial content
            initial_content = await scraper.page.content()
            soup = BeautifulSoup(initial_content, 'lxml')
            
            # Find all price elements before selection
            print("\n💰 Step 2: Finding all price elements BEFORE variant selection...")
            price_elements = soup.find_all(string=re.compile(r'\$[0-9,]+'))
            print(f"Found {len(price_elements)} price-like elements:")
            for i, price in enumerate(price_elements[:10]):  # Show first 10
                print(f"  {i+1}: {price.strip()}")
            
            # Apply variant selection
            print(f"\n⚙️ Step 3: Selecting ComMarker B6 30W variant...")
            await scraper._select_commarker_variant(machine_name)
            
            # Wait for updates
            await scraper.page.wait_for_timeout(3000)
            
            # Get updated content after selection
            updated_content = await scraper.page.content()
            updated_soup = BeautifulSoup(updated_content, 'lxml')
            
            print("\n💰 Step 4: Finding all price elements AFTER variant selection...")
            price_elements_after = updated_soup.find_all(string=re.compile(r'\$[0-9,]+'))
            print(f"Found {len(price_elements_after)} price-like elements:")
            for i, price in enumerate(price_elements_after[:10]):  # Show first 10
                print(f"  {i+1}: {price.strip()}")
            
            # Test specific selectors used by the system
            print(f"\n🎯 Step 5: Testing specific selectors used by dynamic scraper...")
            
            test_selectors = [
                '.package-selection .price ins .amount',
                '.package-selection .price .amount:last-child', 
                '.selected-package .price ins .amount',
                '.selected-package .price .amount:last-child',
                '.woocommerce-variation-price .price ins .amount',
                '.woocommerce-variation-price .price .amount:last-child',
                '.single-product-content .price ins .amount',  # This is what succeeded
                '.product-summary .price ins .amount',
                '.entry-summary .price ins .amount',
                '.product-summary .price .amount:last-child',
                '.entry-summary .price .amount:last-child'
            ]
            
            for selector in test_selectors:
                elements = updated_soup.select(selector)
                if elements:
                    for i, elem in enumerate(elements):
                        price_text = elem.get_text(strip=True)
                        print(f"  ✅ {selector} → {price_text}")
                else:
                    print(f"  ❌ {selector} → No matches")
            
            # Look for specific price we expect ($2,399)
            print(f"\n🔍 Step 6: Looking for $2,399 specifically...")
            elements_2399 = updated_soup.find_all(string=re.compile(r'2[,.]?399'))
            if elements_2399:
                print(f"Found {len(elements_2399)} elements containing '2399':")
                for elem in elements_2399:
                    parent = elem.parent
                    parent_classes = ' '.join(parent.get('class', [])) if parent else 'No parent'
                    print(f"  📍 Text: '{elem.strip()}' | Parent: <{parent.name}> | Classes: {parent_classes}")
            else:
                print("❌ No elements containing '2399' found!")
            
            # Look for the $2,249 we're getting instead
            print(f"\n🔍 Step 7: Looking for $2,249 (what we're extracting)...")
            elements_2249 = updated_soup.find_all(string=re.compile(r'2[,.]?249'))
            if elements_2249:
                print(f"Found {len(elements_2249)} elements containing '2249':")
                for elem in elements_2249:
                    parent = elem.parent
                    parent_classes = ' '.join(parent.get('class', [])) if parent else 'No parent'
                    print(f"  📍 Text: '{elem.strip()}' | Parent: <{parent.name}> | Classes: {parent_classes}")
            else:
                print("❌ No elements containing '2249' found!")
                
            # Check the exact selector that succeeded: .single-product-content .price ins .amount
            print(f"\n🎯 Step 8: Detailed analysis of successful selector...")
            successful_selector = '.single-product-content .price ins .amount'
            elements = updated_soup.select(successful_selector)
            print(f"Selector: {successful_selector}")
            print(f"Found {len(elements)} elements:")
            
            for i, elem in enumerate(elements):
                price_text = elem.get_text(strip=True)
                parent = elem.parent
                grandparent = parent.parent if parent else None
                
                print(f"  Element {i+1}:")
                print(f"    Text: '{price_text}'")
                print(f"    Parent: <{parent.name}> classes: {' '.join(parent.get('class', []))}")
                if grandparent:
                    print(f"    Grandparent: <{grandparent.name}> classes: {' '.join(grandparent.get('class', []))}")
                
                # Get surrounding context
                parent_text = parent.get_text(strip=True) if parent else ''
                print(f"    Parent context: '{parent_text[:100]}...'")
            
            print("\n" + "=" * 80)
            print("🏁 Debug complete!")
            
        except Exception as e:
            print(f"❌ Error during debugging: {str(e)}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_commarker_extraction())