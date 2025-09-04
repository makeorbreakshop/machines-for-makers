from services.database import DatabaseService

db = DatabaseService()

# Get the CloudRay machines
cloudray_machines = db.supabase.table('machines').select('*').ilike('Machine Name', '%CloudRay%').limit(3).execute()

for machine in cloudray_machines.data:
    print(f"Machine: {machine['Machine Name']}")
    print(f"  ID: {machine['id']}")
    print(f"  URL: {machine.get('product_link', 'N/A')}")
    print(f"  Current Price: ${machine.get('price', 'N/A')}")
    print()