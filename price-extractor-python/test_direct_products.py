#!/usr/bin/env python3
"""
Test Direct Products
Tests the pipeline with known working product URLs
"""

import asyncio
import sys
from colorama import init, Fore, Style

# Add the current directory to Python path
sys.path.append('.')

from services.simplified_discovery import SimplifiedDiscoveryService

# Initialize colorama for colored output
init()

async def test_direct_products():
    """Test discovery with known working product URLs"""
    
    print(f"\n{Fore.CYAN}{'='*60}")
    print(f"DIRECT PRODUCTS TEST")
    print(f"{'='*60}{Style.RESET_ALL}\n")
    
    # Known working xTool product URLs
    test_products = [
        "https://www.xtool.com/products/xtool-s1-laser-cutter",
        "https://www.xtool.com/products/xtool-p2-55w-co2-laser-cutter"
    ]
    
    try:
        # Initialize discovery service
        print(f"{Fore.YELLOW}🔄 Initializing discovery service...{Style.RESET_ALL}")
        discovery = SimplifiedDiscoveryService()
        
        print(f"\n{Fore.CYAN}📦 TESTING {len(test_products)} PRODUCTS:{Style.RESET_ALL}")
        for i, url in enumerate(test_products, 1):
            print(f"  {i}. {url.split('/')[-1]}")
        
        # Test each product
        successful_extractions = 0
        total_credits = 0
        
        for i, product_url in enumerate(test_products, 1):
            try:
                print(f"\n{Fore.YELLOW}{'='*50}")
                print(f"🔄 TESTING PRODUCT {i}/{len(test_products)}")
                print(f"{'='*50}{Style.RESET_ALL}")
                print(f"URL: {product_url}")
                
                # Extract product data
                print(f"\n{Fore.YELLOW}🔄 Step 1: Scrapfly extraction...{Style.RESET_ALL}")
                product_data = await discovery.extract_product(product_url)
                
                if not product_data:
                    print(f"{Fore.RED}❌ No data extracted from Scrapfly{Style.RESET_ALL}")
                    continue
                
                # Show extracted data
                name = product_data.get('name', 'Not found')
                brand = product_data.get('brand', 'Not found')
                price_info = product_data.get('offers', [])
                price = price_info[0].get('price', 'Not found') if price_info else 'Not found'
                credits = product_data.get('_credits_used', 0)
                total_credits += credits
                
                print(f"{Fore.GREEN}✅ Scrapfly extraction successful:{Style.RESET_ALL}")
                print(f"   Name: {Fore.CYAN}{name}{Style.RESET_ALL}")
                print(f"   Brand: {Fore.CYAN}{brand}{Style.RESET_ALL}")
                print(f"   Price: {Fore.CYAN}${price}{Style.RESET_ALL}")
                print(f"   Credits: {Fore.YELLOW}{credits}{Style.RESET_ALL}")
                
                # Test Claude mapping
                print(f"\n{Fore.YELLOW}🔄 Step 2: Claude mapping...{Style.RESET_ALL}")
                
                from services.claude_mapper import ClaudeMapper
                mapper = ClaudeMapper()
                
                mapped_data, warnings = mapper.map_to_database_schema(product_data)
                
                machine_name = mapped_data.get('Machine Name', 'Unknown')
                company = mapped_data.get('Company', 'Unknown')
                mapped_price = mapped_data.get('Price', 'Unknown')
                category = mapped_data.get('Machine Category', 'Unknown')
                power = mapped_data.get('Laser Power A', 'Unknown')
                
                print(f"{Fore.GREEN}✅ Claude mapping successful:{Style.RESET_ALL}")
                print(f"   Machine Name: {Fore.CYAN}{machine_name}{Style.RESET_ALL}")
                print(f"   Company: {Fore.CYAN}{company}{Style.RESET_ALL}")
                print(f"   Category: {Fore.CYAN}{category}{Style.RESET_ALL}")
                print(f"   Power: {Fore.CYAN}{power}{Style.RESET_ALL}")
                print(f"   Mapped Price: {Fore.CYAN}${mapped_price}{Style.RESET_ALL}")
                
                if warnings:
                    print(f"   Warnings: {Fore.YELLOW}{len(warnings)} warnings{Style.RESET_ALL}")
                
                # Check if extraction was successful
                if machine_name.lower() == 'unknown' or not machine_name:
                    print(f"\n{Fore.RED}❌ CRITICAL: Machine name is 'Unknown' or missing!{Style.RESET_ALL}")
                else:
                    successful_extractions += 1
                    print(f"\n{Fore.GREEN}✅ PRODUCT {i} SUCCESS: Complete pipeline working{Style.RESET_ALL}")
                
            except Exception as e:
                print(f"\n{Fore.RED}❌ Error with product {i}: {str(e)}{Style.RESET_ALL}")
        
        # Final summary
        print(f"\n{Fore.CYAN}{'='*60}")
        print(f"📊 FINAL SUMMARY")
        print(f"{'='*60}{Style.RESET_ALL}")
        print(f"Products tested: {len(test_products)}")
        print(f"Successful extractions: {Fore.GREEN if successful_extractions > 0 else Fore.RED}{successful_extractions}{Style.RESET_ALL}")
        print(f"Failed extractions: {Fore.RED if (len(test_products) - successful_extractions) > 0 else Fore.GREEN}{len(test_products) - successful_extractions}{Style.RESET_ALL}")
        print(f"Total credits used: {Fore.YELLOW}{total_credits}{Style.RESET_ALL}")
        print(f"Total cost: {Fore.YELLOW}~${total_credits * 0.001:.3f}{Style.RESET_ALL}")
        
        if successful_extractions == len(test_products):
            print(f"\n{Fore.GREEN}🎉 ALL TESTS PASSED!{Style.RESET_ALL}")
            print(f"{Fore.GREEN}✅ Scrapfly extraction working{Style.RESET_ALL}")
            print(f"{Fore.GREEN}✅ Claude mapping working{Style.RESET_ALL}")
            print(f"{Fore.GREEN}✅ No 'Unknown' products{Style.RESET_ALL}")
            print(f"{Fore.GREEN}✅ Complete pipeline functional{Style.RESET_ALL}")
            return True
        elif successful_extractions > 0:
            print(f"\n{Fore.YELLOW}⚠️  PARTIAL SUCCESS: {successful_extractions}/{len(test_products)} products worked{Style.RESET_ALL}")
            return True
        else:
            print(f"\n{Fore.RED}❌ ALL TESTS FAILED: No successful extractions{Style.RESET_ALL}")
            return False
        
    except Exception as e:
        print(f"\n{Fore.RED}❌ CRITICAL ERROR: {str(e)}{Style.RESET_ALL}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print(f"\n{Fore.YELLOW}⚠️  This test will use real Scrapfly credits (~$0.10 for 2 products){Style.RESET_ALL}")
    print("Running test...")
    success = asyncio.run(test_direct_products())
    sys.exit(0 if success else 1)