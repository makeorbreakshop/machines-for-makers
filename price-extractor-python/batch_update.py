#!/usr/bin/env python
"""
Script to perform a batch update of machine prices from the command line.

Usage:
  python batch_update.py [days_threshold]
  
The days_threshold argument is optional and defaults to 7.
"""

import sys
import asyncio
from loguru import logger
import os

from services.price_service import PriceService
from config import validate_config

async def batch_update_prices(days_threshold=7):
    """
    Update prices for machines that have not been updated in the last 'days_threshold' days.
    
    Args:
        days_threshold (int): Number of days since last update to consider a machine for update.
    """
    # Ensure config is valid
    if not validate_config():
        logger.error("Configuration validation failed. Exiting.")
        sys.exit(1)
    
    # Initialize price service
    price_service = PriceService()
    
    # Perform batch update
    logger.info(f"Starting batch update with threshold of {days_threshold} days")
    print(f"Starting batch update for machines not updated in the last {days_threshold} days...")
    
    result = await price_service.batch_update_machines(days_threshold)
    
    # Print the result summary
    if result["success"]:
        if "results" in result:
            results = result["results"]
            total = results.get("total", 0)
            successful = results.get("successful", 0)
            failed = results.get("failed", 0)
            unchanged = results.get("unchanged", 0)
            updated = results.get("updated", 0)
            
            print("\nBatch update completed!")
            print(f"Total machines processed: {total}")
            print(f"Successfully processed: {successful}")
            print(f"  - Prices unchanged: {unchanged}")
            print(f"  - Prices updated: {updated}")
            print(f"Failed: {failed}")
            
            if failed > 0 and "failures" in results:
                print("\nFailed machines:")
                for failure in results["failures"]:
                    print(f"  - Machine {failure['machine_id']}: {failure.get('error', 'Unknown error')}")
        else:
            print(f"Batch update completed: {result.get('message', 'No details available')}")
    else:
        logger.error(f"Batch update failed: {result.get('error')}")
        print(f"Error: {result.get('error', 'Unknown error')}")
        sys.exit(1)

if __name__ == "__main__":
    # Ensure logs directory exists
    os.makedirs("logs", exist_ok=True)
    
    # Get days threshold from command line if provided
    days_threshold = 7  # Default value
    if len(sys.argv) > 1:
        try:
            days_threshold = int(sys.argv[1])
            if days_threshold < 1:
                print("Error: days_threshold must be a positive integer")
                sys.exit(1)
        except ValueError:
            print(f"Error: Invalid days threshold '{sys.argv[1]}'. Must be an integer.")
            print(f"Usage: python {sys.argv[0]} [days_threshold]")
            sys.exit(1)
    
    # Run the batch update
    asyncio.run(batch_update_prices(days_threshold)) 