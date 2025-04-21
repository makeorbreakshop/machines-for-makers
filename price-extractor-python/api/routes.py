from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from loguru import logger
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

from services.price_service import PriceService
from services.extraction_service import ExtractionService

router = APIRouter()
price_service = PriceService()
extraction_service = ExtractionService()

class MachineUpdateRequest(BaseModel):
    """Request model for updating a machine's price."""
    machine_id: str
    confirm: Optional[bool] = False
    new_price: Optional[float] = None

class ExtractPriceRequest(BaseModel):
    """Request model for extracting a machine's price without saving."""
    machine_id: str

class BatchUpdateRequest(BaseModel):
    """Request model for batch updating machine prices."""
    days_threshold: Optional[int] = 7
    machine_ids: Optional[List[str]] = None
    limit: Optional[int] = None

class ReviewActionRequest(BaseModel):
    """Request model for review actions."""
    machine_id: str
    variant_attribute: Optional[str] = "DEFAULT"
    price: Optional[float] = None
    notes: Optional[str] = None

class ConfigUpdateRequest(BaseModel):
    """Request model for updating configuration."""
    config: Optional[Dict[str, Any]] = None
    
class ConfigData(BaseModel):
    """Model for configuration data fields."""
    css_price_selector: Optional[str] = None
    requires_js_interaction: Optional[bool] = None
    js_click_sequence: Optional[List[Dict[str, Any]]] = None
    min_extraction_confidence: Optional[float] = None
    min_validation_confidence: Optional[float] = None
    sanity_check_threshold: Optional[float] = None
    api_endpoint_template: Optional[str] = None

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
    extraction_details: Optional[dict] = None

@router.get("/health")
async def health_check():
    """Simple health check endpoint."""
    return {"status": "ok"}

@router.post("/extract-price", response_model=UpdateResponse)
async def extract_machine_price(request: ExtractPriceRequest):
    """
    Extract price for a specific machine without saving to database.
    
    This endpoint is called by the admin interface for price preview and confirmation.
    """
    logger.info(f"Received price extraction request for machine {request.machine_id}")
    
    try:
        # Validate the machine ID is in correct format (basic check)
        if not request.machine_id or len(request.machine_id) < 8:
            logger.error(f"Invalid machine ID format: {request.machine_id}")
            raise HTTPException(status_code=400, detail=f"Invalid machine ID format: {request.machine_id}")
        
        # Process the price extraction
        result = await price_service.extract_machine_price(request.machine_id)
        
        # Handle failure cases with detailed error messages
        if not result["success"]:
            error_msg = result.get("error", "Price extraction failed")
            logger.error(f"Price extraction failed for machine {request.machine_id}: {error_msg}")
            
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
        logger.exception(f"Error extracting price for machine {request.machine_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error extracting price: {str(e)}")

@router.post("/update-price", response_model=UpdateResponse)
async def update_machine_price(request: MachineUpdateRequest):
    """
    Update price for a specific machine.
    
    This endpoint is called by the admin interface when the "update price" button is pressed.
    If confirm=true, it will use the provided new_price to update the database.
    Otherwise, it will extract the price but not save it.
    """
    logger.info(f"Received price update request for machine {request.machine_id}")
    
    try:
        # Validate the machine ID is in correct format (basic check)
        if not request.machine_id or len(request.machine_id) < 8:
            logger.error(f"Invalid machine ID format: {request.machine_id}")
            raise HTTPException(status_code=400, detail=f"Invalid machine ID format: {request.machine_id}")
        
        # Check if the machine exists in the database first
        machine = await price_service.db_service.get_machine_by_id(request.machine_id)
        if not machine:
            logger.error(f"Machine ID not found in database: {request.machine_id}")
            error_detail = {
                "error": f"Machine ID not found in database: {request.machine_id}",
                "machine_id": request.machine_id,
                "debug_info": {
                    "request_type": "update_price",
                    "timestamp": datetime.now().isoformat()
                }
            }
            raise HTTPException(status_code=404, detail=error_detail)
        
        logger.info(f"Machine found: {machine.get('Machine Name')} (ID: {machine.get('id')})")
        
        # If confirmation is required and a new price is provided, save it directly
        if request.confirm and request.new_price is not None:
            logger.info(f"Confirmed price update for machine {request.machine_id}: {request.new_price}")
            result = await price_service.save_machine_price(request.machine_id, request.new_price)
        else:
            # Otherwise, extract the price but don't save (for preview)
            logger.info(f"Non-confirmed price update for machine {request.machine_id}")
            result = await price_service.update_machine_price(request.machine_id)
        
        # Add additional debug information to the response
        if not "debug" in result:
            result["debug"] = {}
        
        result["debug"].update({
            "machine_name": machine.get("Machine Name"),
            "machine_company": machine.get("Company"),
            "product_url": machine.get("product_link"),
            "request_time": datetime.now().isoformat(),
            "confirm_mode": request.confirm
        })
        
        # Handle failure cases with detailed error messages
        if not result["success"]:
            error_msg = result.get("error", "Price update failed")
            logger.error(f"Price update failed for machine {request.machine_id}: {error_msg}")
            
            # Add more context to the error
            result["debug"].update({
                "error_context": "Price extraction successful but database update failed",
                "machine_id_format": request.machine_id,
                "db_machine_id": machine.get("id")
            })
            
            # Include more details in the response for debugging
            raise HTTPException(
                status_code=400, 
                detail=result
            )
        
        logger.info(f"Price update successful for {machine.get('Machine Name')}")
        return result
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.exception(f"Error updating price for machine {request.machine_id}: {str(e)}")
        error_detail = {
            "success": False,
            "error": f"Error updating price: {str(e)}",
            "exception_type": type(e).__name__,
            "machine_id": request.machine_id,
            "timestamp": datetime.now().isoformat()
        }
        raise HTTPException(status_code=500, detail=error_detail)

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

