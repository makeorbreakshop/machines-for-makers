#!/usr/bin/env python
"""
Script to update machine html_timestamp fields to match backfilled price history dates.

Usage:
  python update_machine_timestamps.py
"""

import asyncio
from loguru import logger
import os
from datetime import datetime, timedelta
from typing import List, Dict, Any

from services.database import DatabaseService
from config import validate_config, MACHINES_TABLE, PRICE_HISTORY_TABLE

# Set to 7 days ago to match the backfill
DAYS_AGO = 7

async def update_machine_timestamps():
    """Update html_timestamp in the machines table to match backfilled price history dates."""
    logger.info("Starting machine timestamp update")
    
    # Ensure config is valid
    if not validate_config():
        logger.error("Configuration validation failed. Exiting.")
        return
    
    # Initialize database service
    db_service = DatabaseService()
    
    try:
        # Find all machines with product links
        machines_response = db_service.supabase.table(MACHINES_TABLE) \
            .select("id, \"Machine Name\", product_link, html_timestamp") \
            .not_.is_("product_link", "null") \
            .execute()
        
        if not machines_response.data or len(machines_response.data) == 0:
            logger.warning("No machines with product links found")
            return
        
        logger.info(f"Found {len(machines_response.data)} machines with product links")
        
        # Calculate the new timestamp (7 days ago)
        backfill_timestamp = (datetime.utcnow() - timedelta(days=DAYS_AGO)).isoformat()
        
        # Update each machine
        updated_count = 0
        for machine in machines_response.data:
            machine_id = machine.get("id")
            machine_name = machine.get("Machine Name", "Unknown")
            
            if not machine_id:
                logger.warning(f"Machine {machine_name} has no ID, skipping")
                continue
            
            # Update the html_timestamp to 7 days ago
            update_response = db_service.supabase.table(MACHINES_TABLE) \
                .update({"html_timestamp": backfill_timestamp}) \
                .eq("id", machine_id) \
                .execute()
            
            if update_response.data and len(update_response.data) > 0:
                updated_count += 1
                logger.info(f"Updated timestamp for {machine_name} (ID: {machine_id})")
            else:
                logger.warning(f"Failed to update timestamp for {machine_name} (ID: {machine_id})")
        
        logger.info(f"Successfully updated {updated_count} of {len(machines_response.data)} machines")
        logger.info(f"All machine timestamps have been set to {backfill_timestamp} (7 days ago)")
        logger.info("Batch updates with days_threshold > 0 should now work correctly")
    
    except Exception as e:
        logger.error(f"Error updating machine timestamps: {str(e)}")

if __name__ == "__main__":
    # Ensure logs directory exists
    os.makedirs("logs", exist_ok=True)
    
    # Run the update
    asyncio.run(update_machine_timestamps()) 