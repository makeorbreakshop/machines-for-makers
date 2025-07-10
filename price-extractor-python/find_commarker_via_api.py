#!/usr/bin/env python3
"""
Find ComMarker machines via API to identify the correct machine ID.
"""

import requests
import json

API_BASE = "http://localhost:8000"

def find_commarker_machines_via_api():
    """Find ComMarker machines via the API."""
    print("🔍 Searching for ComMarker machines via API...")
    print("=" * 60)
    
    try:
        # Get machines that need updates (this should show us recent machines)
        response = requests.get(f"{API_BASE}/machines-needing-update?days=30", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            machines = data.get("machines", [])
            
            commarker_machines = []
            for machine in machines:
                machine_name = machine.get("machine_name", "")
                if "commarker" in machine_name.lower():
                    commarker_machines.append(machine)
            
            if commarker_machines:
                print(f"✅ Found {len(commarker_machines)} ComMarker machines:")
                print()
                
                for machine in commarker_machines:
                    machine_id = machine.get("id", "N/A")
                    machine_name = machine.get("machine_name", "N/A")
                    price = machine.get("price", "N/A")
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
                        print(f"   Let's test this machine ID: {machine_id}")
                        print()
                        
                        # Test this machine immediately
                        test_machine_price_update(machine_id, machine_name)
            else:
                print("❌ No ComMarker machines found in recent updates")
                
        else:
            print(f"❌ API Error: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Error querying API: {str(e)}")

def test_machine_price_update(machine_id, machine_name):
    """Test price update for a specific machine."""
    print(f"🚀 Testing price update for {machine_name}")
    print("-" * 40)
    
    try:
        response = requests.post(
            f"{API_BASE}/api/v1/update-price",
            json={"machine_id": machine_id},
            timeout=120
        )
        
        if response.status_code == 200:
            result = response.json()
            old_price = result.get("old_price")
            new_price = result.get("new_price")
            method = result.get("method", "Unknown")
            
            print(f"✅ Price update completed:")
            print(f"   Old price: ${old_price}")
            print(f"   New price: ${new_price}")
            print(f"   Method: {method}")
            print(f"   Success: {result.get('success')}")
            
            if result.get("requires_approval"):
                print(f"   Requires approval: {result.get('approval_reason')}")
            
        else:
            print(f"❌ Price update failed: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Error testing price update: {str(e)}")
    
    print()

if __name__ == "__main__":
    find_commarker_machines_via_api()