@router.get("/reviews")
async def get_flagged_machines(limit: int = 100, skip: int = 0):
    """
    Get machines flagged for manual review.
    
    Args:
        limit (int): Maximum number of machines to return
        skip (int): Number of machines to skip (for pagination)
        
    Returns:
        List of machines flagged for manual review with details.
    """
    try:
        logger.info(f"Fetching machines flagged for manual review (limit={limit}, skip={skip})")
        
        # Query machines with manual_review_flag=true from the database
        flagged_machines = await price_service.db_service.get_flagged_machines(limit=limit, skip=skip)
        
        if not flagged_machines:
            logger.info("No machines flagged for manual review")
            return {"success": True, "reviews": [], "count": 0}
        
        # Format the results
        result = []
        for machine in flagged_machines:
            old_price = machine.get("previous_price")
            new_price = machine.get("machines_latest_price")
            
            # Calculate price change information
            price_change = new_price - old_price if old_price is not None and new_price is not None else None
            percentage_change = ((new_price - old_price) / old_price) * 100 if old_price is not None and old_price > 0 and new_price is not None else None
            
            result.append({
                "machine_id": machine.get("machine_id"),
                "variant_attribute": machine.get("variant_attribute"),
                "machine_name": machine.get("machine_name"),
                "old_price": old_price,
                "new_price": new_price,
                "price_change": price_change,
                "percentage_change": percentage_change,
                "tier": machine.get("tier"),
                "confidence": machine.get("confidence"),
                "currency": machine.get("currency", "USD"),
                "last_checked": machine.get("last_checked"),
                "reason": machine.get("flag_reason", "Unknown")
            })
        
        return {
            "success": True, 
            "reviews": result, 
            "count": len(result),
            "total": await price_service.db_service.get_flagged_machines_count()
        }
    except Exception as e:
        logger.exception(f"Error fetching machines flagged for review: {str(e)}")
        return {"success": False, "error": str(e)}

@router.post("/reviews/{machine_id}/approve")
async def approve_flagged_price(machine_id: str, request: ReviewActionRequest):
    """
    Approve a flagged price change.
    
    Args:
        machine_id (str): ID of the machine to approve
        request (ReviewActionRequest): Request containing variant information
        
    Returns:
        Status of the approval operation.
    """
    try:
        logger.info(f"Approving flagged price for machine {machine_id}, variant {request.variant_attribute}")
        
        # Get the current flagged price from machines_latest
        machine = await price_service.db_service.get_machine_latest_price(
            machine_id, 
            request.variant_attribute
        )
        
        if not machine:
            return {
                "success": False,
                "error": f"Machine {machine_id} with variant {request.variant_attribute} not found"
            }
        
        # Clear the review flag without changing the price
        success = await price_service.db_service.set_manual_review_flag(
            machine_id,
            request.variant_attribute,
            False
        )
        
        if not success:
            return {
                "success": False,
                "error": "Failed to clear review flag"
            }
        
        # Add notes to price history if provided
        if request.notes:
            await price_service.db_service.add_price_history(
                machine_id=machine_id,
                variant_attribute=request.variant_attribute,
                new_price=machine.get("machines_latest_price"),
                old_price=machine.get("machines_latest_price"),  # Same price, just adding notes
                tier="MANUAL_REVIEW",
                success=True,
                source="admin_approval"
            )
            
        return {
            "success": True,
            "message": f"Successfully approved price for {machine_id}",
            "machine_id": machine_id,
            "variant_attribute": request.variant_attribute,
            "price": machine.get("machines_latest_price")
        }
    except Exception as e:
        logger.exception(f"Error approving price for machine {machine_id}: {str(e)}")
        return {"success": False, "error": str(e)}

