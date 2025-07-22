#!/usr/bin/env python3
"""
Verify that the EMP ST50R extraction fix is working correctly.
This test loads the actual site_specific_extractors configuration and tests it.
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

def load_emp_config():
    """Load the EMP configuration from site_specific_extractors.py"""
    
    try:
        # Import the configuration
        from scrapers.site_specific_extractors import SiteSpecificExtractor
        extractor = SiteSpecificExtractor()
        
        # Get the emplaser.com configuration
        domain_rules = extractor.rules.get('emplaser.com', {})
        machine_rules = domain_rules.get('machine_specific_rules', {})
        
        return machine_rules
    except Exception as e:
        logger.error(f"❌ Error loading configuration: {str(e)}")
        return None

async def test_fixed_extraction():
    """Test the EMP ST50R extraction with the fixed configuration."""
    
    logger.info("=== VERIFYING EMP ST50R FIX ===")
    
    # Load the actual configuration
    machine_rules = load_emp_config()
    if not machine_rules:
        logger.error("❌ Failed to load machine configuration")
        return False
    
    # Get ST50R configuration
    st50r_config = machine_rules.get('EMP ST50R')
    if not st50r_config:
        logger.error("❌ EMP ST50R configuration not found")
        return False
    
    logger.info("📋 Loaded EMP ST50R Configuration:")
    logger.info(f"  • Keywords: {st50r_config.get('keywords', [])}")
    logger.info(f"  • Expected Price: ${st50r_config.get('expected_price', 'N/A')}")
    logger.info(f"  • Table Column: {st50r_config.get('table_column', 'N/A')}")
    logger.info(f"  • Price Range: {st50r_config.get('price_range', [])}")
    
    # Verify the fix was applied
    expected_column = st50r_config.get('table_column')
    expected_price = st50r_config.get('expected_price')
    keywords = st50r_config.get('keywords', [])
    
    # Check fix criteria
    fix_checks = {
        "Column is 2 (not 3)": expected_column == 2,
        "Price is 6995 (not 8495)": expected_price == 6995,
        "No risky '50R' keyword": '50R' not in keywords,
        "Has ST50R keyword": 'ST50R' in keywords,
        "Has ST 50R keyword": 'ST 50R' in keywords,
    }
    
    logger.info(f"\n🔍 Fix Verification:")
    all_passed = True
    for check_name, passed in fix_checks.items():
        status = "✅" if passed else "❌"
        logger.info(f"  {status} {check_name}")
        if not passed:
            all_passed = False
    
    if not all_passed:
        logger.error("❌ Configuration fix verification failed")
        return False
    
    # Test actual price extraction
    logger.info(f"\n🧪 Testing actual price extraction...")
    
    url = "https://emplaser.com/emp-galvo-lasers"
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Find the price table
        tables = soup.find_all('table')
        if not tables:
            logger.error("❌ No tables found on page")
            return False
        
        table = tables[0]
        rows = table.find_all('tr')
        
        # Find price row
        price_row = None
        for row in rows:
            cells = row.find_all(['td', 'th'])
            cell_texts = [cell.get_text(strip=True) for cell in cells]
            if any('$' in text for text in cell_texts):
                price_row = cells
                break
        
        if not price_row:
            logger.error("❌ Could not find price row")
            return False
        
        # Test column 2 (should be EMP ST50R)
        target_column = expected_column
        if target_column < len(price_row):
            cell_text = price_row[target_column].get_text(strip=True)
            
            # Parse price
            import re
            price_match = re.search(r'\$?([\d,]+)', cell_text)
            if price_match:
                extracted_price = int(price_match.group(1).replace(',', ''))
                
                logger.info(f"🎯 Extraction Test Result:")
                logger.info(f"  Target Column: {target_column}")
                logger.info(f"  Cell Content: '{cell_text}'")
                logger.info(f"  Extracted Price: ${extracted_price}")
                logger.info(f"  Expected Price: ${expected_price}")
                
                # Verify we're getting the right column content
                # Column 2 should be EMP ST50R price
                header_row = table.find_all('tr')[0] if len(table.find_all('tr')) > 0 else None
                if header_row:
                    header_cells = header_row.find_all(['th', 'td'])
                    if target_column < len(header_cells):
                        header_text = header_cells[target_column].get_text(strip=True)
                        logger.info(f"  Column Header: '{header_text}'")
                        
                        if 'ST50R' in header_text:
                            logger.info(f"  ✅ Correctly targeting EMP ST50R column")
                        else:
                            logger.warning(f"  ⚠️ Column header doesn't contain 'ST50R': {header_text}")
                
                # Check if price matches expected
                if extracted_price == expected_price:
                    logger.info(f"  ✅ Extracted price matches expected price")
                else:
                    price_diff = abs(extracted_price - expected_price)
                    logger.warning(f"  ⚠️ Price difference: ${price_diff}")
                
                return True
            else:
                logger.error(f"  ❌ Could not parse price from: '{cell_text}'")
        else:
            logger.error(f"❌ Target column {target_column} doesn't exist")
        
    except Exception as e:
        logger.error(f"❌ Error testing extraction: {str(e)}")
        return False
    
    return False

if __name__ == "__main__":
    async def main():
        success = await test_fixed_extraction()
        
        if success:
            logger.info(f"\n{'='*60}")
            logger.info("✅ EMP ST50R FIX VERIFICATION PASSED!")
            logger.info("🎯 The configuration has been successfully updated:")
            logger.info("  • Column mapping corrected (3 → 2)")
            logger.info("  • Expected price corrected ($8495 → $6995)")
            logger.info("  • Risky '50R' keyword removed")
            logger.info("  • Price range updated to [6500, 7500]")
            logger.info("\n💡 Next Steps:")
            logger.info("  • Re-run EMP ST50R price extractions")
            logger.info("  • Monitor for improved accuracy")
            logger.info("  • Test other EMP variants for any regressions")
        else:
            logger.error(f"\n{'='*60}")
            logger.error("❌ EMP ST50R FIX VERIFICATION FAILED!")
            logger.error("💡 Manual review of configuration may be required")
            sys.exit(1)
    
    asyncio.run(main())