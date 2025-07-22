#!/usr/bin/env python3
"""
Check what happens when we specifically select B6 MOPA 60W variant
Maybe $4,589 only appears after selecting 60W
"""

import requests
import re
from bs4 import BeautifulSoup

def check_b6_60w_variants():
    """Check what variants exist and what prices show after selecting 60W"""
    
    url = "https://commarker.com/product/commarker-b6-jpt-mopa/"
    
    print("=== CHECKING B6 MOPA VARIANTS ===")
    print(f"URL: {url}")
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        print("\n🔍 LOOKING FOR POWER/VARIANT SELECTION...")
        
        # Look for power selection dropdowns
        power_selects = soup.find_all('select')
        for i, select in enumerate(power_selects):
            select_name = select.get('name', '')
            select_id = select.get('id', '')
            
            print(f"\n📋 SELECT {i+1}: name='{select_name}' id='{select_id}'")
            
            # Get all options
            options = select.find_all('option')
            for j, option in enumerate(options):
                value = option.get('value', '')
                text = option.get_text(strip=True)
                print(f"   Option {j+1}: value='{value}' text='{text}'")
                
                # Check if this is power related
                if any(keyword in text.lower() for keyword in ['60w', '30w', '100w', 'mopa']):
                    print(f"   🎯 POWER OPTION FOUND: {text}")
        
        # Look for radio buttons for power selection
        print(f"\n🔘 CHECKING RADIO BUTTONS...")
        radio_inputs = soup.find_all('input', {'type': 'radio'})
        for i, radio in enumerate(radio_inputs):
            name = radio.get('name', '')
            value = radio.get('value', '')
            radio_id = radio.get('id', '')
            
            # Find associated label
            label_text = ""
            if radio_id:
                label = soup.find('label', {'for': radio_id})
                if label:
                    label_text = label.get_text(strip=True)
            
            if any(keyword in label_text.lower() for keyword in ['60w', '30w', '100w', 'mopa']) or \
               any(keyword in value.lower() for keyword in ['60w', '30w', '100w', 'mopa']):
                print(f"   Radio {i+1}: name='{name}' value='{value}' label='{label_text}'")
                print(f"   🎯 POWER RADIO FOUND: {label_text}")
        
        # Look for any text mentioning the variants
        print(f"\n📝 SEARCHING FOR VARIANT TEXT...")
        all_text = soup.get_text()
        
        # Look for variant mentions
        variant_patterns = [
            r'B6\s*MOPA\s*30W',
            r'B6\s*MOPA\s*60W', 
            r'B6\s*MOPA\s*100W'
        ]
        
        for pattern in variant_patterns:
            matches = re.findall(pattern, all_text, re.IGNORECASE)
            if matches:
                print(f"   Found variant pattern '{pattern}': {len(matches)} times")
                for match in matches[:3]:  # Show first 3
                    print(f"     - {match}")
        
        # Check the JSON schema again more carefully for variant structure
        print(f"\n📊 ANALYZING JSON SCHEMA FOR VARIANTS...")
        script_tags = soup.find_all('script', string=re.compile(r'schema\.org'))
        
        for script in script_tags:
            if script.string and 'offers' in script.string:
                try:
                    import json
                    # Try to parse the JSON
                    json_text = script.string.strip()
                    if json_text.startswith('{"@context"'):
                        data = json.loads(json_text)
                        
                        # Look for product offers
                        for item in data.get('@graph', []):
                            if item.get('@type') == 'Product':
                                offers = item.get('offers', {})
                                if 'offers' in offers:
                                    print(f"\n💰 FOUND PRODUCT OFFERS:")
                                    for i, offer in enumerate(offers['offers'][:5]):  # Show first 5
                                        price = offer.get('price', '')
                                        description = offer.get('description', '')
                                        print(f"   Offer {i+1}: ${price}")
                                        print(f"   Description: {description}")
                                        
                                        # Check if this mentions 60W
                                        if '60w' in description.lower() or 'b6 mopa' in description.lower():
                                            print(f"   🎯 B6 MOPA RELATED OFFER!")
                                            if price == '4589':
                                                print(f"   🎉 FOUND $4,589 IN OFFERS!")
                                        
                except Exception as e:
                    print(f"   Error parsing JSON: {e}")
        
        # Final check - search for any 4589 in the entire page
        print(f"\n🔍 FINAL CHECK FOR 4589...")
        if '4589' in soup.get_text():
            print("✅ Found 4589 in page text")
            
            # Find all text nodes containing 4589
            for element in soup.find_all(string=re.compile(r'4,?589')):
                parent = element.parent
                if parent:
                    print(f"   Found in: <{parent.name}> text='{element.strip()}'")
                    print(f"   Context: {parent.get_text()[:200]}")
        else:
            print("❌ 4589 NOT found anywhere in static page")
            print("   This suggests $4,589 only appears after JavaScript/variant selection")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    check_b6_60w_variants()