@router.post("/reviews/{machine_id}/override")
async def override_flagged_price(machine_id: str, request: ReviewActionRequest):
    """
    Override a flagged price with manual value.
    
    Args:
        machine_id (str): ID of the machine to override
        request (ReviewActionRequest): Request containing new price and variant
        
    Returns:
        Status of the override operation.
    """
    try:
        logger.info(f"Overriding price for machine {machine_id}, variant {request.variant_attribute}")
        
        if request.price is None:
            return {
                "success": False,
                "error": "Price must be provided for override operation"
            }
        
        # Get current price for comparison
        machine = await price_service.db_service.get_machine_latest_price(
            machine_id, 
            request.variant_attribute
        )
        
        if not machine:
            return {
                "success": False,
                "error": f"Machine {machine_id} with variant {request.variant_attribute} not found"
            }
        
        old_price = machine.get("machines_latest_price")
        
        # Update price and clear review flag
        success = await price_service.db_service.update_machine_price(
            machine_id=machine_id,
            new_price=request.price,
            variant_attribute=request.variant_attribute,
            tier="MANUAL_OVERRIDE",
            confidence=1.0
        )
        
        if not success:
            return {
                "success": False,
                "error": "Failed to update price"
            }
        
        # Clear the review flag
        await price_service.db_service.set_manual_review_flag(
            machine_id,
            request.variant_attribute,
            False
        )
        
        # Add to price history
        await price_service.db_service.add_price_history(
            machine_id=machine_id,
            variant_attribute=request.variant_attribute,
            new_price=request.price,
            old_price=old_price,
            tier="MANUAL_OVERRIDE",
            extracted_confidence=1.0,
            validation_confidence=1.0,
            success=True,
            source="admin_override",
            currency=machine.get("currency", "USD")
        )
        
        return {
            "success": True,
            "message": f"Successfully updated price for {machine_id}",
            "machine_id": machine_id,
            "variant_attribute": request.variant_attribute,
            "old_price": old_price,
            "new_price": request.price
        }
    except Exception as e:
        logger.exception(f"Error overriding price for machine {machine_id}: {str(e)}")
        return {"success": False, "error": str(e)}

@router.post("/reviews/{machine_id}/reject")
async def reject_flagged_price(machine_id: str, request: ReviewActionRequest):
    """
    Reject a flagged price change.
    
    Args:
        machine_id (str): ID of the machine to reject
        request (ReviewActionRequest): Request containing variant and notes
        
    Returns:
        Status of the rejection operation.
    """
    try:
        logger.info(f"Rejecting flagged price for machine {machine_id}, variant {request.variant_attribute}")
        
        # Get machine to find previous price
        machine_data = await price_service.db_service.get_machine_by_id(machine_id)
        
        if not machine_data:
            return {
                "success": False,
                "error": f"Machine {machine_id} not found"
            }
        
        # Get latest price record
        latest_price = await price_service.db_service.get_machine_latest_price(
            machine_id, 
            request.variant_attribute
        )
        
        if not latest_price:
            return {
                "success": False,
                "error": f"Latest price for {machine_id} with variant {request.variant_attribute} not found"
            }
        
        # Get previous price from price history
        previous_price = await price_service.db_service.get_previous_price(
            machine_id,
            request.variant_attribute
        )
        
        if not previous_price:
            # Fallback to main machine price if no previous variant price
            previous_price = machine_data.get("Price")
        
        # Revert to previous price and clear flag
        success = await price_service.db_service.update_machine_price(
            machine_id=machine_id,
            new_price=previous_price,
            variant_attribute=request.variant_attribute,
            tier="MANUAL_REJECT",
            confidence=1.0
        )
        
        if not success:
            return {
                "success": False,
                "error": "Failed to revert price"
            }
        
        # Clear the review flag
        await price_service.db_service.set_manual_review_flag(
            machine_id,
            request.variant_attribute,
            False
        )
        
        # Add rejection record to price history
        await price_service.db_service.add_price_history(
            machine_id=machine_id,
            variant_attribute=request.variant_attribute,
            new_price=previous_price,
            old_price=latest_price.get("machines_latest_price"),
            tier="MANUAL_REJECT",
            extracted_confidence=1.0,
            validation_confidence=1.0,
            success=True,
            error_message=request.notes,
            source="admin_rejection"
        )
        
        return {
            "success": True,
            "message": f"Successfully rejected price change for {machine_id}",
            "machine_id": machine_id,
            "variant_attribute": request.variant_attribute,
            "rejected_price": latest_price.get("machines_latest_price"),
            "reverted_price": previous_price
        }
    except Exception as e:
        logger.exception(f"Error rejecting price for machine {machine_id}: {str(e)}")
        return {"success": False, "error": str(e)}

