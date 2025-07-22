#!/usr/bin/env python3
"""
Simple test for EMP ST50R machine price extraction to check for variant selection issues.
This script analyzes the emplaser.com page structure without database dependencies.
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from loguru import logger
import requests
from bs4 import BeautifulSoup
import re

# Configure logging
logger.remove()
logger.add(sys.stdout, level="INFO", format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | {message}")

def parse_price_text(text):
    """Parse price from text string."""
    if not text:
        return None
    
    # Remove common prefixes and clean
    text = str(text).replace('$', '').replace(',', '').strip()
    
    # Extract numeric value
    price_match = re.search(r'(\d+(?:\.\d+)?)', text)
    if price_match:
        try:
            return float(price_match.group(1))
        except ValueError:
            return None
    return None

async def analyze_emp_page_structure():
    """Analyze the EMP page structure to understand variant selection."""
    
    url = "https://emplaser.com/emp-galvo-lasers"
    
    logger.info(f"🔍 Analyzing EMP page structure at: {url}")
    logger.info(f"🎯 Looking for EMP ST50R variant selection issues")
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        html_content = response.text
        soup = BeautifulSoup(html_content, 'html.parser')
        
        logger.info(f"✅ Successfully loaded page ({len(html_content)} characters)")
        
        # Look for page title
        title = soup.find('title')
        if title:
            logger.info(f"📄 Page title: {title.get_text(strip=True)}")
        
        # Look for price tables
        tables = soup.find_all('table')
        logger.info(f"\n📊 Found {len(tables)} tables on the page")
        
        if not tables:
            logger.warning("❌ No tables found - this might be a dynamic site")
            return analyze_non_table_structure(soup, html_content)
        
        # Analyze each table
        for table_idx, table in enumerate(tables):
            logger.info(f"\n🔍 Analyzing Table {table_idx + 1}:")
            
            rows = table.find_all('tr')
            logger.info(f"  📝 Has {len(rows)} rows")
            
            if len(rows) < 2:
                logger.info(f"  ⚠️ Table {table_idx + 1} has insufficient rows, skipping")
                continue
            
            # Show table structure
            for row_idx, row in enumerate(rows):
                cells = row.find_all(['th', 'td'])
                cell_texts = [cell.get_text(strip=True)[:30] for cell in cells]  # Limit text length
                
                if row_idx < 5:  # Show first 5 rows
                    logger.info(f"    Row {row_idx + 1}: {cell_texts}")
                
                # Look for price patterns in this row
                price_cells = []
                for cell_idx, cell in enumerate(cells):
                    cell_text = cell.get_text(strip=True)
                    if '$' in cell_text or re.search(r'\d{3,5}', cell_text):
                        price = parse_price_text(cell_text)
                        if price and 1000 <= price <= 20000:  # Reasonable laser price range
                            price_cells.append((cell_idx, price, cell_text))
                
                if price_cells:
                    logger.info(f"      💰 Price cells found: {price_cells}")
        
        # Test the specific ST50R extraction logic from site_specific_extractors.py
        return test_st50r_specific_extraction(soup, tables)
        
    except Exception as e:
        logger.error(f"❌ Error analyzing page: {str(e)}")
        return False

def analyze_non_table_structure(soup, html_content):
    """Analyze page structure when no tables are found."""
    logger.info("\n🔍 No tables found, looking for other price structures...")
    
    # Look for common price selectors
    price_selectors = [
        '.price', '.cost', '.total', '[class*="price"]', '[class*="cost"]',
        '.product-price', '.item-price', '.machine-price'
    ]
    
    found_prices = []
    for selector in price_selectors:
        elements = soup.select(selector)
        for elem in elements:
            text = elem.get_text(strip=True)
            if '$' in text or re.search(r'\d{3,5}', text):
                price = parse_price_text(text)
                if price and 1000 <= price <= 20000:
                    found_prices.append((selector, price, text))
    
    if found_prices:
        logger.info(f"💰 Found {len(found_prices)} potential prices:")
        for selector, price, text in found_prices:
            logger.info(f"  {selector}: ${price} ('{text}')")
    
    # Look for ST50R specific mentions
    st50r_mentions = soup.find_all(text=re.compile(r'ST50R|ST 50R', re.IGNORECASE))
    logger.info(f"\n🎯 Found {len(st50r_mentions)} ST50R mentions:")
    for mention in st50r_mentions[:5]:
        logger.info(f"  '{mention.strip()}'")
    
    return len(found_prices) > 0

def test_st50r_specific_extraction(soup, tables):
    """Test the specific extraction logic for ST50R based on site_specific_extractors.py config."""
    
    logger.info(f"\n{'='*60}")
    logger.info("🧪 TESTING ST50R SPECIFIC EXTRACTION")
    
    # According to site_specific_extractors.py:
    # EMP ST50R: table_column: 3, expected_price: 8495, price_range: [8000, 9000]
    
    expected_price = 8495
    expected_column = 3
    expected_range = [8000, 9000]
    
    logger.info(f"📋 Configuration from site_specific_extractors.py:")
    logger.info(f"  • Expected price: ${expected_price}")
    logger.info(f"  • Table column: {expected_column} (4th column)")
    logger.info(f"  • Price range: ${expected_range[0]} - ${expected_range[1]}")
    logger.info(f"  • Keywords: ST50R, ST 50R, 50R")
    
    if not tables:
        logger.error("❌ No tables to analyze")
        return False
    
    # Test extraction from the first table (most likely to contain prices)
    table = tables[0]
    rows = table.find_all('tr')
    
    logger.info(f"\n🔍 Analyzing main table ({len(rows)} rows):")
    
    # Find price row
    price_row = None
    price_row_index = -1
    
    for row_idx, row in enumerate(rows):
        cells = row.find_all(['td', 'th'])
        cell_texts = [cell.get_text(strip=True) for cell in cells]
        
        # Check if this row contains prices ($ symbols or 4-5 digit numbers)
        has_price_indicators = any('$' in text or re.search(r'\d{4,5}', text) for text in cell_texts)
        
        if has_price_indicators:
            logger.info(f"  📊 Row {row_idx + 1} (potential price row): {cell_texts}")
            if price_row is None:  # Take first price row
                price_row = cells
                price_row_index = row_idx
    
    if price_row is None:
        logger.error("❌ Could not find price row in table")
        return False
    
    logger.info(f"\n💰 Using price row {price_row_index + 1} with {len(price_row)} columns:")
    
    # Analyze each column in the price row
    column_analysis = []
    for col_idx, cell in enumerate(price_row):
        cell_text = cell.get_text(strip=True)
        price = parse_price_text(cell_text)
        column_analysis.append({
            'column': col_idx,
            'text': cell_text,
            'price': price,
            'is_expected_column': col_idx == expected_column
        })
        
        status = "✅ TARGET COLUMN" if col_idx == expected_column else ""
        logger.info(f"  Column {col_idx}: '{cell_text}' → ${price} {status}")
    
    # Check the expected column (column 3)
    if expected_column < len(column_analysis):
        target_col = column_analysis[expected_column]
        extracted_price = target_col['price']
        
        logger.info(f"\n🎯 EXTRACTION RESULT:")
        logger.info(f"  Target column {expected_column}: '{target_col['text']}'")
        logger.info(f"  Extracted price: ${extracted_price}")
        logger.info(f"  Expected price: ${expected_price}")
        
        if extracted_price:
            price_diff = abs(extracted_price - expected_price)
            price_diff_percent = (price_diff / expected_price) * 100
            
            logger.info(f"  Price difference: ${price_diff} ({price_diff_percent:.1f}%)")
            
            if expected_range[0] <= extracted_price <= expected_range[1]:
                logger.info(f"  ✅ Price is within expected range ${expected_range[0]}-${expected_range[1]}")
            else:
                logger.warning(f"  ⚠️ Price ${extracted_price} is outside expected range ${expected_range[0]}-${expected_range[1]}")
        else:
            logger.error(f"  ❌ Could not extract price from target column")
    else:
        logger.error(f"❌ Target column {expected_column} doesn't exist (only {len(column_analysis)} columns)")
    
    # Check for potential variant confusion
    logger.info(f"\n🔍 VARIANT CONFUSION ANALYSIS:")
    
    # Look for other columns that might be selected by mistake
    potential_issues = []
    for col in column_analysis:
        if col['price'] and col['column'] != expected_column:
            price_diff = abs(col['price'] - expected_price)
            if price_diff < abs(extracted_price - expected_price) if extracted_price else float('inf'):
                potential_issues.append(col)
    
    if potential_issues:
        logger.warning(f"  ⚠️ Found {len(potential_issues)} columns with prices closer to expected:")
        for col in potential_issues:
            logger.warning(f"    Column {col['column']}: ${col['price']} ('{col['text']}')")
        logger.warning(f"  💡 This suggests possible column mapping issue")
    
    # Check if we're picking up a different EMP variant
    emp_variants = {
        'ST30R': {'price': 4995, 'range': [4500, 5500]},
        'ST50R': {'price': 8495, 'range': [8000, 9000]}, 
        'ST60J': {'price': 8995, 'range': [8500, 9500]},
        'ST100J': {'price': 11995, 'range': [11500, 12500]}
    }
    
    if extracted_price:
        logger.info(f"\n🎯 CHECKING AGAINST OTHER EMP VARIANTS:")
        for variant_name, variant_data in emp_variants.items():
            variant_price = variant_data['price']
            variant_range = variant_data['range']
            
            if variant_range[0] <= extracted_price <= variant_range[1]:
                if variant_name == 'ST50R':
                    logger.info(f"  ✅ {variant_name}: ${extracted_price} matches expected range ${variant_range}")
                else:
                    logger.error(f"  ❌ {variant_name}: ${extracted_price} matches {variant_name} range ${variant_range} - WRONG VARIANT!")
    
    return True

async def test_keyword_matching():
    """Test if keyword matching might be selecting wrong variants."""
    
    logger.info(f"\n{'='*60}")
    logger.info("🔍 TESTING KEYWORD MATCHING ISSUES")
    
    # These are the keywords from site_specific_extractors.py
    st50r_keywords = ['ST50R', 'ST 50R', '50R']
    
    logger.info(f"📋 ST50R keywords: {st50r_keywords}")
    logger.info(f"⚠️ Potential issue: '50R' might match other 50W variants")
    
    # Test potential conflicts
    conflicting_terms = [
        "50W",         # 50 Watt power rating
        "50 W",        # 50 Watt with space
        "50-Watt",     # Hyphenated
        "ST50W",       # Similar model naming
        "F50R",        # Different series but similar ending
        "B50R"         # Different series but similar ending
    ]
    
    logger.info(f"\n🚨 POTENTIAL KEYWORD CONFLICTS:")
    for term in conflicting_terms:
        # Check if any ST50R keyword might match this term
        for keyword in st50r_keywords:
            if keyword.lower() in term.lower() or term.lower() in keyword.lower():
                logger.warning(f"  ⚠️ '{keyword}' might match '{term}'")
        
        # Specifically check the risky '50R' keyword
        if '50' in term:
            logger.warning(f"  🔴 '50R' keyword could incorrectly match '{term}'")
    
    logger.info(f"\n💡 RECOMMENDATIONS:")
    logger.info(f"  • Use more specific keywords: ['ST50R', 'ST 50R'] (remove generic '50R')")
    logger.info(f"  • Add negative keywords to avoid 50W power variants")
    logger.info(f"  • Implement exact string matching instead of substring matching")
    
    return True

if __name__ == "__main__":
    async def main():
        logger.info("=== EMP ST50R VARIANT SELECTION TEST ===")
        logger.info("🎯 Checking for incorrect variant selection (like 50W option)")
        
        success = await analyze_emp_page_structure()
        
        if success:
            await test_keyword_matching()
            logger.info(f"\n{'='*60}")
            logger.info("✅ EMP ST50R analysis completed!")
            logger.info("\n📋 KEY FINDINGS TO CHECK:")
            logger.info("  1. Verify table column 3 contains correct ST50R price")
            logger.info("  2. Check if '50R' keyword causes confusion with 50W variants") 
            logger.info("  3. Ensure price range [8000-9000] is still accurate")
            logger.info("  4. Confirm expected price $8495 matches current market price")
        else:
            logger.error("❌ Analysis failed - site structure may have changed")
    
    asyncio.run(main())