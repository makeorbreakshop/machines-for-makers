#!/usr/bin/env python3
"""
Test URL discovery for manufacturer sites
"""
import asyncio
import json
from services.url_discovery import URLDiscoveryService
from loguru import logger

async def test_url_discovery():
    """Test URL discovery on manufacturer sites"""
    
    discovery = URLDiscoveryService()
    
    # Test with xTool
    test_sites = [
        "https://www.xtool.com",
        # Can add more sites here
    ]
    
    for site in test_sites:
        logger.info(f"\n{'='*60}")
        logger.info(f"Discovering URLs for: {site}")
        logger.info(f"{'='*60}")
        
        try:
            # Discover URLs (crawl up to 5 pages)
            results = await discovery.discover_urls(site, max_pages=5)
            
            print(f"\n📊 Discovery Results:")
            print(f"Pages crawled: {results['pages_crawled']}")
            print(f"Credits used: {results['credits_used']}")
            print(f"Product URLs found: {results['total_urls_found']}")
            
            if results['categorized']:
                print(f"\n📁 URLs by Category:")
                for category, urls in results['categorized'].items():
                    print(f"\n{category.replace('_', ' ').title()}: {len(urls)} URLs")
                    for url in urls[:3]:  # Show first 3
                        print(f"  - {url}")
                    if len(urls) > 3:
                        print(f"  ... and {len(urls) - 3} more")
            
            print(f"\n💰 Cost Estimate:")
            print(f"Estimated credits for full scraping: {results['estimated_total_credits']:,}")
            print(f"Estimated cost: ${results['estimated_total_credits'] * 0.00005:.2f}")
            
            # Validate a sample
            if results['urls']:
                print(f"\n🔍 Validating sample URLs...")
                validation = await discovery.quick_validate_urls(results['urls'][:3])
                
                for url, is_valid in validation.items():
                    status = "✅ Valid" if is_valid else "❌ Invalid"
                    print(f"{status}: {url}")
            
            # Save results
            filename = f"discovered_urls_{results['domain'].replace('.', '_')}.json"
            with open(filename, 'w') as f:
                json.dump(results, f, indent=2)
            print(f"\n💾 Results saved to: {filename}")
            
        except Exception as e:
            logger.error(f"Error discovering {site}: {str(e)}")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_url_discovery())