@router.get("/machines")
async def get_machines(
    limit: int = 100, 
    skip: int = 0, 
    days_threshold: int = None,
    search: str = None,
    company: str = None,
    category: str = None
):
    """
    List all machines with variant price information.
    
    Args:
        limit (int): Maximum number of machines to return
        skip (int): Number of machines to skip (for pagination)
        days_threshold (int, optional): Filter by days since last update
        search (str, optional): Search term for machine name
        company (str, optional): Filter by company name
        category (str, optional): Filter by machine category
        
    Returns:
        List of machines with their variant information.
    """
    try:
        logger.info(f"Fetching machines (limit={limit}, skip={skip}, days_threshold={days_threshold})")
        
        # Get machines from database
        machines = await price_service.db_service.get_machines_with_variants(
            limit=limit,
            skip=skip,
            days_threshold=days_threshold,
            search=search,
            company=company,
            category=category
        )
        
        if not machines:
            return {"success": True, "machines": [], "count": 0}
        
        # Get total count for pagination
        total_count = await price_service.db_service.get_machines_count(
            days_threshold=days_threshold,
            search=search,
            company=company,
            category=category
        )
        
        return {
            "success": True,
            "machines": machines,
            "count": len(machines),
            "total": total_count
        }
    except Exception as e:
        logger.exception(f"Error fetching machines: {str(e)}")
        return {"success": False, "error": str(e)}

@router.get("/machines/{machine_id}")
async def get_machine_details(machine_id: str):
    """
    Get detailed information for a specific machine with variants.
    
    Args:
        machine_id (str): Machine ID
        
    Returns:
        Detailed machine information with variants.
    """
    try:
        logger.info(f"Fetching details for machine {machine_id}")
        
        # Get machine with variant information
        machine = await price_service.db_service.get_machine_with_variants(machine_id)
        
        if not machine:
            logger.error(f"Machine {machine_id} not found")
            return {"success": False, "error": f"Machine {machine_id} not found"}
        
        # Get price history (most recent entries)
        price_history = await price_service.db_service.get_price_history(
            machine_id,
            limit=10
        )
        
        # Add price history to response
        machine["price_history"] = price_history
        
        return {
            "success": True,
            "machine": machine
        }
    except Exception as e:
        logger.exception(f"Error fetching machine details for {machine_id}: {str(e)}")
        return {"success": False, "error": str(e)}

@router.get("/machines/{machine_id}/price-history")
async def get_machine_price_history(
    machine_id: str, 
    variant_attribute: str = "DEFAULT",
    limit: int = 30,
    skip: int = 0
):
    """
    Get price history for a machine with optional variant filtering.
    
    Args:
        machine_id (str): Machine ID
        variant_attribute (str): Variant attribute (optional)
        limit (int): Maximum number of history entries
        skip (int): Number of entries to skip
        
    Returns:
        Price history for the machine.
    """
    try:
        logger.info(f"Fetching price history for machine {machine_id}, variant {variant_attribute}")
        
        # Get price history
        price_history = await price_service.db_service.get_price_history(
            machine_id,
            variant_attribute=variant_attribute,
            limit=limit,
            skip=skip
        )
        
        if not price_history:
            return {
                "success": True,
                "machine_id": machine_id,
                "variant_attribute": variant_attribute,
                "history": [],
                "count": 0
            }
        
        # Get total count
        total_count = await price_service.db_service.get_price_history_count(
            machine_id,
            variant_attribute=variant_attribute
        )
        
        return {
            "success": True,
            "machine_id": machine_id,
            "variant_attribute": variant_attribute,
            "history": price_history,
            "count": len(price_history),
            "total": total_count
        }
    except Exception as e:
        logger.exception(f"Error fetching price history for {machine_id}/{variant_attribute}: {str(e)}")
        return {"success": False, "error": str(e)}

