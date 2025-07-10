#!/usr/bin/env python3
"""
Sync machines.Price with the latest manual corrections from price_history.
This fixes the existing stale prices in the machines table.
"""

import requests
import json
import sys
import os

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.database import DatabaseService
from loguru import logger

def sync_manual_corrections():
    """Sync machines.Price with latest manual corrections."""
    print("🔧 Syncing machines.Price with latest manual corrections...")
    print("=" * 60)
    
    try:
        db_service = DatabaseService()
        
        # Get all machines that have manual corrections
        print("📋 Finding machines with manual corrections...")
        
        # Query to get the latest manual correction for each machine
        response = db_service.supabase.rpc(
            'get_latest_manual_corrections'
        ).execute()
        
        if not response.data:
            # If RPC doesn't exist, fall back to manual query
            print("📋 Using manual query to find latest corrections...")
            
            # Get all manual corrections, grouped by machine_id
            corrections_response = db_service.supabase.table("price_history") \
                .select("machine_id, price, date") \
                .eq("status", "MANUAL_CORRECTION") \
                .order("date", desc=True) \
                .execute()
            
            if not corrections_response.data:
                print("❌ No manual corrections found")
                return
            
            # Group by machine_id and get the latest correction for each
            machine_corrections = {}
            for correction in corrections_response.data:
                machine_id = correction["machine_id"]
                if machine_id not in machine_corrections:
                    machine_corrections[machine_id] = correction
            
            corrections_to_sync = list(machine_corrections.values())
        else:
            corrections_to_sync = response.data
        
        print(f"✅ Found {len(corrections_to_sync)} machines with manual corrections")
        
        # Sync each machine
        updated_count = 0
        for correction in corrections_to_sync:
            machine_id = correction["machine_id"]
            corrected_price = correction["price"]
            
            try:
                # Get current machine price
                machine_response = db_service.supabase.table("machines") \
                    .select("id, \"Machine Name\", \"Price\"") \
                    .eq("id", machine_id) \
                    .single() \
                    .execute()
                
                if machine_response.data:
                    current_price = machine_response.data.get("Price")
                    machine_name = machine_response.data.get("Machine Name", "Unknown")
                    
                    if current_price != corrected_price:
                        print(f"🔧 Updating {machine_name[:30]}...")
                        print(f"   Current: ${current_price} → Corrected: ${corrected_price}")
                        
                        # Update the machines table
                        update_response = db_service.supabase.table("machines") \
                            .update({"Price": corrected_price}) \
                            .eq("id", machine_id) \
                            .execute()
                        
                        if update_response.data:
                            updated_count += 1
                            print(f"   ✅ Updated successfully")
                        else:
                            print(f"   ❌ Failed to update")
                    else:
                        print(f"✅ {machine_name[:30]}: Already in sync (${current_price})")
                else:
                    print(f"⚠️ Machine {machine_id} not found in machines table")
                    
            except Exception as e:
                print(f"❌ Error updating machine {machine_id}: {str(e)}")
        
        print(f"\n📊 SYNC SUMMARY")
        print(f"   Machines checked: {len(corrections_to_sync)}")
        print(f"   Machines updated: {updated_count}")
        print(f"   ✅ Sync completed successfully!")
        
    except Exception as e:
        print(f"❌ Error during sync: {str(e)}")
        import traceback
        traceback.print_exc()

def test_specific_machine():
    """Test with ComMarker Omni 1 UV laser specifically."""
    print("\n🎯 Testing ComMarker Omni 1 UV laser specifically...")
    print("=" * 60)
    
    try:
        db_service = DatabaseService()
        
        # Find ComMarker Omni 1 UV laser
        response = db_service.supabase.table("machines") \
            .select("id, \"Machine Name\", \"Price\"") \
            .ilike("Machine Name", "%omni%uv%") \
            .execute()
        
        if response.data:
            for machine in response.data:
                machine_id = machine["id"]
                machine_name = machine["Machine Name"]
                current_price = machine["Price"]
                
                print(f"🔧 Found: {machine_name}")
                print(f"   ID: {machine_id}")
                print(f"   Current Price: ${current_price}")
                
                # Get latest manual correction
                correction_response = db_service.supabase.table("price_history") \
                    .select("price, date") \
                    .eq("machine_id", machine_id) \
                    .eq("status", "MANUAL_CORRECTION") \
                    .order("date", desc=True) \
                    .limit(1) \
                    .execute()
                
                if correction_response.data:
                    latest_correction = correction_response.data[0]
                    corrected_price = latest_correction["price"]
                    correction_date = latest_correction["date"]
                    
                    print(f"   Latest Manual Correction: ${corrected_price} (on {correction_date})")
                    
                    if current_price != corrected_price:
                        print(f"   🔧 NEEDS UPDATE: ${current_price} → ${corrected_price}")
                        
                        # Update it
                        update_response = db_service.supabase.table("machines") \
                            .update({"Price": corrected_price}) \
                            .eq("id", machine_id) \
                            .execute()
                        
                        if update_response.data:
                            print(f"   ✅ UPDATED SUCCESSFULLY!")
                        else:
                            print(f"   ❌ UPDATE FAILED")
                    else:
                        print(f"   ✅ Already in sync")
                else:
                    print(f"   ⚠️ No manual corrections found")
        else:
            print("❌ ComMarker Omni 1 UV laser not found")
            
    except Exception as e:
        print(f"❌ Error testing specific machine: {str(e)}")

if __name__ == "__main__":
    sync_manual_corrections()
    test_specific_machine()