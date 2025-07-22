#!/usr/bin/env python3
"""Test script to verify ComMarker B6 MOPA price extraction fixes."""

import asyncio
import requests
from loguru import logger
import json

# Set up logging
logger.remove()
logger.add(lambda msg: print(msg), format="{time:HH:mm:ss} | {level:<8} | {message}", level="INFO")

async def test_commarker_extraction(machine_id, expected_price):
    """Test price extraction for a specific machine."""
    try:
        logger.info(f"Testing machine: {machine_id}")
        logger.info(f"Expected price: ${expected_price}")
        
        # Call the API to update price
        response = requests.post(
            "http://localhost:8000/api/v1/update-price",
            json={"machine_id": machine_id}
        )
        
        if response.status_code == 200:
            result = response.json()
            logger.info(f"API Response: {json.dumps(result, indent=2)}")
            
            if result.get("success"):
                new_price = result.get("new_price")
                old_price = result.get("old_price")
                method = result.get("extraction_method")
                
                logger.info(f"✅ Extraction successful!")
                logger.info(f"   Old price: ${old_price}")
                logger.info(f"   New price: ${new_price}")
                logger.info(f"   Method: {method}")
                
                if new_price == expected_price:
                    logger.success(f"✅ CORRECT PRICE EXTRACTED: ${new_price}")
                else:
                    logger.error(f"❌ WRONG PRICE: Got ${new_price}, expected ${expected_price}")
                    
            else:
                logger.error(f"❌ Extraction failed: {result.get('error')}")
        else:
            logger.error(f"❌ API error: {response.status_code} - {response.text}")
            
    except Exception as e:
        logger.error(f"❌ Test failed: {str(e)}")

async def main():
    """Run tests for ComMarker machines."""
    logger.info("=" * 60)
    logger.info("ComMarker B6 MOPA Price Extraction Test")
    logger.info("=" * 60)
    
    # Test cases with actual machine IDs
    test_cases = [
        {
            "name": "ComMarker B6 MOPA 60W",
            "machine_id": "d94ed1c2-9dba-47e4-9600-5af55564afaa",
            "expected_price": 4589.0
        },
        {
            "name": "ComMarker B6 MOPA 30W", 
            "machine_id": "7520f7f7-8ba9-4b77-b5ae-f5480f943b6c",
            "expected_price": 3569.0
        }
    ]
    
    logger.info("IMPORTANT: Make sure the price extractor service is running on port 8000")
    logger.info("Run with: cd price-extractor-python && python main.py")
    logger.info("")
    
    # Wait for user confirmation
    input("Press Enter to start tests...")
    
    for test in test_cases:
        logger.info("")
        logger.info(f"Testing: {test['name']}")
        logger.info("-" * 40)
        await test_commarker_extraction(test['machine_id'], test['expected_price'])
        
        # Wait between tests
        await asyncio.sleep(2)
    
    logger.info("")
    logger.info("=" * 60)
    logger.info("Test complete!")

if __name__ == "__main__":
    asyncio.run(main())