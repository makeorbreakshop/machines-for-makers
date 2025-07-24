#!/usr/bin/env python3
"""
Check Scrapfly Account Status
"""

import asyncio
import sys
import os
from colorama import init, Fore, Style
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add the current directory to Python path
sys.path.append('.')

from scrapfly import ScrapflyClient

# Initialize colorama for colored output
init()

async def check_account():
    """Check Scrapfly account status"""
    
    print(f"\n{Fore.CYAN}{'='*60}")
    print(f"SCRAPFLY ACCOUNT STATUS")
    print(f"{'='*60}{Style.RESET_ALL}\n")
    
    try:
        # Check API key
        api_key = os.getenv('SCRAPFLY_API_KEY')
        if not api_key:
            print(f"{Fore.RED}❌ SCRAPFLY_API_KEY not set{Style.RESET_ALL}")
            return False
        
        print(f"{Fore.GREEN}✅ API key found: {api_key[:15]}...{Style.RESET_ALL}")
        
        # Initialize client
        client = ScrapflyClient(key=api_key)
        
        # Get account info
        print(f"{Fore.YELLOW}🔄 Fetching account information...{Style.RESET_ALL}")
        
        # Try a simple request to check status
        from scrapfly import ScrapeConfig
        
        config = ScrapeConfig(
            url="https://httpbin.org/ip",  # Simple test endpoint
            asp=False,
            render_js=False
        )
        
        result = await client.async_scrape(config)
        
        print(f"Status: {result.status_code}")
        print(f"Success: {result.success}")
        
        if result.success:
            print(f"{Fore.GREEN}✅ Scrapfly account is working{Style.RESET_ALL}")
            
            # Check if we have access to product extraction
            print(f"\n{Fore.YELLOW}🔄 Testing product extraction capability...{Style.RESET_ALL}")
            
            # Try with a simple product page
            config2 = ScrapeConfig(
                url="https://httpbin.org/json",  # Simple JSON endpoint
                extraction_model='product'
            )
            
            result2 = await client.async_scrape(config2)
            print(f"Product extraction test - Status: {result2.status_code}, Success: {result2.success}")
            
            if result2.success:
                print(f"{Fore.GREEN}✅ Product extraction model available{Style.RESET_ALL}")
            else:
                print(f"{Fore.RED}❌ Product extraction not available or rate limited{Style.RESET_ALL}")
                print(f"Error: {result2.scrape_result.get('error', 'Unknown') if result2.scrape_result else 'No error info'}")
        else:
            print(f"{Fore.RED}❌ Scrapfly request failed{Style.RESET_ALL}")
            if result.scrape_result:
                error = result.scrape_result.get('error', 'Unknown error')
                print(f"Error: {error}")
        
        return result.success
        
    except Exception as e:
        print(f"\n{Fore.RED}❌ ERROR: {str(e)}{Style.RESET_ALL}")
        return False

if __name__ == "__main__":
    success = asyncio.run(check_account())
    sys.exit(0 if success else 1)