#!/usr/bin/env python3
"""
Test with Real xTool Product
Tests the complete pipeline with a real product from xTool website
"""

import asyncio
import sys
import json
from colorama import init, Fore, Style

# Add the current directory to Python path
sys.path.append('.')

from services.simplified_discovery import SimplifiedDiscoveryService

# Initialize colorama for colored output
init()

async def test_real_xtool_product():
    """Test with a real xTool product"""
    
    print(f"\n{Fore.CYAN}{'='*60}")
    print(f"REAL xTOOL PRODUCT TEST")
    print(f"{'='*60}{Style.RESET_ALL}\n")
    
    # Known xTool product URL
    product_url = "https://www.xtool.com/products/xtool-s1-laser-cutter"
    
    try:
        # Initialize discovery service
        print(f"{Fore.YELLOW}🔄 Initializing discovery service...{Style.RESET_ALL}")
        discovery = SimplifiedDiscoveryService()
        
        # Extract the product
        print(f"{Fore.YELLOW}🔄 Extracting product data from: {product_url}{Style.RESET_ALL}")
        print(f"{Fore.YELLOW}   This will use Scrapfly credits (~50 credits = ~$0.05){Style.RESET_ALL}")
        
        # Use the extract_product method directly
        extracted_data = await discovery.extract_product(product_url)
        
        if not extracted_data:
            print(f"{Fore.RED}❌ No data extracted from product page{Style.RESET_ALL}")
            return False
        
        print(f"\n{Fore.GREEN}✅ Product extraction successful!{Style.RESET_ALL}\n")
        
        # Display extracted data
        print(f"{Fore.CYAN}📊 EXTRACTED DATA:{Style.RESET_ALL}")
        print(f"{Fore.WHITE}{'-'*40}{Style.RESET_ALL}")
        
        # Show key fields
        name = extracted_data.get('name', 'Not found')
        brand = extracted_data.get('brand', 'Not found')
        price_info = extracted_data.get('offers', [])
        price = price_info[0].get('price', 'Not found') if price_info else 'Not found'
        specs = extracted_data.get('specifications', [])
        credits = extracted_data.get('_credits_used', 'Unknown')
        
        print(f"Product Name: {Fore.GREEN}{name}{Style.RESET_ALL}")
        print(f"Brand: {Fore.GREEN}{brand}{Style.RESET_ALL}")
        print(f"Price: {Fore.GREEN}${price}{Style.RESET_ALL}")
        print(f"Credits Used: {Fore.YELLOW}{credits}{Style.RESET_ALL}")
        print(f"Specifications Found: {Fore.CYAN}{len(specs)}{Style.RESET_ALL}")
        
        # Show first few specs
        if specs:
            print(f"\n{Fore.CYAN}🔧 SAMPLE SPECIFICATIONS:{Style.RESET_ALL}")
            for i, spec in enumerate(specs[:5]):
                if isinstance(spec, dict) and 'name' in spec and 'value' in spec:
                    print(f"  • {spec['name']}: {Fore.GREEN}{spec['value']}{Style.RESET_ALL}")
        
        # Test Claude mapping on this real data
        print(f"\n{Fore.YELLOW}🔄 Testing Claude mapping on real data...{Style.RESET_ALL}")
        
        from services.claude_mapper import ClaudeMapper
        mapper = ClaudeMapper()
        
        mapped_data, warnings = mapper.map_to_database_schema(extracted_data)
        
        print(f"\n{Fore.GREEN}✅ Claude mapping successful!{Style.RESET_ALL}\n")
        
        print(f"{Fore.CYAN}📋 MAPPED FOR DATABASE:{Style.RESET_ALL}")
        print(f"{Fore.WHITE}{'-'*40}{Style.RESET_ALL}")
        
        key_fields = ['Machine Name', 'Company', 'Price', 'Machine Category', 'Laser Power A', 'Working Area']
        for field in key_fields:
            value = mapped_data.get(field, 'Not mapped')
            print(f"{field}: {Fore.GREEN}{value}{Style.RESET_ALL}")
        
        if warnings:
            print(f"\n{Fore.YELLOW}⚠️  Warnings:{Style.RESET_ALL}")
            for warning in warnings:
                print(f"  • {warning}")
        
        # Check if name is "Unknown"
        machine_name = mapped_data.get('Machine Name', '')
        if machine_name.lower() == 'unknown' or not machine_name:
            print(f"\n{Fore.RED}❌ CRITICAL: Machine name is missing or 'Unknown'!{Style.RESET_ALL}")
            return False
        
        print(f"\n{Fore.GREEN}✅ TEST PASSED: Real product data successfully extracted and mapped{Style.RESET_ALL}")
        print(f"{Fore.GREEN}   Product name: '{machine_name}' (NOT 'Unknown'){Style.RESET_ALL}")
        return True
        
    except Exception as e:
        print(f"\n{Fore.RED}❌ ERROR: {str(e)}{Style.RESET_ALL}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print(f"\n{Fore.YELLOW}⚠️  This test will use real Scrapfly credits (~$0.05){Style.RESET_ALL}")
    print("Running test...")
    success = asyncio.run(test_real_xtool_product())
    sys.exit(0 if success else 1)