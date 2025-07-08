#!/usr/bin/env python3
"""
Test what pages are available on the Thunder Laser Chinese domain.
"""

import asyncio
import requests
from bs4 import BeautifulSoup
from loguru import logger

async def test_thunder_chinese_domain():
    """Test the Thunder Laser Chinese domain to see what's available."""
    logger.info("🔥 Testing Thunder Laser Chinese domain structure...")
    
    # Test main page first
    base_urls = [
        "https://thunderlaser.cn/",
        "https://www.thunderlaser.cn/"
    ]
    
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
    })
    
    for base_url in base_urls:
        logger.info(f"Testing base URL: {base_url}")
        
        try:
            response = session.get(base_url, timeout=15)
            logger.info(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                logger.success(f"✅ Base URL accessible: {base_url}")
                
                # Parse content
                soup = BeautifulSoup(response.content, 'html.parser')
                title = soup.title.string if soup.title else "No title"
                logger.info(f"Page title: {title}")
                
                # Look for navigation links to products
                links = soup.find_all('a', href=True)
                product_links = []
                
                for link in links:
                    href = link['href'].lower()
                    link_text = link.get_text(strip=True).lower()
                    
                    # Look for laser product indicators
                    if any(keyword in href or keyword in link_text for keyword in ['nova', 'aurora', 'laser', 'product', '激光']):
                        full_url = response.url.rstrip('/') + '/' + href.lstrip('/') if href.startswith('/') else href
                        product_links.append((link.get_text(strip=True), full_url))
                
                if product_links:
                    logger.success(f"Found {len(product_links)} potential product links:")
                    for text, url in product_links[:10]:  # Show first 10
                        logger.info(f"  📎 {text} → {url}")
                else:
                    logger.warning("No product links found")
                
                # Look for price indicators in the main page
                price_elements = soup.select('*[class*="price"], *[class*="cost"], *[data-price]')
                if price_elements:
                    logger.info(f"Found {len(price_elements)} price-related elements")
                    for element in price_elements[:5]:
                        text = element.get_text(strip=True)
                        if text and len(text) < 100:
                            logger.info(f"  💰 {text}")
                
                # Look for specific product mentions
                content_lower = response.text.lower()
                thunder_products = ['nova 35', 'nova 51', 'aurora', 'nova-35', 'nova-51']
                found_products = [prod for prod in thunder_products if prod in content_lower]
                
                if found_products:
                    logger.success(f"🎯 Found product mentions: {found_products}")
                else:
                    logger.warning("No specific product mentions found")
                
            else:
                logger.error(f"❌ Failed to access {base_url}: {response.status_code}")
                
        except Exception as e:
            logger.error(f"❌ Error accessing {base_url}: {str(e)}")
        
        logger.info("─" * 60)

if __name__ == "__main__":
    asyncio.run(test_thunder_chinese_domain())