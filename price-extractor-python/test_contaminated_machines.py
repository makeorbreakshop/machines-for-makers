#!/usr/bin/env python3
"""
Test script to verify browser pool fixes contaminated machine extraction.
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from loguru import logger
from services.price_service import PriceService
from services.database import DatabaseService

# Configure logging
logger.remove()
logger.add(sys.stdout, level="INFO", format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | {message}")

async def test_contaminated_machines():
    """Test the machines that were manually corrected (contaminated)."""
    
    logger.info("=== TESTING CONTAMINATED MACHINES ===")
    
    # These are the machines we cleaned up
    contaminated_machines = [
        'ComMarker B6 20W',
        'ComMarker B6 MOPA 60W', 
        'ComMarker B6 MOPA 30W',
        'ComMarker B4 20W',
        'xTool S1',
        'ComMarker B4 100W MOPA',
        'EMP ST50R',
        'ComMarker B6 MOPA 20W'
    ]
    
    # Get machine data from database
    db_service = DatabaseService()
    price_service = PriceService()
    
    # Get all machines matching our names
    machines = []
    for machine_name in contaminated_machines:
        try:
            response = db_service.supabase.table("machines").select("*").eq("Machine Name", machine_name).execute()
            if response.data:
                machines.extend(response.data)
            else:
                logger.warning(f"Machine not found: {machine_name}")
        except Exception as e:
            logger.error(f"Error fetching {machine_name}: {str(e)}")
    
    logger.info(f"Found {len(machines)} machines to test")
    
    # Test each machine
    results = []
    for machine in machines:
        machine_id = machine.get('id')
        machine_name = machine.get('Machine Name')
        old_price = machine.get('Price')
        
        logger.info(f"\n🎯 Testing: {machine_name} (Current price: ${old_price})")
        
        try:
            # Use the actual price service method
            result = await price_service.update_machine_price(machine_id)
            
            # Analyze result
            if result.get("success"):
                new_price = result.get("new_price")
                method = result.get("method", "unknown")
                
                if result.get("requires_approval"):
                    logger.info(f"✅ EXTRACTION SUCCESS: {machine_name} - ${new_price} (needs approval)")
                    logger.info(f"   Method: {method}")
                    logger.info(f"   Reason: {result.get('approval_reason', 'Unknown')}")
                else:
                    logger.info(f"✅ EXTRACTION SUCCESS: {machine_name} - ${new_price} (auto-approved)")
                    logger.info(f"   Method: {method}")
                
                results.append({
                    "machine_name": machine_name,
                    "success": True,
                    "old_price": old_price,
                    "new_price": new_price,
                    "method": method,
                    "requires_approval": result.get("requires_approval", False)
                })
            else:
                error = result.get("error", "Unknown error")
                logger.error(f"❌ EXTRACTION FAILED: {machine_name} - {error}")
                results.append({
                    "machine_name": machine_name,
                    "success": False,
                    "error": error
                })
                
        except Exception as e:
            logger.error(f"❌ EXCEPTION: {machine_name} - {str(e)}")
            results.append({
                "machine_name": machine_name,
                "success": False,
                "error": str(e)
            })
    
    # Summary
    successful = sum(1 for r in results if r.get("success"))
    failed = len(results) - successful
    
    logger.info(f"\n🎯 FINAL RESULTS: {successful}/{len(results)} successful")
    
    # Details
    logger.info("\n📊 DETAILED RESULTS:")
    for result in results:
        if result.get("success"):
            approval_status = "NEEDS APPROVAL" if result.get("requires_approval") else "AUTO-APPROVED"
            logger.info(f"  ✅ {result['machine_name']}: ${result['old_price']} → ${result['new_price']} ({approval_status})")
            logger.info(f"     Method: {result['method']}")
        else:
            logger.info(f"  ❌ {result['machine_name']}: {result['error']}")
    
    # Cleanup browser pool
    from scrapers.browser_pool import cleanup_browser_pool
    await cleanup_browser_pool()
    
    return successful > 0

if __name__ == "__main__":
    success = asyncio.run(test_contaminated_machines())
    if success:
        logger.info("🎉 CONTAMINATED MACHINES TEST PASSED!")
        sys.exit(0)
    else:
        logger.error("💥 CONTAMINATED MACHINES TEST FAILED!")
        sys.exit(1)