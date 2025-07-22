#!/usr/bin/env python3
"""Test script to debug price precision issue with Monport GA 30W MOPA"""

import asyncio
import sys
from decimal import Decimal
from services.database import DatabaseService

async def test_price_precision():
    """Test how prices are being read and compared"""
    db = DatabaseService()
    
    machine_id = "5ffa07fc-279f-4a2d-ad86-f935203df15e"
    
    print(f"Testing price precision for machine: {machine_id}")
    print("=" * 60)
    
    # Get machine data
    machine = await db.get_machine_by_id(machine_id)
    if not machine:
        print("ERROR: Machine not found")
        return
        
    # Check the raw price value
    raw_price = machine.get("Price")
    print(f"Raw price from database: {raw_price} (type: {type(raw_price)})")
    
    # Test different conversions
    if raw_price is not None:
        print(f"As string: '{raw_price}'")
        print(f"As float: {float(raw_price)}")
        print(f"As Decimal: {Decimal(str(raw_price))}")
        print(f"Float == 3499.99: {float(raw_price) == 3499.99}")
        print(f"Float == 3499.0: {float(raw_price) == 3499.0}")
        print(f"String comparison: '{raw_price}' == '3499.99': {str(raw_price) == '3499.99'}")
        
        # Test what happens in comparison
        test_values = [3499, 3499.0, 3499.99, "3499", "3499.0", "3499.99"]
        print("\nComparison tests:")
        for test_val in test_values:
            if isinstance(test_val, str):
                comparison = float(raw_price) == float(test_val)
            else:
                comparison = float(raw_price) == test_val
            print(f"  {raw_price} == {test_val} ({type(test_val).__name__}): {comparison}")
    
    # Check recent price history
    print("\n" + "=" * 60)
    print("Recent price history entries:")
    
    history_response = db.supabase.table("price_history") \
        .select("id, date, price, previous_price, status, review_result") \
        .eq("machine_id", machine_id) \
        .order("date", desc=True) \
        .limit(5) \
        .execute()
    
    if history_response.data:
        for entry in history_response.data:
            print(f"\nDate: {entry['date']}")
            print(f"  Price: {entry['price']} (type when fetched: {type(entry['price'])})")
            print(f"  Previous: {entry['previous_price']} (type: {type(entry['previous_price'])})")
            print(f"  Status: {entry['status']}")
            print(f"  Review: {entry['review_result']}")

if __name__ == "__main__":
    asyncio.run(test_price_precision())