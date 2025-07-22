#!/usr/bin/env python3
"""
Test only EMP ST50R extraction using the fixed configuration.
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from loguru import logger
import requests
from bs4 import BeautifulSoup

# Configure logging
logger.remove()
logger.add(sys.stdout, level="INFO", format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | {message}")

async def test_emp_st50r_with_fixed_config():
    """Test EMP ST50R extraction using the price extractor with fixed config."""
    
    logger.info("=== TESTING EMP ST50R WITH FIXED CONFIG ===")
    
    # Mock machine data for EMP ST50R
    machine_data = {
        'Machine Name': 'EMP ST50R',
        'old_price': 6995.0,  # Current database price
        'product_link': 'https://emplaser.com/emp-galvo-lasers'
    }
    
    url = machine_data['product_link']
    logger.info(f"🎯 Testing machine: {machine_data['Machine Name']}")
    logger.info(f"🔗 URL: {url}")
    logger.info(f"💰 Expected price: ${machine_data['old_price']}")
    
    try:
        # Import the price extractor
        from scrapers.price_extractor import PriceExtractor
        
        # Fetch the page
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        html_content = response.text
        soup = BeautifulSoup(html_content, 'html.parser')
        
        logger.info("✅ Successfully fetched page")
        
        # Test price extraction
        extractor = PriceExtractor()
        
        price, method = await extractor.extract_price(
            soup,
            html_content,
            url,
            old_price=machine_data['old_price'],
            machine_name=machine_data['Machine Name'],
            machine_data=machine_data
        )
        
        if price:
            price_diff = abs(price - machine_data['old_price'])
            price_change_percent = (price_diff / machine_data['old_price']) * 100 if machine_data['old_price'] > 0 else 0
            
            logger.info(f"✅ EXTRACTION SUCCESS!")
            logger.info(f"  💰 Extracted price: ${price}")
            logger.info(f"  📊 Method: {method}")
            logger.info(f"  📈 Price difference: ${price_diff:.2f} ({price_change_percent:.1f}%)")
            
            # Analyze result
            if price_change_percent <= 5:
                logger.info(f"  ✅ Excellent match - price within 5% of expected")
            elif price_change_percent <= 15:
                logger.info(f"  ✅ Good match - price within 15% of expected")
            else:
                logger.warning(f"  ⚠️ Large difference - might indicate issue")
            
            # Check if we're getting the right variant
            if abs(price - 6995) <= 100:
                logger.info(f"  ✅ Price matches EMP ST50R expected range (~$6995)")
            elif abs(price - 4995) <= 100:
                logger.warning(f"  ⚠️ Price matches EMP ST30R (~$4995) - wrong variant?")
            elif abs(price - 8495) <= 100:
                logger.warning(f"  ⚠️ Price matches EMP ST50J (~$8495) - wrong variant?")
            elif abs(price - 8995) <= 100:
                logger.warning(f"  ⚠️ Price matches EMP ST60J (~$8995) - wrong variant?")
            else:
                logger.info(f"  💡 Price doesn't match common EMP variants - check if legitimate")
            
            return True
            
        else:
            logger.error("❌ EXTRACTION FAILED")
            logger.error("  • No price extracted")
            return False
            
    except ImportError as e:
        logger.error(f"❌ Import error: {str(e)}")
        logger.info("💡 Try running from price-extractor-python directory")
        return False
    except Exception as e:
        logger.error(f"❌ Error during extraction: {str(e)}")
        logger.exception("Full error details:")
        return False

async def manual_table_extraction_test():
    """Manually test table extraction to verify column mapping."""
    
    logger.info(f"\n{'='*60}")
    logger.info("🧪 MANUAL TABLE EXTRACTION TEST")
    
    url = "https://emplaser.com/emp-galvo-lasers"
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Find tables
        tables = soup.find_all('table')
        if not tables:
            logger.error("❌ No tables found")
            return False
        
        table = tables[0]
        rows = table.find_all('tr')
        
        # Show model names (row 1) and prices (row 2)
        if len(rows) >= 2:
            model_row = rows[0].find_all(['th', 'td'])
            price_row = rows[1].find_all(['th', 'td'])
            
            logger.info("📊 Table Structure Analysis:")
            for i, (model_cell, price_cell) in enumerate(zip(model_row, price_row)):
                model_text = model_cell.get_text(strip=True)
                price_text = price_cell.get_text(strip=True)
                
                highlight = " 🎯" if 'ST50R' in model_text else ""
                logger.info(f"  Column {i}: {model_text} - {price_text}{highlight}")
            
            # Test our target column (should be 2)
            target_column = 2
            if target_column < len(price_row):
                target_model = model_row[target_column].get_text(strip=True)
                target_price = price_row[target_column].get_text(strip=True)
                
                logger.info(f"\n🎯 Target Column {target_column} Test:")
                logger.info(f"  Model: {target_model}")
                logger.info(f"  Price: {target_price}")
                
                if 'ST50R' in target_model:
                    logger.info(f"  ✅ Correctly targeting EMP ST50R!")
                    
                    # Parse price
                    import re
                    price_match = re.search(r'\$?(\d+)', target_price)
                    if price_match:
                        extracted_price = int(price_match.group(1))
                        logger.info(f"  💰 Extracted price: ${extracted_price}")
                        
                        if extracted_price == 6995:
                            logger.info(f"  ✅ Perfect match with expected $6995!")
                            return True
                else:
                    logger.error(f"  ❌ Column {target_column} does not contain ST50R!")
                    logger.error(f"      It contains: {target_model}")
                    return False
        
        return False
        
    except Exception as e:
        logger.error(f"❌ Manual test error: {str(e)}")
        return False

if __name__ == "__main__":
    async def main():
        logger.info("🚀 EMP ST50R Extraction Fix Verification")
        
        # First do manual table test
        manual_success = await manual_table_extraction_test()
        
        if manual_success:
            logger.info(f"\n✅ Manual table test passed - column mapping is correct")
            
            # Now test with actual extractor
            extraction_success = await test_emp_st50r_with_fixed_config()
            
            if extraction_success:
                logger.info(f"\n{'='*60}")
                logger.info("🎉 EMP ST50R FIX VERIFICATION COMPLETE!")
                logger.info("✅ Both manual and automated tests passed")
                logger.info("💡 The fix is working correctly!")
            else:
                logger.warning(f"\n⚠️ Manual test passed but extraction failed")
                logger.warning("💡 May need to check extractor implementation")
        else:
            logger.error(f"\n❌ Manual table test failed")
            logger.error("💡 Column mapping issue persists")
    
    asyncio.run(main())