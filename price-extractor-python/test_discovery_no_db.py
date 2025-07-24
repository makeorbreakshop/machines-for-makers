#!/usr/bin/env python3
"""
Test Discovery Without Database
Just tests the discovery and mapping without storing in database
"""

import asyncio
import sys
import uuid
from colorama import init, Fore, Style

# Add the current directory to Python path
sys.path.append('.')

from services.simplified_discovery import SimplifiedDiscoveryService

# Initialize colorama for colored output
init()

async def test_discovery_no_db():
    """Test discovery process without database storage"""
    
    print(f"\n{Fore.CYAN}{'='*60}")
    print(f"DISCOVERY TEST (NO DATABASE)")
    print(f"{'='*60}{Style.RESET_ALL}\n")
    
    try:
        # Initialize discovery service
        print(f"{Fore.YELLOW}🔄 Initializing discovery service...{Style.RESET_ALL}")
        discovery = SimplifiedDiscoveryService()
        
        # Test with xTool main page to find product URLs
        category_url = "https://www.xtool.com/"
        
        print(f"\n{Fore.YELLOW}🔄 Finding product URLs from: {category_url}{Style.RESET_ALL}")
        
        # First, let's manually get the category page and extract URLs
        from services.scrapfly_service import get_scrapfly_service
        from scrapfly import ScrapeConfig
        
        scrapfly = get_scrapfly_service()
        
        config = ScrapeConfig(
            url=category_url,
            asp=True,
            render_js=True,
            auto_scroll=True,
            country='US'
        )
        
        result = await scrapfly.client.async_scrape(config)
        html = result.content
        
        # Extract product URLs manually
        product_urls = discovery._extract_product_urls(html, category_url)
        
        print(f"{Fore.GREEN}✅ Found {len(product_urls)} product URLs{Style.RESET_ALL}")
        
        # Test with first 2 products
        test_urls = product_urls[:2]
        
        print(f"\n{Fore.CYAN}📦 TESTING PRODUCTS:{Style.RESET_ALL}")
        for i, url in enumerate(test_urls, 1):
            print(f"  {i}. {url}")
        
        # Extract each product
        successful_extractions = 0
        for i, product_url in enumerate(test_urls, 1):
            try:
                print(f"\n{Fore.YELLOW}🔄 Extracting product {i}/{len(test_urls)}: {Style.RESET_ALL}")
                print(f"   {product_url}")
                
                # Extract product data
                product_data = await discovery.extract_product(product_url)
                
                if product_data:
                    # Get basic info
                    name = product_data.get('name', 'Not found')
                    brand = product_data.get('brand', 'Not found')
                    price_info = product_data.get('offers', [])
                    price = price_info[0].get('price', 'Not found') if price_info else 'Not found'
                    credits = product_data.get('_credits_used', 'Unknown')
                    
                    print(f"  {Fore.GREEN}✅ Extraction successful:{Style.RESET_ALL}")
                    print(f"     Name: {Fore.CYAN}{name}{Style.RESET_ALL}")
                    print(f"     Brand: {Fore.CYAN}{brand}{Style.RESET_ALL}")
                    print(f"     Price: {Fore.CYAN}${price}{Style.RESET_ALL}")
                    print(f"     Credits: {Fore.YELLOW}{credits}{Style.RESET_ALL}")
                    
                    # Test Claude mapping
                    print(f"  {Fore.YELLOW}🔄 Testing Claude mapping...{Style.RESET_ALL}")
                    
                    from services.claude_mapper import ClaudeMapper
                    mapper = ClaudeMapper()
                    
                    mapped_data, warnings = mapper.map_to_database_schema(product_data)
                    
                    machine_name = mapped_data.get('Machine Name', 'Unknown')
                    company = mapped_data.get('Company', 'Unknown')
                    mapped_price = mapped_data.get('Price', 'Unknown')
                    
                    print(f"  {Fore.GREEN}✅ Claude mapping successful:{Style.RESET_ALL}")
                    print(f"     Machine Name: {Fore.CYAN}{machine_name}{Style.RESET_ALL}")
                    print(f"     Company: {Fore.CYAN}{company}{Style.RESET_ALL}")
                    print(f"     Mapped Price: {Fore.CYAN}{mapped_price}{Style.RESET_ALL}")
                    
                    if warnings:
                        print(f"     Warnings: {Fore.YELLOW}{len(warnings)}{Style.RESET_ALL}")
                    
                    # Check if name is "Unknown"
                    if machine_name.lower() == 'unknown' or not machine_name:
                        print(f"  {Fore.RED}❌ CRITICAL: Machine name is 'Unknown'!{Style.RESET_ALL}")
                    else:
                        successful_extractions += 1
                        print(f"  {Fore.GREEN}✅ Product name successfully extracted{Style.RESET_ALL}")
                
                else:
                    print(f"  {Fore.RED}❌ No data extracted{Style.RESET_ALL}")
                
            except Exception as e:
                print(f"  {Fore.RED}❌ Error: {str(e)}{Style.RESET_ALL}")
        
        # Summary
        print(f"\n{Fore.CYAN}📊 SUMMARY:{Style.RESET_ALL}")
        print(f"{Fore.WHITE}{'-'*40}{Style.RESET_ALL}")
        print(f"Products tested: {len(test_urls)}")
        print(f"Successful extractions: {Fore.GREEN}{successful_extractions}{Style.RESET_ALL}")
        print(f"Failed extractions: {Fore.RED}{len(test_urls) - successful_extractions}{Style.RESET_ALL}")
        
        if successful_extractions > 0:
            print(f"\n{Fore.GREEN}✅ TEST PASSED: Discovery pipeline working correctly{Style.RESET_ALL}")
            print(f"{Fore.GREEN}   Products successfully extracted with proper names{Style.RESET_ALL}")
            return True
        else:
            print(f"\n{Fore.RED}❌ TEST FAILED: No successful extractions{Style.RESET_ALL}")
            return False
        
    except Exception as e:
        print(f"\n{Fore.RED}❌ ERROR: {str(e)}{Style.RESET_ALL}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print(f"\n{Fore.YELLOW}⚠️  This test will use real Scrapfly credits (~$0.10-0.20 for 2 products){Style.RESET_ALL}")
    print("Running test...")
    success = asyncio.run(test_discovery_no_db())
    sys.exit(0 if success else 1)