#!/usr/bin/env python3
"""
Debug price parsing to understand what's going wrong.
"""

import sys
import os
from unittest.mock import Mock, patch

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def debug_price_parsing():
    """Debug the price parsing logic."""
    print("🔍 Debugging Price Parsing Logic")
    print("=" * 40)
    
    try:
        from scrapers.site_specific_extractors import SiteSpecificExtractor
        
        extractor = SiteSpecificExtractor()
        
        test_cases = [
            "$2399.99",
            "$1299.99", 
            "2399.99",
            "$4589.00",
            "4589.00"
        ]
        
        for test_input in test_cases:
            print(f"\n🧪 Testing: '{test_input}'")
            
            # Step by step debugging
            import re
            
            # Step 1: Remove currency symbols
            text_clean = re.sub(r'[$€£¥]', '', str(test_input))
            print(f"  After currency removal: '{text_clean}'")
            
            # Step 2: Remove whitespace
            text_clean = re.sub(r'\s+', '', text_clean)
            print(f"  After whitespace removal: '{text_clean}'")
            
            # Step 3: Find numeric pattern
            pattern = r'\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+\.\d{1,2}|\d{4,}'
            match = re.search(pattern, text_clean)
            
            if match:
                price_str = match.group(0)
                print(f"  Regex match: '{price_str}'")
                
                # Step 4: Handle separators (no additional processing needed for these simple cases)
                final_price = float(price_str)
                print(f"  Final parsed price: {final_price}")
                
                # Test the actual method
                actual_result = extractor._parse_price_text(test_input)
                print(f"  Method result: {actual_result}")
                
                if actual_result != final_price:
                    print(f"  ❌ MISMATCH! Expected {final_price}, got {actual_result}")
                else:
                    print(f"  ✅ Match!")
            else:
                print(f"  ❌ No regex match found")
                
    except Exception as e:
        print(f"❌ Debug failed: {str(e)}")
        import traceback
        traceback.print_exc()

def debug_html_extraction():
    """Debug HTML extraction to see what text is being parsed."""
    print("\n🔍 Debugging HTML Extraction")
    print("=" * 40)
    
    try:
        from bs4 import BeautifulSoup
        from scrapers.site_specific_extractors import SiteSpecificExtractor
        
        extractor = SiteSpecificExtractor()
        
        # Test the actual HTML from our test
        html = '<div class="learned-selector">$2399.99</div>'
        soup = BeautifulSoup(html, 'html.parser')
        
        # Find the element
        elements = soup.select('.learned-selector')
        print(f"Found {len(elements)} elements with selector '.learned-selector'")
        
        for i, element in enumerate(elements):
            print(f"\nElement {i}:")
            print(f"  Raw element: {element}")
            print(f"  Text content: '{element.get_text()}'")
            print(f"  Text content (stripped): '{element.get_text().strip()}'")
            
            # Test parsing this text
            text = element.get_text()
            result = extractor._parse_price_text(text)
            print(f"  Parsed price: {result}")
            
            # Manual step-by-step
            print(f"  Manual parsing:")
            import re
            text_clean = re.sub(r'[$€£¥]', '', text)
            print(f"    After currency removal: '{text_clean}'")
            
            # Check what the regex is actually matching
            pattern = r'\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+\.\d{1,2}|\d{4,}'
            match = re.search(pattern, text_clean)
            if match:
                print(f"    Regex matched: '{match.group(0)}'")
                print(f"    Float conversion: {float(match.group(0))}")
            else:
                print("    No regex match!")
        
    except Exception as e:
        print(f"❌ HTML debug failed: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    debug_price_parsing()
    debug_html_extraction()