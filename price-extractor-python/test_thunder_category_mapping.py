#!/usr/bin/env python3
"""
Test Thunder Laser category mapping and price extraction.
"""

import asyncio
from urllib.parse import urlparse
from loguru import logger
from scrapers.web_scraper import WebScraper
from scrapers.site_specific_extractors import SiteSpecificExtractor

async def test_thunder_category_mapping():
    """Test the Thunder Laser category mapping and extraction."""
    logger.info("🔥 Testing Thunder Laser category mapping...")
    
    # Test URLs that should be mapped to categories
    test_mappings = [
        ("https://www.thunderlaserusa.com/nova-35/", "https://www.thunderlaser.cn/laser-cutter/"),
        ("https://thunderlaserusa.com/nova-51/", "https://www.thunderlaser.cn/laser-cutter/"),
        ("https://www.thunderlaserusa.com/aurora-lite/", "https://www.thunderlaser.cn/aurora/"),
        ("https://thunderlaserusa.com/nova-plus-35/", "https://www.thunderlaser.cn/laser-cutter/")
    ]
    
    scraper = WebScraper()
    extractor = SiteSpecificExtractor()
    
    for original_url, expected_mapping in test_mappings:
        logger.info(f"Testing mapping: {original_url}")
        
        # Simulate URL replacement logic from price service
        domain = urlparse(original_url).netloc.lower()
        if domain.startswith('www.'):
            domain = domain[4:]
        
        # Thunder Laser category mapping
        mapped_url = original_url
        if 'thunderlaserusa.com' in domain:
            logger.info(f"🔄 Thunder Laser URL replacement detected")
            
            if 'nova' in original_url.lower():
                mapped_url = 'https://www.thunderlaser.cn/laser-cutter/'
                logger.info(f"🌏 Mapped Nova product to category: {original_url} → {mapped_url}")
            elif 'aurora' in original_url.lower():
                mapped_url = 'https://www.thunderlaser.cn/aurora/'
                logger.info(f"🌏 Mapped Aurora product to category: {original_url} → {mapped_url}")
            elif 'bolt' in original_url.lower():
                mapped_url = 'https://www.thunderlaser.cn/thunder-bolt/'
                logger.info(f"🌏 Mapped Bolt product to category: {original_url} → {mapped_url}")
            else:
                mapped_url = 'https://www.thunderlaser.cn/laser-cutter/'
                logger.info(f"🌏 Fallback mapping to laser cutter category: {original_url} → {mapped_url}")
        
        # Verify mapping is correct
        if mapped_url == expected_mapping:
            logger.success(f"✅ Mapping correct: {mapped_url}")
        else:
            logger.error(f"❌ Mapping incorrect. Expected: {expected_mapping}, Got: {mapped_url}")
        
        # Test content fetching from category page
        try:
            html_content, soup = await scraper.get_page_content(mapped_url)
            if html_content and soup:
                logger.success(f"✅ Successfully fetched category content")
                logger.info(f"Content length: {len(html_content)} chars")
                
                # Test price extraction using site-specific rules
                price, method = extractor.extract_price_with_rules(soup, html_content, mapped_url)
                
                if price:
                    logger.success(f"💰 Extracted price: ${price} using {method}")
                else:
                    logger.warning("⚠️ No price extracted, trying alternative methods...")
                    
                    # Try common Thunder Laser price patterns in Chinese
                    import re
                    patterns = [
                        r'¥(\d{1,3}(?:,\d{3})*\.?\d{0,2})',  # Yuan prices
                        r'(\d{1,3}(?:,\d{3})*\.?\d{0,2})',   # General numbers
                        r'价格[：:]\s*¥?(\d{1,3}(?:,\d{3})*\.?\d{0,2})',  # Chinese price label
                        r'报价[：:]\s*¥?(\d{1,3}(?:,\d{3})*\.?\d{0,2})',  # Chinese quote
                        r'售价[：:]\s*¥?(\d{1,3}(?:,\d{3})*\.?\d{0,2})'   # Chinese selling price
                    ]
                    
                    found_prices = []
                    for pattern in patterns:
                        matches = re.findall(pattern, html_content)
                        for match in matches:
                            try:
                                price_val = float(match.replace(',', ''))
                                if 1000 <= price_val <= 100000:  # Reasonable price range
                                    found_prices.append((price_val, pattern))
                            except ValueError:
                                continue
                    
                    if found_prices:
                        logger.info(f"🔍 Found {len(found_prices)} potential prices with regex:")
                        for price_val, pattern in found_prices[:5]:
                            logger.info(f"  💰 ¥{price_val} (pattern: {pattern[:30]}...)")
                    else:
                        logger.warning("⚠️ No prices found with regex patterns either")
                
                # Look for product-specific content
                content_lower = html_content.lower()
                if 'nova' in mapped_url:
                    indicators = ['nova', 'co2', '切割', '激光切割']
                elif 'aurora' in mapped_url:
                    indicators = ['aurora', 'fiber', '打标', '激光打标']
                else:
                    indicators = ['laser', '激光', 'thunder', '雷宇']
                
                found_indicators = [ind for ind in indicators if ind in content_lower]
                if found_indicators:
                    logger.success(f"🎯 Found relevant content: {found_indicators}")
                else:
                    logger.warning("⚠️ No relevant product content found")
                
            else:
                logger.error(f"❌ Failed to fetch category content from {mapped_url}")
                
        except Exception as e:
            logger.error(f"❌ Error testing {mapped_url}: {str(e)}")
        
        logger.info("─" * 80)

if __name__ == "__main__":
    asyncio.run(test_thunder_category_mapping())