#!/usr/bin/env python3
"""
Update Manufacturer Sites with Category URLs
Adds category_urls to scraping_config for Scrapfly-based discovery
"""
import asyncio
import json
from services.database import DatabaseService

# Category URL configurations for each site
SITE_UPDATES = {
    "xTool": {
        "category_urls": [
            "https://www.xtool.com/collections/all",
            "https://www.xtool.com/collections/laser-cutters",
            "https://www.xtool.com/collections/laser-engravers"
        ],
        "discovery_method": "scrapfly",
        "max_products_per_category": 20
    },
    "ComMarker": {
        "category_urls": [
            "https://commarker.com/collections/all",
            "https://commarker.com/collections/laser-engravers",
            "https://commarker.com/collections/laser-cutters"
        ],
        "discovery_method": "scrapfly", 
        "max_products_per_category": 15
    },
    "Bambu Lab": {
        "category_urls": [
            "https://bambulab.com/en/collections/3d-printer",
            "https://bambulab.com/en/collections/all"
        ],
        "discovery_method": "scrapfly",
        "max_products_per_category": 10
    },
    "Prusa": {
        "category_urls": [
            "https://www.prusa3d.com/category/3d-printers/",
            "https://www.prusa3d.com/category/original-prusa-3d-printers/"
        ],
        "discovery_method": "scrapfly",
        "max_products_per_category": 8
    },
    "Shapeoko": {
        "category_urls": [
            "https://shop.carbide3d.com/collections/machines",
            "https://shop.carbide3d.com/collections/all"
        ],
        "discovery_method": "scrapfly",
        "max_products_per_category": 5
    }
}

async def update_manufacturer_sites():
    """Update manufacturer sites with category URLs for Scrapfly discovery"""
    print("Updating Manufacturer Sites with Category URLs")
    print("=" * 60)
    
    db = DatabaseService()
    
    try:
        updated_count = 0
        
        for site_name, updates in SITE_UPDATES.items():
            print(f"\nUpdating {site_name}...")
            
            # Get current site configuration
            response = db.supabase.table("manufacturer_sites") \
                .select("id, scraping_config") \
                .eq("name", site_name) \
                .execute()
            
            if not response.data:
                print(f"❌ Site {site_name} not found")
                continue
            
            site = response.data[0]
            current_config = site.get("scraping_config", {})
            
            print(f"  Current config keys: {list(current_config.keys())}")
            
            # Update configuration with new fields
            updated_config = dict(current_config)
            updated_config.update(updates)
            
            print(f"  Adding {len(updates['category_urls'])} category URLs")
            print(f"  Setting discovery method: {updates['discovery_method']}")
            print(f"  Max products per category: {updates['max_products_per_category']}")
            
            # Update the site
            update_response = db.supabase.table("manufacturer_sites") \
                .update({"scraping_config": updated_config}) \
                .eq("id", site["id"]) \
                .execute()
            
            if update_response.data:
                print(f"✅ Updated {site_name}")
                updated_count += 1
            else:
                print(f"❌ Failed to update {site_name}")
        
        print(f"\n" + "=" * 60)
        print(f"Updated {updated_count} manufacturer sites")
        
        # Show updated configurations
        print("\nUpdated Site Configurations:")
        for site_name in SITE_UPDATES.keys():
            response = db.supabase.table("manufacturer_sites") \
                .select("name, scraping_config") \
                .eq("name", site_name) \
                .execute()
            
            if response.data:
                site = response.data[0]
                config = site.get("scraping_config", {})
                category_urls = config.get("category_urls", [])
                discovery_method = config.get("discovery_method", "unknown")
                max_products = config.get("max_products_per_category", "unknown")
                
                print(f"\n{site_name}:")
                print(f"  Discovery Method: {discovery_method}")
                print(f"  Max Products: {max_products}")
                print(f"  Category URLs: {len(category_urls)} URLs")
                for url in category_urls[:2]:  # Show first 2 URLs
                    print(f"    - {url}")
                if len(category_urls) > 2:
                    print(f"    ... and {len(category_urls) - 2} more")
        
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(update_manufacturer_sites())