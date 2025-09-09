#!/usr/bin/env python3
"""
Script to fix all is_all_time_low and is_all_time_high flags in the price_history table.
This recalculates the flags based on actual historical price data.
"""

import os
import sys
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv
from loguru import logger

# Load environment variables
load_dotenv()

# Initialize Supabase client
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

if not url or not key:
    logger.error("SUPABASE_URL and SUPABASE_KEY environment variables are required")
    logger.info("Please check your .env file in the price-extractor-python directory")
    sys.exit(1)

supabase: Client = create_client(url, key)

def fix_all_time_flags():
    """Fix all is_all_time_low and is_all_time_high flags in price_history table."""
    
    logger.info("Starting to fix all-time low/high flags...")
    
    try:
        # First, reset all flags to false
        logger.info("Resetting all flags to false...")
        reset_response = supabase.table("price_history") \
            .update({"is_all_time_low": False, "is_all_time_high": False}) \
            .neq("id", "00000000-0000-0000-0000-000000000000") \
            .execute()
        
        logger.info(f"Reset {len(reset_response.data) if reset_response.data else 0} records")
        
        # Get all unique machines that have price history
        machines_response = supabase.table("price_history") \
            .select("machine_id") \
            .execute()
        
        if not machines_response.data:
            logger.warning("No price history records found")
            return
        
        # Get unique machine IDs
        machine_ids = list(set(record["machine_id"] for record in machines_response.data))
        logger.info(f"Found {len(machine_ids)} machines with price history")
        
        # Process each machine
        fixed_count = 0
        for i, machine_id in enumerate(machine_ids, 1):
            if i % 10 == 0:
                logger.info(f"Processing machine {i}/{len(machine_ids)}...")
            
            # Get all valid price records for this machine
            history_response = supabase.table("price_history") \
                .select("id, price, date") \
                .eq("machine_id", machine_id) \
                .in_("status", ["AUTO_APPLIED", "APPROVED", "SUCCESS", "MANUAL_CORRECTION"]) \
                .order("date", desc=False) \
                .execute()
            
            if not history_response.data:
                continue
            
            # Extract valid prices with their IDs
            price_records = [
                {"id": record["id"], "price": float(record["price"]), "date": record["date"]}
                for record in history_response.data
                if record["price"] is not None
            ]
            
            if not price_records:
                continue
            
            # Find min and max prices
            prices = [r["price"] for r in price_records]
            min_price = min(prices)
            max_price = max(prices)
            
            # Mark all records that match the min price as all-time low
            low_ids = [r["id"] for r in price_records if abs(r["price"] - min_price) < 0.01]
            if low_ids:
                for record_id in low_ids:
                    try:
                        supabase.table("price_history") \
                            .update({"is_all_time_low": True}) \
                            .eq("id", record_id) \
                            .execute()
                        fixed_count += 1
                    except Exception as e:
                        logger.error(f"Failed to update low flag for record {record_id}: {e}")
            
            # Mark all records that match the max price as all-time high
            high_ids = [r["id"] for r in price_records if abs(r["price"] - max_price) < 0.01]
            if high_ids:
                for record_id in high_ids:
                    try:
                        supabase.table("price_history") \
                            .update({"is_all_time_high": True}) \
                            .eq("id", record_id) \
                            .execute()
                        fixed_count += 1
                    except Exception as e:
                        logger.error(f"Failed to update high flag for record {record_id}: {e}")
            
            # Log progress for this machine
            logger.debug(f"Machine {machine_id}: {len(low_ids)} lows, {len(high_ids)} highs "
                        f"(min: ${min_price:.2f}, max: ${max_price:.2f})")
        
        logger.success(f"✅ Fixed {fixed_count} all-time low/high flags across {len(machine_ids)} machines")
        
    except Exception as e:
        logger.error(f"Error fixing all-time flags: {e}")
        sys.exit(1)

if __name__ == "__main__":
    fix_all_time_flags()