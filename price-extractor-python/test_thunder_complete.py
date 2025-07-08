#!/usr/bin/env python3
"""
Test the complete Thunder Laser solution with URL mapping and price extraction.
"""

import asyncio
from urllib.parse import urlparse
from loguru import logger
from scrapers.web_scraper import WebScraper
from scrapers.site_specific_extractors import SiteSpecificExtractor

async def test_complete_thunder_solution():
    """Test the complete Thunder Laser solution."""
    logger.info("🔥 Testing complete Thunder Laser solution...")
    
    # Test representative Thunder Laser URLs
    test_urls = [
        "https://www.thunderlaserusa.com/nova-35/",
        "https://thunderlaserusa.com/aurora-lite/"
    ]
    
    scraper = WebScraper()
    extractor = SiteSpecificExtractor()
    
    for original_url in test_urls:
        logger.info(f"Testing complete solution for: {original_url}")
        
        # Step 1: Simulate URL replacement (as done in price service)
        domain = urlparse(original_url).netloc.lower()
        if domain.startswith('www.'):
            domain = domain[4:]
        
        mapped_url = original_url
        if 'thunderlaserusa.com' in domain:
            logger.info(f"🔄 Thunder Laser URL replacement detected")
            
            if 'nova' in original_url.lower():
                mapped_url = 'https://www.thunderlaser.cn/laser-cutter/'
                logger.info(f"🌏 Mapped Nova product to category: {original_url} → {mapped_url}")
            elif 'aurora' in original_url.lower():
                mapped_url = 'https://www.thunderlaser.cn/aurora/'
                logger.info(f"🌏 Mapped Aurora product to category: {original_url} → {mapped_url}")
            else:
                mapped_url = 'https://www.thunderlaser.cn/laser-cutter/'
                logger.info(f"🌏 Fallback mapping: {original_url} → {mapped_url}")
        
        # Step 2: Fetch content
        html_content, soup = await scraper.get_page_content(mapped_url)
        if not html_content or not soup:
            logger.error(f"❌ Failed to fetch {mapped_url}")
            continue
        
        logger.success(f"✅ Fetched content: {len(html_content)} chars")
        
        # Step 3: Extract price using site-specific rules
        price, method = extractor.extract_price_with_rules(soup, html_content, mapped_url)
        
        if price:
            logger.success(f"🎉 SUCCESS! Extracted price: ${price} using {method}")
            
            # Convert Yuan to USD for comparison (rough conversion ¥7 = $1)
            if price > 1000:  # Likely Yuan price
                usd_price = price / 7.0
                logger.info(f"💱 Estimated USD equivalent: ${usd_price:.2f}")
            
        else:
            logger.error(f"❌ No price extracted for {original_url}")
        
        logger.info("─" * 80)

if __name__ == "__main__":
    asyncio.run(test_complete_thunder_solution())