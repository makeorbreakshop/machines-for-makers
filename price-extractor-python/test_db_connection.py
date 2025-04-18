#!/usr/bin/env python
"""
Script to test Supabase database connection and machine retrieval.
Run with: python test_db_connection.py
"""

import asyncio
import uuid
from loguru import logger

from services.database import DatabaseService

async def test_db_connection():
    """Test the database connection and machine retrieval."""
    db = DatabaseService()
    logger.info("Testing database connection with machine ID...")
    
    # The machine ID that's failing
    test_id = "af474938-178d-4797-ac32-4426e73e43b2"
    
    # Test direct retrieval
    logger.info(f"Testing direct retrieval with ID: {test_id}")
    machine = await db.get_machine_by_id(test_id)
    if machine:
        logger.info(f"✅ Success! Found machine: {machine.get('Machine Name')}")
        logger.info(f"  - Database ID format: {machine.get('id')}")
        logger.info(f"  - ID type: {type(machine.get('id'))}")
        logger.info(f"  - Are IDs equal? {test_id == machine.get('id')}")
        
        # Test actual update function with debug
        logger.info("Testing update with found machine ID...")
        try:
            # Just change price to itself to avoid actual data changes
            current_price = machine.get('Price')
            update_result = await db.update_machine_price(test_id, current_price)
            logger.info(f"Update result: {update_result}")
        except Exception as e:
            logger.error(f"Error during update test: {str(e)}")
    else:
        logger.error(f"❌ Failed to find machine with ID: {test_id}")
    
    # Test with UUID conversion
    logger.info("Testing with explicit UUID conversion...")
    try:
        uuid_obj = uuid.UUID(test_id)
        uuid_str = str(uuid_obj)
        logger.info(f"Converted to UUID: {uuid_str}")
        
        # Try direct query with UUID string
        response = db.supabase.table("machines") \
            .select("*") \
            .eq("id", uuid_str) \
            .single() \
            .execute()
            
        if response.data:
            logger.info(f"✅ Success with UUID conversion! Found: {response.data.get('Machine Name')}")
        else:
            logger.error("❌ Failed with UUID conversion")
    except Exception as e:
        logger.error(f"Error during UUID test: {str(e)}")
    
    # Test raw SQL query as a last resort
    logger.info("Testing with raw SQL query...")
    try:
        response = db.supabase.table("machines") \
            .select("*") \
            .limit(10) \
            .execute()
        
        # Show the first few records
        logger.info("First few machines in database:")
        for i, machine in enumerate(response.data[:3]):
            logger.info(f"  {i+1}. {machine.get('Machine Name')} - ID: {machine.get('id')} (Type: {type(machine.get('id'))})")
        
        # Manually find the machine in results
        found = False
        for machine in response.data:
            if machine.get("id") == test_id:
                logger.info(f"✅ Found machine in full results: {machine.get('Machine Name')}")
                found = True
                break
        
        if not found:
            logger.error("❌ Machine not found in full results")
    except Exception as e:
        logger.error(f"Error during raw query test: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_db_connection()) 