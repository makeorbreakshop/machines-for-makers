#!/usr/bin/env python3
"""
Test to understand why batch updates appear sequential from cron job
"""

import time
import httpx
import asyncio
from datetime import datetime

API_BASE_URL = "http://localhost:8000"

async def test_batch_timing():
    """Test the actual timing behavior of batch updates."""
    
    print("\n=== Testing Batch Update Timing ===\n")
    
    # First, get some machines that need updates
    async with httpx.AsyncClient() as client:
        # Get machines needing update
        response = await client.get(f"{API_BASE_URL}/api/v1/machines-needing-update?days=1")
        machines_data = response.json()
        machines = machines_data.get("machines", [])[:5]  # Get first 5 machines
        
        if not machines:
            print("No machines need updates. Test cannot proceed.")
            return
            
        machine_ids = [m["id"] for m in machines]
        print(f"Testing with {len(machine_ids)} machines")
        
        # Test batch update
        print("\nStarting batch update...")
        start_time = time.time()
        
        response = await client.post(
            f"{API_BASE_URL}/api/v1/batch-update",
            json={
                "days_threshold": 0,
                "machine_ids": machine_ids,
                "max_workers": 3,
                "use_scrapfly": True
            },
            timeout=600.0  # 10 minute timeout
        )
        
        end_time = time.time()
        duration = end_time - start_time
        
        print(f"Response received after {duration:.2f} seconds")
        print(f"Response: {response.json()}")
        
        # Check if we got a batch_id (background) or results (synchronous)
        result = response.json()
        if "batch_id" in result and "results" not in result:
            print("\nExecution mode: BACKGROUND (returns immediately)")
            print("This is what the admin UI experiences")
        elif "results" in result:
            print("\nExecution mode: SYNCHRONOUS (waits for completion)")
            print("This might be what the cron job experiences")
        else:
            print("\nExecution mode: UNCLEAR")
            print(f"Response structure: {list(result.keys())}")


async def test_direct_service_call():
    """Test calling the price service directly to understand concurrency."""
    
    print("\n=== Testing Direct Service Call ===\n")
    
    # Import the price service directly
    from services.price_service import PriceService
    from services.database import DatabaseService
    
    # Initialize service
    price_service = PriceService()
    
    # Get a few machines
    machines = await price_service.db_service.get_machines_needing_update(days_threshold=1, limit=5)
    
    if not machines:
        print("No machines to test")
        return
        
    print(f"Testing direct service call with {len(machines)} machines")
    
    # Call batch_update_machines directly
    start_time = time.time()
    result = await price_service.batch_update_machines(
        days_threshold=0,
        machine_ids=[m["id"] for m in machines],
        max_workers=3,
        use_scrapfly=True
    )
    end_time = time.time()
    
    print(f"Direct service call completed in {end_time - start_time:.2f} seconds")
    print(f"Result: {result}")
    print("\nThis shows the actual concurrent behavior without HTTP layer")


async def analyze_logs():
    """Analyze log patterns to understand execution."""
    
    print("\n=== Log Pattern Analysis ===\n")
    
    print("Key differences to look for in logs:")
    print("\n1. FROM ADMIN UI:")
    print("   - 'Batch update started in background' message")
    print("   - Request returns immediately")
    print("   - Can see concurrent processing markers like:")
    print("     '🔄 Processing machine X - Worker available'")
    print("     '🔄 Processing machine Y - Worker available'")
    print("   - Multiple machines processing simultaneously")
    
    print("\n2. FROM CRON JOB:")
    print("   - May show sequential processing")
    print("   - Look for timing between machine starts")
    print("   - Check if workers are actually being utilized")
    
    print("\n3. WHAT TO CHECK:")
    print("   - Look for 'Starting concurrent processing' messages")
    print("   - Check worker utilization patterns")
    print("   - Monitor time between machine processing starts")
    print("   - See if Semaphore is limiting concurrency")


if __name__ == "__main__":
    print("Starting batch update behavior analysis...")
    
    # Run tests
    asyncio.run(test_batch_timing())
    asyncio.run(test_direct_service_call())
    asyncio.run(analyze_logs())
    
    print("\n=== CONCLUSION ===")
    print("\nThe issue is likely that FastAPI ALWAYS injects BackgroundTasks")
    print("when the endpoint has it as a parameter, regardless of the caller.")
    print("\nTo make the cron job run synchronously, we need to either:")
    print("1. Create a separate endpoint without BackgroundTasks parameter")
    print("2. Modify the cron job to poll for results like the UI does")
    print("3. Add a parameter to force synchronous execution")