@router.get("/usage/summary")
async def get_usage_summary(days: int = 30):
    """
    Get overall LLM usage summary for the cost tracking dashboard.
    
    Args:
        days (int): Number of days to include in the summary
        
    Returns:
        Overall usage summary with total costs by model and tier.
    """
    try:
        logger.info(f"Fetching LLM usage summary for the last {days} days")
        
        # Get usage summary from database
        summary = await price_service.db_service.get_llm_usage_summary(days)
        
        if not summary:
            return {
                "success": True,
                "summary": {
                    "total_cost": 0,
                    "total_requests": 0,
                    "models": [],
                    "tiers": []
                },
                "days": days
            }
        
        return {
            "success": True,
            "summary": summary,
            "days": days
        }
    except Exception as e:
        logger.exception(f"Error fetching LLM usage summary: {str(e)}")
        return {"success": False, "error": str(e)}

@router.get("/usage/by-model")
async def get_usage_by_model(days: int = 30):
    """
    Get LLM usage breakdown by model.
    
    Args:
        days (int): Number of days to include
        
    Returns:
        Usage statistics broken down by model.
    """
    try:
        logger.info(f"Fetching LLM usage by model for the last {days} days")
        
        # Get usage by model from database
        usage_by_model = await price_service.db_service.get_llm_usage_by_model(days)
        
        if not usage_by_model:
            return {
                "success": True,
                "models": [],
                "days": days
            }
        
        return {
            "success": True,
            "models": usage_by_model,
            "days": days
        }
    except Exception as e:
        logger.exception(f"Error fetching LLM usage by model: {str(e)}")
        return {"success": False, "error": str(e)}

@router.get("/usage/by-tier")
async def get_usage_by_tier(days: int = 30):
    """
    Get LLM usage breakdown by extraction tier.
    
    Args:
        days (int): Number of days to include
        
    Returns:
        Usage statistics broken down by extraction tier.
    """
    try:
        logger.info(f"Fetching LLM usage by tier for the last {days} days")
        
        # Get usage by tier from database
        usage_by_tier = await price_service.db_service.get_llm_usage_by_tier(days)
        
        if not usage_by_tier:
            return {
                "success": True,
                "tiers": [],
                "days": days
            }
        
        return {
            "success": True,
            "tiers": usage_by_tier,
            "days": days
        }
    except Exception as e:
        logger.exception(f"Error fetching LLM usage by tier: {str(e)}")
        return {"success": False, "error": str(e)}

@router.get("/usage/by-date")
async def get_usage_by_date(days: int = 30, group_by: str = "day"):
    """
    Get LLM usage trends over time.
    
    Args:
        days (int): Number of days to include
        group_by (str): Grouping level (day, week, month)
        
    Returns:
        Usage statistics grouped by date.
    """
    try:
        logger.info(f"Fetching LLM usage by date for the last {days} days, grouped by {group_by}")
        
        # Validate group_by parameter
        valid_groups = ["day", "week", "month"]
        if group_by not in valid_groups:
            return {
                "success": False,
                "error": f"Invalid group_by value. Must be one of: {', '.join(valid_groups)}"
            }
        
        # Get usage by date from database
        usage_by_date = await price_service.db_service.get_llm_usage_by_date(days, group_by)
        
        if not usage_by_date:
            return {
                "success": True,
                "dates": [],
                "days": days,
                "group_by": group_by
            }
        
        return {
            "success": True,
            "dates": usage_by_date,
            "days": days,
            "group_by": group_by
        }
    except Exception as e:
        logger.exception(f"Error fetching LLM usage by date: {str(e)}")
        return {"success": False, "error": str(e)}

@router.get("/usage/projected")
async def get_projected_costs(days: int = 30, projection_days: int = 30):
    """
    Get projected LLM costs based on current usage.
    
    Args:
        days (int): Number of days to base projection on
        projection_days (int): Number of days to project
        
    Returns:
        Projected costs for the specified period.
    """
    try:
        logger.info(f"Calculating projected costs based on last {days} days for next {projection_days} days")
        
        # Get current usage totals
        summary = await price_service.db_service.get_llm_usage_summary(days)
        
        if not summary or summary.get("total_cost", 0) == 0:
            return {
                "success": True,
                "projection": {
                    "daily_average": 0,
                    "projected_cost": 0,
                    "projection_days": projection_days
                },
                "days": days
            }
        
        # Calculate daily average
        total_cost = summary.get("total_cost", 0)
        daily_average = total_cost / days
        
        # Project for specified days
        projected_cost = daily_average * projection_days
        
        return {
            "success": True,
            "projection": {
                "daily_average": daily_average,
                "projected_cost": projected_cost,
                "projection_days": projection_days
            },
            "days": days
        }
    except Exception as e:
        logger.exception(f"Error calculating projected costs: {str(e)}")
        return {"success": False, "error": str(e)}

