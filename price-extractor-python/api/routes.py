from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from loguru import logger
from typing import Optional, List

from services.price_service import PriceService
from services.learning_service import DailyLearningService
from services.url_discovery import URLDiscoveryService
from services.config_discovery import ConfigDiscoveryService
# from services.discovery_service import start_discovery  # Commented out - requires aiohttp

router = APIRouter()
price_service = PriceService()
learning_service = DailyLearningService()
url_discovery = URLDiscoveryService()
config_discovery = ConfigDiscoveryService()

# Include cost tracking routes
from api.cost_routes import router as cost_router
router.include_router(cost_router, prefix="/cost", tags=["cost-tracking"])

# Include smart discovery routes
from api.smart_discovery import router as smart_discovery_router
router.include_router(smart_discovery_router, prefix="/smart", tags=["smart-discovery"])

class MachineUpdateRequest(BaseModel):
    """Request model for updating a machine's price."""
    machine_id: str

class BatchUpdateRequest(BaseModel):
    """Request model for batch updating machine prices."""
    days_threshold: Optional[int] = 7
    machine_ids: Optional[List[str]] = None
    limit: Optional[int] = None
    max_workers: Optional[int] = None  # Number of concurrent workers
    use_scrapfly: Optional[bool] = True  # Whether to use Scrapfly pipeline

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
            - max_workers (Optional[int]): Number of concurrent workers for processing
    """
    try:
        days_threshold = request.get("days_threshold", 7)
        limit = request.get("limit", None)
        machine_ids = request.get("machine_ids", None)
        max_workers = request.get("max_workers", None)
        use_scrapfly = request.get("use_scrapfly", True)
        
        logger.info(f"Batch update request with days={days_threshold}, limit={limit}, max_workers={max_workers}, use_scrapfly={use_scrapfly}, machine_ids={machine_ids[:5] if machine_ids and len(machine_ids) > 5 else machine_ids}")
        
        if background_tasks:
            # Pass the specific machine_ids to the batch update if provided
            background_tasks.add_task(
                _process_batch_update, 
                days_threshold,
                limit,
                machine_ids,
                max_workers,
                use_scrapfly
            )
            return {
                "success": True, 
                "message": f"Batch update started for {len(machine_ids) if machine_ids else 'all'} machines in the background"
            }
        else:
            result = await price_service.batch_update_machines(
                days_threshold=days_threshold, 
                limit=limit,
                machine_ids=machine_ids,
                use_scrapfly=use_scrapfly
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
                request.machine_ids,
                request.max_workers
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
            request.limit,
            None,  # machine_ids
            request.max_workers
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

async def _process_batch_update(days_threshold: int, limit: Optional[int] = None, machine_ids: List[str] = None, max_workers: Optional[int] = None, use_scrapfly: bool = True):
    """Process a batch update in the background."""
    try:
        await price_service.batch_update_machines(days_threshold, max_workers=max_workers, limit=limit, machine_ids=machine_ids, use_scrapfly=use_scrapfly)
    except Exception as e:
        logger.exception(f"Error in background batch update: {str(e)}")

async def _process_specific_machines(machine_ids: List[str], max_workers: Optional[int] = None):
    """Process specific machines in the background using concurrent processing."""
    try:
        # Use the batch update method with specific machine IDs to get concurrent processing
        await price_service.batch_update_machines(machine_ids=machine_ids, max_workers=max_workers)
    except Exception as e:
        logger.exception(f"Error in background specific machines update: {str(e)}")

@router.post("/batch-configure")
async def configure_batch_update(request: dict):
    """
    Configure a batch update and return the number of machines that would be affected.
    
    Args:
        request (dict): The request body containing configuration parameters:
            - days_threshold (int): Days threshold for machines needing update
            - limit (Optional[int]): Maximum number of machines to process
            - max_workers (Optional[int]): Number of concurrent workers (for logging/preview)
    """
    try:
        days_threshold = request.get("days_threshold", 7)
        limit = request.get("limit", None)
        max_workers = request.get("max_workers", 3)
        
        logger.info(f"Configuring batch update with days_threshold={days_threshold}, limit={limit}, max_workers={max_workers}")
        
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
            .select("id, status, start_time, end_time, total_machines, days_threshold, metadata") \
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
        
        # Process batch data to add variant blocking information
        processed_batches = []
        for batch in response.data:
            # Parse metadata if it exists
            metadata = {}
            if batch.get('metadata'):
                try:
                    import json
                    metadata = json.loads(batch['metadata'])
                except (json.JSONDecodeError, TypeError):
                    metadata = {}
            
            # Add processed batch data
            processed_batch = {
                **batch,
                'variant_blocked': metadata.get('variant_blocked', False),
                'variant_alerts': metadata.get('variant_alerts', []),
                'has_issues': metadata.get('variant_blocked', False)
            }
            processed_batches.append(processed_batch)
        
        # Log the first batch to help with debugging
        if processed_batches and len(processed_batches) > 0:
            logger.info(f"Most recent batch: {processed_batches[0]}")
            
        return {
            "success": True,
            "batches": processed_batches
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
        
        # Also update the machines.Price column so future extractions use the corrected price as baseline
        try:
            machine_update_response = price_service.db_service.supabase.table("machines") \
                .update({"Price": request.correct_price}) \
                .eq("id", machine_id) \
                .execute()
            
            if machine_update_response.data:
                logger.info(f"✅ Updated machines.Price to ${request.correct_price} for machine {machine_id}")
            else:
                logger.warning(f"⚠️ Failed to update machines.Price for machine {machine_id}")
        except Exception as e:
            logger.warning(f"⚠️ Error updating machines.Price: {str(e)}")
        
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

@router.post("/sync-manual-corrections")
async def sync_manual_corrections():
    """
    Sync machines.Price with the latest manual corrections from price_history.
    This fixes existing stale prices in the machines table.
    """
    try:
        logger.info("Starting sync of manual corrections to machines table")
        
        # Get all machines that have manual corrections
        corrections_response = price_service.db_service.supabase.table("price_history") \
            .select("machine_id, price, date") \
            .eq("status", "MANUAL_CORRECTION") \
            .order("date", desc=True) \
            .execute()
        
        if not corrections_response.data:
            return {"success": True, "message": "No manual corrections found", "updated_count": 0}
        
        # Group by machine_id and get the latest correction for each
        machine_corrections = {}
        for correction in corrections_response.data:
            machine_id = correction["machine_id"]
            if machine_id not in machine_corrections:
                machine_corrections[machine_id] = correction
        
        updated_count = 0
        updates = []
        
        # Sync each machine
        for machine_id, correction in machine_corrections.items():
            corrected_price = correction["price"]
            
            try:
                # Get current machine price
                machine_response = price_service.db_service.supabase.table("machines") \
                    .select("id, \"Machine Name\", \"Price\"") \
                    .eq("id", machine_id) \
                    .single() \
                    .execute()
                
                if machine_response.data:
                    current_price = machine_response.data.get("Price")
                    machine_name = machine_response.data.get("Machine Name", "Unknown")
                    
                    if current_price != corrected_price:
                        # Update the machines table
                        update_response = price_service.db_service.supabase.table("machines") \
                            .update({"Price": corrected_price}) \
                            .eq("id", machine_id) \
                            .execute()
                        
                        if update_response.data:
                            updated_count += 1
                            updates.append({
                                "machine_name": machine_name,
                                "old_price": current_price,
                                "new_price": corrected_price
                            })
                            logger.info(f"Updated {machine_name}: ${current_price} → ${corrected_price}")
                        
            except Exception as e:
                logger.error(f"Error updating machine {machine_id}: {str(e)}")
        
        return {
            "success": True,
            "message": f"Synced {updated_count} machines with manual corrections",
            "updated_count": updated_count,
            "updates": updates
        }
        
    except Exception as e:
        logger.exception(f"Error syncing manual corrections: {str(e)}")
        return {"success": False, "error": f"Error syncing manual corrections: {str(e)}"}


# Discovery System Endpoints

class DiscoveryRequest(BaseModel):
    """Request model for product discovery."""
    scan_log_id: str
    site_id: str
    base_url: str
    sitemap_url: Optional[str] = None
    scraping_config: Optional[dict] = {}
    scan_type: str = 'discovery'

class URLDiscoveryRequest(BaseModel):
    """Request model for URL discovery."""
    manufacturer_id: str
    base_url: str
    max_pages: int = 5

@router.post("/discover-urls")
async def discover_urls(request: URLDiscoveryRequest):
    """
    Discover product URLs from a manufacturer site.
    
    This is Stage 1 of the discovery process - it finds product URLs
    with minimal credit usage (1-2 credits per page).
    """
    try:
        logger.info(f"Starting URL discovery for {request.base_url}")
        
        # Run URL discovery
        results = await url_discovery.discover_urls(
            start_url=request.base_url,
            max_pages=request.max_pages
        )
        
        logger.info(f"URL discovery complete: {results['total_urls_found']} URLs found")
        
        return results
        
    except Exception as e:
        logger.exception(f"Error in URL discovery: {str(e)}")
        raise HTTPException(status_code=500, detail=f"URL discovery failed: {str(e)}")


class ScrapeDiscoveredURLsRequest(BaseModel):
    """Request model for scraping discovered URLs."""
    urls: List[str]
    manufacturer_id: str
    max_workers: Optional[int] = 3


@router.post("/scrape-discovered-urls")
async def scrape_discovered_urls(request: ScrapeDiscoveredURLsRequest, background_tasks: BackgroundTasks):
    """
    Scrape specific discovered URLs and create machines from them.
    
    This is Stage 2 of the discovery process - it scrapes selected URLs
    and creates machine entries in the database.
    """
    try:
        logger.info(f"Starting scrape for {len(request.urls)} discovered URLs")
        
        # Get manufacturer info
        manufacturer_response = price_service.db_service.supabase.table("brands") \
            .select("*") \
            .eq("id", request.manufacturer_id) \
            .single() \
            .execute()
            
        if not manufacturer_response.data:
            raise HTTPException(status_code=404, detail="Manufacturer not found")
            
        manufacturer = manufacturer_response.data
        
        # Start background task to scrape URLs
        background_tasks.add_task(
            _process_discovered_urls,
            request.urls,
            manufacturer,
            request.max_workers
        )
        
        return {
            "success": True,
            "message": f"Started scraping {len(request.urls)} URLs for {manufacturer['Name']}",
            "url_count": len(request.urls),
            "manufacturer": manufacturer['Name']
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error starting URL scraping: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to start scraping: {str(e)}")


@router.post("/run-duplicate-detection")
async def run_duplicate_detection(manufacturer_id: Optional[str] = None):
    """
    Run duplicate detection for discovered URLs.
    
    Args:
        manufacturer_id: Optional manufacturer ID to limit detection to specific manufacturer
        
    Returns:
        Summary of duplicate detection results
    """
    try:
        logger.info(f"Starting duplicate detection" + (f" for manufacturer {manufacturer_id}" if manufacturer_id else ""))
        
        from services.duplicate_detector import DuplicateDetector
        
        # Initialize duplicate detector with price_service's db_service
        detector = DuplicateDetector(price_service.db_service)
        
        # Run detection with force recheck
        results = await detector.run_duplicate_detection(manufacturer_id, force_recheck=True)
        
        logger.info(f"Duplicate detection complete: {results}")
        
        return {
            "success": True,
            **results
        }
        
    except Exception as e:
        logger.exception(f"Error in duplicate detection: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Duplicate detection failed: {str(e)}")


@router.post("/api/v1/reset-duplicate-status")
async def reset_duplicate_status():
    """Reset duplicate detection status for re-checking"""
    try:
        logger.info("Resetting duplicate detection status")
        
        from services.duplicate_detector import DuplicateDetector
        detector = DuplicateDetector(price_service.db_service)
        
        result = await detector.reset_duplicate_status()
        
        logger.info(f"Reset complete: {result}")
        return {"success": True, **result}
        
    except Exception as e:
        logger.error(f"Error resetting duplicate status: {e}")
        return {"success": False, "error": str(e)}


async def _process_discovered_urls(urls: List[str], manufacturer: dict, max_workers: Optional[int] = 3):
    """Process discovered URLs in the background."""
    try:
        from services.simplified_discovery import SimplifiedDiscoveryService
        
        discovery_service = SimplifiedDiscoveryService()
        
        # Process each URL
        for url in urls:
            try:
                logger.info(f"Processing discovered URL: {url}")
                
                # Extract product data using progressive scraper
                product_data = await discovery_service.extract_product_data(url)
                
                if product_data:
                    # Add manufacturer info
                    product_data['manufacturer_id'] = manufacturer['id']
                    product_data['manufacturer_name'] = manufacturer['Name']
                    
                    # Save to discovered_machines table
                    await discovery_service.save_discovered_machine(
                        url=url,
                        raw_data=product_data,
                        manufacturer_id=manufacturer['id']
                    )
                    
                    # Update discovered_urls status
                    price_service.db_service.supabase.table("discovered_urls") \
                        .update({"status": "scraped", "scraped_at": "now()"}) \
                        .eq("url", url) \
                        .eq("manufacturer_id", manufacturer['id']) \
                        .execute()
                else:
                    # Mark as failed
                    price_service.db_service.supabase.table("discovered_urls") \
                        .update({
                            "status": "failed",
                            "error_message": "No product data extracted"
                        }) \
                        .eq("url", url) \
                        .eq("manufacturer_id", manufacturer['id']) \
                        .execute()
                        
            except Exception as e:
                logger.error(f"Error processing URL {url}: {str(e)}")
                # Mark as failed
                price_service.db_service.supabase.table("discovered_urls") \
                    .update({
                        "status": "failed",
                        "error_message": str(e)[:500]
                    }) \
                    .eq("url", url) \
                    .eq("manufacturer_id", manufacturer['id']) \
                    .execute()
                    
        logger.info(f"Completed processing {len(urls)} discovered URLs")
        
    except Exception as e:
        logger.exception(f"Error in discovered URLs background task: {str(e)}")


# Discovery endpoints commented out - requires separate service with aiohttp
# @router.post("/discover-products")
# async def discover_products_endpoint(request: DiscoveryRequest, background_tasks: BackgroundTasks):
#     """
#     Start product discovery for a manufacturer site.
#     
#     This endpoint triggers the discovery process which:
#     1. Crawls the manufacturer website to find product URLs
#     2. Extracts data from each product page
#     3. Normalizes and validates the data
#     4. Stores discovered products for admin review
#     """
#     try:
#         logger.info(f"Starting product discovery for site {request.site_id}: {request.base_url}")
#         
#         # Start discovery in background task
#         background_tasks.add_task(
#             _process_discovery,
#             request.dict()
#         )
#         
#         return {
#             "success": True,
#             "message": f"Product discovery started for {request.base_url}",
#             "scan_log_id": request.scan_log_id,
#             "site_id": request.site_id
#         }
#         
#     except Exception as e:
#         logger.exception(f"Error starting product discovery: {str(e)}")
#         raise HTTPException(status_code=500, detail=f"Error starting discovery: {str(e)}")


