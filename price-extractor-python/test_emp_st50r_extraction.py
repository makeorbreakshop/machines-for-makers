#!/usr/bin/env python3
"""
Test EMP ST50R machine price extraction to check for variant selection issues.
This script specifically checks if we're incorrectly selecting the wrong power variant 
(like the 50W option mentioned) similar to the ComMarker variant selection issues.
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from loguru import logger
import requests
from bs4 import BeautifulSoup
from scrapers.price_extractor import PriceExtractor
from scrapers.dynamic_scraper import DynamicScraper
from services.database import DatabaseService
from services.price_service import PriceService

# Configure logging
logger.remove()
logger.add(sys.stdout, level="INFO", format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | {message}")

async def analyze_emp_page_structure():
    """Analyze the EMP page structure to understand variant selection."""
    
    url = "https://emplaser.com/emp-galvo-lasers"
    
    logger.info(f"🔍 Analyzing EMP page structure at: {url}")
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        html_content = response.text
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Look for price tables
        tables = soup.find_all('table')
        logger.info(f"Found {len(tables)} tables on the page")
        
        for i, table in enumerate(tables):
            logger.info(f"\n📊 Table {i+1}:")
            rows = table.find_all('tr')
            for j, row in enumerate(rows[:3]):  # Show first 3 rows
                cells = row.find_all(['th', 'td'])
                cell_texts = [cell.get_text(strip=True) for cell in cells]
                logger.info(f"  Row {j+1}: {cell_texts}")
        
        # Look for specific ST50R mentions
        st50r_elements = soup.find_all(text=lambda text: text and ('ST50R' in text or 'ST 50R' in text or '50R' in text))
        logger.info(f"\n🎯 Found {len(st50r_elements)} ST50R references:")
        for elem in st50r_elements[:5]:  # Show first 5
            logger.info(f"  '{elem.strip()}'")
        
        # Look for power options that might cause confusion
        power_elements = soup.find_all(text=lambda text: text and ('50W' in text or '50 W' in text))
        logger.info(f"\n⚡ Found {len(power_elements)} 50W references:")
        for elem in power_elements[:5]:  # Show first 5
            logger.info(f"  '{elem.strip()}'")
            
        # Look for any radio buttons or selectors that might indicate variants
        radio_buttons = soup.find_all('input', {'type': 'radio'})
        select_elements = soup.find_all('select')
        option_elements = soup.find_all('option')
        
        logger.info(f"\n🔘 Found {len(radio_buttons)} radio buttons")
        logger.info(f"🔽 Found {len(select_elements)} select dropdowns")
        logger.info(f"📋 Found {len(option_elements)} option elements")
        
        if option_elements:
            logger.info("Sample options:")
            for option in option_elements[:10]:
                logger.info(f"  {option.get_text(strip=True)}")
        
        return html_content, soup
        
    except Exception as e:
        logger.error(f"❌ Error analyzing page: {str(e)}")
        return None, None

async def test_emp_st50r_extraction():
    """Test EMP ST50R price extraction with detailed analysis."""
    
    logger.info("=== EMP ST50R PRICE EXTRACTION TEST ===")
    
    # Get machine data from database
    db_service = DatabaseService()
    try:
        response = db_service.supabase.table("machines").select("*").eq("Machine Name", "EMP ST50R").execute()
        if not response.data:
            logger.error("❌ EMP ST50R machine not found in database")
            return False
        
        machine_data = response.data[0]
        machine_id = machine_data.get('id')
        current_price = machine_data.get('Price')
        product_link = machine_data.get('product_link')
        
        logger.info(f"🎯 Machine: EMP ST50R")
        logger.info(f"💰 Current database price: ${current_price}")
        logger.info(f"🔗 Product link: {product_link}")
        
    except Exception as e:
        logger.error(f"❌ Error fetching machine data: {str(e)}")
        return False
    
    # First, analyze the page structure
    html_content, soup = await analyze_emp_page_structure()
    if not html_content:
        return False
    
    # Test static extraction
    logger.info(f"\n{'='*60}")
    logger.info("🧪 Testing static price extraction")
    
    extractor = PriceExtractor()
    
    try:
        price, method = await extractor.extract_price(
            soup,
            html_content,
            product_link,
            old_price=float(current_price),
            machine_name="EMP ST50R",
            machine_data={'Machine Name': 'EMP ST50R', 'old_price': float(current_price)}
        )
        
        if price:
            price_diff = abs(price - float(current_price))
            price_change_percent = (price_diff / float(current_price)) * 100
            
            logger.info(f"✅ Static extraction result: ${price}")
            logger.info(f"📊 Method: {method}")
            logger.info(f"📈 Price change: ${price_diff:.2f} ({price_change_percent:.1f}%)")
            
            # Check if this looks like a wrong variant (significant price difference)
            if price_change_percent > 20:
                logger.warning(f"⚠️ Large price difference detected! This might indicate wrong variant selection.")
                logger.warning(f"   Expected ~${current_price}, got ${price}")
        else:
            logger.warning("⚠️ Static extraction failed, trying dynamic extraction")
            
    except Exception as e:
        logger.error(f"❌ Static extraction error: {str(e)}")
        price = None
    
    # Test dynamic extraction if static failed or if we suspect variant issues
    if not price or (price and abs(price - float(current_price)) / float(current_price) > 0.2):
        logger.info(f"\n{'='*60}")
        logger.info("🔄 Testing dynamic price extraction")
        
        try:
            async with DynamicScraper() as scraper:
                dynamic_price, dynamic_method = await scraper.extract_price_with_variants(
                    product_link,
                    "EMP ST50R",
                    {},  # No specific variant rules for now
                    machine_data={'Machine Name': 'EMP ST50R', 'old_price': float(current_price)}
                )
                
                if dynamic_price:
                    dynamic_price_diff = abs(dynamic_price - float(current_price))
                    dynamic_price_change_percent = (dynamic_price_diff / float(current_price)) * 100
                    
                    logger.info(f"✅ Dynamic extraction result: ${dynamic_price}")
                    logger.info(f"📊 Method: {dynamic_method}")
                    logger.info(f"📈 Price change: ${dynamic_price_diff:.2f} ({dynamic_price_change_percent:.1f}%)")
                else:
                    logger.error("❌ Dynamic extraction also failed")
                    
        except Exception as e:
            logger.error(f"❌ Dynamic extraction error: {str(e)}")
            dynamic_price = None
    
    # Test using the actual price service
    logger.info(f"\n{'='*60}")
    logger.info("🏗️ Testing full price service pipeline")
    
    try:
        price_service = PriceService()
        result = await price_service.update_machine_price(machine_id)
        
        if result.get("success"):
            service_price = result.get("new_price")
            service_method = result.get("method", "unknown")
            requires_approval = result.get("requires_approval", False)
            
            service_price_diff = abs(service_price - float(current_price))
            service_price_change_percent = (service_price_diff / float(current_price)) * 100
            
            logger.info(f"✅ Price service result: ${service_price}")
            logger.info(f"📊 Method: {service_method}")
            logger.info(f"📈 Price change: ${service_price_diff:.2f} ({service_price_change_percent:.1f}%)")
            logger.info(f"🔐 Requires approval: {requires_approval}")
            
            if requires_approval:
                logger.info(f"📝 Approval reason: {result.get('approval_reason', 'Not provided')}")
                
            # Analyze if this might be wrong variant selection
            if service_price_change_percent > 20:
                logger.warning(f"⚠️ POTENTIAL VARIANT SELECTION ISSUE DETECTED!")
                logger.warning(f"   Expected ~${current_price} for EMP ST50R")
                logger.warning(f"   Got ${service_price} - difference of {service_price_change_percent:.1f}%")
                logger.warning(f"   This could indicate selection of wrong power variant (like 50W instead of ST50R)")
                
                # Check if extracted price is close to other EMP variants
                if 7000 <= service_price <= 9000:
                    logger.warning(f"   💡 Price ${service_price} is in range of EMP ST60J (~$8995)")
                    logger.warning(f"   💡 Possible confusion between ST50R and ST60J variants")
                elif 4000 <= service_price <= 6000:
                    logger.warning(f"   💡 Price ${service_price} is in range of EMP ST30R (~$4995)")
                    logger.warning(f"   💡 Possible confusion between ST50R and ST30R variants")
            else:
                logger.info(f"✅ Price change within reasonable range - variant selection likely correct")
                
        else:
            logger.error(f"❌ Price service failed: {result.get('error', 'Unknown error')}")
            
    except Exception as e:
        logger.error(f"❌ Price service error: {str(e)}")
    
    # Summary and recommendations
    logger.info(f"\n{'='*60}")
    logger.info("📋 ANALYSIS SUMMARY")
    logger.info(f"🎯 Target machine: EMP ST50R")
    logger.info(f"💰 Expected price: ~${current_price}")
    logger.info(f"🔗 URL: {product_link}")
    
    # Based on site-specific extractors analysis
    logger.info(f"\n🔧 EXTRACTION CONFIGURATION ANALYSIS:")
    logger.info(f"  • Site: emplaser.com uses 'static_table' extraction")
    logger.info(f"  • EMP ST50R configured for table_column: 3 (fourth column)")
    logger.info(f"  • Expected price in config: $8495 (different from DB: ${current_price})")
    logger.info(f"  • Price range: [8000, 9000]")
    logger.info(f"  • Keywords: ['ST50R', 'ST 50R', '50R']")
    
    logger.info(f"\n💡 POTENTIAL ISSUES:")
    if float(current_price) != 8495:
        logger.warning(f"  • Database price ${current_price} differs from extractor config $8495")
    logger.info(f"  • Table column extraction may select wrong column")
    logger.info(f"  • Keyword '50R' might match other 50W variants")
    logger.info(f"  • Need to verify correct table column for ST50R")
    
    return True

async def test_baseline_prices():
    """Test extraction against known baseline prices for all EMP variants."""
    
    logger.info("\n🧪 TESTING ALL EMP VARIANT BASELINES")
    
    # Expected prices from site_specific_extractors.py
    emp_variants = {
        'EMP ST30R': {'expected': 4995, 'column': 0},
        'EMP ST50R': {'expected': 8495, 'column': 3},  # Note: different from DB price
        'EMP ST60J': {'expected': 8995, 'column': 4},
        'EMP ST100J': {'expected': 11995, 'column': 5}
    }
    
    url = "https://emplaser.com/emp-galvo-lasers"
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Find price table
        tables = soup.find_all('table')
        if not tables:
            logger.error("❌ No tables found on the page")
            return
        
        logger.info(f"📊 Found {len(tables)} tables, analyzing first table for prices:")
        
        table = tables[0]  # Assume first table contains prices
        rows = table.find_all('tr')
        
        if len(rows) < 2:
            logger.error("❌ Table has insufficient rows")
            return
            
        # Look for price row (usually contains $ symbols)
        price_row = None
        for row in rows:
            cells = row.find_all(['td', 'th'])
            cell_texts = [cell.get_text(strip=True) for cell in cells]
            if any('$' in text for text in cell_texts):
                price_row = cells
                break
        
        if not price_row:
            logger.warning("⚠️ Could not find price row in table")
            # Show all rows for debugging
            for i, row in enumerate(rows):
                cells = row.find_all(['td', 'th'])
                cell_texts = [cell.get_text(strip=True) for cell in cells]
                logger.info(f"Row {i}: {cell_texts}")
            return
        
        logger.info(f"💰 Found price row with {len(price_row)} columns:")
        for i, cell in enumerate(price_row):
            cell_text = cell.get_text(strip=True)
            logger.info(f"  Column {i}: {cell_text}")
        
        # Test each variant's column mapping
        for variant_name, config in emp_variants.items():
            expected_price = config['expected']
            column_index = config['column']
            
            if column_index < len(price_row):
                actual_cell_text = price_row[column_index].get_text(strip=True)
                
                # Try to extract price
                import re
                price_match = re.search(r'\$?([\d,]+)', actual_cell_text)
                if price_match:
                    actual_price = int(price_match.group(1).replace(',', ''))
                    price_diff = abs(actual_price - expected_price)
                    
                    if price_diff <= 100:  # Small tolerance
                        logger.info(f"✅ {variant_name}: Column {column_index} = ${actual_price} (expected ${expected_price}) ✓")
                    else:
                        logger.error(f"❌ {variant_name}: Column {column_index} = ${actual_price} (expected ${expected_price}) - MISMATCH!")
                else:
                    logger.warning(f"⚠️ {variant_name}: Column {column_index} = '{actual_cell_text}' - no price found")
            else:
                logger.error(f"❌ {variant_name}: Column {column_index} doesn't exist (only {len(price_row)} columns)")
        
    except Exception as e:
        logger.error(f"❌ Error testing baseline prices: {str(e)}")

if __name__ == "__main__":
    async def main():
        success = await test_emp_st50r_extraction()
        if success:
            await test_baseline_prices()
            logger.info("\n🎉 EMP ST50R EXTRACTION TEST COMPLETED!")
        else:
            logger.error("\n💥 EMP ST50R EXTRACTION TEST FAILED!")
            sys.exit(1)
    
    asyncio.run(main())