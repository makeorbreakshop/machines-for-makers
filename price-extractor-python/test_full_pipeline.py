#!/usr/bin/env python3
"""
Test the full scraping pipeline to see where it's failing
"""
import asyncio
import requests
from services.simplified_discovery import SimplifiedDiscoveryService
from services.database import DatabaseService

async def test_full_pipeline():
    print("🧪 Testing full scraping pipeline...")
    
    # Test URL from admin interface
    test_url = "https://omtechlaser.com/products/pronto-75-150w-co2-laser-engraver-and-cutter-upgraded-version"
    manufacturer_id = "0234c783-b4d6-4b3f-9336-f558369d2763"  # Acmer ID
    
    # Step 1: Extract product data
    print(f"Step 1: Extracting product data from {test_url}")
    service = SimplifiedDiscoveryService()
    
    try:
        product_data = await service.extract_product_data(test_url)
        if product_data:
            print(f"✅ Product extracted: {product_data.get('name', 'Unknown')}")
            print(f"   Keys: {list(product_data.keys())}")
        else:
            print("❌ No product data extracted")
            return
    except Exception as e:
        print(f"❌ Extraction failed: {e}")
        return
    
    # Step 2: Save to database
    print(f"Step 2: Saving to database...")
    try:
        saved = await service.save_discovered_machine(
            url=test_url,
            raw_data=product_data,
            manufacturer_id=manufacturer_id
        )
        if saved:
            print("✅ Machine saved to database")
        else:
            print("❌ Failed to save machine")
            return
    except Exception as e:
        print(f"❌ Save failed: {e}")
        return
    
    # Step 3: Check if it exists in discovered_machines table
    print("Step 3: Checking discovered_machines table...")
    db = DatabaseService()
    try:
        discovered_machines = await db.get_discovered_machines()
        print(f"✅ Found {len(discovered_machines)} discovered machines")
        
        # Find our machine
        our_machine = None
        for machine in discovered_machines:
            if machine.get('source_url') == test_url:
                our_machine = machine
                break
        
        if our_machine:
            print(f"✅ Found our machine in discovered_machines:")
            print(f"   Name: {our_machine.get('normalized_data', {}).get('name', 'Unknown')}")
            print(f"   Status: {our_machine.get('status', 'Unknown')}")
            print(f"   ID: {our_machine.get('id', 'Unknown')}")
        else:
            print("❌ Our machine not found in discovered_machines table")
            
    except Exception as e:
        print(f"❌ Database check failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_full_pipeline())