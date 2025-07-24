import asyncio
from services.database import DatabaseService

async def check_urls():
    db = DatabaseService()
    machines = await db.get_discovered_machines()
    print('Existing discovered machine URLs:')
    for m in machines[:5]:
        print(f"- {m.get('source_url', 'No URL')}")
        print(f"  Name: {m.get('normalized_data', {}).get('name', 'Unknown')}")
    await db.close()

asyncio.run(check_urls())