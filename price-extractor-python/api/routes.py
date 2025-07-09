from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from loguru import logger
from typing import Optional, List

from services.price_service import PriceService
from services.learning_service import DailyLearningService

router = APIRouter()
price_service = PriceService()
learning_service = DailyLearningService()

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

class PriceCorrectionRequest(BaseModel):
    """Request model for correcting a price."""
    price_history_id: str
    correct_price: float
    corrected_by: str = "admin"
    reason: Optional[str] = None
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
        
        # Handle different result scenarios
        if result.get("requires_approval"):
            # System worked correctly, just needs approval
            logger.info(f"Price requires approval - Old: ${result.get('old_price')}, New: ${result.get('new_price')}")
            # Return the full result so we can see the prices!
            return result
        elif not result["success"]:
            # Actual extraction failure
            error_msg = result.get("error", "Price update failed")
            logger.error(f"Price extraction failed for machine {request.machine_id}: {error_msg}")
            
            # For extraction failures, raise exception
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

@router.get("/api/v1/learning-report")
async def get_learning_report(days_back: int = 7):
    """
    Generate and return a daily learning report analyzing recent batch results.
    
    Args:
        days_back: Number of days to analyze (default: 7)
        
    Returns:
        Learning report with analysis and recommendations
    """
    try:
        logger.info(f"Generating learning report for last {days_back} days")
        
        report = await learning_service.generate_daily_learning_report(days_back)
        
        return {
            "success": True,
            "report": report
        }
        
    except Exception as e:
        logger.exception(f"Error generating learning report: {str(e)}")
        return {
            "success": False,
            "error": f"Error generating learning report: {str(e)}"
        }

@router.post("/api/v1/apply-learning-improvements")
async def apply_learning_improvements(days_back: int = 7):
    """
    Apply automatic improvements based on recent learning analysis.
    
    Args:
        days_back: Number of days to analyze for improvements
        
    Returns:
        List of improvements applied
    """
    try:
        logger.info(f"Applying learning improvements based on last {days_back} days")
        
        # Generate report first to get analysis
        report = await learning_service.generate_daily_learning_report(days_back)
        
        improvements = report.get("auto_improvements", [])
        
        return {
            "success": True,
            "improvements_applied": len(improvements),
            "improvements": improvements,
            "recommendations": report.get("recommendations", [])
        }
        
    except Exception as e:
        logger.exception(f"Error applying learning improvements: {str(e)}")
        return {
            "success": False,
            "error": f"Error applying learning improvements: {str(e)}"
        }

@router.post("/fix-bad-selectors")
async def fix_bad_selectors():
    """
    Fix bad learned selectors that are causing incorrect price extractions.
    Removes .bundle-price selectors from machines.
    """
    try:
        logger.info("🔧 Starting fix for bad learned selectors...")
        
        fixed_count = await price_service.db_service.fix_bad_learned_selectors()
        
        return {
            "success": True,
            "message": f"Fixed {fixed_count} machines with bad learned selectors",
            "fixed_count": fixed_count
        }
        
    except Exception as e:
        logger.exception(f"Error fixing bad learned selectors: {str(e)}")
        return {
            "success": False,
            "error": f"Error fixing bad learned selectors: {str(e)}"
        }

@router.get("/batch-failures/{batch_id}")
async def get_batch_failures(batch_id: str):
    """
    Get machines that had ACTUAL extraction failures (not approval requests).
    
    Args:
        batch_id: The batch ID to get failures for
        
    Returns:
        List of machine IDs that completely failed price extraction
    """
    try:
        logger.info(f"Getting ACTUAL extraction failures for batch ID: {batch_id}")
        
        # Get machines that completely failed extraction from batch logs
        failed_machine_ids = await price_service.get_batch_failures(batch_id)
        
        return {
            "success": True,
            "batch_id": batch_id,
            "failed_machine_ids": failed_machine_ids,
            "total_failures": len(failed_machine_ids),
            "description": "Machines that completely failed price extraction (not approval requests)"
        }
    except Exception as e:
        logger.exception(f"Error getting batch failures for {batch_id}: {str(e)}")
        raise HTTPException(status_code=404, detail=f"Could not get failures for batch {batch_id}: {str(e)}")

