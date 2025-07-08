import asyncio
from services.database import DatabaseService
from datetime import datetime, timedelta

async def check_latest_price():
    db = DatabaseService()
    
    # Get the last 5 price history entries for ComMarker B4 30W
    machine_id = "839e1b00-8496-478a-96c4-6248ce74ce74"
    
    query = """
    SELECT ph.*, m."Machine Name", m."Price" as current_price
    FROM price_history ph
    JOIN machines m ON m.id = ph.machine_id
    WHERE ph.machine_id = $1
    ORDER BY ph.created_at DESC
    LIMIT 5
    """
    
    results = await db.pool.fetch(query, machine_id)
    
    print(f"\n=== Latest Price History for ComMarker B4 30W ===")
    for row in results:
        print(f"\nDate: {row['created_at']}")
        print(f"Old Price: ${row['old_price']}")
        print(f"New Price: ${row['new_price']}")
        print(f"Success: {row['success']}")
        print(f"Error: {row['error_message']}")
        print(f"Current DB Price: ${row['current_price']}")
        
    await db.close()

if __name__ == "__main__":
    asyncio.run(check_latest_price())