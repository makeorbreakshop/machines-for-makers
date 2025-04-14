import logging
import asyncio
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime

# Import app modules
from app.services.database import (
    get_machine_by_id, 
    get_machines_by_ids, 
    update_machine_price as update_db_price
)
from app.config import DEBUG_MODE, MAX_BATCH_SIZE
from app.crews.price_crew import get_price_crew
from ..tools.admin_tools import start_trace, add_step, end_trace

logger = logging.getLogger(__name__)

# In-memory cache for batch jobs
_batch_jobs = {}

async def update_machine_price(machine_id: str, debug_mode: bool = False) -> dict:
    """
    Update the price for a single machine using CrewAI agents
    
    Args:
        machine_id: The ID of the machine to update
        debug_mode: Whether to run in debug mode with more output
        
    Returns:
        Dictionary with result information
    """
    try:
        # Start agent trace
        trace_id = start_trace(machine_id)
        add_step(trace_id, "system", "start", f"Starting price extraction for machine {machine_id}")
        
        # Get machine data from database
        machine_data = await get_machine_data(machine_id)
        if not machine_data["success"]:
            error_msg = f"Error getting machine data: {machine_data.get('error')}"
            add_step(trace_id, "system", "error", error_msg)
            end_trace(trace_id, False, {"error": error_msg})
            return {
                "success": False,
                "message": error_msg,
                "machine_id": machine_id
            }
        
        machine = machine_data["data"]
        add_step(trace_id, "system", "info", f"Got machine data: {machine['Machine Name']}")
        
        # Initialize the price extraction crew
        add_step(trace_id, "system", "info", "Initializing price extraction crew")
        crew = get_price_crew(debug=debug_mode)
        
        # Run the crew
        add_step(trace_id, "system", "action", "Running price extraction crew")
        try:
            # Set machine data in the crew's context
            result = crew.kickoff(inputs={"machine": machine})
            add_step(trace_id, "system", "result", f"Crew finished with result: {result}")
        except Exception as e:
            error_msg = f"Error running price extraction crew: {str(e)}"
            add_step(trace_id, "system", "error", error_msg)
            end_trace(trace_id, False, {"error": error_msg})
            return {
                "success": False,
                "message": error_msg,
                "machine_id": machine_id
            }
        
        # Check if the price was extracted successfully
        if not result or not isinstance(result, dict):
            error_msg = "Price extraction crew returned invalid result"
            add_step(trace_id, "system", "error", error_msg)
            end_trace(trace_id, False, {"error": error_msg})
            return {
                "success": False,
                "message": error_msg,
                "machine_id": machine_id
            }
        
        # Update price in database
        if "price" in result and result["price"] is not None:
            price_update = await update_machine_price_in_db(
                machine_id=machine_id,
                price=result["price"],
                currency=result.get("currency", "USD"),
                source=result.get("source", "crewai")
            )
            add_step(trace_id, "system", "action", f"Updated price in database: {result['price']}")
            
            # Record success
            end_trace(trace_id, True, {
                "price": result["price"],
                "currency": result.get("currency", "USD"),
                "trace_id": trace_id
            })
            
            return {
                "success": True,
                "message": f"Successfully updated price for {machine['Machine Name']}",
                "machine_id": machine_id,
                "new_price": result["price"],
                "currency": result.get("currency", "USD"),
                "trace_id": trace_id,
                "debug_info": result.get("debug_info") if debug_mode else None
            }
        else:
            error_msg = result.get("error", "No price found")
            add_step(trace_id, "system", "error", error_msg)
            end_trace(trace_id, False, {"error": error_msg})
            return {
                "success": False,
                "message": error_msg,
                "machine_id": machine_id,
                "trace_id": trace_id,
                "debug_info": result.get("debug_info") if debug_mode else None
            }
            
    except Exception as e:
        logger.error(f"Error updating price for machine {machine_id}: {str(e)}")
        if locals().get("trace_id"):
            add_step(locals()["trace_id"], "system", "error", f"Unexpected error: {str(e)}")
            end_trace(locals()["trace_id"], False, {"error": str(e)})
        return {
            "success": False,
            "message": f"Error: {str(e)}",
            "machine_id": machine_id
        }