@router.get("/machines/{machine_id}/config")
async def get_machine_config(machine_id: str, variant_attribute: str = "DEFAULT"):
    """
    Get configuration for a machine with optional variant.
    
    Args:
        machine_id (str): Machine ID
        variant_attribute (str): Variant attribute
        
    Returns:
        Configuration for the machine and variant.
    """
    try:
        logger.info(f"Fetching configuration for machine {machine_id}, variant {variant_attribute}")
        
        # Get machine details to verify it exists
        machine = await price_service.db_service.get_machine_by_id(machine_id)
        
        if not machine:
            logger.error(f"Machine {machine_id} not found")
            return {"success": False, "error": f"Machine {machine_id} not found"}
        
        # Extract domain from product URL
        product_url = machine.get("product_link")
        domain = price_service._extract_domain(product_url) if product_url else None
        
        if not domain:
            return {
                "success": False,
                "error": f"Could not extract domain from URL for machine {machine_id}"
            }
            
        # Get variant extraction config
        config = await price_service.db_service.get_variant_config(
            machine_id,
            variant_attribute,
            domain
        )
        
        # If no config exists, return default values
        if not config:
            config = {
                "machine_id": machine_id,
                "variant_attribute": variant_attribute,
                "domain": domain,
                "requires_js_interaction": False,
                "css_price_selector": None,
                "js_click_sequence": None,
                "min_extraction_confidence": 0.85,
                "min_validation_confidence": 0.90,
                "sanity_check_threshold": 0.25,
                "api_endpoint_template": None,
                "api_endpoint_discovered_at": None
            }
        
        return {
            "success": True,
            "config": config,
            "machine": {
                "id": machine.get("id"),
                "name": machine.get("Machine Name"),
                "product_url": product_url,
                "domain": domain
            }
        }
    except Exception as e:
        logger.exception(f"Error fetching config for machine {machine_id}: {str(e)}")
        return {"success": False, "error": str(e)}

@router.post("/machines/{machine_id}/config")
async def update_machine_config(machine_id: str, request: ConfigUpdateRequest, variant_attribute: str = "DEFAULT"):
    """
    Update configuration for a machine with optional variant.
    
    Args:
        machine_id (str): Machine ID
        request (ConfigUpdateRequest): Configuration updates
        variant_attribute (str): Variant attribute
        
    Returns:
        Updated configuration.
    """
    try:
        logger.info(f"Updating configuration for machine {machine_id}, variant {variant_attribute}")
        
        # Get machine details to verify it exists
        machine = await price_service.db_service.get_machine_by_id(machine_id)
        
        if not machine:
            logger.error(f"Machine {machine_id} not found")
            return {"success": False, "error": f"Machine {machine_id} not found"}
        
        # Extract domain from product URL
        product_url = machine.get("product_link")
        domain = price_service._extract_domain(product_url) if product_url else None
        
        if not domain:
            return {
                "success": False,
                "error": f"Could not extract domain from URL for machine {machine_id}"
            }
        
        # Get config data from the request
        config_data = {}
        if request.config:
            logger.info(f"Using nested config field for {machine_id}")
            
            # Extract fields from the nested config object
            if "css_price_selector" in request.config:
                config_data["css_price_selector"] = request.config.get("css_price_selector")
                
            if "requires_js_interaction" in request.config:
                config_data["requires_js_interaction"] = request.config.get("requires_js_interaction")
                
            if "js_click_sequence" in request.config:
                config_data["js_click_sequence"] = request.config.get("js_click_sequence")
                
            if "min_extraction_confidence" in request.config:
                config_data["min_extraction_confidence"] = request.config.get("min_extraction_confidence")
                
            if "min_validation_confidence" in request.config:
                config_data["min_validation_confidence"] = request.config.get("min_validation_confidence")
                
            if "sanity_check_threshold" in request.config:
                config_data["sanity_check_threshold"] = request.config.get("sanity_check_threshold")
                
            if "api_endpoint_template" in request.config:
                config_data["api_endpoint_template"] = request.config.get("api_endpoint_template")
        
        logger.info(f"Config data to save: {config_data}")
            
        # Get current config
        existing_config = await price_service.db_service.get_variant_config(
            machine_id,
            variant_attribute,
            domain
        )
        
        # Update or create the config
        if existing_config:
            # Update existing config
            success = await price_service.db_service.update_variant_config(
                machine_id,
                variant_attribute,
                domain,
                config_data
            )
        else:
            # Create new config with defaults for missing fields
            config_data.update({
                "machine_id": machine_id,
                "variant_attribute": variant_attribute,
                "domain": domain
            })
            
            # Set defaults for fields not in the request
            if "requires_js_interaction" not in config_data:
                config_data["requires_js_interaction"] = False
                
            if "min_extraction_confidence" not in config_data:
                config_data["min_extraction_confidence"] = 0.85
                
            if "min_validation_confidence" not in config_data:
                config_data["min_validation_confidence"] = 0.90
                
            if "sanity_check_threshold" not in config_data:
                config_data["sanity_check_threshold"] = 0.25
            
            success = await price_service.db_service.create_variant_config(config_data)
        
        if not success:
            return {
                "success": False,
                "error": "Failed to update configuration"
            }
        
        # Get updated config
        updated_config = await price_service.db_service.get_variant_config(
            machine_id,
            variant_attribute,
            domain
        )
        
        return {
            "success": True,
            "message": "Configuration updated successfully",
            "config": updated_config
        }
    except Exception as e:
        logger.exception(f"Error updating config for machine {machine_id}: {str(e)}")
        return {"success": False, "error": str(e)}

