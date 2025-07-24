#!/usr/bin/env python3
"""
Find xTool Category URL
Tests different possible category URLs to find working ones
"""

import asyncio
import sys
from colorama import init, Fore, Style

# Add the current directory to Python path
sys.path.append('.')

from services.scrapfly_service import get_scrapfly_service
from scrapfly import ScrapeConfig

# Initialize colorama for colored output
init()

async def test_category_urls():
    """Test different category URLs to find working ones"""
    
    print(f"\n{Fore.CYAN}{'='*60}")
    print(f"FIND XTOOL CATEGORY URL TEST")
    print(f"{'='*60}{Style.RESET_ALL}\n")
    
    # List of possible category URLs to try
    possible_urls = [
        "https://www.xtool.com/collections/all",
        "https://www.xtool.com/collections/laser-cutters",
        "https://www.xtool.com/collections/laser-engravers",
        "https://www.xtool.com/collections",
        "https://www.xtool.com/products",
        "https://www.xtool.com/shop",
        "https://www.xtool.com/",
    ]
    
    scrapfly = get_scrapfly_service()
    
    for url in possible_urls:
        try:
            print(f"{Fore.YELLOW}🔄 Testing: {url}{Style.RESET_ALL}")
            
            config = ScrapeConfig(
                url=url,
                asp=True,
                render_js=True,
                country='US'
            )
            
            result = await scrapfly.client.async_scrape(config)
            
            if result.success:
                # Check if it contains product links
                html = result.content
                product_link_count = html.count('/products/')
                
                print(f"  {Fore.GREEN}✅ SUCCESS - Status: {result.status_code}, Product links found: {product_link_count}{Style.RESET_ALL}")
                
                if product_link_count > 0:
                    print(f"  {Fore.CYAN}   This looks like a good category page!{Style.RESET_ALL}")
            else:
                print(f"  {Fore.RED}❌ FAILED - Status: {result.status_code}{Style.RESET_ALL}")
                
        except Exception as e:
            print(f"  {Fore.RED}❌ ERROR: {str(e)}{Style.RESET_ALL}")
        
        print()

if __name__ == "__main__":
    asyncio.run(test_category_urls())