#!/usr/bin/env python
"""
Script to update a machine's price from the command line.

Usage:
  python update_price.py <machine_id>
"""

import sys
import asyncio
from loguru import logger
import os

from services.price_service import PriceService
from config import validate_config

async def update_machine_price(machine_id):
    """
    Update the price for a specific machine.
    
    Args:
        machine_id (str): The ID of the machine to update.
    """
    # Ensure config is valid
    if not validate_config():
        logger.error("Configuration validation failed. Exiting.")
        sys.exit(1)
    
    # Initialize price service
    price_service = PriceService()
    
    # Update the price
    logger.info(f"Updating price for machine {machine_id}")
    result = await price_service.update_machine_price(machine_id)
    
    # Print the result
    if result["success"]:
        if "message" in result and result["message"] == "Price unchanged":
            logger.info(f"Price unchanged for machine {machine_id}: {result['new_price']}")
            print(f"Price unchanged: {result['new_price']}")
        else:
            logger.info(f"Successfully updated price for machine {machine_id}")
            print(f"Price updated from {result['old_price']} to {result['new_price']} using {result['method']}")
            if result.get('price_change') is not None:
                print(f"Price change: {result['price_change']}")
            if result.get('percentage_change') is not None:
                print(f"Percentage change: {result['percentage_change']:.2f}%")
    else:
        logger.error(f"Failed to update price for machine {machine_id}: {result.get('error')}")
        print(f"Error: {result.get('error', 'Unknown error')}")
        sys.exit(1)

if __name__ == "__main__":
    # Ensure logs directory exists
    os.makedirs("logs", exist_ok=True)
    
    # Check if machine ID is provided
    if len(sys.argv) < 2:
        print("Error: Missing machine ID")
        print(f"Usage: python {sys.argv[0]} <machine_id>")
        sys.exit(1)
    
    # Get machine ID from command line
    machine_id = sys.argv[1]
    
    # Run the update
    asyncio.run(update_machine_price(machine_id)) 