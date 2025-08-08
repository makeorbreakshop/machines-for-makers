#!/usr/bin/env python3
"""
Create a test endpoint that forces synchronous execution to understand the difference
"""

from fastapi import FastAPI
from loguru import logger
import asyncio
import uvicorn

app = FastAPI()

# Simulated batch processing
async def process_batch(items, max_workers=3):
    """Simulate batch processing with concurrency."""
    semaphore = asyncio.Semaphore(max_workers)
    
    async def process_item(item):
        async with semaphore:
            logger.info(f"Processing item {item} - worker acquired")
            await asyncio.sleep(1)  # Simulate work
            logger.info(f"Completed item {item}")
            return f"Processed {item}"
    
    # Process all items concurrently
    tasks = [process_item(item) for item in items]
    results = await asyncio.gather(*tasks)
    return results

@app.post("/test-sync")
async def test_sync_endpoint(num_items: int = 5, max_workers: int = 3):
    """Endpoint that always runs synchronously."""
    logger.info(f"Starting SYNC processing of {num_items} items with {max_workers} workers")
    
    items = list(range(num_items))
    results = await process_batch(items, max_workers)
    
    logger.info("SYNC processing completed")
    return {
        "mode": "synchronous",
        "items_processed": len(results),
        "results": results
    }

@app.post("/test-async") 
async def test_async_endpoint(num_items: int = 5, max_workers: int = 3, background_tasks = None):
    """Endpoint that may run async if BackgroundTasks is injected."""
    from fastapi import BackgroundTasks
    
    logger.info(f"Starting processing of {num_items} items")
    logger.info(f"BackgroundTasks injected: {background_tasks is not None}")
    
    items = list(range(num_items))
    
    if isinstance(background_tasks, BackgroundTasks):
        logger.info("Running in BACKGROUND mode")
        background_tasks.add_task(process_batch, items, max_workers)
        return {
            "mode": "background",
            "message": "Processing started in background"
        }
    else:
        logger.info("Running in SYNC mode")
        results = await process_batch(items, max_workers)
        return {
            "mode": "synchronous", 
            "items_processed": len(results),
            "results": results
        }

if __name__ == "__main__":
    print("Starting test server on port 8001...")
    print("\nTest with:")
    print("curl -X POST http://localhost:8001/test-sync?num_items=5")
    print("curl -X POST http://localhost:8001/test-async?num_items=5")
    
    uvicorn.run(app, host="0.0.0.0", port=8001)