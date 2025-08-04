#!/usr/bin/env python3
"""
Test ComMarker B6 30W extraction fix - should get $2,399 from Basic Bundle
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(__file__))

from services.price_service import PriceService
from loguru import logger

async def test_commarker_b6_fix():
    """Test ComMarker B6 30W extraction with bundle price targeting."""
    
    # ComMarker B6 30W test data
    test_machine = {
        'id': 'test-b6-30w',
        'Machine Name': 'ComMarker B6 30W', 
        'URL': 'https://commarker.com/product/commarker-b6/',
        'old_price': 1839.0  # Previous extracted price
    }
    
    logger.info("🧪 Testing ComMarker B6 30W Bundle Price Extraction")
    logger.info(f"Target: Extract $2,399 from Basic Bundle section")
    logger.info(f"URL: {test_machine['URL']}")
    
    try:
        price_service = PriceService()
        
        # Extract price with updated bundle-targeting logic
        result = await price_service.update_machine_price(
            machine_id=test_machine['id'],
            url=test_machine['URL'],
            batch_id="test-bundle-extraction"
        )
        
        if result and result.get('new_price'):
            new_price = float(result['new_price'])
            method = result.get('method', 'Unknown')
            
            logger.info(f"🎯 EXTRACTION RESULT:")
            logger.info(f"   Price: ${new_price}")
            logger.info(f"   Method: {method}")
            logger.info(f"   Expected: $2,399 (from Basic Bundle)")
            
            # Check if we got the correct bundle price
            if abs(new_price - 2399.0) < 10:  # Allow small variance
                logger.success(f"✅ SUCCESS: Extracted correct bundle price ${new_price}")
                return True
            elif abs(new_price - 1839.0) < 10:  # Got main product price
                logger.warning(f"⚠️ PARTIAL: Got main product price ${new_price}, need bundle price $2,399")
                return False
            else:
                logger.warning(f"⚠️ UNEXPECTED: Got ${new_price}, expected $2,399 (bundle) or $1,839 (main)")
                return False
        else:
            logger.error(f"❌ FAILED: No price extracted")
            return False
            
    except Exception as e:
        logger.error(f"❌ ERROR: {str(e)}")
        return False

async def main():
    """Main test function."""
    logger.info("🚀 ComMarker B6 30W Bundle Price Fix Test")
    logger.info("=" * 60)
    
    success = await test_commarker_b6_fix()
    
    logger.info("=" * 60)
    if success:
        logger.success("🎉 Test PASSED: Bundle price extraction working")
    else:
        logger.error("💥 Test FAILED: Bundle price extraction needs more work")
    
    return success

if __name__ == "__main__":
    result = asyncio.run(main())
    sys.exit(0 if result else 1)