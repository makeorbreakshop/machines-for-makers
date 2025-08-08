#!/usr/bin/env python3
"""Debug script to see JSON-LD structure for OMTech."""

import asyncio
from scrapers.scrapfly_web_scraper import ScrapflyWebScraper
from services.database import DatabaseService
from bs4 import BeautifulSoup
import json
from loguru import logger

async def debug_omtech_jsonld():
    """Debug OMTech JSON-LD structure."""
    
    # Initialize services
    db_service = DatabaseService()
    scraper = ScrapflyWebScraper(database_service=db_service)
    
    # OMTech URL
    url = "https://omtechlaser.com/products/omtech-pro-2440-80w-and-100w-co2-laser-engraver-cutting-machine-with-autofocus-and-built-in-water-chiller"
    
    logger.info("Fetching OMTech page...")
    html_content, soup = await scraper.get_page_content(url)
    
    if not soup:
        logger.error("Failed to fetch page")
        return
    
    # Find all JSON-LD scripts
    json_ld_scripts = soup.find_all('script', type='application/ld+json')
    logger.info(f"Found {len(json_ld_scripts)} JSON-LD scripts")
    
    for idx, script in enumerate(json_ld_scripts):
        try:
            data = json.loads(script.string)
            logger.info(f"\n=== JSON-LD Script {idx} ===")
            
            # Check if it's a Product type
            if isinstance(data, dict) and data.get('@type') == 'Product':
                logger.info("Found Product JSON-LD")
                
                # Check offers
                if 'offers' in data:
                    offers = data['offers']
                    if isinstance(offers, list):
                        logger.info(f"Found {len(offers)} offers:")
                        for i, offer in enumerate(offers):
                            logger.info(f"  Offer {i}:")
                            logger.info(f"    Price: {offer.get('price')}")
                            logger.info(f"    Name: {offer.get('name', 'N/A')}")
                            logger.info(f"    SKU: {offer.get('sku', 'N/A')}")
                            logger.info(f"    Description: {offer.get('description', 'N/A')[:100]}")
                    else:
                        logger.info(f"Single offer: price={offers.get('price')}")
                        
        except json.JSONDecodeError:
            logger.error(f"Failed to parse JSON-LD script {idx}")
        except Exception as e:
            logger.error(f"Error processing JSON-LD script {idx}: {e}")

if __name__ == "__main__":
    asyncio.run(debug_omtech_jsonld())