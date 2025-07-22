#!/usr/bin/env python3
"""
Fix the xTool S1 URL from the 404 path to the correct working path.
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from loguru import logger
from services.database import DatabaseService

# Configure logging
logger.remove()
logger.add(sys.stdout, level="INFO", format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | {message}")

async def fix_xtool_s1_url():
    """Fix the xTool S1 URL to the correct working path."""
    
    logger.info("=== FIXING xTool S1 URL ===")
    
    db_service = DatabaseService()
    
    # Get the current machine data
    machine_id = "0f5f7679-e975-4286-b655-9799e24931b9"
    machine = await db_service.get_machine_by_id(machine_id)
    
    if not machine:
        logger.error(f"Machine {machine_id} not found")
        return False
    
    current_url = machine.get("product_link")
    logger.info(f"Current URL: {current_url}")
    
    # Update to correct URL
    correct_url = "https://www.xtool.com/products/xtool-s1"
    
    if current_url == correct_url:
        logger.info("URL is already correct!")
        return True
    
    try:
        # Update the machine's product_link
        response = db_service.supabase.table("machines").update({
            "product_link": correct_url
        }).eq("id", machine_id).execute()
        
        if response.data:
            logger.info(f"✅ Successfully updated xTool S1 URL to: {correct_url}")
            return True
        else:
            logger.error("❌ Failed to update URL - no response data")
            return False
            
    except Exception as e:
        logger.error(f"❌ Error updating URL: {str(e)}")
        return False

if __name__ == "__main__":
    success = asyncio.run(fix_xtool_s1_url())
    if success:
        logger.info("🎉 xTool S1 URL FIX COMPLETED!")
        sys.exit(0)
    else:
        logger.error("💥 xTool S1 URL FIX FAILED!")
        sys.exit(1)