@router.get("/batch-failures-and-corrections/{batch_id}")
async def get_batch_failures_and_corrections(batch_id: str):
    """
    Get machines that need retesting: ACTUAL extraction failures + manually corrected machines.
    
    This endpoint excludes machines that just required approval (system worked correctly).
    
    Args:
        batch_id: The batch ID to get failures and corrections for
        
    Returns:
        Combined list of failed and manually corrected machine IDs that need retesting
    """
    try:
        logger.info(f"Getting machines needing retest for batch ID: {batch_id}")
        
        # Get machines that completely failed extraction from batch logs
        failed_machine_ids = await price_service.get_batch_failures(batch_id)
        
        # Get manually corrected machines from database
        corrected_machine_ids = await price_service.get_batch_manual_corrections(batch_id)
        
        # Combine both lists and remove duplicates
        all_machine_ids = list(set(failed_machine_ids + corrected_machine_ids))
        
        logger.info(f"Found {len(failed_machine_ids)} extraction failures + {len(corrected_machine_ids)} manual corrections = {len(all_machine_ids)} total machines needing retest")
        
        return {
            "success": True,
            "batch_id": batch_id,
            "extraction_failures": failed_machine_ids,
            "manual_corrections": corrected_machine_ids,
            "machines_needing_retest": all_machine_ids,
            "total_extraction_failures": len(failed_machine_ids),
            "total_manual_corrections": len(corrected_machine_ids),
            "total_needing_retest": len(all_machine_ids),
            "description": "Only includes machines that failed extraction or were manually corrected (excludes approval requests)"
        }
    except Exception as e:
        logger.exception(f"Error getting batch failures and corrections for {batch_id}: {str(e)}")
        raise HTTPException(status_code=404, detail=f"Could not get data for batch {batch_id}: {str(e)}")

@router.post("/batch-retest")
async def batch_retest(request: dict, background_tasks: BackgroundTasks):
    """
    Start a retest for failed machines from a specific batch (backward compatibility endpoint).
    
    Args:
        request: Contains batch_id for the original batch to retest
    """
    try:
        logger.info(f"🔧 DEBUG: Received batch retest request: {request}")
        
        # Handle both old and new request formats
        batch_id = request.get("batch_id") or request.get("original_batch_id")
        machine_ids = request.get("machine_ids", [])
        description = request.get("description", "")
        
        logger.info(f"🔧 DEBUG: Extracted batch_id: {batch_id}")
        logger.info(f"🔧 DEBUG: Machine IDs provided: {len(machine_ids)}")
        
        if not batch_id:
            logger.error(f"🔧 DEBUG: No batch_id or original_batch_id in request: {request}")
            raise HTTPException(status_code=400, detail="batch_id or original_batch_id is required")
        
        logger.info(f"Starting batch retest for batch {batch_id} with {len(machine_ids)} machines")
        
        # Use provided machine IDs if available, otherwise get from batch log
        if machine_ids:
            all_machine_ids = machine_ids
            failed_machine_count = "provided"
            corrected_machine_count = "in list"
            logger.info(f"Using provided machine IDs: {len(all_machine_ids)} machines")
        else:
            # Fallback: Get both failed and manually corrected machine IDs
            failed_machine_ids = await price_service.get_batch_failures(batch_id)
            corrected_machine_ids = await price_service.get_batch_manual_corrections(batch_id)
            all_machine_ids = list(set(failed_machine_ids + corrected_machine_ids))
            failed_machine_count = len(failed_machine_ids)
            corrected_machine_count = len(corrected_machine_ids)
            logger.info(f"Retrieved from logs: {len(all_machine_ids)} machines")
        
        if not all_machine_ids:
            return {
                "success": True,
                "message": f"No machines found for retest in batch {batch_id}",
                "batch_id": batch_id,
                "total_machines": 0
            }
        
        logger.info(f"Starting retest for {len(all_machine_ids)} machines ({failed_machine_count} failed + {corrected_machine_count} corrected)")
        
        # Start the retest batch in background
        background_tasks.add_task(
            _process_batch_update,
            0,  # days_threshold: 0 to force update regardless of last update time
            None,  # limit: None to process all provided machines
            all_machine_ids  # comprehensive machine IDs to retest
        )
        
        return {
            "success": True,
            "message": f"Batch retest started for {len(all_machine_ids)} machines from batch {batch_id}",
            "batch_id": batch_id,
            "original_batch_id": batch_id,
            "total_machines": len(all_machine_ids),
            "machines_to_retest": len(all_machine_ids),
            "description": description or f"Retest of machines from batch {batch_id[:8]}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error starting batch retest: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to start retest: {str(e)}")

