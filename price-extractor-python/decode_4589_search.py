#!/usr/bin/env python3
"""
Search for 4589 in encoded/escaped forms
"""

import requests
import re
from bs4 import BeautifulSoup
import html

def decode_4589_search():
    """Search for 4589 in various encoded forms"""
    
    url = "https://commarker.com/product/commarker-b6-jpt-mopa/"
    
    print("=== DECODING $4,589 SEARCH ===")
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        raw_html = response.text
        print(f"Raw HTML length: {len(raw_html)}")
        
        # Search for 4589 in the raw HTML
        pattern = r'4,?589'
        matches = list(re.finditer(pattern, raw_html))
        
        print(f"Found {len(matches)} occurrences of 4589 in raw HTML:")
        
        for i, match in enumerate(matches, 1):
            start_pos = match.start()
            end_pos = match.end()
            
            # Get more context around the match
            context_start = max(0, start_pos - 200)
            context_end = min(len(raw_html), end_pos + 200)
            context = raw_html[context_start:context_end]
            
            print(f"\n📍 MATCH {i} at position {start_pos}:")
            print(f"   Matched text: '{match.group()}'")
            print(f"   Context: ...{context}...")
            
            # Try to decode HTML entities in the context
            decoded_context = html.unescape(context)
            print(f"   Decoded context: ...{decoded_context}...")
            
            # Look for specific patterns in the context
            if 'woocommerce' in context.lower():
                print(f"   🛒 WOOCOMMERCE CONTEXT!")
            if 'variation' in context.lower():
                print(f"   🔄 VARIATION CONTEXT!")
            if 'bundle' in context.lower():
                print(f"   📦 BUNDLE CONTEXT!")
            if 'basic' in context.lower():
                print(f"   ⭐ BASIC CONTEXT!")
            if 'price' in context.lower():
                print(f"   💰 PRICE CONTEXT!")
            if 'ins class' in context.lower():
                print(f"   🏷️ SALE PRICE TAG!")
            
            # Try to extract the HTML element structure around it
            # Look for opening and closing tags around the price
            before_context = raw_html[max(0, start_pos - 500):start_pos]
            after_context = raw_html[end_pos:min(len(raw_html), end_pos + 500)]
            
            # Find the most recent opening tag before the price
            tag_pattern = r'<([a-zA-Z][^>]*?)>'
            opening_tags = list(re.finditer(tag_pattern, before_context))
            if opening_tags:
                last_tag = opening_tags[-1]
                print(f"   📝 Last opening tag: {last_tag.group()}")
            
            # Find the next closing tag after the price
            closing_tag_pattern = r'</([a-zA-Z][^>]*?)>'
            closing_tags = list(re.finditer(closing_tag_pattern, after_context))
            if closing_tags:
                next_closing = closing_tags[0]
                print(f"   📝 Next closing tag: {next_closing.group()}")
        
        # Now parse with BeautifulSoup and see why it's not finding them
        soup = BeautifulSoup(raw_html, 'html.parser')
        
        print(f"\n🔍 SEARCHING WITH BEAUTIFULSOUP...")
        
        # Try different search methods
        all_text = soup.get_text()
        if '4589' in all_text:
            print(f"   ✅ Found 4589 in soup.get_text()")
        else:
            print(f"   ❌ NOT found in soup.get_text()")
        
        # Search in all string contents
        all_strings = soup.find_all(string=True)
        found_in_strings = [s for s in all_strings if '4589' in str(s)]
        print(f"   Found in {len(found_in_strings)} string nodes")
        
        for string_node in found_in_strings:
            print(f"   String: '{string_node}'")
            if string_node.parent:
                print(f"   Parent: <{string_node.parent.name}> classes={string_node.parent.get('class', [])}")
        
        # Search for elements containing the price in their HTML
        elements_with_4589 = soup.find_all(lambda tag: tag.string and '4589' in tag.string)
        print(f"   Found in {len(elements_with_4589)} element strings")
        
        # Search more broadly in element text content
        all_elements = soup.find_all()
        elements_containing_4589 = []
        for elem in all_elements:
            if elem.get_text() and '4589' in elem.get_text():
                elements_containing_4589.append(elem)
        
        print(f"   Found in {len(elements_containing_4589)} element text contents")
        
        for elem in elements_containing_4589[:5]:  # Show first 5
            print(f"   Element: <{elem.name}> classes={elem.get('class', [])} id='{elem.get('id', '')}'")
            elem_text = elem.get_text(strip=True)
            print(f"   Text: {elem_text[:200]}...")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    decode_4589_search()