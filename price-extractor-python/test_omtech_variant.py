#!/usr/bin/env python3
"""Test script to verify OMTech variant price selection."""

import asyncio
from services.price_service import PriceService
from loguru import logger

async def test_omtech_variant():
    """Test OMTech Pro 2440 price extraction with variant matching."""
    
    # Initialize price service
    price_service = PriceService()
    
    # Test machine ID for OMTech Pro 2440
    machine_id = "bf342168-2b5e-435a-a1df-08099f6200bb"
    
    logger.info("Testing OMTech Pro 2440 price extraction with variant matching...")
    
    # Run price update
    result = await price_service.update_machine_price(
        machine_id=machine_id,
        use_scrapfly=True
    )
    
    logger.info(f"Result: {result}")
    
    if result['success']:
        logger.info(f"✅ Successfully extracted price: ${result['new_price']}")
        logger.info(f"   Method: {result['method']}")
        if 'variant' in result.get('method', ''):
            logger.info("   ✅ Variant matching was applied!")
        else:
            logger.warning("   ⚠️ Variant matching was NOT applied")
    else:
        logger.error(f"❌ Failed to extract price: {result.get('error')}")

if __name__ == "__main__":
    asyncio.run(test_omtech_variant())