#!/usr/bin/env python3
"""
Sync machines.Price with latest manual corrections via API.
This fixes the existing stale prices in the machines table.
"""

import requests
import json

API_BASE = "http://localhost:8000"

def sync_commarker_omni_price():
    """Sync ComMarker Omni 1 UV laser price specifically."""
    print("🎯 Syncing ComMarker Omni 1 UV laser price...")
    print("=" * 60)
    
    # Based on your screenshot, the machine should be corrected to $3,888
    # We need to find the latest price_history ID with MANUAL_CORRECTION status
    
    # For now, let's create a direct API call to fix this specific machine
    # We'll need to add a new endpoint to handle this
    
    print("🔧 This requires a new API endpoint to sync existing manual corrections")
    print("   Let's create that endpoint in the API...")
    
    return True

def create_sync_endpoint():
    """Show what needs to be added to the API."""
    print("\n📋 API Endpoint needed in routes.py:")
    print("=" * 60)
    
    endpoint_code = '''
@router.post("/sync-manual-corrections")
async def sync_manual_corrections():
    """
    Sync machines.Price with the latest manual corrections from price_history.
    This fixes existing stale prices in the machines table.
    """
    try:
        logger.info("Starting sync of manual corrections to machines table")
        
        # Get all machines that have manual corrections
        corrections_response = price_service.db_service.supabase.table("price_history") \\
            .select("machine_id, price, date") \\
            .eq("status", "MANUAL_CORRECTION") \\
            .order("date", desc=True) \\
            .execute()
        
        if not corrections_response.data:
            return {"success": True, "message": "No manual corrections found", "updated_count": 0}
        
        # Group by machine_id and get the latest correction for each
        machine_corrections = {}
        for correction in corrections_response.data:
            machine_id = correction["machine_id"]
            if machine_id not in machine_corrections:
                machine_corrections[machine_id] = correction
        
        updated_count = 0
        updates = []
        
        # Sync each machine
        for machine_id, correction in machine_corrections.items():
            corrected_price = correction["price"]
            
            try:
                # Get current machine price
                machine_response = price_service.db_service.supabase.table("machines") \\
                    .select("id, \\"Machine Name\\", \\"Price\\"") \\
                    .eq("id", machine_id) \\
                    .single() \\
                    .execute()
                
                if machine_response.data:
                    current_price = machine_response.data.get("Price")
                    machine_name = machine_response.data.get("Machine Name", "Unknown")
                    
                    if current_price != corrected_price:
                        # Update the machines table
                        update_response = price_service.db_service.supabase.table("machines") \\
                            .update({"Price": corrected_price}) \\
                            .eq("id", machine_id) \\
                            .execute()
                        
                        if update_response.data:
                            updated_count += 1
                            updates.append({
                                "machine_name": machine_name,
                                "old_price": current_price,
                                "new_price": corrected_price
                            })
                            logger.info(f"Updated {machine_name}: ${current_price} → ${corrected_price}")
                        
            except Exception as e:
                logger.error(f"Error updating machine {machine_id}: {str(e)}")
        
        return {
            "success": True,
            "message": f"Synced {updated_count} machines with manual corrections",
            "updated_count": updated_count,
            "updates": updates
        }
        
    except Exception as e:
        logger.exception(f"Error syncing manual corrections: {str(e)}")
        return {"success": False, "error": f"Error syncing manual corrections: {str(e)}"}
'''
    
    print(endpoint_code)
    
    print("\n🔧 After adding this endpoint, run:")
    print("   curl -X POST http://localhost:8000/sync-manual-corrections")

if __name__ == "__main__":
    sync_commarker_omni_price()
    create_sync_endpoint()