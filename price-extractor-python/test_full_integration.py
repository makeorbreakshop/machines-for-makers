#!/usr/bin/env python3
"""
Full Integration Test for Price Extractor System
Tests the complete pipeline from discovery to review interface
"""

import asyncio
import sys
from datetime import datetime
from typing import Dict, List, Any
import json
from colorama import init, Fore, Style
from tabulate import tabulate

# Add the current directory to Python path
sys.path.append('.')

from services.database import DatabaseService
from services.discovery_service import DiscoveryService
from services.price_service import PriceService
from config import ANTHROPIC_API_KEY

# Initialize colorama for colored output
init()

class IntegrationTester:
    def __init__(self):
        self.db_service = DatabaseService()
        self.discovery_service = DiscoveryService(self.db_service, api_key=ANTHROPIC_API_KEY)
        self.price_service = PriceService(api_key=ANTHROPIC_API_KEY)
        self.results = {
            'discovery': {'success': False, 'data': []},
            'storage': {'success': False, 'data': []},
            'review_data': {'success': False, 'data': []},
            'credits_used': 0,
            'errors': []
        }
    
    async def run_test(self):
        """Run the complete integration test"""
        print(f"\n{Fore.CYAN}{'='*60}")
        print(f"PRICE EXTRACTOR FULL INTEGRATION TEST")
        print(f"{'='*60}{Style.RESET_ALL}\n")
        
        # Step 1: Discovery
        await self._test_discovery()
        
        # Step 2: Verify Storage
        await self._test_storage()
        
        # Step 3: Simulate Review Interface
        await self._test_review_interface()
        
        # Step 4: Display Results
        self._display_results()
        
        return self._is_success()
    
    async def _test_discovery(self):
        """Test product discovery for xTool"""
        print(f"{Fore.YELLOW}Step 1: Testing Product Discovery{Style.RESET_ALL}")
        print(f"Discovering 3 xTool products...\n")
        
        try:
            # Run discovery for xTool with limit of 3 products
            results = await self.discovery_service.discover_brand_products(
                brand_name="xTool",
                base_url="https://www.xtool.com",
                limit=3
            )
            
            if results and results.get('products'):
                self.results['discovery']['success'] = True
                self.results['discovery']['data'] = results['products']
                self.results['credits_used'] = results.get('credits_used', 0)
                
                print(f"{Fore.GREEN}✓ Discovery successful!{Style.RESET_ALL}")
                print(f"  Found {len(results['products'])} products")
                print(f"  Credits used: {results.get('credits_used', 0)}")
                
                # Display discovered products
                for i, product in enumerate(results['products'], 1):
                    print(f"\n  Product {i}:")
                    print(f"    Name: {product.get('name', 'Unknown')}")
                    print(f"    URL: {product.get('url', 'N/A')}")
                    print(f"    Price: ${product.get('price', 'N/A')}")
            else:
                raise Exception("No products discovered")
                
        except Exception as e:
            self.results['errors'].append(f"Discovery error: {str(e)}")
            print(f"{Fore.RED}✗ Discovery failed: {str(e)}{Style.RESET_ALL}")
    
    async def _test_storage(self):
        """Verify data is properly stored in database"""
        print(f"\n{Fore.YELLOW}Step 2: Verifying Database Storage{Style.RESET_ALL}")
        
        if not self.results['discovery']['success']:
            print(f"{Fore.RED}✗ Skipping storage test - discovery failed{Style.RESET_ALL}")
            return
        
        try:
            # Get the most recent pending machines
            pending_machines = await self.db_service.get_pending_machines(limit=3)
            
            if pending_machines:
                self.results['storage']['success'] = True
                self.results['storage']['data'] = pending_machines
                
                print(f"{Fore.GREEN}✓ Storage verification successful!{Style.RESET_ALL}")
                print(f"  Found {len(pending_machines)} pending machines in database")
                
                # Verify machine names are not "Unknown"
                unknown_count = sum(1 for m in pending_machines if m.get('name') == 'Unknown')
                if unknown_count > 0:
                    print(f"{Fore.YELLOW}  ⚠ Warning: {unknown_count} machines have 'Unknown' name{Style.RESET_ALL}")
                else:
                    print(f"{Fore.GREEN}  ✓ All machines have proper names{Style.RESET_ALL}")
                
            else:
                raise Exception("No pending machines found in database")
                
        except Exception as e:
            self.results['errors'].append(f"Storage error: {str(e)}")
            print(f"{Fore.RED}✗ Storage verification failed: {str(e)}{Style.RESET_ALL}")
    
    async def _test_review_interface(self):
        """Simulate what the review interface would see"""
        print(f"\n{Fore.YELLOW}Step 3: Simulating Review Interface View{Style.RESET_ALL}")
        
        if not self.results['storage']['success']:
            print(f"{Fore.RED}✗ Skipping review interface test - storage failed{Style.RESET_ALL}")
            return
        
        try:
            # Transform data as the review interface would see it
            review_data = []
            for machine in self.results['storage']['data']:
                # Extract price history
                price_history = machine.get('price_history', [])
                current_price = None
                if price_history and isinstance(price_history, list):
                    # Get the most recent price
                    current_price = price_history[0].get('price') if price_history else None
                
                review_item = {
                    'id': machine.get('id'),
                    'name': machine.get('name', 'Unknown'),
                    'brand': machine.get('brands', {}).get('name', 'Unknown'),
                    'url': machine.get('url', ''),
                    'current_price': current_price,
                    'price_count': len(price_history),
                    'status': machine.get('status', 'pending'),
                    'created_at': machine.get('created_at', '')
                }
                review_data.append(review_item)
            
            self.results['review_data']['success'] = True
            self.results['review_data']['data'] = review_data
            
            print(f"{Fore.GREEN}✓ Review interface simulation successful!{Style.RESET_ALL}")
            
            # Display as table
            if review_data:
                headers = ['Name', 'Brand', 'Price', 'Status', 'URL']
                table_data = []
                for item in review_data:
                    table_data.append([
                        item['name'][:30] + '...' if len(item['name']) > 30 else item['name'],
                        item['brand'],
                        f"${item['current_price']}" if item['current_price'] else 'N/A',
                        item['status'],
                        item['url'][:40] + '...' if len(item['url']) > 40 else item['url']
                    ])
                
                print(f"\n{tabulate(table_data, headers=headers, tablefmt='grid')}")
            
        except Exception as e:
            self.results['errors'].append(f"Review interface error: {str(e)}")
            print(f"{Fore.RED}✗ Review interface simulation failed: {str(e)}{Style.RESET_ALL}")
    
    def _display_results(self):
        """Display final test results"""
        print(f"\n{Fore.CYAN}{'='*60}")
        print(f"TEST RESULTS SUMMARY")
        print(f"{'='*60}{Style.RESET_ALL}\n")
        
        # Success/Failure Summary
        total_tests = 3
        passed_tests = sum([
            self.results['discovery']['success'],
            self.results['storage']['success'],
            self.results['review_data']['success']
        ])
        
        print(f"Tests Passed: {passed_tests}/{total_tests}")
        print(f"{'─'*30}")
        
        # Individual test results
        tests = [
            ('Product Discovery', self.results['discovery']['success']),
            ('Database Storage', self.results['storage']['success']),
            ('Review Interface', self.results['review_data']['success'])
        ]
        
        for test_name, success in tests:
            status = f"{Fore.GREEN}✓ PASSED{Style.RESET_ALL}" if success else f"{Fore.RED}✗ FAILED{Style.RESET_ALL}"
            print(f"{test_name:<20} {status}")
        
        # Credit usage
        print(f"\n{'─'*30}")
        print(f"Credits Used: {self.results['credits_used']}")
        
        # Data quality check
        print(f"\n{'─'*30}")
        print(f"Data Quality Check:")
        
        if self.results['storage']['data']:
            total_machines = len(self.results['storage']['data'])
            unknown_names = sum(1 for m in self.results['storage']['data'] if m.get('name') == 'Unknown')
            machines_with_prices = sum(1 for m in self.results['storage']['data'] if m.get('price_history'))
            
            print(f"  Total machines: {total_machines}")
            print(f"  Machines with proper names: {total_machines - unknown_names}/{total_machines}")
            print(f"  Machines with prices: {machines_with_prices}/{total_machines}")
        
        # Errors
        if self.results['errors']:
            print(f"\n{Fore.RED}Errors encountered:{Style.RESET_ALL}")
            for error in self.results['errors']:
                print(f"  - {error}")
        
        # Final verdict
        print(f"\n{'='*60}")
        if self._is_success():
            print(f"{Fore.GREEN}✓ INTEGRATION TEST PASSED - System is ready!{Style.RESET_ALL}")
        else:
            print(f"{Fore.RED}✗ INTEGRATION TEST FAILED - System needs attention{Style.RESET_ALL}")
        print(f"{'='*60}\n")
    
    def _is_success(self):
        """Determine if the test passed"""
        return all([
            self.results['discovery']['success'],
            self.results['storage']['success'],
            self.results['review_data']['success'],
            len(self.results['errors']) == 0
        ])

async def main():
    """Run the integration test"""
    tester = IntegrationTester()
    success = await tester.run_test()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    # Check if running from correct directory
    import os
    if not os.path.exists('config.py'):
        print(f"{Fore.RED}Error: Must run from price-extractor-python directory{Style.RESET_ALL}")
        print(f"Current directory: {os.getcwd()}")
        print(f"Please run: cd price-extractor-python && python test_full_integration.py")
        sys.exit(1)
    
    # Run the test
    asyncio.run(main())