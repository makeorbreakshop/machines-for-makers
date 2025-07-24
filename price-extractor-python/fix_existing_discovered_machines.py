#!/usr/bin/env python3
"""
Fix Existing Discovered Machines Data
Updates discovered_machines records that have "Unknown" names but correct data in raw_data
"""
import asyncio
import json
from services.database import DatabaseService

async def fix_discovered_machines():
    """Fix discovered machines with 'Unknown' names but correct data available"""
    print("Fixing Discovered Machines Data")
    print("=" * 50)
    
    db = DatabaseService()
    
    try:
        # Get all discovered machines with "Unknown" names
        response = db.supabase.table("discovered_machines") \
            .select("*") \
            .eq("normalized_data->>name", "Unknown") \
            .execute()
        
        unknown_machines = response.data or []
        print(f"Found {len(unknown_machines)} machines with 'Unknown' names")
        
        fixed_count = 0
        
        for machine in unknown_machines:
            machine_id = machine["id"]
            raw_data = machine.get("raw_data", {})
            
            print(f"\nProcessing machine {machine_id}")
            print(f"Source URL: {machine.get('source_url', 'N/A')}")
            
            # Check if there's nested normalized_data in raw_data
            nested_normalized = None
            if isinstance(raw_data, dict):
                # Check for nested structure from SimplifiedDiscoveryService 
                if "normalized_data" in raw_data:
                    nested_normalized = raw_data["normalized_data"]
                    print(f"Found nested normalized_data with keys: {list(nested_normalized.keys()) if isinstance(nested_normalized, dict) else 'Not a dict'}")
                
                # Also check if raw_data itself has the correct structure
                elif "name" in raw_data and raw_data["name"] != "Unknown":
                    nested_normalized = raw_data
                    print(f"Using raw_data directly with name: {raw_data.get('name')}")
            
            if nested_normalized and isinstance(nested_normalized, dict):
                # Ensure it has a name field
                machine_name = nested_normalized.get("name") or nested_normalized.get("Machine Name")
                
                if machine_name and machine_name != "Unknown":
                    # Create updated normalized_data with name field
                    updated_normalized = dict(nested_normalized)
                    if "name" not in updated_normalized and "Machine Name" in updated_normalized:
                        updated_normalized["name"] = updated_normalized["Machine Name"]
                    
                    print(f"Updating machine with name: {machine_name}")
                    
                    # Update the record
                    update_response = db.supabase.table("discovered_machines") \
                        .update({"normalized_data": updated_normalized}) \
                        .eq("id", machine_id) \
                        .execute()
                    
                    if update_response.data:
                        print(f"✅ Updated machine {machine_id}")
                        fixed_count += 1
                    else:
                        print(f"❌ Failed to update machine {machine_id}")
                else:
                    print(f"⚠️  No valid name found in nested data")
            else:
                print(f"⚠️  No valid nested normalized_data found")
        
        print(f"\n" + "=" * 50)
        print(f"Fixed {fixed_count} out of {len(unknown_machines)} machines")
        
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(fix_discovered_machines())