#!/usr/bin/env python3
"""
Direct analysis of ComMarker B6 MOPA 60W page to understand pricing structure.
This script will fetch the page and analyze where the $4,589 price appears.
"""

import requests
from bs4 import BeautifulSoup
import re
import sys
from loguru import logger

# Configure logging
logger.remove()
logger.add(sys.stdout, level="INFO", format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | {message}")

def analyze_commarker_page():
    """Fetch and analyze the ComMarker B6 MOPA 60W page."""
    
    url = "https://commarker.com/product/commarker-b6-jpt-mopa/"
    
    logger.info("=== ANALYZING COMMARKER B6 MOPA 60W PAGE ===")
    logger.info(f"URL: {url}")
    
    # Fetch the page
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        logger.info(f"✅ Page fetched successfully. Status: {response.status_code}")
        logger.info(f"Page size: {len(response.text)} characters")
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Step 1: Find all prices on the page
        logger.info("\n--- STEP 1: FINDING ALL PRICES ---")
        
        # Find all text containing dollar amounts
        price_pattern = re.compile(r'\$[\d,]+\.?\d*')
        all_prices = []
        
        for text in soup.find_all(text=price_pattern):
            matches = price_pattern.findall(text)
            for match in matches:
                price_value = float(match.replace('$', '').replace(',', ''))
                all_prices.append({
                    'text': match,
                    'value': price_value,
                    'parent_tag': text.parent.name if text.parent else 'unknown',
                    'parent_class': text.parent.get('class', []) if text.parent else [],
                    'context': text.strip()[:100]
                })
        
        # Sort by value
        all_prices.sort(key=lambda x: x['value'])
        
        logger.info(f"Found {len(all_prices)} prices on the page")
        
        # Look for prices around $4,589
        target_price = 4589.0
        logger.info(f"\n🎯 Looking for prices around ${target_price}...")
        
        for price in all_prices:
            if 4500 <= price['value'] <= 4700:
                logger.info(f"  ${price['value']} - Tag: {price['parent_tag']} - Classes: {price['parent_class']}")
                logger.info(f"    Context: {price['context']}")
        
        # Step 2: Analyze form structure for variations
        logger.info("\n--- STEP 2: ANALYZING VARIATION FORMS ---")
        
        # Find variation forms (WooCommerce typically uses these)
        forms = soup.find_all('form', class_=re.compile(r'variations|cart'))
        logger.info(f"Found {len(forms)} variation/cart forms")
        
        for i, form in enumerate(forms):
            logger.info(f"\nForm {i+1}:")
            
            # Look for select dropdowns in the form
            selects = form.find_all('select')
            for select in selects:
                name = select.get('name', 'unknown')
                select_id = select.get('id', 'unknown')
                logger.info(f"  Select field: name='{name}', id='{select_id}'")
                
                # List all options
                options = select.find_all('option')
                for option in options[:10]:  # First 10 options
                    value = option.get('value', '')
                    text = option.get_text(strip=True)
                    logger.info(f"    Option: value='{value}', text='{text}'")
        
        # Step 3: Look for Effect Power and Package selections specifically
        logger.info("\n--- STEP 3: LOOKING FOR EFFECT POWER AND PACKAGE SELECTIONS ---")
        
        # Search for Effect Power section
        effect_power_keywords = ['effect power', 'effect-power', 'power option', 'wattage']
        for keyword in effect_power_keywords:
            elements = soup.find_all(text=re.compile(keyword, re.IGNORECASE))
            if elements:
                logger.info(f"\n🔍 Found '{keyword}' in {len(elements)} places")
                for elem in elements[:3]:
                    parent = elem.parent
                    if parent:
                        # Look for nearby options
                        siblings = parent.find_next_siblings()[:5]
                        for sib in siblings:
                            if sib.name in ['button', 'input', 'label', 'option']:
                                logger.info(f"  Nearby {sib.name}: {sib.get_text(strip=True)[:50]}")
        
        # Search for Package/Bundle section
        package_keywords = ['package', 'bundle', 'kit', 'combo']
        for keyword in package_keywords:
            elements = soup.find_all(text=re.compile(keyword, re.IGNORECASE))
            if elements:
                logger.info(f"\n🔍 Found '{keyword}' in {len(elements)} places")
                for elem in elements[:5]:
                    parent = elem.parent
                    if parent:
                        text = parent.get_text(strip=True)
                        if 'basic bundle' in text.lower() or 'b6 mopa' in text.lower():
                            logger.info(f"  📦 POTENTIAL BUNDLE: {text[:100]}")
                            
                            # Look for prices near this element
                            price_elements = parent.find_all(text=price_pattern)
                            for price_elem in price_elements:
                                logger.info(f"    💰 Associated price: {price_elem.strip()}")
        
        # Step 4: Check for JavaScript-based pricing
        logger.info("\n--- STEP 4: CHECKING FOR JAVASCRIPT PRICING DATA ---")
        
        # Look for product variation data in scripts
        scripts = soup.find_all('script')
        for script in scripts:
            if script.string and 'variations' in script.string:
                # Look for price data in the script
                if '4589' in script.string or '4,589' in script.string:
                    logger.info("🎯 Found $4,589 in JavaScript variation data!")
                    
                    # Extract a sample around the price
                    text = script.string
                    for match in re.finditer(r'4[,]?589', text):
                        start = max(0, match.start() - 100)
                        end = min(len(text), match.end() + 100)
                        sample = text[start:end]
                        logger.info(f"  Context: ...{sample}...")
        
        # Step 5: Summary
        logger.info("\n--- SUMMARY ---")
        
        # Check if we found the exact price
        found_4589 = any(p['value'] == 4589.0 for p in all_prices)
        if found_4589:
            logger.info("✅ Found exact price $4,589 on the page")
            matching = [p for p in all_prices if p['value'] == 4589.0]
            for m in matching:
                logger.info(f"  Location: {m['parent_tag']} with classes {m['parent_class']}")
        else:
            logger.warning("❌ Did NOT find exact price $4,589 in the HTML")
            logger.info("This suggests the price is likely loaded dynamically via JavaScript")
            logger.info("when specific options (60W + Basic Bundle) are selected")
        
        # List prices closest to target
        close_prices = [p for p in all_prices if 4000 <= p['value'] <= 5000]
        logger.info(f"\nPrices in range $4000-$5000: {[p['value'] for p in close_prices]}")
        
    except Exception as e:
        logger.error(f"Error fetching page: {str(e)}")

if __name__ == "__main__":
    analyze_commarker_page()