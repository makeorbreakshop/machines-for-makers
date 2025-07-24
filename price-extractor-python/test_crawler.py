#!/usr/bin/env python3
"""Test the crawler functionality"""
import asyncio
import logging
from crawlers.site_crawler import discover_products

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def test_xtool():
    """Test crawling xTool website"""
    url = "https://www.xtool.com"
    
    config = {
        'crawl_delay': 0.5,
        'timeout': 5,
        'max_pages': 10,
        'use_sitemap': True,
        'respect_robots': False  # Skip robots.txt for testing
    }
    
    try:
        logger.info(f"Testing crawler on {url}")
        urls, stats = await discover_products(url, config)
        
        print("\n" + "="*60)
        print(f"RESULTS for {url}")
        print("="*60)
        print(f"URLs found: {len(urls)}")
        print(f"Stats: {stats}")
        
        if urls:
            print("\nFirst 10 URLs:")
            for i, u in enumerate(urls[:10]):
                print(f"{i+1}. {u}")
        else:
            print("\nNo URLs found!")
            
    except Exception as e:
        logger.error(f"Test failed: {str(e)}", exc_info=True)

async def test_simple_site():
    """Test with a simpler site"""
    url = "https://commarker.com"
    
    config = {
        'crawl_delay': 0.5,
        'timeout': 5,
        'max_pages': 10,
        'use_sitemap': True,
        'respect_robots': False
    }
    
    try:
        logger.info(f"Testing crawler on {url}")
        urls, stats = await discover_products(url, config)
        
        print("\n" + "="*60)
        print(f"RESULTS for {url}")
        print("="*60)
        print(f"URLs found: {len(urls)}")
        print(f"Stats: {stats}")
        
        if urls:
            print("\nFirst 10 URLs:")
            for i, u in enumerate(urls[:10]):
                print(f"{i+1}. {u}")
        else:
            print("\nNo URLs found!")
            
    except Exception as e:
        logger.error(f"Test failed: {str(e)}", exc_info=True)

async def main():
    """Run all tests"""
    # Test xTool
    await test_xtool()
    
    # Test ComMarker
    await test_simple_site()

if __name__ == "__main__":
    asyncio.run(main())