#!/usr/bin/env python3
"""
Simple search for $4,589 using requests instead of Playwright
"""

import requests
import re
from bs4 import BeautifulSoup

def find_4589_simple():
    """Search for 4589 in the ComMarker page HTML"""
    
    url = "https://commarker.com/product/commarker-b6-jpt-mopa/"
    
    print("=== SEARCHING FOR $4,589 IN COMMARKER PAGE ===")
    print(f"URL: {url}")
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        html_content = str(soup)
        
        print(f"Page loaded, HTML length: {len(html_content)} characters")
        
        # Search for various formats of 4589
        search_patterns = [
            r'4589',
            r'4,589',
            r'\$4589',
            r'\$4,589',
            r'USD 4589',
            r'USD 4,589'
        ]
        
        found_any = False
        for pattern in search_patterns:
            matches = re.finditer(pattern, html_content, re.IGNORECASE)
            for match in matches:
                found_any = True
                start = max(0, match.start() - 100)
                end = min(len(html_content), match.end() + 100)
                context = html_content[start:end]
                
                print(f"\n✅ FOUND '{pattern}' at position {match.start()}:")
                print(f"Context: ...{context}...")
                
                # Try to find the parent element
                soup_match = soup.find(string=re.compile(pattern, re.IGNORECASE))
                if soup_match:
                    parent = soup_match.parent
                    print(f"Parent element: <{parent.name}> classes={parent.get('class', [])} id='{parent.get('id', '')}'")
        
        if not found_any:
            print("❌ NO INSTANCES OF 4589 FOUND IN HTML")
            
            # Show all prices found instead
            print("\n📊 ALL PRICES FOUND IN HTML:")
            price_pattern = r'\$?(\d{1,2},?\d{3})'
            all_prices = re.findall(price_pattern, html_content)
            unique_prices = sorted(set(all_prices))
            print(f"Prices found: {unique_prices}")
            
            # Check for bundle-related content
            print("\n📦 BUNDLE-RELATED CONTENT:")
            bundle_matches = re.finditer(r'bundle|package', html_content, re.IGNORECASE)
            for match in bundle_matches[:5]:  # Show first 5
                start = max(0, match.start() - 50)
                end = min(len(html_content), match.end() + 50)
                context = html_content[start:end]
                print(f"Bundle context: ...{context}...")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    find_4589_simple()