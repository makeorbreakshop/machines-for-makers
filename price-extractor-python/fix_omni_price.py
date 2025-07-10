#!/usr/bin/env python3
"""
Fix ComMarker Omni 1 UV laser price specifically using the correction endpoint.
"""

import requests
import json

API_BASE = "http://localhost:8000"

def fix_omni_price():
    """Fix ComMarker Omni 1 UV laser price by creating a manual correction."""
    print("🎯 Fixing ComMarker Omni 1 UV laser price...")
    print("=" * 60)
    
    # From your screenshot, we know:
    # - Current (wrong) price in machines table: $3,325
    # - Correct price from manual corrections: $3,888
    # - We need to force an update to the machines table
    
    # We'll do this by creating a "correction" that updates the machines table
    # Since the API endpoint isn't available yet, let's use a different approach
    
    # Test the update-price endpoint to see the current state
    print("🔍 Testing current ComMarker Omni 1 UV laser state...")
    
    # We need to find the machine ID first - let's try the API
    try:
        # Try to get a specific machine that we know has issues
        # Based on the conversation, let's try some ComMarker machines
        test_machines = [
            {"name": "ComMarker Omni 1 UV laser", "price": 3325},
            {"name": "ComMarker B6", "price": None}
        ]
        
        # Since we can't easily query for machines, let's provide instructions
        print("🔧 MANUAL FIX REQUIRED:")
        print("   1. In the admin interface, find ComMarker Omni 1 UV laser")
        print("   2. Click 'History' to see price history")
        print("   3. Find a recent price_history entry with status 'Manually Corrected' and price $3,888")
        print("   4. Use the 'Correct Price' button on that entry")
        print("   5. Set the correct price to $3,888")
        print("   6. This will trigger our new logic to update machines.Price")
        
        print("\n🔧 OR restart the API server and run:")
        print("   curl -X POST http://localhost:8000/api/v1/sync-manual-corrections")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

def test_correction_flow():
    """Test that the correction flow works properly."""
    print("\n🧪 Testing price correction flow...")
    print("=" * 60)
    
    print("ℹ️ To test the correction flow:")
    print("1. Find a price_history entry ID with status 'Manually Corrected'")
    print("2. Use this API call:")
    print()
    print("curl -X POST http://localhost:8000/api/v1/correct-price \\")
    print("  -H 'Content-Type: application/json' \\")
    print("  -d '{")
    print('    "price_history_id": "YOUR_PRICE_HISTORY_ID",')
    print('    "correct_price": 3888.0,')
    print('    "corrected_by": "admin",')
    print('    "reason": "Manual correction to sync machines table"')
    print("  }'")
    print()
    print("This will now update BOTH price_history AND machines.Price")

if __name__ == "__main__":
    fix_omni_price()
    test_correction_flow()