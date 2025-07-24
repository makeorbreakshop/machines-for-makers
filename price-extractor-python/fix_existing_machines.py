#!/usr/bin/env python3
"""
Batch script to fix existing discovered machines with proper field mapping
Uses OpenAI mapper to re-process all existing records
"""
import json
import asyncio
from services.openai_mapper import create_openai_mapper
from services.database import DatabaseService

async def fix_all_discovered_machines():
    """Fix all existing discovered machines with proper field mapping"""
    print("🔧 Fixing All Discovered Machines with OpenAI Mapper")
    print("=" * 60)
    
    try:
        # Initialize services
        mapper = create_openai_mapper()
        db = DatabaseService()
        
        print(f"✅ Services initialized")
        
        # Get all discovered machines
        print(f"\n🔍 Fetching all discovered machines...")
        machines = db.supabase.table('discovered_machines').select(
            'id, source_url, raw_data, normalized_data, status'
        ).execute()
        
        if not machines.data:
            print("❌ No discovered machines found in database")
            return
        
        total_machines = len(machines.data)
        print(f"✅ Found {total_machines} discovered machines to fix")
        
        fixed_count = 0
        error_count = 0
        
        for i, machine in enumerate(machines.data, 1):
            print(f"\n{'='*50}")
            print(f"FIXING {i}/{total_machines}: {machine.get('source_url', 'No URL')}")
            print(f"{'='*50}")
            
            try:
                # Extract raw_data for re-processing
                raw_data = machine.get('raw_data', {})
                if not raw_data:
                    print(f"  ⚠️  No raw_data available, skipping...")
                    continue
                
                # Handle nested raw_data structure
                if 'raw_data' in raw_data and isinstance(raw_data['raw_data'], dict):
                    # Data is double-nested (from old discovery service)
                    scrapfly_data = raw_data['raw_data']
                else:
                    # Data is at root level
                    scrapfly_data = raw_data
                
                print(f"  🤖 Re-processing with OpenAI mapper...")
                
                # Re-process with OpenAI mapper
                new_normalized, warnings = mapper.map_to_database_schema(scrapfly_data)
                
                if not new_normalized:
                    print(f"  ❌ No data mapped, skipping...")
                    error_count += 1
                    continue
                
                print(f"  ✅ Mapped {len(new_normalized)} fields")
                if warnings:
                    print(f"  ⚠️  {len(warnings)} warnings: {warnings[:2]}...")  # Show first 2 warnings
                
                # Update the database
                print(f"  💾 Updating database...")
                
                update_result = db.supabase.table('discovered_machines').update({
                    'normalized_data': new_normalized,
                    'validation_errors': warnings,
                    'updated_at': 'now()'
                }).eq('id', machine['id']).execute()
                
                if update_result.data:
                    print(f"  ✅ Successfully updated machine {machine['id']}")
                    fixed_count += 1
                    
                    # Show key improvements
                    key_fields = ['name', 'brand', 'laser_power_a', 'work_area', 'machine_category']
                    improvements = []
                    for field in key_fields:
                        if field in new_normalized:
                            improvements.append(f"{field}={new_normalized[field]}")
                    
                    if improvements:
                        print(f"  📈 Key fields: {', '.join(improvements[:3])}...")
                else:
                    print(f"  ❌ Failed to update machine {machine['id']}")
                    error_count += 1
                
            except Exception as e:
                print(f"  ❌ Error processing machine: {str(e)}")
                error_count += 1
        
        print(f"\n🎉 Batch Fix Complete!")
        print(f"  ✅ Fixed: {fixed_count}")
        print(f"  ❌ Errors: {error_count}")
        print(f"  📊 Success rate: {(fixed_count/total_machines)*100:.1f}%")
        
        if fixed_count > 0:
            print(f"\n✨ Discovery interface should now show proper field mapping!")
            print(f"   Navigate to /admin/discovery to see the improvements")
        
    except Exception as e:
        print(f"❌ Batch fix failed: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(fix_all_discovered_machines())