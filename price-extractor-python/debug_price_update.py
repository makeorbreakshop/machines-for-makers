#!/usr/bin/env python
"""
Script to debug and verify price update process with enhanced field population.

This script runs a test price update and displays detailed information
about the fields being populated in price_history.

Usage:
  python debug_price_update.py <machine_id>
"""

import sys
import asyncio
import json
from loguru import logger
import os
from pprint import pprint
from decimal import Decimal

# Set up logger to show debug information
logger.remove()
logger.add(sys.stderr, level="DEBUG")
logger.add("debug.log", level="DEBUG", rotation="10 MB")

# Import our price service
from services.price_service import PriceService
from services.database_service import DatabaseService
from utils.dom_analyzer import DOMAnalyzer
from config import validate_config

async def debug_price_update(machine_id):
    """
    Run a debug price update with detailed logging.
    
    Args:
        machine_id (str): The ID of the machine to update
    """
    logger.info("Starting price update debugging session")
    
    # Ensure config is valid
    if not validate_config():
        logger.error("Configuration validation failed. Exiting.")
        sys.exit(1)
    
    # Initialize services
    price_service = PriceService()
    db_service = DatabaseService()
    dom_analyzer = DOMAnalyzer()
    
    # Get machine info
    machine = await db_service.get_machine_by_id(machine_id)
    if not machine:
        logger.error(f"Machine {machine_id} not found in database")
        sys.exit(1)
    
    logger.info(f"Machine: {machine.get('Machine Name')} (ID: {machine_id})")
    logger.info(f"Current price: {machine.get('Price')}")
    logger.info(f"URL: {machine.get('product_link')}")
    
    # Run the price update with debug options
    # We'll save to DB but enable flags for review to check that behavior
    result = await price_service.update_machine_price(
        machine_id=machine_id,
        flags_for_review=True,
        save_to_db=True
    )
    
    # Check the result
    if result["success"]:
        logger.info("Price update successful!")
        logger.info(f"Old price: {result['old_price']}")
        logger.info(f"New price: {result['new_price']}")
        logger.info(f"Method: {result['method']}")
        
        if result.get("needs_review"):
            logger.warning(f"Price flagged for review: {result.get('review_reason')}")
        
        # Get the price history records for this machine
        history = await db_service.get_price_history_for_machine(machine_id)
        
        if history and len(history) > 0:
            # Get the latest record
            latest = history[0]
            
            # Display the detailed fields we're interested in
            logger.info("\nPrice history record field details:")
            logger.info("======================================")
            
            fields_to_check = [
                "dom_elements_analyzed", 
                "price_location_in_dom",
                "structured_data_type",
                "selectors_tried",
                "validation_steps",
                "raw_price_text",
                "cleaned_price_string",
                "validation_basis_price",
                "extraction_duration_seconds",
                "company",
                "category",
                "validation_confidence",
                "extracted_confidence",
                "tier",
                "status",
                "review_reason"
            ]
            
            # Display field values
            for field in fields_to_check:
                value = latest.get(field)
                if value is not None:
                    if isinstance(value, (dict, list)) and field in ["selectors_tried", "validation_steps"]:
                        logger.info(f"{field}: {json.dumps(value, indent=2)}")
                    else:
                        logger.info(f"{field}: {value}")
                else:
                    logger.warning(f"{field}: <NOT SET>")
            
            # Check for missing fields from PRD section 3.1.1
            logger.info("\nChecking for all required fields from PRD section 3.1.1:")
            prd_fields = [
                "id", "machine_id", "variant_attribute", "date", "status", 
                "price", "currency", "batch_id", "scraped_from_url", "original_url",
                "html_size", "http_status", "tier", "extraction_method",
                "extracted_confidence", "validation_confidence", "structured_data_type",
                "fallback_to_claude", "validation_basis_price", "raw_price_text",
                "cleaned_price_string", "parsed_currency_from_text", "failure_reason",
                "review_reason", "extraction_duration_seconds", "retry_count",
                "dom_elements_analyzed", "price_location_in_dom", "extraction_attempts",
                "selectors_tried", "request_headers", "response_headers",
                "validation_steps", "company", "category", "reviewed_by", 
                "reviewed_at", "original_record_id"
            ]
            
            missing_fields = []
            for field in prd_fields:
                if field not in latest or latest.get(field) is None:
                    missing_fields.append(field)
            
            if missing_fields:
                logger.warning(f"Missing fields: {', '.join(missing_fields)}")
            else:
                logger.info("All fields from PRD are present in the record!")
            
            # Final check on machines_latest
            latest_record = await db_service.get_machine_latest_price(machine_id)
            if latest_record:
                logger.info("\nMachines Latest Record:")
                logger.info(f"latest_price_history_id: {latest_record.get('latest_price_history_id')}")
                logger.info(f"latest_successful_price_history_id: {latest_record.get('latest_successful_price_history_id')}")
                logger.info(f"manual_review_flag: {latest_record.get('manual_review_flag')}")
                logger.info(f"flag_reason: {latest_record.get('flag_reason')}")
            else:
                logger.error("No machines_latest record found!")
    else:
        logger.error(f"Price update failed: {result.get('error')}")
        logger.debug(f"Debug info: {result.get('debug')}")

async def test_manual_price_update(machine_id):
    """Test the manual price confirmation path."""
    logger.info("Testing manual price confirmation")
    
    price_service = PriceService()
    
    # Set a test price that's 10% higher than current
    machine = await price_service.db_service.get_machine_by_id(machine_id)
    current_price = machine.get("Price", 0)
    new_price = Decimal(current_price) * Decimal('1.1')
    
    logger.info(f"Current price: {current_price}")
    logger.info(f"Test new price: {new_price}")
    
    # Save the manual price
    result = await price_service.save_machine_price(
        machine_id=machine_id,
        new_price=new_price
    )
    
    if result["success"]:
        logger.info("Manual price update successful!")
        logger.info(f"Old price: {result['old_price']}")
        logger.info(f"New price: {result['new_price']}")
    else:
        logger.error(f"Manual price update failed: {result.get('error')}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python debug_price_update.py <machine_id>")
        sys.exit(1)
    
    machine_id = sys.argv[1]
    
    # Run both test functions
    asyncio.run(debug_price_update(machine_id))
    # Uncomment to test manual updates too
    # asyncio.run(test_manual_price_update(machine_id)) 