@router.get("/machines/{machine_id}/variants")
async def get_machine_variants(machine_id: str):
    """
    Get all variants for a machine.
    
    Args:
        machine_id (str): Machine ID
        
    Returns:
        List of variants for the machine.
    """
    try:
        logger.info(f"Fetching variants for machine {machine_id}")
        
        # Get machine details to verify it exists
        machine = await price_service.db_service.get_machine_by_id(machine_id)
        
        if not machine:
            logger.error(f"Machine {machine_id} not found")
            return {"success": False, "error": f"Machine {machine_id} not found"}
        
        # Get variants for this machine
        variants = await price_service.db_service.get_machine_variants(machine_id)
        
        return {
            "success": True,
            "machine_id": machine_id,
            "machine_name": machine.get("Machine Name"),
            "variants": variants,
            "count": len(variants)
        }
    except Exception as e:
        logger.exception(f"Error fetching variants for machine {machine_id}: {str(e)}")
        return {"success": False, "error": str(e)}

@router.post("/machines/{machine_id}/variants")
async def create_machine_variant(machine_id: str, variant_attribute: str, initial_price: Optional[float] = None):
    """
    Create a new variant for a machine.
    
    Args:
        machine_id (str): Machine ID
        variant_attribute (str): Variant attribute
        initial_price (float, optional): Initial price for the variant
        
    Returns:
        Status of the creation operation.
    """
    try:
        logger.info(f"Creating variant {variant_attribute} for machine {machine_id}")
        
        # Get machine details to verify it exists
        machine = await price_service.db_service.get_machine_by_id(machine_id)
        
        if not machine:
            logger.error(f"Machine {machine_id} not found")
            return {"success": False, "error": f"Machine {machine_id} not found"}
        
        # Check if variant already exists
        existing_variant = await price_service.db_service.get_machine_latest_price(
            machine_id,
            variant_attribute
        )
        
        if existing_variant:
            return {
                "success": False,
                "error": f"Variant {variant_attribute} already exists for machine {machine_id}"
            }
        
        # Use machine's current price if no initial price provided
        if initial_price is None:
            initial_price = machine.get("Price")
        
        # Create the variant
        success = await price_service.db_service.create_machine_variant(
            machine_id,
            variant_attribute,
            initial_price
        )
        
        if not success:
            return {
                "success": False,
                "error": f"Failed to create variant {variant_attribute} for machine {machine_id}"
            }
        
        return {
            "success": True,
            "message": f"Variant {variant_attribute} created successfully for machine {machine_id}",
            "machine_id": machine_id,
            "variant_attribute": variant_attribute,
            "initial_price": initial_price
        }
    except Exception as e:
        logger.exception(f"Error creating variant for machine {machine_id}: {str(e)}")
        return {"success": False, "error": str(e)}

@router.delete("/machines/{machine_id}/variants/{variant_attribute}")
async def delete_machine_variant(machine_id: str, variant_attribute: str):
    """
    Delete a variant for a machine.
    
    Args:
        machine_id (str): Machine ID
        variant_attribute (str): Variant attribute
        
    Returns:
        Status of the deletion operation.
    """
    try:
        logger.info(f"Deleting variant {variant_attribute} for machine {machine_id}")
        
        # Don't allow deleting the DEFAULT variant
        if variant_attribute == "DEFAULT":
            return {
                "success": False,
                "error": "Cannot delete the DEFAULT variant"
            }
        
        # Get machine details to verify it exists
        machine = await price_service.db_service.get_machine_by_id(machine_id)
        
        if not machine:
            logger.error(f"Machine {machine_id} not found")
            return {"success": False, "error": f"Machine {machine_id} not found"}
        
        # Check if variant exists
        existing_variant = await price_service.db_service.get_machine_latest_price(
            machine_id,
            variant_attribute
        )
        
        if not existing_variant:
            return {
                "success": False,
                "error": f"Variant {variant_attribute} does not exist for machine {machine_id}"
            }
        
        # Delete the variant
        success = await price_service.db_service.delete_machine_variant(
            machine_id,
            variant_attribute
        )
        
        if not success:
            return {
                "success": False,
                "error": f"Failed to delete variant {variant_attribute} for machine {machine_id}"
            }
        
        return {
            "success": True,
            "message": f"Variant {variant_attribute} deleted successfully for machine {machine_id}",
            "machine_id": machine_id,
            "variant_attribute": variant_attribute
        }
    except Exception as e:
        logger.exception(f"Error deleting variant for machine {machine_id}: {str(e)}")
        return {"success": False, "error": str(e)}