async def process_batch(batch_id: str, machine_ids: List[str], debug_mode: bool = False):
    """
    Process a batch of machine price updates
    
    Args:
        batch_id: ID of the batch job
        machine_ids: List of machine IDs to update
        debug_mode: Whether to include debug information in the results
    """
    try:
        # Update batch status
        _batch_jobs[batch_id]["status"] = "processing"
        _batch_jobs[batch_id]["start_time"] = datetime.now().isoformat()
        
        # Get machines from database
        machines = await get_machines_by_ids(machine_ids)
        
        if not machines:
            _batch_jobs[batch_id]["status"] = "completed"
            _batch_jobs[batch_id]["end_time"] = datetime.now().isoformat()
            _batch_jobs[batch_id]["results"] = []
            _batch_jobs[batch_id]["success_count"] = 0
            _batch_jobs[batch_id]["failed_count"] = len(machine_ids)
            return
        
        # Filter machines that have product links
        machines_with_links = [m for m in machines if m.get("product_link")]
        
        if not machines_with_links:
            _batch_jobs[batch_id]["status"] = "completed"
            _batch_jobs[batch_id]["end_time"] = datetime.now().isoformat()
            _batch_jobs[batch_id]["results"] = [
                {
                    "machine_id": m["id"],
                    "success": False,
                    "message": "No product link defined"
                }
                for m in machines
            ]
            _batch_jobs[batch_id]["success_count"] = 0
            _batch_jobs[batch_id]["failed_count"] = len(machines)
            return
        
        # Process in batches of MAX_BATCH_SIZE
        results = []
        success_count = 0
        failed_count = 0
        
        # Initialize the price extraction crew
        price_crew = get_price_crew(debug=debug_mode or DEBUG_MODE)
        
        # Process in chunks to avoid overwhelming the crew
        chunk_size = min(MAX_BATCH_SIZE, 5)  # Process at most 5 machines at once
        for i in range(0, len(machines_with_links), chunk_size):
            chunk = machines_with_links[i:i+chunk_size]
            
            # Update batch status
            _batch_jobs[batch_id]["status"] = f"processing ({i+1} to {min(i+chunk_size, len(machines_with_links))} of {len(machines_with_links)})"
            
            # Run the crew to extract prices for this chunk
            chunk_result = price_crew.kickoff(inputs={"machines": chunk})
            
            # Process results for this chunk
            if chunk_result and isinstance(chunk_result, dict) and "machines" in chunk_result:
                machine_results = chunk_result.get("machines", [])
                
                for machine, result in zip(chunk, machine_results):
                    if result.get("success", False) and result.get("new_price"):
                        success_count += 1
                        results.append({
                            "machine_id": machine["id"],
                            "machine_name": machine["Machine Name"],
                            "success": True,
                            "new_price": float(result["new_price"]),
                            "currency": result.get("currency", "USD")
                        })
                    else:
                        failed_count += 1
                        results.append({
                            "machine_id": machine["id"],
                            "machine_name": machine["Machine Name"],
                            "success": False,
                            "message": result.get("error", "Unknown error during price extraction")
                        })
            else:
                # If crew failed for the entire chunk, mark all as failed
                for machine in chunk:
                    failed_count += 1
                    results.append({
                        "machine_id": machine["id"],
                        "machine_name": machine["Machine Name"],
                        "success": False,
                        "message": "Batch processing failed"
                    })
        
        # Add machines without product links to results
        for machine in [m for m in machines if not m.get("product_link")]:
            failed_count += 1
            results.append({
                "machine_id": machine["id"],
                "machine_name": machine["Machine Name"],
                "success": False,
                "message": "No product link defined"
            })
        
        # Update batch status
        _batch_jobs[batch_id]["status"] = "completed"
        _batch_jobs[batch_id]["end_time"] = datetime.now().isoformat()
        _batch_jobs[batch_id]["results"] = results
        _batch_jobs[batch_id]["success_count"] = success_count
        _batch_jobs[batch_id]["failed_count"] = failed_count
    
    except Exception as e:
        logger.error(f"Error processing batch {batch_id}: {str(e)}")
        _batch_jobs[batch_id]["status"] = "error"
        _batch_jobs[batch_id]["error"] = str(e)
        _batch_jobs[batch_id]["end_time"] = datetime.now().isoformat()

async def update_multiple_prices(machine_ids: List[str], debug_mode: bool = False) -> str:
    """
    Update prices for multiple machines in the background
    
    Args:
        machine_ids: List of machine IDs to update
        debug_mode: Whether to include debug information in the results
        
    Returns:
        Batch job ID for tracking the operation
    """
    # Generate a batch ID
    batch_id = str(uuid.uuid4())
    
    # Create a batch job record
    _batch_jobs[batch_id] = {
        "id": batch_id,
        "status": "pending",
        "created_at": datetime.now().isoformat(),
        "machine_ids": machine_ids,
        "machine_count": len(machine_ids),
        "debug_mode": debug_mode
    }
    
    # Start the batch process asynchronously
    asyncio.create_task(process_batch(batch_id, machine_ids, debug_mode))
    
    return batch_id

def get_batch_status(batch_id: str) -> Optional[Dict[str, Any]]:
    """
    Get the status of a batch price update job
    
    Args:
        batch_id: ID of the batch job
        
    Returns:
        Dict containing the batch job status or None if not found
    """
    return _batch_jobs.get(batch_id) 