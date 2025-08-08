#!/usr/bin/env python3
"""Test script to verify ComMarker B6 30W price extraction with dynamic variant selection."""

import asyncio
from loguru import logger
from scrapers.scrapfly_web_scraper import ScrapflyWebScraper
from scrapers.site_specific_extractors import SiteSpecificExtractor
from scrapers.price_extractor import PriceExtractor
from services.database import DatabaseService
from bs4 import BeautifulSoup

async def test_commarker_b6_30w():
    """Test ComMarker B6 30W extraction with updated rules."""
    db_service = DatabaseService()
    
    # URL for ComMarker B6
    url = "https://commarker.com/product/commarker-b6"
    machine_name = "ComMarker B6 30W"
    
    # Initialize components
    scraper = ScrapflyWebScraper(database_service=db_service)
    site_extractor = SiteSpecificExtractor()
    price_extractor = PriceExtractor()
    
    try:
        logger.info(f"Testing URL: {url}")
        logger.info("Expected price: $2,399 (B6 Basic Bundle with 30W selected)")
        
        # Get page content
        html_content, soup = await scraper.get_page_content(url)
        
        logger.info(f"Page fetched successfully, size: {len(html_content)} chars")
        
        # Test site-specific extraction first
        machine_data = {
            'name': machine_name,
            'Machine Name': machine_name,
            'old_price': 2399.00  # Expected price
        }
        
        logger.info("\n=== Testing site-specific extraction ===")
        price, method = site_extractor.extract_price_with_rules(
            soup,
            html_content,
            url,
            machine_data
        )
        
        if price:
            logger.success(f"✅ Site-specific extracted price: ${price} using method: {method}")
        else:
            logger.warning("❌ Site-specific extraction failed")
        
        # Test with full price extractor
        logger.info("\n=== Testing full price extractor ===")
        full_price, full_method = await price_extractor.extract_price(
            html_content,
            url,
            machine_name,
            2399.00,
            soup=soup,
            machine_data=machine_data
        )
        
        if full_price:
            logger.success(f"✅ Full extractor price: ${full_price} using method: {full_method}")
        else:
            logger.error("❌ Full extraction failed")
        
        # Debug: Check what bundle prices exist on the page
        logger.info("\n=== Checking bundle prices on page ===")
        bundle_elements = soup.select('.wd-swatch-tooltip')
        if bundle_elements:
            logger.info(f"Found {len(bundle_elements)} bundle elements:")
            for i, elem in enumerate(bundle_elements[:5]):
                text_elem = elem.select_one('.wd-swatch-text')
                price_elem = elem.select_one('.price')
                if text_elem and price_elem:
                    bundle_name = text_elem.get_text(strip=True)
                    price_text = price_elem.get_text(strip=True)
                    logger.info(f"  [{i}] {bundle_name}: {price_text}")
        
        # Check if dynamic scraping is needed
        rules = site_extractor.site_rules.get('commarker.com', {})
        machine_rules = rules.get('machine_specific_rules', {}).get(machine_name, {})
        if machine_rules.get('requires_dynamic'):
            logger.warning("\n⚠️  This machine requires dynamic scraping to select 30W variant")
            logger.warning("The static extraction may not get the correct price without variant selection")
            logger.info("For production, the dynamic scraper will:")
            logger.info("  1. Click/select the 30W variant option")
            logger.info("  2. Wait for bundle prices to update")
            logger.info("  3. Extract the B6 Basic Bundle price ($2,399)")
        
        # Final result
        logger.info("\n=== FINAL RESULT ===")
        if price == 2399.00 or full_price == 2399.00:
            logger.success("✅ SUCCESS: Correctly extracted $2,399 for ComMarker B6 30W")
        else:
            logger.error(f"❌ FAILED: Expected $2,399, got ${price or full_price or 'None'}")
            logger.info("Note: This likely requires dynamic variant selection which is not available in static extraction")
        
    except Exception as e:
        logger.error(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await db_service.close()

if __name__ == "__main__":
    asyncio.run(test_commarker_b6_30w())