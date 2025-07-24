"""
Test script to verify the entire discovery pipeline after fixes
Tests SimplifiedDiscoveryService with real xTool product URLs
"""

import asyncio
import json
from datetime import datetime
from services.discovery_service import SimplifiedDiscoveryService
from services.database import Database
from config import Config
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def test_discovery_pipeline():
    """Test the complete discovery pipeline with a real xTool product"""
    
    # Test URLs - xTool S1 and P2
    test_urls = [
        "https://www.xtool.com/products/xtool-s1-enclosed-diode-laser-cutter",
        "https://www.xtool.com/products/xtool-p2-55w-co2-laser-cutter"
    ]
    
    # Initialize services
    discovery_service = SimplifiedDiscoveryService()
    db = Database()
    
    print("\n" + "="*80)
    print("DISCOVERY PIPELINE TEST")
    print("="*80)
    
    for url in test_urls:
        print(f"\n\n{'='*80}")
        print(f"Testing URL: {url}")
        print("="*80)
        
        try:
            # Step 1: Discover products using SimplifiedDiscoveryService
            print("\n[1] Running discovery service...")
            discovered_products = await discovery_service.discover_products(url)
            
            if not discovered_products:
                print("❌ No products discovered!")
                continue
            
            print(f"✅ Discovered {len(discovered_products)} product(s)")
            
            for idx, product in enumerate(discovered_products):
                print(f"\n--- Product {idx + 1} ---")
                
                # Step 2: Show raw Scrapfly response (if available)
                print("\n[2] Raw Product Data:")
                print(f"  Name: {product.get('name', 'N/A')}")
                print(f"  URL: {product.get('url', 'N/A')}")
                print(f"  Price: ${product.get('price', 'N/A')}")
                print(f"  Currency: {product.get('currency', 'N/A')}")
                print(f"  In Stock: {product.get('in_stock', 'N/A')}")
                
                # Check if name was properly extracted
                if product.get('name') == 'Unknown' or not product.get('name'):
                    print("  ⚠️  WARNING: Product name not properly extracted!")
                else:
                    print("  ✅ Product name successfully extracted")
                
                # Step 3: Show normalized data structure
                print("\n[3] Normalized Data Structure:")
                normalized_data = {
                    'domain': 'xtool.com',
                    'url': product.get('url'),
                    'name': product.get('name'),
                    'price': product.get('price'),
                    'currency': product.get('currency', 'USD'),
                    'in_stock': product.get('in_stock', True),
                    'discovered_at': datetime.utcnow().isoformat(),
                    'last_checked': datetime.utcnow().isoformat(),
                    'metadata': {
                        'brand': 'xTool',
                        'category': 'laser-cutters',
                        'source': 'discovery_service'
                    }
                }
                
                print(json.dumps(normalized_data, indent=2))
                
                # Step 4: Store in database
                print("\n[4] Storing in database...")
                try:
                    # Check if product already exists
                    existing = db.get_discovered_product_by_url(product.get('url'))
                    
                    if existing:
                        print(f"  Product already exists in DB (ID: {existing['id']})")
                        # Update existing product
                        db.update_discovered_product(existing['id'], {
                            'name': normalized_data['name'],
                            'price': normalized_data['price'],
                            'in_stock': normalized_data['in_stock'],
                            'last_checked': normalized_data['last_checked']
                        })
                        print("  ✅ Updated existing product")
                    else:
                        # Add new product
                        product_id = db.add_discovered_product(
                            domain=normalized_data['domain'],
                            url=normalized_data['url'],
                            name=normalized_data['name'],
                            price=normalized_data['price'],
                            currency=normalized_data['currency'],
                            in_stock=normalized_data['in_stock'],
                            metadata=normalized_data['metadata']
                        )
                        print(f"  ✅ Added new product (ID: {product_id})")
                        
                except Exception as e:
                    print(f"  ❌ Database error: {str(e)}")
                
                # Step 5: Query database to verify storage
                print("\n[5] Verifying database storage...")
                try:
                    stored_product = db.get_discovered_product_by_url(product.get('url'))
                    if stored_product:
                        print("  ✅ Product found in database:")
                        print(f"    - ID: {stored_product['id']}")
                        print(f"    - Name: {stored_product['name']}")
                        print(f"    - Price: ${stored_product['price']}")
                        print(f"    - Last Checked: {stored_product['last_checked']}")
                    else:
                        print("  ❌ Product not found in database!")
                except Exception as e:
                    print(f"  ❌ Query error: {str(e)}")
        
        except Exception as e:
            print(f"\n❌ Error testing {url}: {str(e)}")
            import traceback
            traceback.print_exc()
    
    # Step 6: Show credit usage
    print("\n\n" + "="*80)
    print("CREDIT USAGE SUMMARY")
    print("="*80)
    
    try:
        # Get current credit info from Scrapfly
        import httpx
        headers = {'x-api-key': Config.SCRAPFLY_API_KEY}
        response = httpx.get('https://api.scrapfly.io/v1/account', headers=headers)
        
        if response.status_code == 200:
            account_data = response.json()
            print(f"Remaining Credits: {account_data.get('credits', {}).get('remaining', 'N/A')}")
            print(f"Used Credits: {account_data.get('credits', {}).get('used', 'N/A')}")
        else:
            print("Could not retrieve credit information")
    except Exception as e:
        print(f"Error getting credit info: {str(e)}")
    
    # Final summary
    print("\n\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    # Query all discovered xTool products
    try:
        all_xtool = db.connection.execute("""
            SELECT COUNT(*) as count, 
                   COUNT(DISTINCT name) as unique_names,
                   COUNT(CASE WHEN name != 'Unknown' THEN 1 END) as named_products
            FROM discovered_products 
            WHERE domain = 'xtool.com'
        """).fetchone()
        
        print(f"Total xTool products in DB: {all_xtool['count']}")
        print(f"Unique product names: {all_xtool['unique_names']}")
        print(f"Products with proper names: {all_xtool['named_products']}")
        
        # Show recent discoveries
        recent = db.connection.execute("""
            SELECT name, url, price, discovered_at 
            FROM discovered_products 
            WHERE domain = 'xtool.com' 
            ORDER BY discovered_at DESC 
            LIMIT 5
        """).fetchall()
        
        print("\nRecent xTool discoveries:")
        for r in recent:
            print(f"  - {r['name']}: ${r['price']} (discovered: {r['discovered_at']})")
            
    except Exception as e:
        print(f"Error querying summary: {str(e)}")
    
    print("\n✅ Discovery pipeline test complete!")

if __name__ == "__main__":
    asyncio.run(test_discovery_pipeline())