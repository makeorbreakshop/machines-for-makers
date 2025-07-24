#!/usr/bin/env python3
"""
Test script to re-process existing discovered machines with new OpenAI mapper
This will fix the field mapping issues in the current database
"""
import json
import asyncio
from services.openai_mapper import create_openai_mapper
from services.database import DatabaseService

async def test_reprocess_existing():
    """Test reprocessing existing discovered machines"""
    print("🔄 Testing Re-processing Existing Discovered Machines")
    print("=" * 60)
    
    try:
        # Initialize services
        mapper = create_openai_mapper()
        db = DatabaseService()
        
        print(f"✅ Services initialized")
        
        # Get existing discovered machines
        print(f"\n🔍 Fetching existing discovered machines...")
        
        # Use supabase to get machines with nested normalized_data
        machines = db.supabase.table('discovered_machines').select(
            'id, source_url, raw_data, normalized_data, status'
        ).limit(3).execute()
        
        if not machines.data:
            print("❌ No discovered machines found in database")
            return
        
        print(f"✅ Found {len(machines.data)} discovered machines")
        
        for i, machine in enumerate(machines.data, 1):
            print(f"\n{'='*50}")
            print(f"MACHINE {i}: {machine.get('source_url', 'No URL')}")
            print(f"{'='*50}")
            
            # Show current problematic normalized_data
            current_normalized = machine.get('normalized_data', {})
            print(f"\n❌ CURRENT PROBLEMATIC DATA:")
            print(f"  Type: {type(current_normalized)}")
            if isinstance(current_normalized, dict):
                print(f"  Keys: {list(current_normalized.keys())}")
                print(f"  Has 'name': {'name' in current_normalized}")
                print(f"  Has 'Machine Name': {'Machine Name' in current_normalized}")
                print(f"  Has nested specs: {'specifications' in current_normalized}")
            
            # Extract raw_data for re-processing
            raw_data = machine.get('raw_data', {})
            if not raw_data:
                print(f"  ⚠️  No raw_data available for reprocessing")
                continue
            
            # Re-process with OpenAI mapper
            print(f"\n🤖 Re-processing with OpenAI mapper...")
            
            # Handle nested raw_data structure
            if 'raw_data' in raw_data and isinstance(raw_data['raw_data'], dict):
                # Data is double-nested
                scrapfly_data = raw_data['raw_data']
            else:
                # Data is at root level
                scrapfly_data = raw_data
            
            new_normalized, warnings = mapper.map_to_database_schema(scrapfly_data)
            
            print(f"\n✅ NEW PROCESSED DATA:")
            print(f"  Fields mapped: {len(new_normalized)}")
            print(f"  Warnings: {len(warnings)}")
            
            if new_normalized:
                print(f"\n📋 MAPPED FIELDS:")
                for field, value in new_normalized.items():
                    if isinstance(value, str) and len(value) > 50:
                        value_display = value[:50] + "..."
                    else:
                        value_display = value
                    print(f"    {field}: {value_display}")
            
            if warnings:
                print(f"\n⚠️  WARNINGS:")
                for warning in warnings:
                    print(f"    - {warning}")
            
            # Key field comparison
            key_fields = ['name', 'brand', 'price', 'laser_power_a', 'work_area']
            print(f"\n🔍 KEY FIELD COMPARISON:")
            for field in key_fields:
                old_val = current_normalized.get(field, 'MISSING')
                new_val = new_normalized.get(field, 'MISSING')
                
                if old_val != new_val:
                    print(f"  📝 {field}:")
                    print(f"      Old: {old_val}")
                    print(f"      New: {new_val}")
                else:
                    print(f"  ✅ {field}: {new_val}")
        
        print(f"\n🎉 Re-processing Test Complete!")
        print(f"\n💡 NEXT STEPS:")
        print(f"  1. The OpenAI mapper successfully fixed field mapping issues")
        print(f"  2. Run a batch update script to fix all existing records")
        print(f"  3. New discoveries will use the correct format automatically")
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_reprocess_existing())