@router.post("/debug-extraction", response_model=dict)
async def debug_extraction(request: dict):
    """
    Debug endpoint for price extraction that doesn't save to the database.
    Returns detailed extraction information for debugging purposes.
    """
    machine_id = request.get("machine_id")
    variant_attribute = request.get("variant_attribute", "DEFAULT")
    url_override = request.get("url", None)
    legacy = request.get("legacy", False)
    
    logger.info(f"Received debug extraction request for machine {machine_id}, variant {variant_attribute}")
    
    try:
        # Validate the machine ID
        if not machine_id or len(machine_id) < 8:
            logger.error(f"Invalid machine ID format: {machine_id}")
            raise HTTPException(status_code=400, detail=f"Invalid machine ID format: {machine_id}")
        
        # Check if the machine exists in the database
        machine = await price_service.db_service.get_machine_by_id(machine_id)
        if not machine:
            logger.error(f"Machine ID not found in database: {machine_id}")
            error_detail = {
                "error": f"Machine ID not found in database: {machine_id}",
                "machine_id": machine_id,
                "debug_info": {
                    "request_type": "debug_extraction",
                    "timestamp": datetime.now().isoformat()
                }
            }
            raise HTTPException(status_code=404, detail=error_detail)
        
        logger.info(f"Machine found for debug: {machine.get('Machine Name')} (ID: {machine.get('id')})")
        
        # Try to use the multi-tier extraction pipeline, but fall back to the simple method if it fails
        result = None
        try:
            if not legacy:
                # Use the V3 multi-tier extraction pipeline with dry_run=True to avoid DB writes
                result = await extraction_service.extract_price(
                    machine_id=machine_id,
                    variant_attribute=variant_attribute,
                    url=url_override,
                    dry_run=True  # Ensure no database writes
                )
                
                # Flag in debug info that we used the V3 extraction pipeline
                if "debug" not in result:
                    result["debug"] = {}
                
                result["debug"]["extraction_mode"] = "v3_pipeline"
            else:
                # If legacy is explicitly requested, use the old method
                result = await price_service.extract_machine_price(machine_id)
                
                # Flag in debug info that we used the simple extraction method
                if "debug" not in result:
                    result["debug"] = {}
                
                result["debug"]["extraction_mode"] = "legacy"
            
        except Exception as e:
            logger.warning(f"Failed to use V3 extraction pipeline, falling back to simple method: {str(e)}")
            # Fall back to simple extraction
            result = await price_service.extract_machine_price(machine_id)
            
            # Flag in debug info that we used the simple extraction method as fallback
            if "debug" not in result:
                result["debug"] = {}
            
            result["debug"]["extraction_mode"] = "fallback_to_legacy"
            result["debug"]["extraction_error"] = str(e)
        
        # Add machine information
        result["machine_name"] = machine.get("Machine Name")
        result["company"] = machine.get("Company")
        result["current_db_price"] = machine.get("Price")
        result["product_url"] = machine.get("product_link")
        result["last_updated"] = machine.get("html_timestamp")
        
        # Add helpful debug information 
        if "debug" not in result:
            result["debug"] = {}
            
        result["debug"].update({
            "mode": "debug_extraction",
            "db_write_disabled": True,
            "request_time": datetime.now().isoformat(),
            "machine_id_format": machine_id,
            "variant_attribute": variant_attribute,
            "db_machine_id": machine.get("id"),
            "possible_variants": machine.get("variants", [])
        })
        
        return result
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.exception(f"Error in debug extraction for machine {machine_id}: {str(e)}")
        error_detail = {
            "success": False,
            "error": f"Error in debug extraction: {str(e)}",
            "exception_type": type(e).__name__,
            "machine_id": machine_id,
            "timestamp": datetime.now().isoformat()
        }
        raise HTTPException(status_code=500, detail=error_detail) 