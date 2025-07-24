#!/usr/bin/env python3
"""
Test Scrapfly Direct
Tests Scrapfly service directly
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

from scrapfly import ScrapflyClient, ScrapeConfig

# Initialize colorama for colored output
init()

async def test_scrapfly_direct():
    """Test Scrapfly service directly"""
    
    print(f"\n{Fore.CYAN}{'='*60}")
    print(f"SCRAPFLY DIRECT TEST")
    print(f"{'='*60}{Style.RESET_ALL}\n")
    
    try:
        # Check API key
        api_key = os.getenv('SCRAPFLY_API_KEY')
        if not api_key:
            print(f"{Fore.RED}❌ SCRAPFLY_API_KEY not set{Style.RESET_ALL}")
            return False
        
        print(f"{Fore.GREEN}✅ API key found: {api_key[:10]}...{Style.RESET_ALL}")
        
        # Initialize client
        print(f"{Fore.YELLOW}🔄 Initializing Scrapfly client...{Style.RESET_ALL}")
        client = ScrapflyClient(key=api_key, max_concurrency=1)
        
        # Test URL
        test_url = "https://www.xtool.com/products/xtool-s1-laser-cutter"
        print(f"{Fore.YELLOW}🔄 Testing URL: {test_url}{Style.RESET_ALL}")
        
        # Create config
        config = ScrapeConfig(
            url=test_url,
            asp=True,
            render_js=True,
            extraction_model='product'
        )
        
        print(f"{Fore.YELLOW}🔄 Making Scrapfly request...{Style.RESET_ALL}")
        result = await client.async_scrape(config)
        
        print(f"{Fore.GREEN}✅ Request successful!{Style.RESET_ALL}")
        print(f"Status: {result.status_code}")
        print(f"Success: {result.success}")
        
        # Check result structure
        print(f"\n{Fore.CYAN}📊 RESULT STRUCTURE:{Style.RESET_ALL}")
        print(f"Result type: {type(result)}")
        print(f"Has scrape_result: {hasattr(result, 'scrape_result')}")
        
        if hasattr(result, 'scrape_result'):
            scrape_result = result.scrape_result
            print(f"scrape_result type: {type(scrape_result)}")
            print(f"scrape_result is None: {scrape_result is None}")
            
            if scrape_result:
                print(f"scrape_result keys: {list(scrape_result.keys()) if isinstance(scrape_result, dict) else 'Not a dict'}")
                
                if isinstance(scrape_result, dict) and 'extracted_data' in scrape_result:
                    extracted = scrape_result['extracted_data']
                    print(f"extracted_data type: {type(extracted)}")
                    
                    if isinstance(extracted, dict):
                        print(f"extracted_data keys: {list(extracted.keys())}")
                        
                        if 'data' in extracted:
                            data = extracted['data']
                            print(f"data type: {type(data)}")
                            
                            if isinstance(data, dict):
                                name = data.get('name', 'Not found')
                                print(f"\n{Fore.GREEN}✅ Product name: {name}{Style.RESET_ALL}")
                                return True
        
        print(f"{Fore.RED}❌ Could not extract product data{Style.RESET_ALL}")
        return False
        
    except Exception as e:
        print(f"\n{Fore.RED}❌ ERROR: {str(e)}{Style.RESET_ALL}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_scrapfly_direct())
    sys.exit(0 if success else 1)