#!/usr/bin/env python3
"""Test ComMarker B6 30W using the actual production workflow."""

import asyncio
from loguru import logger
from services.price_service import PriceService
from services.database import DatabaseService

async def test_commarker_production():
    """Test ComMarker B6 30W extraction using production workflow."""
    price_service = PriceService()  # PriceService creates its own db_service
    db_service = price_service.db_service
    
    try:
        # Get the ComMarker B6 30W machine from database
        result = db_service.supabase.table('machines') \
            .select('*') \
            .eq('"Machine Name"', 'ComMarker B6 30W') \
            .execute()
        
        if not result.data:
            logger.error("ComMarker B6 30W not found in database")
            return
            
        machine = result.data[0]
        machine_id = machine['id']
        logger.info(f"Found ComMarker B6 30W: ID={machine_id}")
        logger.info(f"Current price: ${machine.get('Price')}")
        logger.info(f"Product link: {machine.get('product_link')}")
        
        # Run the actual price update using Scrapfly
        logger.info("\n=== Running production price extraction ===")
        result = await price_service.update_machine_price(
            machine_id=machine_id,
            use_scrapfly=True  # Use Scrapfly for dynamic scraping
        )
        
        if result['success']:
            logger.success(f"✅ Successfully extracted price: ${result.get('new_price')}")
            logger.info(f"Extraction method: {result.get('extraction_method')}")
        else:
            logger.error(f"❌ Failed to extract price: {result.get('error')}")
            
        # Check price history
        history = db_service.supabase.table('price_history') \
            .select('*') \
            .eq('machine_id', machine_id) \
            .order('created_at', desc=True) \
            .limit(5) \
            .execute()
            
        if history.data:
            logger.info("\n=== Recent price history ===")
            for entry in history.data:
                logger.info(f"- {entry['created_at']}: ${entry.get('price')} (success: {entry.get('success')})")
        
    except Exception as e:
        logger.error(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await db_service.close()

if __name__ == "__main__":
    asyncio.run(test_commarker_production())