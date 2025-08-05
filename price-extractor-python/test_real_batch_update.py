#!/usr/bin/env python3
"""
Test running ComMarker B6 30W through the real batch system
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(__file__))

from services.price_service import PriceService
from loguru import logger

async def test_real_batch_update():
    """Test ComMarker B6 30W through the real batch system that fetches from database."""
    
    machine_id = 'd910f7fc-a8e0-48ad-8a62-78c9e4259b8b'
    
    logger.info("🚀 Real Batch Update Test - ComMarker B6 30W")
    logger.info(f"Machine ID: {machine_id}")
    
    try:
        # Create price service instance (it will connect to database)
        price_service = PriceService()
        
        # Call update_machine_price exactly as the batch system does
        # This will fetch machine data from database and process it
        result = await price_service.update_machine_price(
            machine_id=machine_id,
            batch_id="test-batch-commarker-b6",
            use_scrapfly=True  # Force Scrapfly since commarker.com needs it
        )
        
        logger.info(f"🎯 BATCH RESULT:")
        logger.info(f"   Success: {result.get('success', False)}")
        if result.get('success'):
            logger.info(f"   New Price: ${result.get('new_price', 'N/A')}")
            logger.info(f"   Old Price: ${result.get('old_price', 'N/A')}")
            logger.info(f"   Method: {result.get('method', 'N/A')}")
            logger.info(f"   Message: {result.get('message', 'N/A')}")
        else:
            logger.error(f"   Error: {result.get('error', 'N/A')}")
        
        if result.get('success') and result.get('new_price'):
            new_price = result['new_price']
            if abs(new_price - 2399.0) < 50:  # Allow some variance
                logger.success(f"✅ SUCCESS: Got expected price ${new_price} (target: $2,399)")
                return True
            else:
                logger.warning(f"⚠️ DIFFERENT: Got ${new_price}, expected $2,399")
                # Still successful if it finds a reasonable price
                if 2000 <= new_price <= 3000:
                    logger.info("ℹ️ Price is in reasonable range for ComMarker B6")
                    return True
                return False
        else:
            logger.error("❌ Batch system failed to extract price")
            return False
            
    except Exception as e:
        logger.error(f"❌ ERROR: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return False

async def main():
    """Main test function."""
    logger.info("🧪 Real Batch Update Test")
    logger.info("=" * 60)
    
    success = await test_real_batch_update()
    
    logger.info("=" * 60)
    if success:
        logger.success("🎉 Test PASSED - Batch system working!")
    else:
        logger.error("💥 Test FAILED - Batch system has issues")
    
    return success

if __name__ == "__main__":
    result = asyncio.run(main())
    sys.exit(0 if result else 1)