# async def _process_discovery(request_data: dict):
#     """Process discovery in background task."""
#     try:
#         result = await start_discovery(request_data)
#         logger.info(f"Discovery completed: {result}")
#     except Exception as e:
#         logger.exception(f"Error in discovery background task: {str(e)}")


# Config Discovery Endpoints
class ConfigDiscoveryRequest(BaseModel):
    base_url: str
    site_name: str

@router.post("/discover-config")
async def discover_site_configuration(request: ConfigDiscoveryRequest):
    """
    Auto-discover manufacturer site configuration
    
    Analyzes a manufacturer website to automatically generate:
    - Sitemap URL
    - Category URLs for product discovery
    - Optimal crawl delay
    - User agent configuration
    """
    try:
        logger.info(f"Starting config discovery for {request.site_name} at {request.base_url}")
        
        # Generate configuration
        config = await config_discovery.discover_site_config(
            base_url=request.base_url,
            site_name=request.site_name
        )
        
        # Format for UI
        formatted_config = config_discovery.format_config_for_ui(
            config, request.site_name, request.base_url
        )
        
        # Generate detailed report using the already-discovered config
        report = await config_discovery.generate_discovery_report(
            base_url=request.base_url,
            site_name=request.site_name,
            config=config
        )
        
        return {
            "success": True,
            "configuration": formatted_config,
            "report": report,
            "message": f"Configuration discovered for {request.site_name}"
        }
        
    except Exception as e:
        logger.error(f"Error discovering configuration for {request.site_name}: {e}")
        return {
            "success": False,
            "error": str(e),
            "message": f"Failed to discover configuration for {request.site_name}"
        }

@router.get("/suggest-sitemap/{base_url:path}")
async def suggest_sitemap_url(base_url: str):
    """
    Quick endpoint to suggest sitemap URL for a given base URL
    """
    try:
        sitemap_url = await config_discovery._discover_sitemap(base_url)
        
        return {
            "success": True,
            "sitemap_url": sitemap_url,
            "found": sitemap_url is not None
        }
        
    except Exception as e:
        logger.error(f"Error finding sitemap for {base_url}: {e}")
        return {
            "success": False,
            "error": str(e),
            "sitemap_url": None,
            "found": False
        }