#!/usr/bin/env python3
"""
SAFE single product discovery test.
Tests the discovery pipeline with ONE xTool product.
"""
import asyncio
import json
from services.simplified_discovery import SimplifiedDiscoveryService
from services.database import DatabaseService
from loguru import logger

async def test_single_discovery():
    """Test discovery with a single xTool product"""
    
    # Single product URL to test
    test_url = "https://www.xtool.com/products/xtool-s1-40w-enclosed-diode-laser-cutter"
    
    logger.info(f"Testing discovery with URL: {test_url}")
    
    # Initialize services
    discovery = SimplifiedDiscoveryService()
    db = DatabaseService()
    
    try:
        # Step 1: Extract product data
        logger.info("Step 1: Extracting product data from URL...")
        extracted_data = await discovery.extract_product_data(test_url)
        
        if not extracted_data:
            logger.error("Failed to extract product data")
            return
        
        logger.info(f"✅ Extracted data for: {extracted_data.get('name', 'Unknown Product')}")
        logger.info(f"   Price: ${extracted_data.get('price', 'N/A')}")
        logger.info(f"   Images: {len(extracted_data.get('images', []))} found")
        
        # Step 2: Map with OpenAI
        logger.info("\nStep 2: Mapping data with OpenAI...")
        mapped_data = await discovery.map_to_database_schema(extracted_data)
        
        if not mapped_data:
            logger.error("Failed to map data")
            return
        
        logger.info(f"✅ Mapped {len(mapped_data)} fields")
        logger.info(f"   Machine Category: {mapped_data.get('machine_category', 'N/A')}")
        logger.info(f"   Laser Type: {mapped_data.get('laser_type_a', 'N/A')}")
        logger.info(f"   Work Area: {mapped_data.get('work_area', 'N/A')}")
        
        # Step 3: Save to database
        logger.info("\nStep 3: Saving to discovered_machines...")
        machine_data = {
            'manufacturer_site_id': 'xtool-test',  # Test site ID
            'raw_data': extracted_data,
            'normalized_data': mapped_data,
            'source_url': test_url,
            'status': 'pending'
        }
        
        result = await db.save_discovered_machine(machine_data)
        
        if result:
            logger.info(f"✅ Saved to database with ID: {result['id']}")
            logger.info("\n🎉 Discovery test completed successfully!")
            logger.info("You can now review this machine in the admin panel at:")
            logger.info("http://localhost:3000/admin/discovery")
        else:
            logger.error("Failed to save to database")
            
    except Exception as e:
        logger.error(f"Discovery test failed: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        await db.close()

if __name__ == "__main__":
    print("=" * 60)
    print("Single Product Discovery Test")
    print("=" * 60)
    print("This will discover ONE product from xTool")
    print("Estimated cost: ~50-100 credits")
    print("=" * 60)
    
    response = input("\nProceed with test? (yes/no): ")
    if response.lower() != 'yes':
        print("Test cancelled.")
    else:
        asyncio.run(test_single_discovery())