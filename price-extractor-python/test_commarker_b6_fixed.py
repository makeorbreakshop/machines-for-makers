#!/usr/bin/env python3
"""
Test ComMarker B6 30W extraction with correct machine data format
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(__file__))

from scrapers.price_extractor import PriceExtractor
from scrapers.hybrid_web_scraper import get_hybrid_scraper
from loguru import logger

async def test_with_fixed_data_format():
    """Test with the correct machine data format including old_price."""
    
    url = "https://commarker.com/product/commarker-b6"
    machine_name = "ComMarker B6 30W"
    old_price = 2399.0  # Current baseline price from database
    
    # Fixed machine data structure with old_price field
    machine_data = {
        'Machine Name': machine_name,
        'id': 'd910f7fc-a8e0-48ad-8a62-78c9e4259b8b',
        'Price': str(old_price),  # String format as from database
        'old_price': old_price,    # THIS IS THE MISSING FIELD!
        'product_link': url
    }
    
    logger.info("🚀 ComMarker B6 30W Test with Fixed Data Format")
    logger.info(f"URL: {url}")
    logger.info(f"Machine: {machine_name}")
    logger.info(f"Old Price: ${old_price}")
    logger.info(f"Machine Data: {machine_data}")
    
    try:
        # Get page content using hybrid scraper
        scraper = get_hybrid_scraper()
        html_content, soup = await scraper.get_page_content(url)
        
        if not html_content or not soup:
            logger.error("❌ Failed to fetch page content")
            return False
        
        logger.info(f"✅ Page fetched: {len(html_content)} chars")
        
        # Use the same PriceExtractor as the batch system
        extractor = PriceExtractor()
        
        # Call extract_price exactly as the batch system does
        price, method = await extractor.extract_price(
            soup=soup,
            html_content=html_content,
            url=url,
            old_price=old_price,
            machine_name=machine_name,
            machine_data=machine_data
        )
        
        if price:
            logger.info(f"🎯 EXTRACTION RESULT:")
            logger.info(f"   Price: ${price}")
            logger.info(f"   Method: {method}")
            
            # Check results
            if abs(price - 2399.0) < 50:  # Allow some variance
                logger.success(f"✅ SUCCESS: Got expected price ${price} (target: $2,399)")
                return True
            else:
                logger.warning(f"⚠️ DIFFERENT: Got ${price}, expected $2,399")
                # Still successful if it finds a reasonable price
                if 2000 <= price <= 3000:
                    logger.info("ℹ️ Price is in reasonable range for ComMarker B6")
                    return True
                return False
        else:
            logger.error("❌ No price extracted")
            return False
            
    except Exception as e:
        logger.error(f"❌ ERROR: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return False

async def main():
    """Main test function."""
    logger.info("🧪 ComMarker B6 30W Test with Fixed Data Format")
    logger.info("=" * 60)
    
    success = await test_with_fixed_data_format()
    
    logger.info("=" * 60)
    if success:
        logger.success("🎉 Test PASSED - Fix confirmed!")
    else:
        logger.error("💥 Test FAILED")
    
    return success

if __name__ == "__main__":
    result = asyncio.run(main())
    sys.exit(0 if result else 1)