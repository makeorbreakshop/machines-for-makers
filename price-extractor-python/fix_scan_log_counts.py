#!/usr/bin/env python3
"""
Fix Scan Log Counts
Updates site_scan_logs with correct product counts based on actual discovered_machines
"""
import asyncio
from services.database import DatabaseService

async def fix_scan_log_counts():
    """Fix scan log counts to match actual discovered machines"""
    print("Fixing Scan Log Counts")
    print("=" * 50)
    
    db = DatabaseService()
    
    try:
        # Get all discovered machines grouped by scan_log_id
        response = db.supabase.table("discovered_machines") \
            .select("scan_log_id") \
            .execute()
        
        discovered_machines = response.data or []
        
        # Count machines per scan_log_id
        scan_counts = {}
        for machine in discovered_machines:
            scan_id = machine['scan_log_id']
            scan_counts[scan_id] = scan_counts.get(scan_id, 0) + 1
        
        # Get scan logs that need fixing
        scan_logs_to_fix = []
        for scan_id, actual_count in scan_counts.items():
            if scan_id:  # Skip None scan_log_ids
                scan_response = db.supabase.table("site_scan_logs") \
                    .select("id, products_found, products_processed") \
                    .eq("id", scan_id) \
                    .execute()
                
                if scan_response.data:
                    scan_log = scan_response.data[0]
                    if scan_log['products_found'] != actual_count or scan_log['products_processed'] != actual_count:
                        scan_log['actual_machine_count'] = actual_count
                        scan_logs_to_fix.append(scan_log)
        
        print(f"Found {len(scan_logs_to_fix)} scan logs to fix")
        
        for scan_log in scan_logs_to_fix:
            scan_id = scan_log['id']
            actual_count = scan_log['actual_machine_count']
            
            print(f"\nFixing scan {scan_id}")
            print(f"  Current: {scan_log['products_found']} found, {scan_log['products_processed']} processed")
            print(f"  Should be: {actual_count} found, {actual_count} processed")
            
            # Update the scan log
            update_response = db.supabase.table("site_scan_logs") \
                .update({
                    "products_found": actual_count,
                    "products_processed": actual_count
                }) \
                .eq("id", scan_id) \
                .execute()
            
            if update_response.data:
                print(f"✅ Updated scan log {scan_id}")
            else:
                print(f"❌ Failed to update scan log {scan_id}")
        
        print(f"\n" + "=" * 50)
        print("Scan log counts fixed!")
        
        # Show updated results
        print("\nUpdated scan logs with discovered machines:")
        for scan_id, actual_count in scan_counts.items():
            if scan_id:
                scan_response = db.supabase.table("site_scan_logs") \
                    .select("id, products_found, products_processed, site_id") \
                    .eq("id", scan_id) \
                    .execute()
                
                if scan_response.data:
                    scan_log = scan_response.data[0]
                    
                    # Get site name
                    site_response = db.supabase.table("manufacturer_sites") \
                        .select("name") \
                        .eq("id", scan_log['site_id']) \
                        .execute()
                    
                    site_name = site_response.data[0]['name'] if site_response.data else 'Unknown'
                    print(f"  {site_name}: {scan_log['products_found']} found, {actual_count} actual")
        
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(fix_scan_log_counts())