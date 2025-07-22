#!/usr/bin/env python3
"""Test script to trace baseline price calculation issue"""

import asyncio
from services.database import DatabaseService
from services.price_service import PriceService

async def test_baseline_price():
    """Test how baseline price is calculated"""
    db = DatabaseService()
    price_service = PriceService()
    
    machine_id = "5ffa07fc-279f-4a2d-ad86-f935203df15e"
    
    print(f"Testing baseline price calculation for machine: {machine_id}")
    print("=" * 60)
    
    # Get machine data
    machine = await db.get_machine_by_id(machine_id)
    if not machine:
        print("ERROR: Machine not found")
        return
        
    # Check the raw price value
    machine_price = machine.get("Price")
    print(f"Machine price from database: {machine_price} (type: {type(machine_price)})")
    
    # Test the effective current price logic
    effective_price = await price_service._get_effective_current_price(machine_id, machine_price)
    print(f"Effective current price: {effective_price} (type: {type(effective_price)})")
    
    # Check if these are different
    if machine_price != effective_price:
        print(f"⚠️  DIFFERENCE DETECTED: {machine_price} != {effective_price}")
    else:
        print("✅ Prices match")
    
    # Now let's see what happens during a price update
    print("\n" + "=" * 60)
    print("Simulating price extraction...")
    
    # This would be the old_price used in comparison
    old_price = await price_service._get_effective_current_price(machine_id, machine.get("Price"))
    print(f"Old price for comparison: {old_price}")
    
    # Simulate a new price extraction
    new_price = 3499.99
    print(f"New price extracted: {new_price}")
    
    # Check comparison
    if old_price == new_price:
        print("Result: Prices are equal - no update needed")
    else:
        print(f"Result: Prices differ - update would be triggered")
        print(f"  Difference: {new_price - old_price}")

if __name__ == "__main__":
    asyncio.run(test_baseline_price())