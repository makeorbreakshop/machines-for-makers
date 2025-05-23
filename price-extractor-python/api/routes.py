from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from loguru import logger
from typing import Optional, List

from services.price_service import PriceService

router = APIRouter()
price_service = PriceService()

class MachineUpdateRequest(BaseModel):
    """Request model for updating a machine's price."""
    machine_id: str

class BatchUpdateRequest(BaseModel):
    """Request model for batch updating machine prices."""
    days_threshold: Optional[int] = 7
    machine_ids: Optional[List[str]] = None
    limit: Optional[int] = None

class UpdateResponse(BaseModel):
    """Response model for price update operation."""
    success: bool
    message: Optional[str] = None
    error: Optional[str] = None
    old_price: Optional[float] = None
    new_price: Optional[float] = None
    method: Optional[str] = None
    price_change: Optional[float] = None
    percentage_change: Optional[float] = None

@router.get("/health")
async def health_check():
    """Simple health check endpoint."""
    return {"status": "ok"}

@router.post("/update-price", response_model=UpdateResponse)
async def update_machine_price(request: MachineUpdateRequest):
    """
    Update price for a specific machine.
    
    This endpoint is called by the admin interface when the "update price" button is pressed.
    """
    logger.info(f"Received price update request for machine {request.machine_id}")
    
    try:
        # Validate the machine ID is in correct format (basic check)
        if not request.machine_id or len(request.machine_id) < 8:
            logger.error(f"Invalid machine ID format: {request.machine_id}")
            raise HTTPException(status_code=400, detail=f"Invalid machine ID format: {request.machine_id}")
        
        # Process the price update
        result = await price_service.update_machine_price(request.machine_id)
        
        # Handle failure cases with detailed error messages
        if not result["success"]:
            error_msg = result.get("error", "Price update failed")
            logger.error(f"Price update failed for machine {request.machine_id}: {error_msg}")
            
            # Include more details in the response for debugging
            raise HTTPException(
                status_code=400, 
                detail=error_msg
            )
        
        return result
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.exception(f"Error updating price for machine {request.machine_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating price: {str(e)}")

@router.get("/machines-needing-update")
async def get_machines_needing_update(days: int = 7):
    """
    Get list of machines that need price updates.
    
    Args:
        days (int): Threshold in days for machines needing update.
    """
    try:
        result = await price_service.db_service.get_machines_needing_update(days)
        # Return only necessary fields to reduce response size
        machines = []
        for machine in result:
            machines.append({
                "id": machine.get("id"),
                "machine_name": machine.get("Machine Name"),
                "product_link": machine.get("product_link"),
                "price": machine.get("Price"),
                "last_updated": machine.get("html_timestamp")
            })
        return {"machines": machines, "count": len(machines)}
    except Exception as e:
        logger.exception(f"Error getting machines needing update: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting machines needing update: {str(e)}")

@router.post("/batch-update", response_model=dict)
async def batch_update_machines(request: dict, background_tasks: BackgroundTasks = None):
    """
    Start a batch update for machines.
    
    Args:
        request (dict): Request containing parameters:
            - days_threshold (int): Days threshold for updates
            - limit (Optional[int]): Maximum machines to update
            - machine_ids (List[str], optional): Specific machine IDs to update
    """
    try:
        days_threshold = request.get("days_threshold", 7)
        limit = request.get("limit", None)
        machine_ids = request.get("machine_ids", None)
        
        logger.info(f"Batch update request with days={days_threshold}, limit={limit}, machine_ids={machine_ids[:5] if machine_ids and len(machine_ids) > 5 else machine_ids}")
        
        if background_tasks:
            # Pass the specific machine_ids to the batch update if provided
            background_tasks.add_task(
                _process_batch_update, 
                days_threshold,
                limit,
                machine_ids
            )
            return {
                "success": True, 
                "message": f"Batch update started for {len(machine_ids) if machine_ids else 'all'} machines in the background"
            }
        else:
            result = await price_service.batch_update_machines(
                days_threshold=days_threshold, 
                limit=limit,
                machine_ids=machine_ids
            )
            return result
    except Exception as e:
        logger.exception(f"Error starting batch update: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error starting batch update: {str(e)}")

