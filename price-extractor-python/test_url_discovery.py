#!/usr/bin/env python3
"""
Test script to verify URL discovery without using Scrapfly credits
"""
import asyncio
import aiohttp
import json
from typing import Dict, Any

async def test_url_discovery(site_config: Dict[str, Any]):
    """Test URL discovery for a site"""
    
    # API endpoint for testing
    url = "http://localhost:8001/api/v1/test-discover-urls"
    
    # Prepare request data
    request_data = {
        "site_id": site_config.get("site_id", "test-site"),
        "site_name": site_config.get("site_name", "Test Site"),
        "config": site_config,
        "max_products": 10,  # Limit for testing
        "test_mode": False  # We're not using the fake data mode
    }
    
    print(f"Testing URL discovery for: {site_config.get('site_name')}")
    print(f"Base URL: {site_config.get('url')}")
    print(f"Sitemap: {site_config.get('sitemap_url', 'Will auto-detect')}")
    print("-" * 60)
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(url, json=request_data) as response:
                if response.status == 200:
                    result = await response.json()
                    
                    print(f"✅ SUCCESS: Found {result['urls_found']} URLs")
                    print(f"\nCrawl Statistics:")
                    for key, value in result.get('crawl_stats', {}).items():
                        print(f"  - {key}: {value}")
                    
                    print(f"\nPatterns Used:")
                    print(f"  Include: {result['patterns_used']['include']}")
                    print(f"  Exclude: {result['patterns_used']['exclude']}")
                    
                    print(f"\nSample URLs (first 10):")
                    for i, url in enumerate(result.get('sample_urls', []), 1):
                        print(f"  {i}. {url}")
                        
                else:
                    error_text = await response.text()
                    print(f"❌ FAILED: Status {response.status}")
                    print(f"Error: {error_text}")
                    
        except Exception as e:
            print(f"❌ ERROR: {str(e)}")
            print("Make sure the discovery service is running on port 8001")


# Test configurations for different sites
TEST_SITES = {
    "xtool": {
        "site_id": "xtool-test",
        "site_name": "xTool",
        "url": "https://www.xtool.com",
        "sitemap_url": "https://www.xtool.com/sitemap.xml",
        "product_url_patterns": [
            "/products/",
            "/collections/.*/products/"
        ],
        "exclude_patterns": [
            "/blogs/",
            "/pages/",
            "/collections/$",  # Collection pages, not products
            "/products/.*#",   # Anchor links
            "/products/.*/reviews"
        ]
    },
    "commarker": {
        "site_id": "commarker-test", 
        "site_name": "ComMarker",
        "url": "https://www.commarker.com",
        "sitemap_url": "https://www.commarker.com/sitemap_products_1.xml",
        "product_url_patterns": [
            "/products/"
        ],
        "exclude_patterns": [
            "/collections/",
            "/blogs/",
            "/pages/"
        ]
    },
    "glowforge": {
        "site_id": "glowforge-test",
        "site_name": "Glowforge", 
        "url": "https://glowforge.com",
        "sitemap_url": "https://glowforge.com/sitemap.xml",
        "product_url_patterns": [
            "/products/",
            "/shop/"
        ],
        "exclude_patterns": [
            "/support/",
            "/community/",
            "/blog/"
        ]
    }
}


async def main():
    """Run tests for all sites"""
    print("=" * 60)
    print("URL DISCOVERY TEST - No Scrapfly Credits Used")
    print("=" * 60)
    print()
    
    # Let user choose which site to test
    print("Available sites to test:")
    for i, (key, config) in enumerate(TEST_SITES.items(), 1):
        print(f"{i}. {config['site_name']} ({config['url']})")
    
    choice = input("\nEnter site number to test (or 'all' for all sites): ").strip()
    
    if choice.lower() == 'all':
        # Test all sites
        for site_key, site_config in TEST_SITES.items():
            print("\n" + "=" * 60)
            await test_url_discovery(site_config)
            print()
    else:
        # Test specific site
        try:
            idx = int(choice) - 1
            site_key = list(TEST_SITES.keys())[idx]
            await test_url_discovery(TEST_SITES[site_key])
        except (ValueError, IndexError):
            print("Invalid choice!")
            return


if __name__ == "__main__":
    asyncio.run(main())