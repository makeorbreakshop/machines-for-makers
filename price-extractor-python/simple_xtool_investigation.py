#!/usr/bin/env python3
"""
Simple investigation of xTool S1 pricing using requests and BeautifulSoup
"""

import requests
import re
from bs4 import BeautifulSoup
from loguru import logger

def investigate_xtool_s1_simple():
    """Simple investigation using requests"""
    url = 'https://www.xtool.com/products/xtool-s1-laser-cutter'
    
    logger.info(f"🔍 Investigating xTool S1 pricing at: {url}")
    logger.info(f"Expected correct price: $999")
    logger.info(f"Problematic extracted price: $4589")
    
    try:
        # Fetch the page
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        logger.info("📄 Fetching page...")
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        # Parse HTML
        soup = BeautifulSoup(response.content, 'html.parser')
        page_text = soup.get_text()
        
        logger.info(f"Page fetched successfully. Size: {len(response.content)} bytes")
        
        # Step 1: Find all dollar amounts
        logger.info("\n💰 STEP 1: Finding all dollar amounts...")
        dollar_matches = re.findall(r'\$[\d,]+(?:\.?\d{2})?', page_text)
        unique_prices = sorted(set(dollar_matches), key=lambda x: float(x.replace('$', '').replace(',', '')))
        
        logger.info(f"Found unique dollar amounts: {unique_prices}")
        
        # Step 2: Look for specific prices
        logger.info("\n🎯 STEP 2: Analyzing specific prices...")
        target_prices = ['999', '4589', '4,589']
        
        for price in target_prices:
            if f'${price}' in page_text:
                logger.info(f"✅ Found ${price} in page content")
                
                # Find HTML elements containing this price
                elements = soup.find_all(string=re.compile(re.escape(f'${price}')))
                logger.info(f"  Found in {len(elements)} text nodes")
                
                for i, text_node in enumerate(elements[:3]):  # Limit to 3
                    parent = text_node.parent if text_node.parent else None
                    if parent:
                        logger.info(f"  {i+1}. <{parent.name}> class=\"{parent.get('class', [])}\"")
                        logger.info(f"     Text: {text_node.strip()[:100]}...")
                        
                        # Get more context
                        grandparent = parent.parent if parent.parent else None
                        if grandparent:
                            context = grandparent.get_text(strip=True)[:200]
                            logger.info(f"     Context: {context}...")
            else:
                logger.info(f"❌ ${price} not found in page content")
        
        # Step 3: Look for price-related CSS classes
        logger.info("\n🏗️ STEP 3: Analyzing CSS structure...")
        
        price_selectors = [
            'class*="price"',
            'class*="Price"',
            'class*="cost"',
            'class*="amount"',
            'class*="money"'
        ]
        
        recommended_selectors = []
        
        # Find elements with price-like classes
        for pattern in ['price', 'Price', 'cost', 'amount', 'money']:
            elements = soup.find_all(class_=re.compile(pattern))
            if elements:
                logger.info(f"Found {len(elements)} elements with '{pattern}' in class")
                
                for elem in elements[:5]:  # Check first 5
                    text = elem.get_text(strip=True)
                    if '$' in text:
                        logger.info(f"  <{elem.name}> class=\"{elem.get('class', [])}\"")
                        logger.info(f"    Text: {text[:100]}...")
                        
                        # Check if this contains the correct $999 price
                        if '$999' in text:
                            class_names = elem.get('class', [])
                            class_str = '.'.join(class_names) if class_names else elem.name
                            specific_selector = f'{elem.name}.{class_str}' if class_names else elem.name
                            
                            recommended_selectors.append({
                                'selector': specific_selector,
                                'price': '$999',
                                'text': text[:100],
                                'confidence': 'HIGH',
                                'element': elem
                            })
                            logger.info(f"    🎯 CORRECT PRICE FOUND!")
                        elif '$4589' in text or '$4,589' in text:
                            logger.info(f"    ⚠️ PROBLEMATIC PRICE FOUND!")
        
        # Step 4: Look for data attributes
        logger.info("\n📊 STEP 4: Checking data attributes...")
        
        data_price_elements = soup.find_all(attrs={'data-price': True})
        if data_price_elements:
            logger.info(f"Found {len(data_price_elements)} elements with data-price attribute")
            for elem in data_price_elements:
                price_value = elem.get('data-price')
                logger.info(f"  data-price=\"{price_value}\" in <{elem.name}>")
        
        # Step 5: Look for bundle/kit context
        logger.info("\n📦 STEP 5: Analyzing bundle/kit context...")
        
        bundle_keywords = ['bundle', 'kit', 'package', 'set', 'configuration', 'option']
        for keyword in bundle_keywords:
            elements = soup.find_all(string=re.compile(keyword, re.IGNORECASE))
            if elements:
                logger.info(f"✅ Found '{keyword}' in {len(elements)} places")
                
                for text_node in elements[:2]:  # Check first 2
                    parent = text_node.parent if text_node.parent else None
                    if parent:
                        context = parent.get_text(strip=True)
                        if any(price in context for price in ['$999', '$4589', '$4,589']):
                            logger.info(f"  🎯 Bundle context with price: {context[:150]}...")
        
        # Step 6: Generate final recommendations
        logger.info("\n🎯 FINAL RECOMMENDATIONS:")
        logger.info("=" * 60)
        
        if recommended_selectors:
            logger.info("✅ RECOMMENDED CSS SELECTORS FOR $999 PRICE:")
            for i, rec in enumerate(recommended_selectors, 1):
                logger.info(f"{i}. Selector: {rec['selector']}")
                logger.info(f"   Price: {rec['price']}")
                logger.info(f"   Text: {rec['text']}")
                logger.info(f"   Confidence: {rec['confidence']}")
                logger.info("")
                
                # Try to build a more specific selector
                elem = rec['element']
                selector_parts = [elem.name]
                if elem.get('class'):
                    class_selector = '.'.join(elem.get('class'))
                    selector_parts.append(f".{class_selector}")
                if elem.get('id'):
                    selector_parts.append(f"#{elem.get('id')}")
                
                specific_selector = ''.join(selector_parts)
                logger.info(f"   Specific CSS: {specific_selector}")
                logger.info("")
        else:
            logger.warning("❌ No specific selectors found for $999 price")
            logger.info("💡 The page may use JavaScript to load prices dynamically")
        
        # Summary
        if '$999' in page_text and ('$4589' in page_text or '$4,589' in page_text):
            logger.info("📋 SUMMARY:")
            logger.info("✅ Both prices ($999 and $4589) found on page")
            logger.info("🔍 Issue: Price extraction is picking up bundle/accessory price")
            logger.info("💡 Solution: Use more specific CSS selector for base product price")
            
            if recommended_selectors:
                best_selector = recommended_selectors[0]['selector']
                logger.info(f"🎯 RECOMMENDED SELECTOR: {best_selector}")
                return best_selector
        
        return None
        
    except Exception as e:
        logger.error(f"Error during investigation: {str(e)}")
        return None

if __name__ == "__main__":
    result = investigate_xtool_s1_simple()
    if result:
        print(f"\n🎉 FINAL RECOMMENDATION: {result}")
    else:
        print("\n❌ Investigation completed but no specific selector found")