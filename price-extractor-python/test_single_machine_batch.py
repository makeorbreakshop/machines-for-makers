#!/usr/bin/env python3
"""
Test running a single machine through the actual batch system
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(__file__))

from services.price_service import PriceService
from loguru import logger

async def test_single_machine_batch():
    """Test running ComMarker B6 30W through the actual batch system."""
    
    # Simulate the machine data as it would come from the database
    machine = {
        'id': 'd910f7fc-a8e0-48ad-8a62-78c9e4259b8b',
        'Machine Name': 'ComMarker B6 30W',
        'Price': '2399.0',  # String as from database
        'product_link': 'https://commarker.com/product/commarker-b6'
    }
    
    logger.info("🚀 Single Machine Batch Test - ComMarker B6 30W")
    logger.info(f"Machine: {machine}")
    
    try:
        # Create price service instance
        price_service = PriceService()
        
        # Process single machine using the batch system
        result = await price_service.update_machine_price(
            machine_id=machine['id'],
            machine=machine,
            skip_recently_updated=False  # Force update
        )
        
        if result:
            logger.success(f"✅ SUCCESS: Batch system successfully processed ComMarker B6")
            logger.info(f"Result: {result}")
            return True
        else:
            logger.error("❌ FAILED: Batch system failed to process ComMarker B6")
            return False
            
    except Exception as e:
        logger.error(f"❌ ERROR: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return False

async def main():
    """Main test function."""
    logger.info("🧪 Single Machine Batch Test")
    logger.info("=" * 60)
    
    success = await test_single_machine_batch()
    
    logger.info("=" * 60)
    if success:
        logger.success("🎉 Test PASSED")
    else:
        logger.error("💥 Test FAILED")
    
    return success

if __name__ == "__main__":
    result = asyncio.run(main())
    sys.exit(0 if result else 1)