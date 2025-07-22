#!/usr/bin/env python3
"""
Analyze exactly where $4,589 appears in the ComMarker page
"""

import requests
import re
from bs4 import BeautifulSoup

def analyze_4589_location():
    """Analyze exactly where 4589 appears"""
    
    url = "https://commarker.com/product/commarker-b6-jpt-mopa/"
    
    print("=== ANALYZING $4,589 LOCATION ===")
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Find all text nodes containing 4589
        price_nodes = soup.find_all(string=re.compile(r'4,?589', re.IGNORECASE))
        
        print(f"Found {len(price_nodes)} text nodes containing 4589:")
        
        for i, node in enumerate(price_nodes, 1):
            print(f"\n📍 OCCURRENCE {i}:")
            print(f"   Text: '{node.strip()}'")
            
            # Get parent element
            parent = node.parent
            if parent:
                print(f"   Parent: <{parent.name}>")
                print(f"   Parent classes: {parent.get('class', [])}")
                print(f"   Parent ID: {parent.get('id', '')}")
                
                # Get full parent text (limited)
                parent_text = parent.get_text(strip=True)
                print(f"   Parent text: {parent_text[:200]}...")
                
                # Build hierarchy
                hierarchy = []
                current = parent
                for level in range(6):  # Go up 6 levels
                    if current:
                        tag_desc = current.name
                        if current.get('class'):
                            tag_desc += f".{'.'.join(current.get('class'))}"
                        if current.get('id'):
                            tag_desc += f"#{current.get('id')}"
                        hierarchy.append(tag_desc)
                        current = current.parent
                    else:
                        break
                
                print(f"   Hierarchy: {' > '.join(reversed(hierarchy))}")
                
                # Generate CSS selector
                if parent.get('class'):
                    css_selector = f"{parent.name}.{'.'.join(parent.get('class'))}"
                elif parent.get('id'):
                    css_selector = f"{parent.name}#{parent.get('id')}"
                else:
                    css_selector = parent.name
                
                print(f"   🎯 CSS Selector: {css_selector}")
                
                # Check for bundle/basic keywords
                bundle_keywords = ['bundle', 'basic', 'package', 'b6-mopa-basic']
                if any(keyword in parent_text.lower() for keyword in bundle_keywords):
                    print(f"   🎁 BUNDLE CONTEXT DETECTED!")
                    
                # Check if this is the active/selected price
                active_keywords = ['selected', 'active', 'current', 'variation']
                if any(keyword in str(parent).lower() for keyword in active_keywords):
                    print(f"   ✅ ACTIVE PRICE CONTEXT!")
                
                # Look for WooCommerce variation classes
                wc_keywords = ['woocommerce-variation', 'single_variation', 'variation-price']
                if any(keyword in str(parent).lower() for keyword in wc_keywords):
                    print(f"   🛒 WOOCOMMERCE VARIATION PRICE!")
        
        # Also search in data attributes and hidden fields
        print(f"\n🔍 SEARCHING IN DATA ATTRIBUTES...")
        
        elements_with_data = soup.find_all(attrs={'data-price': re.compile(r'4,?589')})
        if elements_with_data:
            for elem in elements_with_data:
                print(f"   Found in data-price: {elem.get('data-price')}")
                print(f"   Element: <{elem.name}> classes={elem.get('class', [])}")
        
        # Search in value attributes
        elements_with_value = soup.find_all(attrs={'value': re.compile(r'4,?589')})
        if elements_with_value:
            for elem in elements_with_value:
                print(f"   Found in value attribute: {elem.get('value')}")
                print(f"   Element: <{elem.name}> classes={elem.get('class', [])}")
        
        # Search for JSON data containing 4589
        print(f"\n📊 SEARCHING IN SCRIPT TAGS...")
        script_tags = soup.find_all('script')
        for script in script_tags:
            if script.string and '4589' in script.string:
                print(f"   Found 4589 in script tag")
                # Show a snippet of the script
                snippet = script.string[:500] + "..." if len(script.string) > 500 else script.string
                print(f"   Script content: {snippet}")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    analyze_4589_location()