@router.post("/batch-update-advanced", response_model=dict)
async def batch_update_prices(request: BatchUpdateRequest, background_tasks: BackgroundTasks):
    """
    Batch update prices for multiple machines or all machines that need updates.
    
    If machine_ids is provided, only those machines will be updated.
    Otherwise, all machines that haven't been updated in the last days_threshold days will be updated.
    """
    logger.info(f"Received batch update request with threshold {request.days_threshold} days and limit {request.limit if request.limit else 'none'}")
    
    try:
        # If specific machine IDs are provided, update only those
        if request.machine_ids:
            logger.info(f"Batch updating specific machines: {request.machine_ids}")
            
            # Add the batch update to background tasks
            background_tasks.add_task(
                _process_specific_machines, 
                request.machine_ids
            )
            
            return {
                "success": True,
                "message": f"Batch update of {len(request.machine_ids)} machines started in the background"
            }
        
        # Otherwise update all machines that need updates
        logger.info(f"Batch updating all machines with threshold {request.days_threshold} days and limit {request.limit if request.limit else 'none'}")
        
        # Add the batch update to background tasks
        background_tasks.add_task(
            _process_batch_update, 
            request.days_threshold,
            request.limit
        )
        
        return {
            "success": True,
            "message": f"Batch update started in the background with threshold {request.days_threshold} days and limit {request.limit if request.limit else 'none'}"
        }
    except Exception as e:
        logger.exception(f"Error starting batch update: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error starting batch update: {str(e)}")

@router.get("/batch-results/{batch_id}", response_model=dict)
async def get_batch_results(batch_id: str):
    """
    Get the results of a batch update operation.
    
    This endpoint is optimized to efficiently fetch batch results without triggering any CPU-intensive operations.
    """
    logger.info(f"Fetching batch results for batch_id: {batch_id}")
    
    try:
        # Get batch results from the database directly without processing
        batch_data = await price_service.get_batch_results(batch_id)
        
        if not batch_data:
            logger.warning(f"No batch results found for batch_id: {batch_id}")
            return {
                "success": False,
                "error": f"No batch results found for batch_id: {batch_id}"
            }
        
        return {
            "success": True,
            "batch_data": batch_data
        }
    except Exception as e:
        logger.exception(f"Error fetching batch results for batch_id {batch_id}: {str(e)}")
        return {
            "success": False,
            "error": f"Error fetching batch results: {str(e)}"
        }

async def _process_batch_update(days_threshold: int, limit: Optional[int] = None, machine_ids: List[str] = None):
    """Process a batch update in the background."""
    try:
        await price_service.batch_update_machines(days_threshold, limit=limit, machine_ids=machine_ids)
    except Exception as e:
        logger.exception(f"Error in background batch update: {str(e)}")

async def _process_specific_machines(machine_ids: List[str]):
    """Process specific machines in the background."""
    for machine_id in machine_ids:
        try:
            await price_service.update_machine_price(machine_id)
        except Exception as e:
            logger.exception(f"Error updating machine {machine_id} in batch: {str(e)}")

@router.post("/batch-configure")
async def configure_batch_update(request: dict):
    """
    Configure a batch update and return the number of machines that would be affected.
    
    Args:
        request (dict): The request body containing configuration parameters:
            - days_threshold (int): Days threshold for machines needing update
            - limit (Optional[int]): Maximum number of machines to process
    """
    try:
        days_threshold = request.get("days_threshold", 7)
        limit = request.get("limit", None)
        
        logger.info(f"Configuring batch update with days_threshold={days_threshold}, limit={limit}")
        
        # Get machines that need updates
        machines = await price_service.db_service.get_machines_needing_update(days_threshold)
        
        # Extract machine IDs
        machine_ids = [machine.get("id") for machine in machines if machine.get("id")]
        
        # Apply limit
        if limit is not None and len(machine_ids) > limit:
            machine_ids = machine_ids[:limit]
            
        return {
            "success": True,
            "configuration": {
                "days_threshold": days_threshold,
                "limit": limit,
                "machine_count": len(machine_ids),
                "machine_ids": machine_ids
            }
        }
    except Exception as e:
        logger.exception(f"Error configuring batch update: {str(e)}")
        return {
            "success": False,
            "error": f"Error configuring batch update: {str(e)}"
        }

@router.get("/batches", response_model=dict)
async def get_batches():
    """
    Get a list of all batch jobs with their status.
    
    Returns:
        A list of batch jobs with details like id, status, start_time, end_time, and total_machines.
    """
    try:
        logger.info("Fetching list of batch jobs")
        
        # Query all batches from the database, ordered by start_time (newest first)
        # Note: Supabase client is synchronous, no await needed
        response = price_service.db_service.supabase.table("batches") \
            .select("id, status, start_time, end_time, total_machines, days_threshold") \
            .order("start_time", desc=True) \
            .limit(20) \
            .execute()
            
        if not response.data:
            logger.info("No batch jobs found in database")
            return {
                "success": True,
                "batches": []
            }
        
        logger.info(f"Found {len(response.data)} batch jobs")
        
        # Log the first batch to help with debugging
        if response.data and len(response.data) > 0:
            logger.info(f"Most recent batch: {response.data[0]}")
            
        return {
            "success": True,
            "batches": response.data
        }
    except Exception as e:
        logger.exception(f"Error fetching batch jobs: {str(e)}")
        return {
            "success": False,
            "error": f"Error fetching batch jobs: {str(e)}"
        } 