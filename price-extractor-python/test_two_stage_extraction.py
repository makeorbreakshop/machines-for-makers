#!/usr/bin/env python
"""
Script to test the two-stage price extraction approach.

Usage:
  python test_two_stage_extraction.py <url> [--category CATEGORY] [--previous-price PRICE] [--machine-id MACHINE_ID]
"""

import sys
import os
import argparse
from loguru import logger
import json
from datetime import datetime
import requests
from bs4 import BeautifulSoup
import time

from config import validate_config
from scrapers.web_scraper import WebScraper
from scrapers.price_extractor import PriceExtractor
from utils.price_validator import PriceValidator
from services.database_service import DatabaseService

def setup_argparse():
    """Set up command line argument parsing."""
    parser = argparse.ArgumentParser(description='Test the two-stage price extraction on a URL')
    parser.add_argument('url', help='URL of the product page to extract price from')
    parser.add_argument('--category', help='Product category for price validation', default=None)
    parser.add_argument('--previous-price', type=float, help='Previous known price for change validation', default=None)
    parser.add_argument('--force-claude', action='store_true', help='Force using Claude for extraction')
    parser.add_argument('--debug', action='store_true', help='Enable debug output')
    parser.add_argument('--machine-id', help='Machine ID for database lookup of product specs')
    return parser.parse_args()

def setup_logging(debug=False):
    """Set up logging configuration."""
    log_level = "DEBUG" if debug else "INFO"
    
    # Configure loguru logger
    logger.remove()  # Remove default handler
    logger.add(sys.stderr, level=log_level)  # Add stderr handler with specified level
    logger.add("logs/test_extraction_{time}.log", level=log_level, rotation="5 MB")  # Add file handler
    
    return logger

def save_debug_info(url, html_content, extraction_results, soup=None):
    """
    Save debug information for analysis.
    
    Args:
        url (str): URL of the product page.
        html_content (str): Raw HTML content.
        extraction_results (dict): Results from extraction methods.
        soup (BeautifulSoup, optional): Parsed HTML.
    """
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    
    # Create debug directory if it doesn't exist
    debug_dir = os.path.join("debug", timestamp)
    os.makedirs(debug_dir, exist_ok=True)
    
    # Save URL
    with open(os.path.join(debug_dir, "url.txt"), "w") as f:
        f.write(url)
    
    # Save HTML content
    with open(os.path.join(debug_dir, "page.html"), "w", encoding="utf-8") as f:
        f.write(html_content)
    
    # Save extraction results
    with open(os.path.join(debug_dir, "results.json"), "w") as f:
        # Convert BeautifulSoup objects to string representation for serialization
        serializable_results = {}
        for key, value in extraction_results.items():
            if hasattr(value, 'to_dict'):
                serializable_results[key] = value.to_dict()
            elif isinstance(value, (list, dict, str, int, float, bool, type(None))):
                serializable_results[key] = value
            else:
                serializable_results[key] = str(value)
        
        json.dump(serializable_results, f, indent=2)
    
    logger.info(f"Debug information saved to {debug_dir}")

