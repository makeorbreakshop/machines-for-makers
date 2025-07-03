#!/usr/bin/env python3
"""
Fix bad learned selectors that are causing $4,589 extraction errors.
"""

import os
import sys
from supabase import create_client

# Add the parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Supabase configuration
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

def main():
    """Remove bad learned selectors that are extracting wrong prices."""
    
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("❌ Error: Missing Supabase configuration")
        print("Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
        return
    
    # Create service client with admin privileges
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("🔧 Fixing bad learned selectors...")
    print()
    
    # Get machines with bad selectors first
    print("📋 Machines affected by bad .bundle-price selectors:")
    response = supabase.table("machines").select("id, Machine Name, learned_selectors").execute()
    
    affected_machines = []
    for machine in response.data:
        learned = machine.get('learned_selectors', {})
        machine_name = machine.get('Machine Name', 'Unknown')
        
        # Check for bad ComMarker selectors
        if 'commarker.com' in learned:
            selector = learned['commarker.com'].get('selector', '')
            if 'bundle-price' in selector:
                affected_machines.append((machine['id'], machine_name, 'commarker.com', selector))
        
        # Check for bad Glowforge selectors  
        if 'glowforge.com' in learned:
            selector = learned['glowforge.com'].get('selector', '')
            if 'bundle-price' in selector:
                affected_machines.append((machine['id'], machine_name, 'glowforge.com', selector))
    
    print(f"Found {len(affected_machines)} machines with bad selectors:")
    for machine_id, name, domain, selector in affected_machines:
        print(f"  - {name}: {domain} → {selector}")
    print()
    
    if not affected_machines:
        print("✅ No bad selectors found!")
        return
    
    # Remove bad selectors
    print("🗑️  Removing bad selectors...")
    
    for machine_id, name, domain, selector in affected_machines:
        try:
            # Get current learned_selectors
            response = supabase.table("machines").select("learned_selectors").eq("id", machine_id).execute()
            if not response.data:
                continue
                
            current_selectors = response.data[0].get('learned_selectors', {})
            
            # Remove the bad domain
            if domain in current_selectors:
                del current_selectors[domain]
                
                # Update the machine
                update_response = supabase.table("machines").update({
                    "learned_selectors": current_selectors
                }).eq("id", machine_id).execute()
                
                if update_response.data:
                    print(f"  ✅ Fixed: {name} ({domain})")
                else:
                    print(f"  ❌ Failed: {name} ({domain})")
            
        except Exception as e:
            print(f"  ❌ Error fixing {name}: {e}")
    
    print()
    print("🎯 SUMMARY:")
    print("The bad .bundle-price .main-amount selectors have been removed.")
    print("This selector was causing ComMarker and Glowforge machines to extract")
    print("$4,589 from bundle pricing instead of actual product prices.")
    print()
    print("Next batch run should now extract correct prices!")
    print()
    print("💡 Root cause: Claude AI learned a selector for bundle pricing that")
    print("was being incorrectly applied to find individual product prices.")

if __name__ == "__main__":
    main()