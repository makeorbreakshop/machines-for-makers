#!/usr/bin/env python3
"""Debug script to understand ComMarker B6 page structure."""

import asyncio
from loguru import logger
from scrapers.scrapfly_web_scraper import ScrapflyWebScraper
from services.database import DatabaseService
from bs4 import BeautifulSoup

async def debug_commarker_page():
    """Debug ComMarker B6 page structure."""
    db_service = DatabaseService()
    
    # URL for ComMarker B6
    url = "https://commarker.com/product/commarker-b6"
    
    # Initialize scraper
    scraper = ScrapflyWebScraper(database_service=db_service)
    
    try:
        logger.info(f"Fetching URL: {url}")
        
        # Get page content
        html_content, soup = await scraper.get_page_content(url)
        
        logger.info(f"Page fetched successfully, size: {len(html_content)} chars")
        
        # Look for bundle information
        logger.info("\n=== Looking for bundle/swatch elements ===")
        
        # Try different selectors
        selectors_to_try = [
            '.wd-swatch-tooltip',
            '.wd-swatch-info',
            '.wd-swatch',
            '.wd-swatches-product',
            '.variation-selector',
            '.product-bundle',
            '[class*="bundle"]',
            '[class*="swatch"]',
            '.swatches-select',
            '.single_variation_wrap'
        ]
        
        for selector in selectors_to_try:
            elements = soup.select(selector)
            if elements:
                logger.info(f"\nFound {len(elements)} elements with selector '{selector}':")
                for i, elem in enumerate(elements[:3]):
                    logger.info(f"  [{i}] HTML snippet:")
                    # Show a snippet of the HTML
                    html_snippet = str(elem)[:300] + "..." if len(str(elem)) > 300 else str(elem)
                    logger.info(f"    {html_snippet}")
        
        # Look for variation forms
        logger.info("\n=== Looking for variation forms ===")
        variation_forms = soup.select('form.variations_form')
        if variation_forms:
            logger.info(f"Found {len(variation_forms)} variation forms")
            for i, form in enumerate(variation_forms[:1]):
                # Look for variation data
                variations_data = form.get('data-product_variations')
                if variations_data:
                    logger.info(f"  Form {i} has variations data (length: {len(variations_data)})")
        
        # Look for wattage options
        logger.info("\n=== Looking for wattage options ===")
        wattage_selectors = [
            'input[name*="watt"]',
            'input[value="20W"]',
            'input[value="30W"]',
            'label:contains("20W")',
            'label:contains("30W")',
            '.variation-selector input',
            'input[type="radio"]'
        ]
        
        for selector in wattage_selectors:
            try:
                elements = soup.select(selector)
                if elements:
                    logger.info(f"\nSelector '{selector}' found {len(elements)} elements:")
                    for elem in elements[:5]:
                        logger.info(f"  - {elem}")
            except:
                # CSS selector might not support :contains
                pass
        
        # Look for price elements in bundles
        logger.info("\n=== Looking for bundle prices ===")
        # Find elements that might contain bundle information
        bundle_containers = soup.find_all(lambda tag: tag.get('class') and any('bundle' in ' '.join(tag.get('class', [])).lower() or 'swatch' in ' '.join(tag.get('class', [])).lower() for cls in tag.get('class', [])))
        
        if bundle_containers:
            logger.info(f"Found {len(bundle_containers)} potential bundle containers")
            for i, container in enumerate(bundle_containers[:5]):
                text = container.get_text(strip=True)[:100]
                logger.info(f"  [{i}] Text: {text}...")
                # Look for prices within
                price_elems = container.select('.price, .woocommerce-Price-amount, bdi')
                if price_elems:
                    logger.info(f"    Prices found: {[elem.get_text(strip=True) for elem in price_elems[:3]]}")
        
        # Save a sample of the HTML for manual inspection
        logger.info("\n=== Saving HTML sample ===")
        with open('commarker_b6_debug.html', 'w', encoding='utf-8') as f:
            # Find the main product area
            product_area = soup.select_one('.product-main, .product-summary, .entry-summary, .single-product')
            if product_area:
                f.write(str(product_area.prettify()))
                logger.info("Saved product area HTML to commarker_b6_debug.html")
            else:
                f.write(html_content[:50000])  # First 50k chars
                logger.info("Saved first 50k chars to commarker_b6_debug.html")
        
    except Exception as e:
        logger.error(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await db_service.close()

if __name__ == "__main__":
    asyncio.run(debug_commarker_page())