async def main():
    """Main function to test the two-stage price extraction."""
    # Parse command line arguments
    args = setup_argparse()
    
    # Configure logging
    setup_logging(args.debug)
    
    # Print arguments
    logger.info(f"Testing price extraction for URL: {args.url}")
    if args.category:
        logger.info(f"Product category: {args.category}")
    if args.previous_price:
        logger.info(f"Previous price: ${args.previous_price}")
    if args.force_claude:
        logger.info("Forcing Claude extraction")
    if args.machine_id:
        logger.info(f"Machine ID: {args.machine_id}")
    
    # Ensure required configuration is valid
    if not validate_config():
        logger.error("Configuration validation failed. Exiting.")
        sys.exit(1)
    
    # Initialize components
    web_scraper = WebScraper()
    price_extractor = PriceExtractor()
    price_validator = PriceValidator()
    
    # If machine_id is provided but no previous_price, try to get the previous price from the database
    previous_price = args.previous_price
    if args.machine_id and not previous_price:
        try:
            # Get the latest price from the database
            db_service = DatabaseService()
            latest_price = db_service.get_latest_price(args.machine_id)
            if latest_price:
                previous_price = latest_price
                logger.info(f"Found previous price in database: ${previous_price}")
        except Exception as e:
            logger.error(f"Error getting previous price from database: {str(e)}")
    
    # Add test URL to problematic merchants if force_claude is set
    if args.force_claude:
        domain = price_extractor._extract_domain(args.url)
        if domain:
            price_extractor.add_problematic_merchant(domain)
            logger.info(f"Added {domain} to problematic merchants list")
    
    # Fetch the page content
    logger.info(f"Fetching content from {args.url}...")
    start_time = time.time()
    response = requests.get(args.url, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    })
    fetch_time = time.time() - start_time
    logger.info(f"Fetched page in {fetch_time:.2f} seconds")
    
    if response.status_code != 200:
        logger.error(f"Failed to fetch product page: HTTP {response.status_code}")
        sys.exit(1)
    
    logger.info(f"Successfully fetched content ({len(response.text)} bytes)")
    
    # Dictionary to store all extraction results for comparison
    extraction_results = {}
    
    # Test Stage 1: Direct extraction methods
    
    # Method 1: Structured data
    logger.info("Testing structured data extraction...")
    price, method = price_extractor._extract_from_structured_data(BeautifulSoup(response.text, 'html.parser'))
    extraction_results["structured_data"] = {
        "price": price,
        "method": method,
        "validation": price_validator.validate_price(price, args.category, args.previous_price, BeautifulSoup(response.text, 'html.parser')) if price is not None else None
    }
    if price is not None:
        logger.info(f"Structured data extraction: ${price} ({method})")
    else:
        logger.info("Structured data extraction: No price found")
    
    # Method 2: CSS selectors
    logger.info("Testing CSS selector extraction...")
    price, method = price_extractor._extract_from_common_selectors(BeautifulSoup(response.text, 'html.parser'))
    extraction_results["css_selectors"] = {
        "price": price,
        "method": method,
        "validation": price_validator.validate_price(price, args.category, args.previous_price, BeautifulSoup(response.text, 'html.parser')) if price is not None else None
    }
    if price is not None:
        logger.info(f"CSS selector extraction: ${price} ({method})")
    else:
        logger.info("CSS selector extraction: No price found")
    
    # Method 3: Regex patterns
    logger.info("Testing regex pattern extraction...")
    price, method = price_extractor._extract_from_regex_patterns(response.text)
    extraction_results["regex_patterns"] = {
        "price": price,
        "method": method,
        "validation": price_validator.validate_price(price, args.category, args.previous_price, BeautifulSoup(response.text, 'html.parser')) if price is not None else None
    }
    if price is not None:
        logger.info(f"Regex pattern extraction: ${price} ({method})")
    else:
        logger.info("Regex pattern extraction: No price found")
    
    # Method 4: Add to Cart proximity
    logger.info("Testing Add to Cart proximity extraction...")
    price, method = price_extractor._extract_near_add_to_cart(BeautifulSoup(response.text, 'html.parser'))
    extraction_results["add_to_cart"] = {
        "price": price,
        "method": method,
        "validation": price_validator.validate_price(price, args.category, args.previous_price, BeautifulSoup(response.text, 'html.parser')) if price is not None else None
    }
    if price is not None:
        logger.info(f"Add to Cart proximity extraction: ${price} ({method})")
    else:
        logger.info("Add to Cart proximity extraction: No price found")
    
    # Method 5: Claude AI
    logger.info("Testing Claude AI extraction...")
    price, method = price_extractor._extract_using_claude(response.text, args.url, args.category, args.previous_price)
    extraction_results["claude_ai"] = {
        "price": price,
        "method": method,
        "validation": price_validator.validate_price(price, args.category, args.previous_price, BeautifulSoup(response.text, 'html.parser')) if price is not None else None
    }
    if price is not None:
        logger.info(f"Claude AI extraction: ${price} ({method})")
    else:
        logger.info("Claude AI extraction: No price found")
    
    # Test Stage 2: Full two-stage extraction
    logger.info("Testing full two-stage extraction...")
    price, method = price_extractor.extract_price(
        BeautifulSoup(response.text, 'html.parser'), 
        response.text, 
        args.url, 
        product_category=args.category, 
        previous_price=previous_price,
        machine_id=args.machine_id
    )
    extraction_results["two_stage"] = {
        "price": price,
        "method": method
    }
    if price is not None:
        logger.info(f"Two-stage extraction result: ${price} ({method})")
    else:
        logger.info("Two-stage extraction: No price found")
    
    # Save debug information
    save_debug_info(args.url, response.text, extraction_results, BeautifulSoup(response.text, 'html.parser'))
    
    # Print summary
    logger.info("\nExtraction Summary:")
    for method_name, result in extraction_results.items():
        price = result.get("price")
        method = result.get("method")
        validation = result.get("validation")
        
        if price is not None:
            validation_info = ""
            if validation:
                confidence = validation.get("confidence", 0)
                is_valid = validation.get("is_valid", False)
                validation_info = f" (Confidence: {confidence:.2f}, Valid: {is_valid})"
            
            logger.info(f"{method_name}: ${price} - {method}{validation_info}")
        else:
            logger.info(f"{method_name}: No price found")

if __name__ == "__main__":
    # Ensure logs directory exists
    os.makedirs("logs", exist_ok=True)
    os.makedirs("debug", exist_ok=True)
    
    # Run the test
    import asyncio
    asyncio.run(main()) 