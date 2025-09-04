from services.database import DatabaseService

db = DatabaseService()

# Get the exact machines from the screenshot
machines_from_screenshot = [
    'Cloudray GM Neo 100',
    'Cloudray QS Neo',
    'Cloudray MP Neo 60'
]

for machine_name in machines_from_screenshot:
    result = db.supabase.table('machines').select('*').eq('Machine Name', machine_name).execute()
    
    if result.data:
        machine = result.data[0]
        print(f"\nMachine: {machine['Machine Name']}")
        print(f"  ID: {machine['id']}")
        print(f"  URL: {machine.get('product_link', 'N/A')}")
        print(f"  Current Price: ${machine.get('price', 'N/A')}")
    else:
        print(f"\n❌ Machine not found: {machine_name}")