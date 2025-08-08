#!/usr/bin/env python3
"""Test rate limiting fixes for Scrapfly integration."""

import asyncio
from services.price_service import PriceService
from loguru import logger

async def test_rate_limit_fix():
    """Test with a small batch to verify rate limiting works."""
    
    # Initialize price service
    price_service = PriceService()
    
    # Test with just 5 machines to see if rate limiting prevents 429 errors
    machine_ids = [
        "bf342168-2b5e-435a-a1df-08099f6200bb",  # OMTech Pro 2440
        "df5a4c67-34a7-464e-8ac5-f72de088f6d5",  # Another machine
        "8322e4f5-0bae-45a9-98f0-5f1c94cb0d1f",  # Another machine
    ]
    
    logger.info("Testing rate limit fixes with 3 machines...")
    
    # Run batch update with reduced workers
    result = await price_service.batch_update_machines(
        machine_ids=machine_ids,
        max_workers=2,  # Use only 2 workers
        use_scrapfly=True
    )
    
    logger.info(f"Batch result: {result}")
    
    if result['success']:
        logger.info(f"✅ Batch completed successfully!")
        logger.info(f"   Total: {result['results']['total']}")
        logger.info(f"   Successful: {result['results']['successful']}")
        logger.info(f"   Failed: {result['results']['failed']}")
        if result['results']['failures']:
            logger.warning("Failures:")
            for failure in result['results']['failures']:
                logger.warning(f"   - {failure}")
    else:
        logger.error(f"❌ Batch failed: {result.get('error')}")

if __name__ == "__main__":
    asyncio.run(test_rate_limit_fix())