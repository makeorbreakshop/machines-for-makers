#!/usr/bin/env python3
"""
Test xTool S1 and EMP laser machines price extraction.
"""
import asyncio
import sys
from loguru import logger
import requests
from bs4 import BeautifulSoup

sys.path.append('.')

from scrapers.price_extractor import PriceExtractor
from scrapers.dynamic_scraper import DynamicScraper

async def test_machines():
    """Test price extraction for xTool S1 and EMP laser machines."""
    
    machines = [
        {
            "name": "xTool S1",
            "url": "https://www.xtool.com/products/xtool-s1-laser-cutter",
            "id": "0f5f7679-e975-4286-b655-9799e24931b9",
            "old_price": 4000  # Approximate baseline
        },
        {
            "name": "Thunder Bolt",  # EMP laser machine
            "url": "https://thunderlaser.com/products/thunder-bolt",
            "id": "thunder-bolt-id",  # We'll need to find the actual ID
            "old_price": 15000  # Approximate baseline for Thunder Bolt
        }
    ]
    
    extractor = PriceExtractor()
    
    for machine in machines:
        logger.info(f"\n{'='*60}")
        logger.info(f"Testing: {machine['name']}")
        logger.info(f"URL: {machine['url']}")
        logger.info(f"Baseline price: ${machine['old_price']}")
        
        try:
            # First try static extraction
            logger.info("Attempting static extraction...")
            
            # Fetch the page
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            response = requests.get(machine['url'], headers=headers, timeout=30)
            response.raise_for_status()
            
            html_content = response.text
            soup = BeautifulSoup(html_content, 'html.parser')
            
            price, method = await extractor.extract_price(
                soup,
                html_content,
                machine['url'],
                old_price=machine['old_price'],
                machine_name=machine['name'],
                machine_data={'old_price': machine['old_price']}
            )
            
            if price:
                logger.success(f"✅ Extracted price: ${price} (method: {method})")
            else:
                logger.warning(f"⚠️ No price extracted with static methods")
                
                # Try dynamic extraction if static fails
                logger.info("Attempting dynamic extraction...")
                async with DynamicScraper() as scraper:
                    price, method = await scraper.extract_price_with_variants(
                        machine['url'],
                        machine['name'],
                        {},  # No variant rules needed for these
                        machine_data={'Machine Name': machine['name'], 'old_price': machine['old_price']}
                    )
                    
                    if price:
                        logger.success(f"✅ Dynamic extraction successful: ${price}")
                    else:
                        logger.error(f"❌ Failed to extract price")
                        
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Error fetching page: {str(e)}")
        except Exception as e:
            logger.error(f"❌ Error extracting price: {str(e)}")
            logger.exception(e)
    
    logger.info(f"\n{'='*60}")
    logger.info("Test completed")

if __name__ == "__main__":
    asyncio.run(test_machines())