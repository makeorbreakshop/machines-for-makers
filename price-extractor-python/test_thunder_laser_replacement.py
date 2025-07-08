#!/usr/bin/env python3
"""
Test Thunder Laser URL replacement and extraction logic.
"""

import asyncio
from urllib.parse import urlparse
from loguru import logger
from scrapers.web_scraper import WebScraper

async def test_thunder_laser_url_replacement():
    """Test the Thunder Laser URL replacement logic."""
    logger.info("🔥 Testing Thunder Laser URL replacement logic...")
    
    # Test URLs that should be replaced
    test_urls = [
        "https://www.thunderlaserusa.com/nova-35/",
        "https://thunderlaserusa.com/nova-51/",
        "https://www.thunderlaserusa.com/aurora-lite/",
        "https://thunderlaserusa.com/nova-plus-35/"
    ]
    
    scraper = WebScraper()
    
    for original_url in test_urls:
        logger.info(f"Testing URL: {original_url}")
        
        # Simulate URL replacement logic from price service
        domain = urlparse(original_url).netloc.lower()
        if domain.startswith('www.'):
            domain = domain[4:]
        
        # Thunder Laser domain replacement
        replaced_url = original_url
        if 'thunderlaserusa.com' in domain:
            logger.info(f"🔄 Thunder Laser URL replacement detected")
            if 'www.thunderlaserusa.com' in original_url:
                replaced_url = original_url.replace('www.thunderlaserusa.com', 'www.thunderlaser.cn')
            else:
                replaced_url = original_url.replace('thunderlaserusa.com', 'thunderlaser.cn')
            logger.info(f"🌏 Replaced Thunder Laser URL: {original_url} → {replaced_url}")
        
        # Test URL health check bypass
        health_info = await scraper.validate_url_health(replaced_url)
        logger.info(f"Health check result: {health_info['is_healthy']} - {health_info.get('issues', [])}")
        
        # Test actual content fetching
        try:
            html_content, soup = await scraper.get_page_content(replaced_url)
            if html_content and soup:
                logger.success(f"✅ Successfully fetched content from {replaced_url}")
                logger.info(f"Content length: {len(html_content)} chars")
                
                # Look for Thunder Laser indicators
                content_lower = html_content.lower()
                thunder_indicators = ['nova', 'aurora', 'laser', 'thunder', 'engraving', 'cutting']
                found_indicators = [ind for ind in thunder_indicators if ind in content_lower]
                
                if found_indicators:
                    logger.success(f"🎯 Found Thunder Laser content indicators: {found_indicators}")
                else:
                    logger.warning("⚠️ No Thunder Laser content indicators found")
                    
                # Look for price elements
                price_selectors = [
                    '.woocommerce-Price-amount',
                    '.price .amount', 
                    '.product-price .price',
                    '.price'
                ]
                
                price_found = False
                for selector in price_selectors:
                    try:
                        elements = soup.select(selector)
                        if elements:
                            for element in elements[:3]:
                                text = element.get_text(strip=True)
                                if text and ('$' in text or any(c.isdigit() for c in text)):
                                    logger.success(f"💰 Found potential price: {text} (selector: {selector})")
                                    price_found = True
                    except Exception as e:
                        continue
                
                if not price_found:
                    logger.warning("⚠️ No price elements found with common selectors")
                
            else:
                logger.error(f"❌ Failed to fetch content from {replaced_url}")
                
        except Exception as e:
            logger.error(f"❌ Error fetching {replaced_url}: {str(e)}")
        
        logger.info("─" * 60)

if __name__ == "__main__":
    asyncio.run(test_thunder_laser_url_replacement())