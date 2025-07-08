#!/usr/bin/env python3
"""
EMERGENCY CLEANUP SCRIPT: Remove Bundle-Price Selector Contamination

This script removes ALL bundle-price selectors from the machines database.
The contamination affects 120+ machines extracting incorrect $4,589 prices.

PROBLEM: The blacklist system prevents new contamination but doesn't clean existing data.
SOLUTION: Reset learned_selectors for all contaminated machines.

Run this script IMMEDIATELY to fix the systematic price extraction error.
"""

import json
import os
from datetime import datetime
from supabase import create_client

def cleanup_contaminated_selectors():
    """
    Emergency cleanup of bundle-price selector contamination
    """
    # Load environment variables
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    if not supabase_url or not supabase_key:
        print("❌ Missing environment variables. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
        return
    
    db = create_client(supabase_url, supabase_key)
    
    print("🚨 EMERGENCY: Bundle-Price Selector Contamination Cleanup")
    print("=" * 60)
    
    # First, audit the current contamination
    print("\n1. Auditing current contamination...")
    
    # Get all machines with bundle-price selectors
    response = db.table('machines').select('id, "Machine Name", "Company", "Price", learned_selectors').execute()
    
    contaminated_machines = []
    for machine in response.data:
        if machine['learned_selectors']:
            learned_selectors_str = json.dumps(machine['learned_selectors'])
            if any(pattern in learned_selectors_str.lower() for pattern in [
                'bundle-price', 'bundle', 'combo-price', 'package-price'
            ]):
                contaminated_machines.append(machine)
    
    print(f"📊 Found {len(contaminated_machines)} contaminated machines")
    
    # Show some examples
    print("\n2. Examples of contaminated machines:")
    for i, machine in enumerate(contaminated_machines[:10]):
        selector_info = ""
        if machine['learned_selectors']:
            for domain, data in machine['learned_selectors'].items():
                selector_info = f"{domain}: {data.get('selector', 'N/A')}"
                break
        print(f"   {i+1}. {machine['Machine Name']} ({machine['Company']}) - {selector_info}")
    
    if len(contaminated_machines) > 10:
        print(f"   ... and {len(contaminated_machines) - 10} more")
    
    # Confirm cleanup
    print(f"\n3. This script will RESET learned_selectors for {len(contaminated_machines)} machines")
    print("   These machines will need to re-learn selectors using the FIXED blacklist system")
    
    confirm = input("\nProceed with cleanup? (yes/no): ").lower().strip()
    if confirm not in ['yes', 'y']:
        print("❌ Cleanup cancelled")
        return
    
    print("\n4. Cleaning up contaminated selectors...")
    
    # Clean up each machine
    cleaned_count = 0
    for machine in contaminated_machines:
        try:
            # Reset learned_selectors to empty object
            update_response = db.table('machines').update({
                'learned_selectors': {}
            }).eq('id', machine['id']).execute()
            
            if update_response.data:
                cleaned_count += 1
                print(f"   ✅ Cleaned: {machine['Machine Name']} ({machine['Company']})")
            else:
                print(f"   ❌ Failed: {machine['Machine Name']} ({machine['Company']})")
                
        except Exception as e:
            print(f"   ❌ Error cleaning {machine['Machine Name']}: {str(e)}")
    
    print(f"\n5. Cleanup Summary:")
    print(f"   ✅ Successfully cleaned: {cleaned_count} machines")
    print(f"   ❌ Failed to clean: {len(contaminated_machines) - cleaned_count} machines")
    
    # Final verification
    print("\n6. Verifying cleanup...")
    
    # Check if any contaminated selectors remain
    response = db.table('machines').select('id, "Machine Name", learned_selectors').execute()
    
    remaining_contaminated = []
    for machine in response.data:
        if machine['learned_selectors']:
            learned_selectors_str = json.dumps(machine['learned_selectors'])
            if any(pattern in learned_selectors_str.lower() for pattern in [
                'bundle-price', 'bundle', 'combo-price', 'package-price'
            ]):
                remaining_contaminated.append(machine)
    
    if remaining_contaminated:
        print(f"⚠️  WARNING: {len(remaining_contaminated)} machines still have contaminated selectors")
        for machine in remaining_contaminated[:5]:
            print(f"   - {machine['Machine Name']}: {machine['learned_selectors']}")
    else:
        print("✅ SUCCESS: All bundle-price selectors have been removed!")
    
    print("\n7. Next Steps:")
    print("   1. Run a new batch price extraction to re-learn clean selectors")
    print("   2. Monitor the blacklist system to prevent future contamination")
    print("   3. Check that the price extraction now shows correct prices")
    
    print(f"\n🎉 Emergency cleanup completed at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == "__main__":
    cleanup_contaminated_selectors()