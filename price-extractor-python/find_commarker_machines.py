#!/usr/bin/env python3
"""
Find ComMarker machines in the database to identify the correct machine ID.
"""

import sys
sys.path.append('/Users/brandoncullum/machines-for-makers/price-extractor-python')

from services.database import DatabaseService

def find_commarker_machines():
    """Find all ComMarker machines in the database."""
    print("🔍 Searching for ComMarker machines in database...")
    print("=" * 60)
    
    try:
        db_service = DatabaseService()
        
        # Query for ComMarker machines
        response = db_service.supabase.table("machines") \
            .select("id, \"Machine Name\", \"Price\", product_link") \
            .ilike("Machine Name", "%commarker%") \
            .execute()
        
        if response.data:
            print(f"✅ Found {len(response.data)} ComMarker machines:")
            print()
            
            for machine in response.data:
                machine_id = machine.get("id", "N/A")
                machine_name = machine.get("Machine Name", "N/A")
                price = machine.get("Price", "N/A")
                product_link = machine.get("product_link", "N/A")
                
                print(f"🔧 Machine: {machine_name}")
                print(f"   ID: {machine_id}")
                print(f"   Price: ${price}")
                print(f"   URL: {product_link}")
                print()
                
                # Check if this is the Omni 1 UV laser
                if "omni" in machine_name.lower() and "uv" in machine_name.lower():
                    print(f"🎯 FOUND TARGET: {machine_name}")
                    print(f"   This is likely the machine causing issues!")
                    print()
        else:
            print("❌ No ComMarker machines found in database")
            
    except Exception as e:
        print(f"❌ Error querying database: {str(e)}")
        
    print("🔍 Now checking for recent price history on ComMarker machines...")
    print("=" * 60)
    
    try:
        # Check recent price history for ComMarker machines
        response = db_service.supabase.table("price_history") \
            .select("machine_id, price, status, date") \
            .eq("status", "MANUAL_CORRECTION") \
            .order("date", desc=True) \
            .limit(10) \
            .execute()
        
        if response.data:
            print(f"✅ Found {len(response.data)} recent manual corrections:")
            print()
            
            for correction in response.data:
                machine_id = correction.get("machine_id", "N/A")
                price = correction.get("price", "N/A")
                date = correction.get("date", "N/A")
                
                print(f"🔧 Machine ID: {machine_id}")
                print(f"   Corrected to: ${price}")
                print(f"   Date: {date}")
                print()
        else:
            print("❌ No recent manual corrections found")
            
    except Exception as e:
        print(f"❌ Error querying price history: {str(e)}")

if __name__ == "__main__":
    find_commarker_machines()