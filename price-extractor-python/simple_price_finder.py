#!/usr/bin/env python3
"""
Simple approach: Just find ALL prices on the ComMarker page
Maybe we're overcomplicating this
"""

import requests
import re
from bs4 import BeautifulSoup

def find_all_prices():
    """Find ALL prices on the ComMarker page"""
    
    url = "https://commarker.com/product/commarker-b6-jpt-mopa/"
    
    print("=== FINDING ALL PRICES ON COMMARKER PAGE ===")
    print(f"URL: {url}")
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Method 1: Find all price patterns in text
        print("\n💰 ALL PRICES FOUND IN TEXT:")
        price_pattern = r'\$?([1-9]\d{2,4}(?:,\d{3})*(?:\.\d{2})?)'
        all_text = soup.get_text()
        
        price_matches = re.findall(price_pattern, all_text)
        unique_prices = sorted(set(price_matches), key=lambda x: int(x.replace(',', '')))
        
        for price in unique_prices:
            price_num = int(price.replace(',', ''))
            if 1000 <= price_num <= 10000:  # Reasonable range
                print(f"   ${price}")
                if price == '4,589' or price == '4589':
                    print(f"   🎉 FOUND TARGET PRICE: ${price}")
        
        # Method 2: Search specifically for 4589
        print(f"\n🔍 SEARCHING FOR 4589...")
        if '4589' in all_text or '4,589' in all_text:
            print("✅ Found 4589 in page text")
            
            # Find context
            text_lines = all_text.split('\n')
            for i, line in enumerate(text_lines):
                if '4589' in line or '4,589' in line:
                    print(f"   Line {i}: {line.strip()}")
        else:
            print("❌ 4589 NOT found in page text")
        
        # Method 3: Check HTML elements containing prices
        print(f"\n🏷️ PRICE ELEMENTS IN HTML:")
        
        # Find all elements with price-like content
        price_elements = soup.find_all(string=re.compile(r'\$?\d{3,5}'))
        price_info = []
        
        for element in price_elements:
            parent = element.parent
            if parent:
                price_text = element.strip()
                # Extract just the price number
                price_match = re.search(r'(\d{3,5})', price_text)
                if price_match:
                    price_num = price_match.group(1)
                    if len(price_num) >= 3:  # At least 3 digits
                        info = {
                            'price': price_num,
                            'text': price_text,
                            'tag': parent.name,
                            'classes': parent.get('class', []),
                            'id': parent.get('id', ''),
                            'full_text': parent.get_text(strip=True)[:100]
                        }
                        price_info.append(info)
        
        # Remove duplicates and sort
        seen_prices = set()
        unique_price_info = []
        for info in price_info:
            if info['price'] not in seen_prices:
                seen_prices.add(info['price'])
                unique_price_info.append(info)
        
        unique_price_info.sort(key=lambda x: int(x['price']))
        
        for info in unique_price_info:
            price_num = int(info['price'])
            if 1000 <= price_num <= 10000:
                print(f"\n   💰 ${info['price']}:")
                print(f"      Text: '{info['text']}'")
                print(f"      Element: <{info['tag']}> classes={info['classes']} id='{info['id']}'")
                print(f"      Context: {info['full_text']}")
                
                if info['price'] == '4589':
                    print(f"      🎉 TARGET PRICE FOUND!")
        
        # Method 4: Check for bundle/package specific content
        print(f"\n📦 BUNDLE/PACKAGE CONTENT:")
        
        bundle_keywords = ['bundle', 'package', 'basic', 'premium', 'deluxe', 'standard']
        for keyword in bundle_keywords:
            elements = soup.find_all(string=re.compile(keyword, re.IGNORECASE))
            for element in elements[:3]:  # Limit to first 3 matches per keyword
                parent = element.parent
                if parent and '4589' in parent.get_text():
                    print(f"   🎯 Found 4589 in {keyword} context:")
                    print(f"      Text: {parent.get_text()[:200]}")
                    print(f"      Element: <{parent.name}> classes={parent.get('class', [])}")
        
        # Method 5: Look for JavaScript/JSON data
        print(f"\n📜 CHECKING SCRIPT TAGS FOR 4589:")
        script_tags = soup.find_all('script')
        for i, script in enumerate(script_tags):
            if script.string and '4589' in script.string:
                print(f"   Script {i}: Contains 4589")
                # Show snippet around 4589
                script_text = script.string
                pos = script_text.find('4589')
                if pos != -1:
                    start = max(0, pos - 100)
                    end = min(len(script_text), pos + 100)
                    snippet = script_text[start:end]
                    print(f"   Context: ...{snippet}...")
                    
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    find_all_prices()