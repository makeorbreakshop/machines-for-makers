#!/usr/bin/env python
"""
Script to perform a batch update of machine prices from the command line.

Usage:
  python batch_update.py [days_threshold] [--dry-run]
  
The days_threshold argument is optional and defaults to 7.
The --dry-run flag is optional. When included, prices will be extracted 
but not saved to the database.
"""

import sys
import asyncio
from loguru import logger
import os
import json
import argparse
from datetime import datetime

from services.price_service import PriceService
from config import validate_config

async def batch_update_prices(days_threshold=7, dry_run=False, output_file=None):
    """
    Update prices for machines that have not been updated in the last 'days_threshold' days.
    
    Args:
        days_threshold (int): Number of days since last update to consider a machine for update.
        dry_run (bool): If True, don't save to database, just log results.
        output_file (str): Optional file to write extraction results to (JSON format).
    """
    # Ensure config is valid
    if not validate_config():
        logger.error("Configuration validation failed. Exiting.")
        sys.exit(1)
    
    # Initialize price service
    price_service = PriceService()
    
    # Perform batch update
    if dry_run:
        logger.info(f"Starting DRY RUN batch update with threshold of {days_threshold} days")
        print(f"DRY RUN: Starting batch update for machines not updated in the last {days_threshold} days...")
        print(f"Prices will be extracted but NOT saved to the database.")
    else:
        logger.info(f"Starting batch update with threshold of {days_threshold} days")
        print(f"Starting batch update for machines not updated in the last {days_threshold} days...")
    
    # Add dry_run parameter to batch_update_machines
    result = await price_service.batch_update_machines(days_threshold, dry_run=dry_run)
    
    # Generate output file if specified
    if dry_run and output_file:
        try:
            # Create output directory if it doesn't exist
            output_dir = os.path.dirname(output_file)
            if output_dir:
                os.makedirs(output_dir, exist_ok=True)
                
            # Write the extraction results to a JSON file
            with open(output_file, 'w') as f:
                json.dump(result, f, indent=2)
            print(f"Extraction results written to {output_file}")
        except Exception as e:
            logger.error(f"Error writing output file: {str(e)}")
    
    # Print the result summary
    if result["success"]:
        if "results" in result:
            results = result["results"]
            total = results.get("total", 0)
            successful = results.get("successful", 0)
            failed = results.get("failed", 0)
            unchanged = results.get("unchanged", 0)
            updated = results.get("updated", 0)
            
            if dry_run:
                print("\nDRY RUN batch update completed!")
            else:
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
                    
            # Additional details for dry run
            if dry_run and "extractions" in results:
                print("\nDetailed extraction results:")
                for extract in results["extractions"]:
                    machine_id = extract.get("machine_id", "unknown")
                    variant = extract.get("variant_attribute", "DEFAULT")
                    new_price = extract.get("new_price", "N/A")
                    old_price = extract.get("old_price", "N/A")
                    method = extract.get("method", "unknown")
                    
                    print(f"  - {machine_id} ({variant}): {old_price} → {new_price} via {method}")
        else:
            print(f"Batch update completed: {result.get('message', 'No details available')}")
    else:
        logger.error(f"Batch update failed: {result.get('error')}")
        print(f"Error: {result.get('error', 'Unknown error')}")
        sys.exit(1)

if __name__ == "__main__":
    # Set up command line argument parsing
    parser = argparse.ArgumentParser(description='Batch update machine prices')
    parser.add_argument('days_threshold', nargs='?', type=int, default=7, 
                        help='Number of days threshold for updates (default: 7)')
    parser.add_argument('--dry-run', action='store_true', 
                        help='Extract prices without saving to database')
    parser.add_argument('--output', type=str,
                        help='Output file for extraction results (JSON format)')
    
    args = parser.parse_args()
    
    # Ensure logs directory exists
    os.makedirs("logs", exist_ok=True)
    
    # Generate default output filename if dry-run enabled and no output file specified
    output_file = args.output
    if args.dry_run and not output_file:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = f"logs/dry_run_results_{timestamp}.json"
    
    # Run the batch update
    asyncio.run(batch_update_prices(args.days_threshold, args.dry_run, output_file)) 