@router.post("/comprehensive-retest")
async def comprehensive_retest(request: dict, background_tasks: BackgroundTasks):
    """
    Start a comprehensive retest for both failed and manually corrected machines from a specific batch.
    
    Args:
        request: Contains batch_id for the original batch to retest
    """
    try:
        batch_id = request.get("batch_id")
        if not batch_id:
            raise HTTPException(status_code=400, detail="batch_id is required")
        
        logger.info(f"Starting comprehensive retest for batch {batch_id}")
        
        # Get both failed and manually corrected machine IDs
        failed_machine_ids = await price_service.get_batch_failures(batch_id)
        corrected_machine_ids = await price_service.get_batch_manual_corrections(batch_id)
        
        # Combine and deduplicate
        all_machine_ids = list(set(failed_machine_ids + corrected_machine_ids))
        
        if not all_machine_ids:
            return {
                "success": True,
                "message": f"No machines found for retest in batch {batch_id}",
                "batch_id": batch_id,
                "total_machines": 0
            }
        
        logger.info(f"Starting retest for {len(all_machine_ids)} machines ({len(failed_machine_ids)} failed + {len(corrected_machine_ids)} corrected)")
        
        # Start the retest batch in background
        background_tasks.add_task(
            _process_batch_update,
            0,  # days_threshold: 0 to force update regardless of last update time
            None,  # limit: None to process all provided machines
            all_machine_ids  # comprehensive machine IDs to retest
        )
        
        return {
            "success": True,
            "message": f"Comprehensive retest started for {len(all_machine_ids)} machines from batch {batch_id}",
            "batch_id": batch_id,
            "total_machines": len(all_machine_ids),
            "failed_machines": len(failed_machine_ids),
            "corrected_machines": len(corrected_machine_ids)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error starting comprehensive retest: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to start retest: {str(e)}")

@router.post("/correct-price")
async def correct_price(request: PriceCorrectionRequest):
    """
    Correct an extracted price by updating the price_history entry and logging the correction.
    
    This endpoint allows users to reject an incorrectly extracted price and provide the correct one.
    The price_history entry is updated with the correct price and marked as MANUAL_CORRECTION.
    The original extraction mistake is logged to price_corrections table for analysis.
    """
    try:
        logger.info(f"Processing price correction for price_history ID: {request.price_history_id}")
        
        # First, get the original price_history entry to extract correction data
        response = price_service.db_service.supabase.table("price_history") \
            .select("*") \
            .eq("id", request.price_history_id) \
            .single() \
            .execute()
            
        if not response.data:
            logger.error(f"Price history entry not found: {request.price_history_id}")
            raise HTTPException(status_code=404, detail="Price history entry not found")
            
        original_entry = response.data
        
        # Extract data for correction logging
        machine_id = original_entry.get("machine_id")
        batch_id = original_entry.get("batch_id")
        extracted_price = original_entry.get("price")
        extraction_method = original_entry.get("extraction_method")
        
        # Get machine data for URL
        machine = await price_service.db_service.get_machine_by_id(machine_id)
        url = machine.get("product_link") if machine else None
        html_content = machine.get("html_content") if machine else None
        
        # Update the price_history entry with corrected price
        updated_entry = await price_service.db_service.update_price_history_entry(
            price_history_id=request.price_history_id,
            new_price=request.correct_price,
            status="MANUAL_CORRECTION",
            correction_reason=f"User corrected price from ${extracted_price} to ${request.correct_price}"
        )
        
        if not updated_entry:
            logger.error(f"Failed to update price history entry: {request.price_history_id}")
            raise HTTPException(status_code=500, detail="Failed to update price history entry")
        
        # Log the correction for analysis
        correction_logged = await price_service.db_service.add_price_correction(
            machine_id=machine_id,
            batch_id=batch_id,
            extracted_price=extracted_price,
            correct_price=request.correct_price,
            extraction_method=extraction_method,
            url=url,
            corrected_by=request.corrected_by,
            html_content=html_content,
            reason=request.reason
        )
        
        if not correction_logged:
            logger.warning(f"Failed to log price correction for machine {machine_id}")
        
        logger.info(f"Price correction completed: {extracted_price} -> {request.correct_price} for machine {machine_id}")
        
        return {
            "success": True,
            "message": f"Price corrected from ${extracted_price} to ${request.correct_price}",
            "original_price": extracted_price,
            "corrected_price": request.correct_price,
            "machine_id": machine_id,
            "correction_logged": correction_logged
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error processing price correction: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing price correction: {str(e)}")