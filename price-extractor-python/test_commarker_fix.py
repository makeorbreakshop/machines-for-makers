#!/usr/bin/env python3
"""
Focused test for ComMarker MCP automation fix.
Tests that we're extracting correct prices, not $50.
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from loguru import logger
from scrapers.claude_mcp_client import extract_price_with_claude_mcp

# Configure logging
logger.remove()
logger.add(sys.stdout, level="INFO", format="{time:HH:mm:ss} | {level} | {message}")

# ComMarker test cases
COMMARKER_TEST_CASES = [
    {
        "name": "ComMarker B4 30W",
        "url": "https://www.commarker.com/products/commarker-b4-fiber-laser-engraver",
        "expected_price": 1799.0,
        "variant": "30W"
    },
    {
        "name": "ComMarker B6 30W",
        "url": "https://www.commarker.com/products/b6-enclosed-fiber-laser-engraver",
        "expected_price": 2399.0,
        "variant": "30W"
    },
    {
        "name": "ComMarker B6 MOPA 30W",
        "url": "https://www.commarker.com/products/b6-mopa-fiber-laser-engraver",
        "expected_price": 3569.0,
        "variant": "30W"
    }
]


async def test_commarker_machine(test_case):
    """Test a single ComMarker machine."""
    logger.info(f"\n{'='*60}")
    logger.info(f"Testing: {test_case['name']}")
    logger.info(f"URL: {test_case['url']}")
    logger.info(f"Expected: ${test_case['expected_price']}")
    logger.info(f"Variant: {test_case['variant']}")
    
    try:
        # Extract price using MCP automation
        price, method = await extract_price_with_claude_mcp(
            test_case['url'], 
            test_case['name'],
            None,  # old_price
            {}  # Empty machine data
        )
        
        if price is None:
            logger.error(f"❌ FAILED: No price extracted")
            return False, None
        elif price == 50:
            logger.error(f"❌ FAILED: Got the $50 bug! Price extraction returned $50")
            return False, price
        elif abs(price - test_case['expected_price']) < 1:
            logger.success(f"✅ SUCCESS: Extracted ${price} (expected ${test_case['expected_price']})")
            return True, price
        else:
            logger.error(f"❌ FAILED: Wrong price - got ${price}, expected ${test_case['expected_price']}")
            return False, price
            
    except Exception as e:
        logger.error(f"❌ ERROR: {str(e)}")
        return False, None


async def main():
    """Run ComMarker tests."""
    logger.info("COMMARKER MCP AUTOMATION FIX TEST")
    logger.info("Testing that ComMarker machines extract correct prices, not $50")
    
    results = []
    
    for test_case in COMMARKER_TEST_CASES:
        success, price = await test_commarker_machine(test_case)
        results.append({
            "machine": test_case["name"],
            "success": success,
            "extracted_price": price,
            "expected_price": test_case["expected_price"]
        })
        
        # Brief pause between tests
        await asyncio.sleep(2)
    
    # Summary
    logger.info(f"\n{'='*60}")
    logger.info("TEST SUMMARY")
    logger.info(f"{'='*60}")
    
    passed = sum(1 for r in results if r["success"])
    total = len(results)
    
    logger.info(f"Total: {total}")
    logger.info(f"Passed: {passed}")
    logger.info(f"Failed: {total - passed}")
    
    # Check for $50 bug
    fifty_dollar_count = sum(1 for r in results if r["extracted_price"] == 50)
    if fifty_dollar_count > 0:
        logger.error(f"⚠️  $50 BUG DETECTED: {fifty_dollar_count} machines returned $50!")
    
    logger.info("\nDetailed Results:")
    for result in results:
        status = "✅" if result["success"] else "❌"
        logger.info(f"{status} {result['machine']}: ${result['extracted_price']} (expected ${result['expected_price']})")


if __name__ == "__main__":
    asyncio.run(main())