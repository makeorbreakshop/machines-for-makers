#!/usr/bin/env python3
"""Test discovery with real database records"""
import asyncio
import logging
from datetime import datetime
import uuid
from services.discovery_service import DiscoveryService, DiscoveryRequest
from services.database import DatabaseService

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def test_discovery_with_real_site():
    """Test discovery using real manufacturer site from database"""
    db = DatabaseService()
    
    try:
        # Get a real manufacturer site
        logger.info("Getting manufacturer site from database...")
        sites = db.supabase.table("manufacturer_sites") \
            .select("*") \
            .eq("base_url", "https://www.xtool.com") \
            .limit(1) \
            .execute()
        
        if not sites.data:
            logger.error("No xTool site found in database")
            return
            
        site = sites.data[0]
        logger.info(f"Found site: {site['name']} (ID: {site['id']})")
        
        # Create a scan log entry
        logger.info("Creating scan log entry...")
        scan_log_data = {
            'site_id': site['id'],
            'scan_type': 'discovery',
            'status': 'pending'
        }
        
        scan_log = db.supabase.table("site_scan_logs") \
            .insert(scan_log_data) \
            .execute()
            
        if not scan_log.data:
            logger.error("Failed to create scan log")
            return
            
        scan_log_id = scan_log.data[0]['id']
        logger.info(f"Created scan log: {scan_log_id}")
        
        # Create discovery request
        request = DiscoveryRequest(
            scan_log_id=scan_log_id,
            site_id=site['id'],
            base_url=site['base_url'],
            sitemap_url=site.get('sitemap_url'),
            scraping_config=site.get('scraping_config', {}),
            scan_type='discovery'
        )
        
        # Run discovery
        logger.info("Starting discovery service...")
        service = DiscoveryService()
        result = await service.discover_products(request)
        
        print("\n" + "="*60)
        print("DISCOVERY RESULTS")
        print("="*60)
        print(f"Success: {result.success}")
        print(f"URLs discovered: {result.discovered_count}")
        print(f"Products processed: {result.processed_count}")
        print(f"Errors: {result.error_count}")
        print(f"Total cost: ${result.total_cost:.2f}")
        
        if result.errors:
            print("\nErrors:")
            for error in result.errors[:5]:  # Show first 5
                print(f"  - {error}")
                
        # Check what was stored
        logger.info("\nChecking stored URLs...")
        stored = db.supabase.table("discovered_machines") \
            .select("source_url, status") \
            .eq("scan_log_id", scan_log_id) \
            .limit(10) \
            .execute()
            
        if stored.data:
            print(f"\nStored {len(stored.data)} URLs in database:")
            for item in stored.data[:5]:
                print(f"  - {item['source_url']} [{item['status']}]")
        
    except Exception as e:
        logger.error(f"Test failed: {str(e)}", exc_info=True)
    finally:
        if 'service' in locals():
            await service.cleanup()

if __name__ == "__main__":
    asyncio.run(test_discovery_with_real_site())