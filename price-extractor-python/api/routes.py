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

class UpdateResponse(BaseModel):
    """Response model for price update operations."""
    success: bool
    message: Optional[str] = None
    error: Optional[str] = None
    old_price: Optional[float] = None
    new_price: Optional[float] = None
    method: Optional[str] = None
    price_change: Optional[float] = None
    percentage_change: Optional[float] = None

@router.post("/update-price", response_model=UpdateResponse)
async def update_machine_price(request: MachineUpdateRequest):
    """
    Update price for a specific machine.
    
    This endpoint is called by the admin interface when the "update price" button is pressed.
    """
    logger.info(f"Received price update request for machine {request.machine_id}")
    
    try:
        result = await price_service.update_machine_price(request.machine_id)
        if not result["success"]:
            logger.error(f"Price update failed for machine {request.machine_id}: {result.get('error')}")
            raise HTTPException(status_code=400, detail=result.get("error", "Price update failed"))
        
        return result
    except Exception as e:
        logger.exception(f"Error updating price for machine {request.machine_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating price: {str(e)}")

@router.post("/batch-update", response_model=dict)
async def batch_update_prices(request: BatchUpdateRequest, background_tasks: BackgroundTasks):
    """
    Batch update prices for multiple machines or all machines that need updates.
    
    If machine_ids is provided, only those machines will be updated.
    Otherwise, all machines that haven't been updated in the last days_threshold days will be updated.
    """
    logger.info(f"Received batch update request with threshold {request.days_threshold} days")
    
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
        logger.info(f"Batch updating all machines with threshold {request.days_threshold} days")
        
        # Add the batch update to background tasks
        background_tasks.add_task(
            _process_batch_update, 
            request.days_threshold
        )
        
        return {
            "success": True,
            "message": f"Batch update started in the background with threshold {request.days_threshold} days"
        }
    except Exception as e:
        logger.exception(f"Error starting batch update: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error starting batch update: {str(e)}")

async def _process_batch_update(days_threshold: int):
    """Process a batch update in the background."""
    try:
        await price_service.batch_update_machines(days_threshold)
    except Exception as e:
        logger.exception(f"Error in background batch update: {str(e)}")

async def _process_specific_machines(machine_ids: List[str]):
    """Process specific machines in the background."""
    for machine_id in machine_ids:
        try:
            await price_service.update_machine_price(machine_id)
        except Exception as e:
            logger.exception(f"Error updating machine {machine_id} in batch: {str(e)}") 