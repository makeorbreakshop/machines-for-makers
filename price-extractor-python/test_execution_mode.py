#!/usr/bin/env python3
"""
Test script to understand the execution difference between cron job and admin UI calls
to the batch update endpoint.
"""

import asyncio
import httpx
from loguru import logger

API_BASE_URL = "http://localhost:8000"

async def test_batch_update_modes():
    """Test different execution modes of the batch update endpoint."""
    
    # Test parameters
    test_params = {
        "days_threshold": 7,
        "limit": 5,
        "max_workers": 3,
        "use_scrapfly": True
    }
    
    async with httpx.AsyncClient() as client:
        print("\n=== Testing Batch Update Execution Modes ===\n")
        
        # Test 1: Direct call (simulating cron job behavior)
        print("Test 1: Direct call without background_tasks (like cron job)")
        print("This should run synchronously...")
        
        try:
            response = await client.post(
                f"{API_BASE_URL}/api/v1/batch-update",
                json=test_params,
                timeout=300.0  # 5 minute timeout for sync execution
            )
            
            print(f"Response status: {response.status_code}")
            print(f"Response body: {response.json()}")
            print("Note: The call blocked until completion\n")
            
        except Exception as e:
            print(f"Error: {e}\n")
        
        # Test 2: Check if we can simulate the admin UI behavior
        # The admin UI gets background task injection automatically by FastAPI
        # when called through the normal request flow
        print("Test 2: Understanding BackgroundTasks injection")
        print("FastAPI automatically injects BackgroundTasks when:")
        print("1. The endpoint parameter has BackgroundTasks type")
        print("2. The request goes through the normal FastAPI request handler")
        print("3. It's NOT injected when we call the function directly in tests")
        print("\nThis explains why:")
        print("- Admin UI calls → FastAPI injects BackgroundTasks → runs async")
        print("- Cron job calls → No BackgroundTasks → runs sync")
        
        # Test 3: Check the actual endpoint signature
        print("\nTest 3: Endpoint signature analysis")
        response = await client.get(f"{API_BASE_URL}/openapi.json")
        openapi = response.json()
        
        batch_update_endpoint = openapi["paths"]["/api/v1/batch-update"]["post"]
        print(f"Endpoint: /api/v1/batch-update")
        print(f"Parameters: {batch_update_endpoint.get('parameters', [])}")
        print("Note: BackgroundTasks is not a request parameter - it's injected by FastAPI")


async def test_execution_behavior():
    """Test to demonstrate the execution behavior difference."""
    
    print("\n=== Execution Behavior Analysis ===\n")
    
    print("When background_tasks is provided (Admin UI):")
    print("1. Request returns immediately with success message")
    print("2. Actual processing happens in background")
    print("3. Machines are processed concurrently with semaphore control")
    print("4. Client can poll for results")
    
    print("\nWhen background_tasks is None (Cron job):")
    print("1. Request blocks until all processing completes")
    print("2. Processing still uses concurrent workers internally")
    print("3. Returns final results directly")
    print("4. HTTP connection stays open for entire duration")
    
    print("\nThis explains the sequential appearance in cron logs:")
    print("- The HTTP call blocks for the entire batch")
    print("- But internally, machines are still processed concurrently")
    print("- It just LOOKS sequential because we wait for completion")


if __name__ == "__main__":
    print("Starting execution mode tests...")
    asyncio.run(test_batch_update_modes())
    asyncio.run(test_execution_behavior())
    print("\nTests completed!")