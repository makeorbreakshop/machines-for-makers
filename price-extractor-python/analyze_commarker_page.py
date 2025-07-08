#!/usr/bin/env python3
"""
Analyze ComMarker page structure to understand price loading.
"""

import requests
from bs4 import BeautifulSoup
import re
import json

def analyze_commarker_page():
    """Analyze ComMarker B4 page structure."""
    
    url = "https://www.commarker.com/products/commarker-b4-fiber-laser-engraver"
    
    print(f"Fetching: {url}")
    
    response = requests.get(url, headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    })
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Look for product data in scripts
        print("\nLooking for product data in scripts...")
        scripts = soup.find_all('script', type='application/ld+json')
        
        for i, script in enumerate(scripts):
            try:
                data = json.loads(script.string)
                print(f"\nScript {i+1} contains: {data.get('@type', 'Unknown type')}")
                if 'offers' in str(data):
                    print("  Found offers data!")
                    print(json.dumps(data, indent=2)[:500])
            except:
                pass
        
        # Look for Shopify/WooCommerce data
        print("\nLooking for e-commerce platform data...")
        
        # Check for WooCommerce
        woo_scripts = soup.find_all('script', string=re.compile('wc_product_|woocommerce'))
        print(f"Found {len(woo_scripts)} WooCommerce scripts")
        
        # Check for product forms
        forms = soup.find_all('form', class_=re.compile('cart|product'))
        print(f"Found {len(forms)} product forms")
        
        # Look for variant/option selectors
        selects = soup.find_all('select', {'name': re.compile('attribute_|variant|option')})
        print(f"Found {len(selects)} variant selectors")
        
        # Check for price in meta tags
        print("\nChecking meta tags...")
        meta_price = soup.find('meta', {'property': 'product:price:amount'})
        if meta_price:
            print(f"Found meta price: {meta_price.get('content')}")
        
        # Look for JavaScript variables
        print("\nLooking for JavaScript price variables...")
        all_scripts = soup.find_all('script')
        for script in all_scripts:
            if script.string and 'price' in script.string.lower():
                # Look for price patterns
                matches = re.findall(r'price["\']?\s*:\s*["\']?(\d+\.?\d*)', script.string, re.IGNORECASE)
                if matches:
                    print(f"Found price values in JavaScript: {matches[:5]}")
                    break
        
        # Save page for manual inspection
        with open('commarker_page.html', 'w', encoding='utf-8') as f:
            f.write(response.text)
        print("\nSaved page to commarker_page.html for inspection")


if __name__ == "__main__":
    analyze_commarker_page()