#!/usr/bin/env python3
"""
Test direct price extraction for xTool S1 to debug machine-specific rules.
"""

import asyncio
import requests
from bs4 import BeautifulSoup
from scrapers.price_extractor import PriceExtractor

async def test_direct_extraction():
    """Test direct extraction for xTool S1."""
    
    # xTool S1 data
    machine_name = "xTool S1"
    url = "https://www.xtool.com/products/xtool-s1-laser-cutter"
    old_price = 1899.0
    
    # Mock machine data
    machine_data = {
        'Machine Name': machine_name,
        'id': '0f5f7679-e975-4286-b655-9799e24931b9',
        'old_price': old_price,
        'product_link': url
    }
    
    print(f"Testing direct extraction for: {machine_name}")
    print(f"URL: {url}")
    print(f"Old price: ${old_price}")
    print()
    
    # Fetch the page
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            print(f"✅ Page fetched successfully ({len(response.text)} chars)")
            
            # Parse HTML
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Test extraction
            extractor = PriceExtractor()
            price, method = await extractor.extract_price(
                soup=soup,
                html_content=response.text,
                url=url,
                old_price=old_price,
                machine_name=machine_name,
                machine_data=machine_data
            )
            
            print(f"\n=== EXTRACTION RESULT ===")
            print(f"Extracted price: ${price}")
            print(f"Method used: {method}")
            print(f"Expected: ~$1899 (not $899)")
            
            if price == 899.0:
                print("❌ Still extracting 10W price instead of correct S1 price")
            elif price and 1800 <= price <= 2000:
                print("✅ Extracted correct price range for S1")
            else:
                print(f"⚠️ Unexpected price: ${price}")
                
        else:
            print(f"❌ Failed to fetch page: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == '__main__':
    asyncio.run(test_direct_extraction())