#!/usr/bin/env python3
"""
Fix price extraction issues for specific machines
Batch ID: 0cd2c985-a0d0-44ce-8393-5a726433bb1c

Issues:
1. Cloudray MP 60 LiteMarker Pro - Getting $6,859.99 instead of $4,999
2. EMP ST100J - Getting $4,995 instead of $11,995 
3. xTool F1 Lite - Getting $1,039 instead of $799
4. Thunder Aurora 8 - Correctly getting $6,600 (no issue)
"""

import asyncio
from loguru import logger
from services.database import DatabaseService
from services.price_service import PriceService

async def test_specific_machines():
    """Test price extraction for problematic machines"""
    
    db_service = DatabaseService()
    price_service = PriceService(db_service)
    
    # Test machines with their expected prices
    test_cases = [
        {
            'name': 'Cloudray MP 60 LiteMarker Pro',
            'id': 'b0e22cea-c826-4707-8643-e42ef6c3b90a',
            'url': 'https://www.cloudraylaser.com/collections/cloudray-engraver-machine/products/mp-60-litemarker-60w-split-laser-engraver-fiber-marking-machine-with-11-8-x-11-8-working-area',
            'expected_price': 4999.0,
            'current_extraction': 6859.99
        },
        {
            'name': 'EMP ST100J',
            'id': 'c279ded1-1f68-4492-9f3d-5e07e07eb023',
            'url': 'https://emplaser.com/emp-galvo-lasers',
            'expected_price': 11995.0,
            'current_extraction': 4995.0
        },
        {
            'name': 'xTool F1 Lite',
            'id': '0b5f958f-5b8b-4881-96d3-15924ea095e8',
            'url': 'https://www.xtool.com/products/xtool-f1?variant=46187559157999',
            'expected_price': 799.0,
            'current_extraction': 1039.0
        }
    ]
    
    logger.info("Testing price extraction for problematic machines...")
    
    for test in test_cases:
        logger.info(f"\n{'='*60}")
        logger.info(f"Testing: {test['name']}")
        logger.info(f"URL: {test['url']}")
        logger.info(f"Expected: ${test['expected_price']}")
        logger.info(f"Currently extracting: ${test['current_extraction']}")
        
        # Extract price using current system
        try:
            result = await price_service.update_machine_price(
                machine_id=test['id'],
                use_scrapfly=True,
                force_update=False  # Don't save to DB, just test
            )
            
            if result and 'price' in result:
                extracted = result['price']
                logger.info(f"Extracted: ${extracted}")
                
                if abs(extracted - test['expected_price']) < 1:
                    logger.success(f"✅ CORRECT: Extracted ${extracted} matches expected ${test['expected_price']}")
                else:
                    logger.error(f"❌ WRONG: Extracted ${extracted}, expected ${test['expected_price']}")
            else:
                logger.error(f"❌ FAILED: No price extracted")
                
        except Exception as e:
            logger.error(f"❌ ERROR: {str(e)}")

async def analyze_extraction_logs():
    """Analyze the extraction methods being used"""
    
    import re
    log_file = '/Users/brandoncullum/machines-for-makers/price-extractor-python/logs/batch_20250822_030022_0cd2c985.log'
    
    machines_of_interest = [
        'Cloudray MP 60 LiteMarker Pro',
        'EMP ST100J', 
        'xTool F1 Lite'
    ]
    
    with open(log_file, 'r') as f:
        content = f.read()
        
    for machine in machines_of_interest:
        logger.info(f"\n{'='*60}")
        logger.info(f"Analyzing extraction for: {machine}")
        
        # Find the extraction methods used
        pattern = f"{re.escape(machine)}.*?EXTRACTION COMPLETE"
        matches = re.findall(pattern, content, re.DOTALL)
        
        if matches:
            for match in matches[:1]:  # Just show first occurrence
                # Extract key info
                if "METHOD 1 SUCCESS" in match:
                    logger.info("Used METHOD 1: Dynamic extraction")
                elif "METHOD 2 SUCCESS" in match:
                    logger.info("Used METHOD 2: Site-specific extraction")
                    # Find the specific selector
                    selector_match = re.search(r"using site-specific method: (.*?)$", match, re.MULTILINE)
                    if selector_match:
                        logger.info(f"Selector: {selector_match.group(1)}")
                elif "METHOD 3 SUCCESS" in match:
                    logger.info("Used METHOD 3: Structured data")
                elif "METHOD 4 SUCCESS" in match:
                    logger.info("Used METHOD 4: Common selectors")
                    
                # Find the extracted price
                price_match = re.search(r"Extracted price \$?([\d,]+\.?\d*)", match)
                if price_match:
                    logger.info(f"Extracted price: ${price_match.group(1)}")

if __name__ == "__main__":
    # First analyze what went wrong
    asyncio.run(analyze_extraction_logs())
    
    # Then test with current system
    # asyncio.run(test_specific_machines())