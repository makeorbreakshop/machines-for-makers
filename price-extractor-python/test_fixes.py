#!/usr/bin/env python3
"""
Test the fixes for systematic price extraction issues
"""

import asyncio
from loguru import logger
from services.database import DatabaseService
from services.price_service import PriceService

async def test_fixed_extraction():
    """Test that our fixes work"""
    
    db_service = DatabaseService()
    price_service = PriceService()
    
    test_cases = [
        {
            'name': 'xTool F1 Lite',
            'id': '0b5f958f-5b8b-4881-96d3-15924ea095e8',
            'expected': 799.0,
            'was_extracting': 1039.0
        },
        {
            'name': 'EMP ST100J',
            'id': 'c279ded1-1f68-4492-9f3d-5e07e07eb023',
            'expected': 11995.0,
            'was_extracting': 4995.0
        },
        {
            'name': 'Cloudray MP 60 LiteMarker Pro',
            'id': 'b0e22cea-c826-4707-8643-e42ef6c3b90a',
            'expected': 4999.0,
            'was_extracting': 6859.99
        }
    ]
    
    logger.info("="*60)
    logger.info("Testing fixes for systematic extraction issues")
    logger.info("="*60)
    
    for test in test_cases:
        logger.info(f"\nTesting: {test['name']}")
        logger.info(f"Expected: ${test['expected']}")
        logger.info(f"Was extracting (wrong): ${test['was_extracting']}")
        
        try:
            # Just check what would be extracted, don't save
            result = await price_service.update_machine_price(
                machine_id=test['id'],
                use_scrapfly=True
            )
            
            if result and 'new_price' in result:
                extracted = result['new_price']
                if abs(extracted - test['expected']) < 100:  # Allow small variance
                    logger.success(f"✅ FIXED: Now extracting ${extracted} (expected ${test['expected']})")
                else:
                    logger.error(f"❌ STILL WRONG: Extracting ${extracted}, expected ${test['expected']}")
            else:
                logger.error(f"❌ FAILED: {result.get('error', 'No price extracted')}")
                
        except Exception as e:
            logger.error(f"❌ ERROR: {str(e)}")
    
    logger.info("\n" + "="*60)
    logger.info("SUMMARY:")
    logger.info("The systematic issue was that machines with force_dynamic=True")
    logger.info("were being skipped for dynamic extraction when using Scrapfly.")
    logger.info("This caused variant/bundle prices to be extracted instead of base prices.")
    logger.info("="*60)

if __name__ == "__main__":
    asyncio.run(test_fixed_extraction())