#!/usr/bin/env python3
"""
Simple Discovery Test
Tests product discovery and storage in database
"""

import asyncio
import sys
import uuid
from colorama import init, Fore, Style

# Add the current directory to Python path
sys.path.append('.')

from services.simplified_discovery import SimplifiedDiscoveryService
from services.database import DatabaseService

# Initialize colorama for colored output
init()

async def test_discovery():
    """Test discovery process"""
    
    print(f"\n{Fore.CYAN}{'='*60}")
    print(f"DISCOVERY & STORAGE TEST")
    print(f"{'='*60}{Style.RESET_ALL}\n")
    
    try:
        # Initialize services
        print(f"{Fore.YELLOW}🔄 Initializing services...{Style.RESET_ALL}")
        discovery = SimplifiedDiscoveryService()
        db = DatabaseService()
        
        # Generate test IDs
        site_id = str(uuid.uuid4())
        scan_id = str(uuid.uuid4())
        
        print(f"Site ID: {site_id}")
        print(f"Scan ID: {scan_id}")
        
        # Test with xTool main page (just 2 products to save credits)
        category_url = "https://www.xtool.com/"
        
        print(f"\n{Fore.YELLOW}🔄 Starting discovery from: {category_url}{Style.RESET_ALL}")
        print(f"{Fore.YELLOW}   Limiting to 2 products to save credits{Style.RESET_ALL}")
        
        # Run discovery
        results = await discovery.discover_from_category(
            category_url=category_url,
            site_id=site_id,
            scan_id=scan_id,
            max_products=2
        )
        
        print(f"\n{Fore.GREEN}✅ Discovery completed!{Style.RESET_ALL}\n")
        
        # Display results
        print(f"{Fore.CYAN}📊 DISCOVERY RESULTS:{Style.RESET_ALL}")
        print(f"{Fore.WHITE}{'-'*40}{Style.RESET_ALL}")
        print(f"Products Discovered: {Fore.GREEN}{results['discovered_products']}{Style.RESET_ALL}")
        print(f"Product URLs Found: {Fore.CYAN}{len(results['product_urls'])}{Style.RESET_ALL}")
        print(f"Errors: {Fore.RED if results['errors'] else Fore.GREEN}{len(results['errors'])}{Style.RESET_ALL}")
        
        if results['errors']:
            print(f"\n{Fore.RED}❌ ERRORS:{Style.RESET_ALL}")
            for error in results['errors']:
                print(f"  • {error}")
        
        # Check what was stored in database
        print(f"\n{Fore.YELLOW}🔄 Checking database storage...{Style.RESET_ALL}")
        
        # Query discovered machines
        discovered_machines = db.supabase.table("discovered_machines") \
            .select("*") \
            .eq("scan_log_id", scan_id) \
            .execute()
        
        if discovered_machines.data:
            print(f"\n{Fore.GREEN}✅ Found {len(discovered_machines.data)} products in database{Style.RESET_ALL}\n")
            
            for i, machine in enumerate(discovered_machines.data, 1):
                normalized_data = machine.get('normalized_data', {})
                name = normalized_data.get('Machine Name', 'Unknown')
                price = normalized_data.get('Price', 'Unknown')
                
                print(f"{Fore.CYAN}Product {i}:{Style.RESET_ALL}")
                print(f"  Name: {Fore.GREEN if name != 'Unknown' else Fore.RED}{name}{Style.RESET_ALL}")
                print(f"  Price: {Fore.GREEN}{price}{Style.RESET_ALL}")
                print(f"  Status: {machine.get('status', 'Unknown')}")
                
                # Check for validation errors
                errors = machine.get('validation_errors', [])
                if errors:
                    print(f"  Errors: {Fore.RED}{len(errors)} validation errors{Style.RESET_ALL}")
                else:
                    print(f"  Errors: {Fore.GREEN}None{Style.RESET_ALL}")
                print()
        
        # Success check
        unknown_count = sum(1 for machine in discovered_machines.data 
                          if machine.get('normalized_data', {}).get('Machine Name', '').lower() == 'unknown')
        
        if unknown_count > 0:
            print(f"{Fore.RED}❌ CRITICAL: {unknown_count} products have 'Unknown' names{Style.RESET_ALL}")
            return False
        
        if results['discovered_products'] > 0:
            print(f"{Fore.GREEN}✅ TEST PASSED: Discovery and storage working correctly{Style.RESET_ALL}")
            print(f"{Fore.GREEN}   All products have proper names (not 'Unknown'){Style.RESET_ALL}")
            return True
        else:
            print(f"{Fore.RED}❌ No products were discovered{Style.RESET_ALL}")
            return False
        
    except Exception as e:
        print(f"\n{Fore.RED}❌ ERROR: {str(e)}{Style.RESET_ALL}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print(f"\n{Fore.YELLOW}⚠️  This test will use real Scrapfly credits (~$0.10-0.20 for 2 products){Style.RESET_ALL}")
    print("Running test...")
    success = asyncio.run(test_discovery())
    sys.exit(0 if success else 1)