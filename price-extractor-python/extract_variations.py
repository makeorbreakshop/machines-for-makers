#!/usr/bin/env python3
"""Extract variation data from HTML file."""

import re
import json

# Read the HTML file
with open('commarker_b6_debug.html', 'r') as f:
    content = f.read()

# Find the data-product_variations attribute
match = re.search(r'data-product_variations=\'([^\']+)\'', content)
if match:
    variations_json = match.group(1)
    # Parse the JSON
    variations = json.loads(variations_json)
    
    # Look for B6 30W Basic Bundle
    for variant in variations:
        attrs = variant.get('attributes', {})
        if (attrs.get('attribute_pa_effect-power') == 'b6-30w' and 
            attrs.get('attribute_pa_package') == 'b6-basic-bundle'):
            print("Found B6 30W Basic Bundle!")
            print(f"Display Price: ${variant.get('display_price')}")
            print(f"Regular Price: ${variant.get('display_regular_price')}")
            print(f"SKU: {variant.get('sku')}")
            print(f"Price HTML (decoded):")
            # Decode the HTML entities in price_html
            import html
            price_html = html.unescape(variant.get('price_html', ''))
            print(price_html)
            break
    else:
        print("B6 30W Basic Bundle not found in variations")
        print("\nAvailable variations:")
        for variant in variations:
            attrs = variant.get('attributes', {})
            print(f"- {attrs.get('attribute_pa_effect-power')} + {attrs.get('attribute_pa_package')}: ${variant.get('display_price')}")
else:
    print("Could not find variations data in HTML")