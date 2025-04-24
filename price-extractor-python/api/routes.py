from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from loguru import logger
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import os
import json
import re
import time
import uuid
import asyncio

from services.price_service import PriceService
from services.extraction_service import ExtractionService
from services.database_service import DatabaseService
from config import PRICE_HISTORY_TABLE

router = APIRouter()
price_service = PriceService()
extraction_service = ExtractionService()

async def get_current_price(machine_id):
    """Get the current price for a machine from the database."""
    try:
        machine = await price_service.db_service.get_machine_by_id(machine_id)
        return machine.get("Price") if machine else None
    except Exception as e:
        logger.error(f"Error getting current price for machine {machine_id}: {str(e)}")
        return None

class MachineUpdateRequest(BaseModel):
    """Request model for updating a machine's price."""
    machine_id: str
    confirm: Optional[bool] = False
    new_price: Optional[float] = None

class ExtractPriceRequest(BaseModel):
    """Request model for extracting a machine's price."""
    machine_id: str
    save_to_db: bool = Field(default=False, description="Whether to save the results to the database")
    dry_run: bool = Field(default=True, description="Whether to run in dry-run mode (no database changes)")
    flags_for_review: bool = Field(default=True, description="Whether to flag prices for review based on validation rules")
    sanity_check_threshold: float = Field(default=25.0, description="Percentage threshold for flagging significant price changes")
    variant_attribute: str = Field(default="DEFAULT", description="Variant attribute to extract price for")

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
        result = await price_service.db_service.get_machines_for_update(days_threshold=days)
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
        request (dict): Request parameters:
            - days_threshold (int): Days threshold for updates
            - limit (Optional[int]): Maximum machines to update
            - machine_ids (List[str], optional): Specific machine IDs to update
            - dry_run (bool, optional): If True, extracts prices without saving to database
            - flags_for_review (bool, optional): If True, ensure items are flagged for review when needed
            - save_to_db (bool, optional): If True, save results to database
            - create_batch_record (bool, optional): If True, create a batch record
            - sanity_check_threshold (float, optional): Threshold for flagging significant price changes
    """
    try:
        days_threshold = request.get("days_threshold", 7)
        limit = request.get("limit", None)
        machine_ids = request.get("machine_ids", None)
        dry_run = request.get("dry_run", False)
        flags_for_review = request.get("flags_for_review", True)
        save_to_db = request.get("save_to_db", True)
        create_batch_record = request.get("create_batch_record", True)
        sanity_check_threshold = request.get("sanity_check_threshold", 25)
        
        logger.info(f"Batch update request with days={days_threshold}, limit={limit}, machine_ids={machine_ids[:5] if machine_ids and len(machine_ids) > 5 else machine_ids}, dry_run={dry_run}, flags_for_review={flags_for_review}, save_to_db={save_to_db}, create_batch_record={create_batch_record}, sanity_check_threshold={sanity_check_threshold}")
        
        # Generate output filename for dry run
        output_file = None
        if dry_run:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = f"logs/dry_run_results_{timestamp}.json"
            # Ensure logs directory exists
            os.makedirs("logs", exist_ok=True)
            logger.info(f"Dry run enabled, results will be saved to {output_file}")
        
        if background_tasks:
            # Pass the specific machine_ids to the batch update if provided
            background_tasks.add_task(
                _process_batch_update_v2, 
                days_threshold,
                limit,
                machine_ids,
                dry_run,
                output_file,
                flags_for_review,
                save_to_db,
                sanity_check_threshold
            )
            
            response_message = f"{'Dry run ' if dry_run else ''}Batch update started for {len(machine_ids) if machine_ids else 'all'} machines in the background"
            if dry_run:
                response_message += f". Results will be saved to {output_file}"
                
            return {
                "success": True, 
                "message": response_message,
                "log_file": output_file if dry_run else None
            }
        else:
            # Create a new batch record
            batch_id = None
            if not dry_run:
                try:
                    batch_id = await price_service.db_service.create_batch(
                        count=len(machine_ids) if machine_ids else 0,
                        days_threshold=days_threshold,
                        machine_ids=machine_ids,
                        limit=limit
                    )
                    
                    if not batch_id:
                        logger.error("Failed to create batch record")
                        # Continue processing anyway
                except Exception as e:
                    logger.error(f"Error creating batch record: {str(e)}")
                    # Continue processing anyway
            
            # Get machines that need updates
            if machine_ids:
                logger.info(f"Using provided list of {len(machine_ids)} machine IDs")
                machines = []
                for machine_id in machine_ids:
                    machine = await price_service.db_service.get_machine_by_id(machine_id)
                    if machine:
                        machines.append(machine)
                    else:
                        logger.warning(f"Machine ID {machine_id} not found in database")
            else:
                logger.info(f"Fetching machines not updated in {days_threshold} days")
                machines = await price_service.db_service.get_machines_for_update(
                    days_threshold=days_threshold,
                    limit=limit
                )
            
            if not machines:
                logger.info("No machines to update")
                if batch_id:
                    await price_service.db_service.update_batch_status(batch_id, "completed")
                return {"success": True, "message": "No machines to update", "count": 0}
            
            # Track results
            success_count = 0
            failure_count = 0
            review_count = 0
            results = []
            
            # Process each machine using extraction_service.extract_price
            for machine in machines:
                machine_id = machine.get("id")
                machine_name = machine.get("Machine Name", "Unknown")
                url = machine.get("product_link", "")
                
                try:
                    logger.info(f"Processing machine {machine_id}: {machine_name}")
                    
                    # Use extraction_service.extract_price (which has proper validation)
                    extraction_result = await extraction_service.extract_price(
                        machine_id=machine_id,
                        variant_attribute="DEFAULT",
                        dry_run=dry_run,
                        save_to_db=save_to_db,
                        flags_for_review=flags_for_review,
                        sanity_check_threshold=sanity_check_threshold
                    )
                    
                    if extraction_result["success"]:
                        if extraction_result.get("needs_review", False):
                            review_reason = extraction_result.get("review_reason")
                            logger.info(f"Price for {machine_name} flagged for review: {review_reason}")
                            
                            # Make sure we explicitly set the flag with the reason
                            if save_to_db and not dry_run:
                                await price_service.db_service.set_manual_review_flag(
                                    machine_id=machine_id,
                                    variant_attribute="DEFAULT",
                                    flag_value=True,
                                    flag_reason=review_reason
                                )
                            
                            review_count += 1
                        else:
                            logger.info(f"Successfully updated price for {machine_name}")
                            success_count += 1
                    else:
                        logger.error(f"Failed to extract price for {machine_id}: {extraction_result.get('error')}")
                        failure_count += 1
                    
                    # For failed extractions, make sure to add old_price
                    old_price = None
                    if not extraction_result["success"] and "old_price" not in extraction_result:
                        old_price = await get_current_price(machine_id)
                    else:
                        old_price = extraction_result.get("old_price")
                    
                    results.append({
                        "machine_id": machine_id,
                        "machine_name": machine_name,
                        "success": extraction_result["success"],
                        "needs_review": extraction_result.get("needs_review", False),
                        "review_reason": extraction_result.get("review_reason"),
                        "old_price": old_price,
                        "new_price": extraction_result.get("new_price"),
                        "extraction_method": extraction_result.get("extraction_method")
                    })
                    
                except Exception as e:
                    logger.exception(f"Error processing machine {machine_id}: {str(e)}")
                    failure_count += 1
                    results.append({
                        "machine_id": machine_id,
                        "machine_name": machine_name,
                        "success": False,
                        "error": str(e),
                        "old_price": await get_current_price(machine_id)
                    })
            
            # Update batch status if not dry run
            if batch_id and not dry_run:
                try:
                    await price_service.db_service.update_batch_status(batch_id, "completed")
                except Exception as e:
                    logger.error(f"Error updating batch status: {str(e)}")
            
            # If dry run, save results to file
            if dry_run and output_file:
                try:
                    with open(output_file, 'w') as f:
                        json.dump(results, f, indent=2)
                    logger.info(f"Dry run results saved to {output_file}")
                except Exception as e:
                    logger.error(f"Error writing output file: {str(e)}")
            
            return {
                "success": True,
                "message": f"Batch update completed. {success_count} successful, {failure_count} failed, {review_count} flagged for review.",
                "count": len(machines),
                "success_count": success_count,
                "failure_count": failure_count,
                "review_count": review_count,
                "batch_id": batch_id,
                "results": results
            }
    except Exception as e:
        logger.exception(f"Error starting batch update: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error starting batch update: {str(e)}")

# New background task function that uses extraction_service.extract_price
async def _process_batch_update_v2(days_threshold, limit, machine_ids, dry_run, output_file=None, flags_for_review=True, save_to_db=True, sanity_check_threshold=25):
    """
    Process batch update with the V2 approach focused on extraction quality.
    
    Args:
        days_threshold (int): Number of days since last update to filter by
        limit (Optional[int]): Maximum number of machines to update
        machine_ids (List[str], optional): Specific machine IDs to update
        dry_run (bool): If True, don't save to database
        output_file (str, optional): File to save results to in dry run mode
        flags_for_review (bool): If True, flag questionable prices for review
        save_to_db (bool): If True, save results to database
        sanity_check_threshold (float): Threshold for price change validation
    """
    try:
        # Create a batch record for tracking
        batch_id = None
        if not dry_run and save_to_db:
            try:
                batch_id = await price_service.db_service.create_batch(
                    count=len(machine_ids) if machine_ids else 0,
                    days_threshold=days_threshold,
                    machine_ids=machine_ids,
                    limit=limit
                )
                logger.info(f"Created batch record with ID: {batch_id}")
            except Exception as e:
                logger.error(f"Error creating batch record: {str(e)}")
                # Continue processing anyway
        
        # Get machines that need updates
        if machine_ids:
            logger.info(f"Using provided list of {len(machine_ids)} machine IDs")
            machines = []
            for machine_id in machine_ids:
                machine = await price_service.db_service.get_machine_by_id(machine_id)
                if machine:
                    machines.append(machine)
                else:
                    logger.warning(f"Machine ID {machine_id} not found in database")
        else:
            logger.info(f"Fetching machines not updated in {days_threshold} days")
            machines = await price_service.db_service.get_machines_for_update(
                days_threshold=days_threshold,
                limit=limit
            )
        
        if not machines:
            logger.info("No machines to update")
            if batch_id:
                await price_service.db_service.update_batch_status(batch_id, "completed")
            return
        
        # Update batch record with machine count if needed
        if batch_id and not dry_run and len(machines) != (len(machine_ids) if machine_ids else 0):
            try:
                # Update batch count if it changed
                logger.info(f"Updating batch count to {len(machines)}")
                await price_service.db_service.update_batch_count(batch_id, len(machines))
            except Exception as e:
                logger.error(f"Error updating batch count: {str(e)}")
                # Continue processing anyway
        
        # Track results
        success_count = 0
        failure_count = 0
        review_count = 0
        results = []
        
        # Process each machine using extraction_service.extract_price
        for machine in machines:
            machine_id = machine.get("id")
            machine_name = machine.get("Machine Name", "Unknown")
            url = machine.get("product_link", "")
            
            try:
                logger.info(f"Processing machine {machine_id}: {machine_name}")
                
                # Record start time for performance tracking
                start_time = datetime.now(timezone.utc)
                http_status = None
                html_size = None
                
                # Use extraction_service.extract_price (which has proper validation)
                extraction_result = await extraction_service.extract_price(
                    machine_id=machine_id,
                    url=url,
                    dry_run=True,  # Don't save to database
                    save_to_db=False,  # Extra safety to ensure no DB changes
                    flags_for_review=flags_for_review,
                    sanity_check_threshold=sanity_check_threshold,
                    batch_id=batch_id  # Pass the batch_id to the extraction service
                )
                
                # Record end time for performance tracking
                end_time = datetime.now(timezone.utc)
                
                # Capture HTTP status and HTML size if available in the result
                if "http_status" in extraction_result:
                    http_status = extraction_result.get("http_status")
                if "html_size" in extraction_result:
                    html_size = extraction_result.get("html_size")
                
                if extraction_result["success"]:
                    if extraction_result.get("needs_review", False):
                        review_reason = extraction_result.get("review_reason")
                        logger.info(f"Price for {machine_name} flagged for review: {review_reason}")
                        
                        # Make sure we explicitly set the flag with the reason
                        if save_to_db and not dry_run:
                            await price_service.db_service.set_manual_review_flag(
                                machine_id=machine_id,
                                variant_attribute="DEFAULT",
                                flag_value=True,
                                flag_reason=review_reason
                            )
                        
                        review_count += 1
                    else:
                        logger.info(f"Successfully updated price for {machine_name}")
                        success_count += 1
                else:
                    logger.error(f"Failed to extract price for {machine_id}: {extraction_result.get('error')}")
                    failure_count += 1
                
                # For failed extractions, make sure to add old_price
                old_price = None
                if not extraction_result["success"] and "old_price" not in extraction_result:
                    old_price = await get_current_price(machine_id)
                else:
                    old_price = extraction_result.get("old_price")
                
                results.append({
                    "machine_id": machine_id,
                    "machine_name": machine_name,
                    "success": extraction_result["success"],
                    "needs_review": extraction_result.get("needs_review", False),
                    "review_reason": extraction_result.get("review_reason"),
                    "old_price": old_price,
                    "new_price": extraction_result.get("new_price"),
                    "extraction_method": extraction_result.get("extraction_method")
                })
                
                # Record the result in batch_results table if not in dry run mode
                if batch_id and not dry_run and save_to_db:
                    # Collect any extraction attempts for detailed logging
                    extraction_attempts = None
                    if "extraction_attempts" in extraction_result:
                        extraction_attempts = extraction_result.get("extraction_attempts")
                    
                    await price_service.db_service.add_batch_result(
                        batch_id=batch_id,
                        machine_id=machine_id,
                        machine_name=machine_name,
                        url=url,
                        success=extraction_result["success"],
                        old_price=old_price,
                        new_price=extraction_result.get("new_price"),
                        extraction_method=extraction_result.get("extraction_method"),
                        error=extraction_result.get("error") or extraction_result.get("review_reason"),
                        start_time=start_time.isoformat(),
                        end_time=end_time.isoformat(),
                        http_status=http_status,
                        html_size=html_size,
                        extraction_attempts=extraction_attempts,
                        needs_review=extraction_result.get("needs_review", False),
                        review_reason=extraction_result.get("review_reason"),
                        tier=extraction_result.get("tier"),
                        extracted_confidence=extraction_result.get("extraction_confidence"),
                        validation_confidence=extraction_result.get("validation_confidence"),
                        confidence=extraction_result.get("confidence")
                    )
                
            except Exception as e:
                logger.exception(f"Error processing machine {machine_id}: {str(e)}")
                failure_count += 1
                
                # Record the error in results
                results.append({
                    "machine_id": machine_id,
                    "machine_name": machine_name,
                    "success": False,
                    "error": str(e),
                    "old_price": await get_current_price(machine_id)
                })
                
                # Record the failure in batch_results table
                if batch_id and not dry_run and save_to_db:
                    # Get the current price from the machine data
                    old_price = await get_current_price(machine_id)
                        
                    await price_service.db_service.add_batch_result(
                        batch_id=batch_id,
                        machine_id=machine_id,
                        machine_name=machine_name,
                        url=url,
                        success=False,
                        old_price=old_price,
                        error=str(e),
                        start_time=datetime.now(timezone.utc).isoformat(),
                        end_time=datetime.now(timezone.utc).isoformat()
                    )
        
        # Update batch status if not dry run
        if batch_id and not dry_run:
            try:
                await price_service.db_service.update_batch_status(batch_id, "completed")
            except Exception as e:
                logger.error(f"Error updating batch status: {str(e)}")
        
        # If dry run, save results to file
        if dry_run and output_file:
            try:
                with open(output_file, 'w') as f:
                    json.dump(results, f, indent=2)
                logger.info(f"Dry run results saved to {output_file}")
            except Exception as e:
                logger.error(f"Error writing output file: {str(e)}")
        
        logger.info(f"Batch update completed. {success_count} successful, {failure_count} failed, {review_count} flagged for review.")
        
    except Exception as e:
        logger.exception(f"Error in background batch update: {str(e)}")
        # Try to mark batch as failed if it exists
        if batch_id and not dry_run:
            try:
                await price_service.db_service.update_batch_status(batch_id, "failed")
            except Exception as update_error:
                logger.error(f"Failed to update batch status: {str(update_error)}")

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
    
    Per PRD section 3.4.3, this now pulls directly from price_history filtered by batch_id
    instead of using the redundant batch_results table.
    """
    try:
        logger.info(f"Retrieving batch results for batch_id: {batch_id}")
        
        # Initialize price service
        price_service = PriceService()
        db_service = price_service.db_service
        
        # First get the batch info
        batch_query = """
            SELECT * FROM batches WHERE id = :batch_id
        """
        batch_params = {"batch_id": batch_id}
        batch_result = await db_service.supabase.postgrest.rpc('execute_sql', {"sql_query": batch_query, "params": batch_params}).execute()
        
        if not batch_result.data or len(batch_result.data) == 0:
            return {"error": "Batch not found", "batch_id": batch_id}
        
        batch_info = batch_result.data[0]
        
        # Query price_history for this batch_id with machine details
        results_query = """
            SELECT 
                ph.id,
                ph.machine_id,
                ph.variant_attribute,
                ph.price AS new_price,
                ph.validation_basis_price AS old_price,
                ph.date,
                ph.status,
                ph.tier,
                ph.extraction_method,
                ph.extracted_confidence,
                ph.validation_confidence,
                ph.failure_reason,
                ph.review_reason,
                ph.raw_price_text,
                ph.scraped_from_url AS url,
                ph.http_status,
                ph.html_size,
                ph.extraction_duration_seconds,
                m."Machine Name" AS machine_name,
                m."Brand" AS brand,
                m.product_link
            FROM 
                price_history ph
            JOIN 
                machines m ON ph.machine_id = m.id
            WHERE 
                ph.batch_id = :batch_id
            ORDER BY 
                ph.date DESC
        """
        results_params = {"batch_id": batch_id}
        
        results = await db_service.supabase.postgrest.rpc('execute_sql', {"sql_query": results_query, "params": results_params}).execute()
        
        if not results.data:
            results_data = []
        else:
            results_data = results.data
            
            # Calculate price changes for each entry
            for entry in results_data:
                new_price = entry.get("new_price")
                old_price = entry.get("old_price")
                
                if new_price is not None and old_price is not None and old_price > 0:
                    entry["price_change"] = new_price - old_price
                    entry["percentage_change"] = (entry["price_change"] / old_price) * 100
        
        # Calculate statistics
        total = len(results_data)
        successful = sum(1 for r in results_data if r.get("status") == "SUCCESS")
        failed = sum(1 for r in results_data if r.get("status") == "FAILED")
        needs_review = sum(1 for r in results_data if r.get("status") == "NEEDS_REVIEW")
        
        # Count unchanged vs updated prices (for successful extractions only)
        successful_entries = [r for r in results_data if r.get("status") == "SUCCESS"]
        unchanged = sum(1 for r in successful_entries if r.get("new_price") == r.get("old_price"))
        updated = successful - unchanged
        
        stats = {
            "total": total,
            "successful": successful,
            "failed": failed,
            "needs_review": needs_review,
            "unchanged": unchanged,
            "updated": updated,
            "start_time": batch_info.get("start_time"),
            "end_time": batch_info.get("end_time"),
            "status": batch_info.get("status")
        }
        
        return {
            "batch_id": batch_id,
            "results": results_data,
            "stats": stats
        }
        
    except Exception as e:
        logger.exception(f"Error retrieving batch results: {str(e)}")
        return {"error": str(e), "batch_id": batch_id}

async def _process_batch_update(days_threshold: int, limit: Optional[int] = None, machine_ids: List[str] = None, dry_run: bool = False, output_file: Optional[str] = None):
    """Process a batch update in the background."""
    try:
        result = await price_service.batch_update_machines(
            days_threshold, 
            limit=limit, 
            machine_ids=machine_ids, 
            dry_run=dry_run
        )
        
        # Save dry run results to file if specified
        if dry_run and output_file and result["success"]:
            try:
                with open(output_file, 'w') as f:
                    json.dump(result, f, indent=2)
                logger.info(f"Dry run results saved to {output_file}")
            except Exception as e:
                logger.error(f"Error writing output file: {str(e)}")
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
            - limit (Optional[int]): Maximum number of machines to process
    """
    try:
        limit = request.get("limit", None)
        
        logger.info(f"Configuring batch update with limit={limit}")
        
        # Get machines that need updates - no days threshold filtering
        machines = await price_service.db_service.get_machines_for_update(limit=limit)
        
        # Extract machine IDs
        machine_ids = [machine.get("id") for machine in machines if machine.get("id")]
        
        # Apply limit
        if limit is not None and len(machine_ids) > limit:
            machine_ids = machine_ids[:limit]
            
        return {
            "success": True,
            "configuration": {
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
async def get_flagged_machines(
    limit: int = 100, 
    skip: int = 0, 
    reason: str = None, 
    confidence: float = None,
    sort_by: str = None,
    sort_order: str = "desc",
    search: str = None
):
    """
    Get machines flagged for manual review.
    
    Uses the new schema to retrieve machines where manual_review_flag is true in machines_latest.
    """
    try:
        logger.info(f"Fetching flagged machines with limit={limit}, skip={skip}")
        
        # Initialize the price service
        price_service = PriceService()
        db_service = price_service.db_service
        
        # Base query with joins for the new schema
        query = """
            SELECT 
                m.id as machine_id,
                m."Machine Name" as machine_name,
                m."Brand" as brand,
                m.product_link,
                ml.variant_attribute,
                ml.flag_reason,
                ml.manual_review_flag,
                ml.last_attempt_time,
                ph_latest.price as latest_price,
                ph_latest.date as latest_date,
                ph_latest.status,
                ph_latest.review_reason,
                ph_latest.raw_price_text,
                ph_latest.extraction_method,
                ph_success.price as previous_price,
                ph_success.date as previous_date
            FROM 
                machines_latest ml
            JOIN 
                machines m ON ml.machine_id = m.id
            LEFT JOIN 
                price_history ph_latest ON ml.latest_price_history_id = ph_latest.id
            LEFT JOIN 
                price_history ph_success ON ml.latest_successful_price_history_id = ph_success.id
            WHERE 
                ml.manual_review_flag = true
        """
        
        # Add additional filters
        params = {}
        
        if reason:
            query += " AND ml.flag_reason ILIKE :reason"
            params["reason"] = f"%{reason}%"
            
        if confidence is not None:
            query += " AND ph_latest.validation_confidence <= :confidence"
            params["confidence"] = confidence
            
        if search:
            query += " AND (m.\"Machine Name\" ILIKE :search OR m.\"Brand\" ILIKE :search)"
            params["search"] = f"%{search}%"
        
        # Add sorting
        if sort_by:
            # Map frontend sort names to DB column names
            sort_map = {
                "machine_name": "m.\"Machine Name\"",
                "brand": "m.\"Brand\"",
                "price": "ph_latest.price",
                "date": "ph_latest.date",
                "confidence": "ph_latest.validation_confidence",
                "review_reason": "ph_latest.review_reason"
            }
            
            db_sort_col = sort_map.get(sort_by, "ph_latest.date")
            query += f" ORDER BY {db_sort_col} {sort_order.upper()}"
        else:
            # Default sort by date
            query += " ORDER BY ph_latest.date DESC"
        
        # Add pagination
        query += " LIMIT :limit OFFSET :skip"
        params["limit"] = limit
        params["skip"] = skip
        
        # Execute the query
        result = await db_service.supabase.postgrest.rpc('execute_sql', {"sql_query": query, "params": params}).execute()
        
        if not result.data:
            return {"machines": [], "total": 0}
        
        machines = result.data
        
        # Get total count separately
        count_query = """
            SELECT COUNT(*) FROM machines_latest ml
            JOIN machines m ON ml.machine_id = m.id
            WHERE ml.manual_review_flag = true
        """
        
        if reason:
            count_query += " AND ml.flag_reason ILIKE :reason"
        
        if confidence is not None:
            count_query += " AND ml.confidence <= :confidence"
            
        if search:
            count_query += " AND (m.\"Machine Name\" ILIKE :search OR m.\"Brand\" ILIKE :search)"
            
        count_result = await db_service.supabase.postgrest.rpc('execute_sql', {"sql_query": count_query, "params": params}).execute()
        total = count_result.data[0]["count"] if count_result.data else len(machines)
        
        # Format the results for the frontend
        for machine in machines:
            # Calculate price change
            if machine.get("latest_price") is not None and machine.get("previous_price") is not None:
                latest_price = float(machine["latest_price"])
                previous_price = float(machine["previous_price"])
                
                # Only calculate if both prices are valid
                if previous_price > 0:
                    machine["price_change"] = latest_price - previous_price
                    machine["percentage_change"] = (machine["price_change"] / previous_price) * 100
            
            # Ensure we have the price field for backwards compatibility
            machine["price"] = machine.get("latest_price")
        
        return {
            "machines": machines,
            "total": total
        }
        
    except Exception as e:
        logger.exception(f"Error fetching flagged machines: {str(e)}")
        return {"error": str(e), "machines": [], "total": 0}

@router.post("/reviews/{machine_id}/approve")
async def approve_flagged_price(machine_id: str, request: ReviewActionRequest):
    """
    Approve a flagged price after manual review.
    
    Following the PRD section 3.4.2, this will:
    1. Create a new price_history record with status = 'SUCCESS'
    2. Update machines_latest to point to this record
    3. Clear the manual_review_flag
    """
    try:
        variant_attribute = request.variant_attribute or "DEFAULT"
        logger.info(f"Approving flagged price for {machine_id}/{variant_attribute}")
        
        # Initialize the price service
        price_service = PriceService()
        db_service = price_service.db_service
        
        # First, get the current flagged record from machines_latest
        latest_query = """
            SELECT 
                ml.*,
                ph_latest.id as latest_ph_id,
                ph_latest.price,
                ph_latest.extraction_method,
                ph_latest.tier,
                ph_latest.extracted_confidence,
                ph_latest.validation_confidence
            FROM 
                machines_latest ml
            LEFT JOIN 
                price_history ph_latest ON ml.latest_price_history_id = ph_latest.id
            WHERE 
                ml.machine_id = :machine_id 
                AND ml.variant_attribute = :variant_attribute
        """
        
        latest_params = {
            "machine_id": machine_id,
            "variant_attribute": variant_attribute
        }
        
        latest_result = await db_service.supabase.postgrest.rpc(
            'execute_sql', 
            {"sql_query": latest_query, "params": latest_params}
        ).execute()
        
        if not latest_result.data or len(latest_result.data) == 0:
            return {
                "success": False,
                "error": f"No record found for {machine_id}/{variant_attribute}"
            }
        
        latest_record = latest_result.data[0]
        
        # Make sure this record is actually flagged for review
        if not latest_record.get("manual_review_flag"):
            return {
                "success": False,
                "error": f"Record for {machine_id}/{variant_attribute} is not flagged for review"
            }
            
        original_record_id = latest_record.get("latest_ph_id")
        price = request.price if request.price is not None else latest_record.get("price")
        
        if price is None:
            return {
                "success": False,
                "error": "No price available to approve"
            }
        
        # 1. Create a new price_history record with status = 'SUCCESS'
        now = datetime.now(timezone.utc)
        new_ph_data = {
            "id": str(uuid.uuid4()),
            "machine_id": machine_id,
            "variant_attribute": variant_attribute,
            "price": price,
            "date": now.isoformat(),
            "status": "SUCCESS",
            "source": "manual_review",
            "extraction_method": latest_record.get("extraction_method"),
            "tier": latest_record.get("tier"),
            "extracted_confidence": latest_record.get("extracted_confidence"),
            "validation_confidence": 1.0,  # Full confidence as it's manually verified
            "validation_basis_price": latest_record.get("validation_basis_price"),
            "reviewed_by": "admin",  # Could be replaced with actual user ID if available
            "reviewed_at": now.isoformat(),
            "original_record_id": original_record_id
        }
        
        # Add notes if provided
        if request.notes:
            new_ph_data["review_reason"] = f"APPROVED: {request.notes}"
        
        # Insert the new record
        new_ph_response = await db_service.supabase.table("price_history").insert(new_ph_data).execute()
        
        if not new_ph_response.data or len(new_ph_response.data) == 0:
            return {
                "success": False,
                "error": "Failed to create new price_history record"
            }
            
        new_record_id = new_ph_response.data[0]["id"]
        
        # 2 & 3. Update machines_latest to point to the new record and clear the flag
        update_data = {
            "latest_price_history_id": new_record_id,
            "latest_successful_price_history_id": new_record_id,
            "last_successful_update_time": now.isoformat(),
            "last_attempt_time": now.isoformat(),
            "manual_review_flag": False,
            "flag_reason": None,
            "machines_latest_price": price,
            "confidence": 1.0  # Full confidence as it's manually verified
        }
        
        update_response = await db_service.supabase.table("machines_latest") \
            .update(update_data) \
            .eq("machine_id", machine_id) \
            .eq("variant_attribute", variant_attribute) \
            .execute()
            
        if not update_response.data or len(update_response.data) == 0:
            logger.error(f"Failed to update machines_latest for {machine_id}/{variant_attribute}")
            return {
                "success": False,
                "error": "Failed to update machines_latest record"
            }
        
        return {
            "success": True,
            "message": f"Successfully approved price {price} for {machine_id}/{variant_attribute}",
            "price": price
        }
        
    except Exception as e:
        logger.exception(f"Error approving flagged price for {machine_id}: {str(e)}")
        return {
            "success": False,
            "error": f"Error approving flagged price: {str(e)}"
        }

@router.post("/reviews/{machine_id}/reject")
async def reject_flagged_price(machine_id: str, request: ReviewActionRequest):
    """
    Reject a flagged price after manual review.
    
    Following the PRD section 3.4.2, this will:
    1. Create a new price_history record with status = 'FAILED' and reason = 'Rejected in review'
    2. Update machines_latest.latest_price_history_id to point to this new record
    3. Keep latest_successful_price_history_id pointing to the last successful record
    4. Clear the manual_review_flag
    """
    try:
        variant_attribute = request.variant_attribute or "DEFAULT"
        logger.info(f"Rejecting flagged price for {machine_id}/{variant_attribute}")
        
        # Initialize the price service
        price_service = PriceService()
        db_service = price_service.db_service
        
        # First, get the current flagged record from machines_latest
        latest_query = """
            SELECT 
                ml.*,
                ph_latest.id as latest_ph_id,
                ph_latest.price,
                ph_latest.extraction_method,
                ph_latest.tier,
                ph_latest.extracted_confidence,
                ph_latest.validation_confidence,
                ph_latest.validation_basis_price
            FROM 
                machines_latest ml
            LEFT JOIN 
                price_history ph_latest ON ml.latest_price_history_id = ph_latest.id
            WHERE 
                ml.machine_id = :machine_id 
                AND ml.variant_attribute = :variant_attribute
        """
        
        latest_params = {
            "machine_id": machine_id,
            "variant_attribute": variant_attribute
        }
        
        latest_result = await db_service.supabase.postgrest.rpc(
            'execute_sql', 
            {"sql_query": latest_query, "params": latest_params}
        ).execute()
        
        if not latest_result.data or len(latest_result.data) == 0:
            return {
                "success": False,
                "error": f"No record found for {machine_id}/{variant_attribute}"
            }
        
        latest_record = latest_result.data[0]
        
        # Make sure this record is actually flagged for review
        if not latest_record.get("manual_review_flag"):
            return {
                "success": False,
                "error": f"Record for {machine_id}/{variant_attribute} is not flagged for review"
            }
            
        original_record_id = latest_record.get("latest_ph_id")
        rejected_price = latest_record.get("price")
        
        # 1. Create a new price_history record with status = 'FAILED'
        now = datetime.now(timezone.utc)
        new_ph_data = {
            "id": str(uuid.uuid4()),
            "machine_id": machine_id,
            "variant_attribute": variant_attribute,
            "price": None,  # No price as it's rejected
            "date": now.isoformat(),
            "status": "FAILED",
            "source": "manual_review",
            "failure_reason": "Rejected in review",
            "extraction_method": latest_record.get("extraction_method"),
            "tier": latest_record.get("tier"),
            "extracted_confidence": latest_record.get("extracted_confidence"),
            "validation_confidence": 0.0,  # Zero confidence as it's rejected
            "validation_basis_price": latest_record.get("validation_basis_price"),
            "reviewed_by": "admin",  # Could be replaced with actual user ID if available
            "reviewed_at": now.isoformat(),
            "original_record_id": original_record_id
        }
        
        # Add notes if provided
        if request.notes:
            new_ph_data["failure_reason"] = f"REJECTED: {request.notes}"
        
        # Insert the new record
        new_ph_response = await db_service.supabase.table("price_history").insert(new_ph_data).execute()
        
        if not new_ph_response.data or len(new_ph_response.data) == 0:
            return {
                "success": False,
                "error": "Failed to create new price_history record"
            }
            
        new_record_id = new_ph_response.data[0]["id"]
        
        # 2, 3 & 4. Update machines_latest with the new record ID but keep the latest_successful_price_history_id unchanged
        update_data = {
            "latest_price_history_id": new_record_id,
            "last_attempt_time": now.isoformat(),
            "manual_review_flag": False,
            "flag_reason": None
        }
        
        update_response = await db_service.supabase.table("machines_latest") \
            .update(update_data) \
            .eq("machine_id", machine_id) \
            .eq("variant_attribute", variant_attribute) \
            .execute()
            
        if not update_response.data or len(update_response.data) == 0:
            logger.error(f"Failed to update machines_latest for {machine_id}/{variant_attribute}")
            return {
                "success": False,
                "error": "Failed to update machines_latest record"
            }
        
        return {
            "success": True,
            "message": f"Successfully rejected price {rejected_price} for {machine_id}/{variant_attribute}"
        }
        
    except Exception as e:
        logger.exception(f"Error rejecting flagged price for {machine_id}: {str(e)}")
        return {
            "success": False,
            "error": f"Error rejecting flagged price: {str(e)}"
        }

@router.post("/reviews/{machine_id}/override")
async def override_flagged_price(machine_id: str, request: ReviewActionRequest):
    """
    Override a flagged price with a manually entered value.
    
    Similar to approve, but allows specifying a different price.
    Creates a new SUCCESS record with the manual price.
    """
    try:
        variant_attribute = request.variant_attribute or "DEFAULT"
        logger.info(f"Overriding flagged price for {machine_id}/{variant_attribute}")
        
        if request.price is None:
            return {
                "success": False,
                "error": "Price must be provided for override operation"
            }
        
        # Initialize the price service
        price_service = PriceService()
        db_service = price_service.db_service
        
        # First, get the current flagged record from machines_latest
        latest_query = """
            SELECT 
                ml.*,
                ph_latest.id as latest_ph_id,
                ph_latest.price,
                ph_latest.extraction_method,
                ph_latest.tier,
                ph_latest.extracted_confidence,
                ph_latest.validation_confidence,
                ph_latest.validation_basis_price
            FROM 
                machines_latest ml
            LEFT JOIN 
                price_history ph_latest ON ml.latest_price_history_id = ph_latest.id
            WHERE 
                ml.machine_id = :machine_id 
                AND ml.variant_attribute = :variant_attribute
        """
        
        latest_params = {
            "machine_id": machine_id,
            "variant_attribute": variant_attribute
        }
        
        latest_result = await db_service.supabase.postgrest.rpc(
            'execute_sql', 
            {"sql_query": latest_query, "params": latest_params}
        ).execute()
        
        if not latest_result.data or len(latest_result.data) == 0:
            return {
                "success": False,
                "error": f"No record found for {machine_id}/{variant_attribute}"
            }
        
        latest_record = latest_result.data[0]
        
        # Make sure this record is actually flagged for review
        if not latest_record.get("manual_review_flag"):
            return {
                "success": False,
                "error": f"Record for {machine_id}/{variant_attribute} is not flagged for review"
            }
            
        original_record_id = latest_record.get("latest_ph_id")
        old_price = latest_record.get("price")
        new_price = request.price
        
        # Create a new price_history record with status = 'SUCCESS' and the overridden price
        now = datetime.now(timezone.utc)
        new_ph_data = {
            "id": str(uuid.uuid4()),
            "machine_id": machine_id,
            "variant_attribute": variant_attribute,
            "price": new_price,
            "date": now.isoformat(),
            "status": "SUCCESS",
            "source": "manual_override",
            "extraction_method": "MANUAL_OVERRIDE",
            "tier": "MANUAL",
            "extracted_confidence": 1.0,  # Full confidence as it's manually entered
            "validation_confidence": 1.0,  # Full confidence as it's manually entered
            "validation_basis_price": old_price,
            "reviewed_by": "admin",  # Could be replaced with actual user ID if available
            "reviewed_at": now.isoformat(),
            "original_record_id": original_record_id
        }
        
        # Add notes if provided
        if request.notes:
            new_ph_data["review_reason"] = f"OVERRIDE: {request.notes}"
        
        # Insert the new record
        new_ph_response = await db_service.supabase.table("price_history").insert(new_ph_data).execute()
        
        if not new_ph_response.data or len(new_ph_response.data) == 0:
            return {
                "success": False,
                "error": "Failed to create new price_history record"
            }
            
        new_record_id = new_ph_response.data[0]["id"]
        
        # Update machines_latest to point to the new record and clear the flag
        update_data = {
            "latest_price_history_id": new_record_id,
            "latest_successful_price_history_id": new_record_id,
            "last_successful_update_time": now.isoformat(),
            "last_attempt_time": now.isoformat(),
            "manual_review_flag": False,
            "flag_reason": None,
            "machines_latest_price": new_price,
            "confidence": 1.0  # Full confidence as it's manually verified
        }
        
        update_response = await db_service.supabase.table("machines_latest") \
            .update(update_data) \
            .eq("machine_id", machine_id) \
            .eq("variant_attribute", variant_attribute) \
            .execute()
            
        if not update_response.data or len(update_response.data) == 0:
            logger.error(f"Failed to update machines_latest for {machine_id}/{variant_attribute}")
            return {
                "success": False,
                "error": "Failed to update machines_latest record"
            }
        
        return {
            "success": True,
            "message": f"Successfully overrode price from {old_price} to {new_price} for {machine_id}/{variant_attribute}",
            "old_price": old_price,
            "new_price": new_price
        }
        
    except Exception as e:
        logger.exception(f"Error overriding flagged price for {machine_id}: {str(e)}")
        return {
            "success": False,
            "error": f"Error overriding flagged price: {str(e)}"
        }

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
    Get a list of machines with their latest price info.
    
    Args:
        limit: Number of machines to return
        skip: Number of machines to skip (for pagination)
        days_threshold: Only get machines whose price hasn't been updated in this many days
        search: Search term for machine name or brand
        company: Filter by company
        category: Filter by category
        
    Returns:
        List of machines with price data
    """
    try:
        logger.info(f"Fetching machines with params: limit={limit}, skip={skip}, days_threshold={days_threshold}, search={search}")
        
        # Get database service
        db_service = price_service.db_service
        
        # Use direct Supabase queries instead of SQL
        query = db_service.supabase.table("machines").select("*")
        
        # Apply filters if provided
        if search:
            query = query.or_(f"Machine Name.ilike.%{search}%,Brand.ilike.%{search}%")
            
        if company:
            query = query.eq("company", company)
            
        if category:
            query = query.eq("category", category)
        
        # Apply pagination
        query = query.range(skip, skip + limit - 1)
        
        # Execute the query
        response = query.execute()
        
        # Get total count with a separate query
        count_response = db_service.supabase.table("machines").select("count", count="exact").execute()
        
        # Get the machines data
        machines_data = response.data if response.data else []
        total = count_response.count if hasattr(count_response, 'count') else len(machines_data)
        
        # For each machine, get its latest price from machines_latest
        machines = []
        for machine in machines_data:
            machine_id = machine.get("id")
            
            # Rename keys to match expected format
            formatted_machine = {
                "id": machine_id,
                "machine_name": machine.get("Machine Name"),
                "brand": machine.get("Brand"),
                "company": machine.get("company"),
                "category": machine.get("category"),
                "product_link": machine.get("product_link")
            }
            
            # Get latest price info from machines_latest
            latest_response = db_service.supabase.table("machines_latest") \
                .select("*") \
                .eq("machine_id", machine_id) \
                .eq("variant_attribute", "DEFAULT") \
                .execute()
                
            if latest_response.data and len(latest_response.data) > 0:
                latest_data = latest_response.data[0]
                formatted_machine.update({
                    "current_price": latest_data.get("machines_latest_price"),
                    "last_updated": latest_data.get("last_checked"),
                    "manual_review_flag": latest_data.get("manual_review_flag"),
                    "flag_reason": latest_data.get("flag_reason"),
                    "extraction_method": latest_data.get("tier")
                })
                
                # If we have a successful price history record ID, get previous price
                if latest_data.get("latest_successful_price_history_id"):
                    ph_response = db_service.supabase.table("price_history") \
                        .select("validation_basis_price") \
                        .eq("id", latest_data.get("latest_successful_price_history_id")) \
                        .execute()
                        
                    if ph_response.data and len(ph_response.data) > 0:
                        formatted_machine["previous_price"] = ph_response.data[0].get("validation_basis_price")
            
            # Calculate price changes where possible
            if "current_price" in formatted_machine and formatted_machine["current_price"] is not None and \
               "previous_price" in formatted_machine and formatted_machine["previous_price"] is not None:
                price_change = formatted_machine["current_price"] - formatted_machine["previous_price"]
                formatted_machine["price_change"] = price_change
                
                if formatted_machine["previous_price"] > 0:
                    formatted_machine["percentage_change"] = (price_change / formatted_machine["previous_price"]) * 100
            
            machines.append(formatted_machine)
        
        return {
            "success": True,
            "machines": machines,
            "total": total,
            "filters": {
                "search": search,
                "company": company,
                "category": category,
                "days_threshold": days_threshold
            }
        }
    except Exception as e:
        logger.exception(f"Error retrieving machines: {str(e)}")
        return {
            "success": False,
            "error": f"Error retrieving machines: {str(e)}"
        }

@router.get("/debug/price-history/{batch_id}")
async def debug_price_history(batch_id: str):
    """
    Debug endpoint to check price history entries associated with a batch ID.
    
    Args:
        batch_id (str): The batch ID to check
        
    Returns:
        Information about price history entries for this batch
    """
    try:
        logger.info(f"Debugging price history for batch {batch_id}")
        
        # Query price_history table directly for entries with this batch_id
        price_history_response = price_service.db_service.supabase.table("price_history") \
            .select("id, machine_id, variant_attribute, price, previous_price, date") \
            .eq("batch_id", batch_id) \
            .execute()
            
        # Log the response for debugging
        logger.info(f"Found {len(price_history_response.data) if price_history_response.data else 0} price history entries for batch {batch_id}")
        
        # Check batch_results table as well
        batch_results_response = price_service.db_service.supabase.table("batch_results") \
            .select("id, batch_id, machine_id, machine_name, success, old_price, new_price") \
            .eq("batch_id", batch_id) \
            .execute()
            
        logger.info(f"Found {len(batch_results_response.data) if batch_results_response.data else 0} batch results entries for batch {batch_id}")
        
        # Now check the batch record itself
        batch_response = price_service.db_service.supabase.table("batches") \
            .select("*") \
            .eq("id", batch_id) \
            .execute()
            
        results = {
            "price_history_entries": price_history_response.data if price_history_response.data else [],
            "batch_results_entries": batch_results_response.data if batch_results_response.data else [],
            "batch_info": batch_response.data[0] if batch_response.data and len(batch_response.data) > 0 else None
        }
        
        return {
            "success": True,
            "debug_info": results
        }
        
    except Exception as e:
        logger.exception(f"Error debugging price history for batch {batch_id}: {str(e)}")
        return {
            "success": False,
            "error": f"Error debugging price history for batch {batch_id}: {str(e)}"
        }

@router.get("/debug/batch-price-history")
async def debug_batch_price_history():
    """
    Debug endpoint to check if any price history entries have batch_id set.
    """
    try:
        logger.info("Checking for price history entries with batch_id")
        
        # Query price_history table for entries with batch_id set
        response = price_service.db_service.supabase.table("price_history") \
            .select("id, machine_id, variant_attribute, price, batch_id, date") \
            .not_.is_("batch_id", "null") \
            .order("date", desc=True) \
            .limit(20) \
            .execute()
            
        if response.data:
            logger.info(f"Found {len(response.data)} price history entries with batch_id")
            for entry in response.data:
                logger.info(f"Entry: {entry['id']}, Machine: {entry['machine_id']}, Batch: {entry['batch_id']}")
        else:
            logger.warning("No price history entries found with batch_id set")
            
        return {
            "success": True,
            "entries": response.data if response.data else []
        }
        
    except Exception as e:
        logger.exception(f"Error checking batch price history: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

@router.get("/price-history")
async def get_price_history(
    limit: int = 50, 
    skip: int = 0,
    status: str = None,
    batchId: str = None,
    startDate: str = None,
    endDate: str = None,
    search: str = None,
    machineName: str = None,
    brand: str = None,
    minPriceChange: float = None,
    maxPriceChange: float = None,
    extractionMethod: str = None,
    confidence: float = None
):
    """
    Get price history with optional filtering.
    
    This endpoint returns price history data with various filtering options 
    including by date range, machine name, batch ID, and more.
    
    Args:
        limit (int): Maximum number of records to return
        skip (int): Offset for pagination
        status (str): Filter by status (e.g., 'SUCCESS', 'FAILURE')
        batchId (str): Filter by batch ID
        startDate (str): Start date for filtering (ISO format)
        endDate (str): End date for filtering (ISO format)
        search (str): Search term across machine name and brands
        machineName (str): Filter by specific machine name
        brand (str): Filter by brand
        minPriceChange (float): Minimum price change percentage
        maxPriceChange (float): Maximum price change percentage
        extractionMethod (str): Filter by extraction method
        confidence (float): Filter by confidence level
        
    Returns:
        Dictionary with items, total count, and applied filters
    """
    try:
        logger.info(f"Fetching price history with filters, limit={limit}, skip={skip}")
        
        # Use the existing db_service from global price_service instead of creating a new instance
        db_service = price_service.db_service
        
        # Start building query - use string literal instead of constant
        query = db_service.supabase.from_("price_history").select('*', count='exact')
        
        # Apply filters
        if status:
            query = query.eq('status', status)
            
        if batchId:
            query = query.eq('batch_id', batchId)
            
        if startDate:
            query = query.gte('date', startDate)
            
        if endDate:
            query = query.lte('date', endDate)
            
        if machineName:
            # Use Supabase search or ilike for machine name
            query = query.ilike('machine_name', f"%{machineName}%")
            
        if brand:
            query = query.ilike('brand', f"%{brand}%")
            
        if extractionMethod:
            query = query.eq('extraction_method', extractionMethod)
            
        if confidence is not None:
            # For confidence filtering, consider both validation and extraction confidence
            query = query.or_(f"validation_confidence.lte.{confidence},extracted_confidence.lte.{confidence}")
        
        # Add search across multiple fields if provided
        if search:
            search_term = f"%{search}%"
            query = query.or_(f"machine_name.ilike.{search_term},brand.ilike.{search_term}")
        
        # Note: Complex operations like price change filtering might require post-processing
        
        # Add ordering - latest first
        query = query.order('date', desc=True)
        
        # Add pagination
        query = query.range(skip, skip + limit - 1)
        
        # Execute the query
        result = query.execute()
        
        total = result.count if hasattr(result, 'count') else 0
        
        # Process the results
        items = []
        if result.data:
            for item in result.data:
                # Calculate price changes
                new_price = item.get("price")
                old_price = item.get("validation_basis_price")
                
                price_change = None
                percentage_change = None
                
                if new_price is not None and old_price is not None and old_price > 0:
                    price_change = new_price - old_price
                    percentage_change = (price_change / old_price) * 100
                
                # Add calculated fields
                item["price_change"] = price_change
                item["percentage_change"] = percentage_change
                
                # Apply post-query filtering for price changes
                if minPriceChange is not None and (percentage_change is None or percentage_change < minPriceChange):
                    continue
                    
                if maxPriceChange is not None and (percentage_change is None or percentage_change > maxPriceChange):
                    continue
                
                items.append(item)
        
        return {
            "items": items,
            "total": total,
            "filters": {
                "status": status,
                "batchId": batchId,
                "startDate": startDate,
                "endDate": endDate,
                "search": search,
                "machineName": machineName,
                "brand": brand,
                "minPriceChange": minPriceChange,
                "maxPriceChange": maxPriceChange,
                "extractionMethod": extractionMethod,
                "confidence": confidence
            }
        }
    except Exception as e:
        logger.error(f"Error fetching price history: {str(e)}")
        return {"error": str(e), "items": [], "total": 0}

@router.post("/debug-extraction")
async def debug_extraction(request: ExtractPriceRequest):
    """
    Debug price extraction with optional database saving.
    
    This endpoint performs a complete extraction process and optionally saves 
    the results to the database based on the save_to_db and dry_run parameters.
    
    Args:
        request: ExtractPriceRequest containing:
            - machine_id: str
            - save_to_db: bool (optional, default False)
            - dry_run: bool (optional, default True)
            - flags_for_review: bool (optional, default True)
            - sanity_check_threshold: float (optional, default 25.0)
            - variant_attribute: str (optional, default "DEFAULT")
        
    Returns:
        Detailed extraction results and debug information
    """
    try:
        logger.info(f"Debugging price extraction for machine {request.machine_id}")
        
        # Initialize services
        price_service = PriceService()
        extraction_service = ExtractionService()
        
        # Get machine data from database
        machine_data = await price_service.get_machine_data(request.machine_id)
        
        if not machine_data:
            return {
                "success": False,
                "error": f"Machine with ID {request.machine_id} not found"
            }
            
        # Get the product URL
        product_url = machine_data.get("product_link")
        if not product_url:
            return {
                "success": False,
                "error": "Machine does not have a product link"
            }
            
        # Get current price from database for comparison
        current_price = machine_data.get("Price")
        
        # Get extraction configuration if any
        machine_config = await price_service.get_extraction_config(request.machine_id)
        
        # Use parameters from request or defaults
        save_to_db = request.save_to_db if hasattr(request, 'save_to_db') else False
        dry_run = request.dry_run if hasattr(request, 'dry_run') else True
        flags_for_review = request.flags_for_review if hasattr(request, 'flags_for_review') else True
        sanity_check_threshold = request.sanity_check_threshold if hasattr(request, 'sanity_check_threshold') else 25.0
        variant_attribute = request.variant_attribute if hasattr(request, 'variant_attribute') else "DEFAULT"
        
        # Perform extraction with specified parameters
        extraction_result = await extraction_service.extract_price(
            machine_id=request.machine_id,
            url=product_url,
            dry_run=dry_run,
            save_to_db=save_to_db,
            flags_for_review=flags_for_review,
            sanity_check_threshold=sanity_check_threshold,
            variant_attribute=variant_attribute
        )
        
        # Enhance response with machine information
        extraction_result["machine_name"] = machine_data.get("Machine Name", "Unknown")
        extraction_result["product_url"] = product_url
        extraction_result["current_db_price"] = current_price
        
        # If successful, calculate price change information
        if extraction_result.get("success") and extraction_result.get("new_price") is not None:
            new_price = extraction_result["new_price"]
            
            # Calculate price change
            if current_price is not None and current_price > 0:
                price_change = new_price - current_price
                percentage_change = (price_change / current_price) * 100
                
                extraction_result["price_change"] = price_change
                extraction_result["percentage_change"] = percentage_change
        
        logger.info(f"Debug extraction complete for {request.machine_id}: {extraction_result.get('success')}")
        return extraction_result
        
    except Exception as e:
        logger.exception(f"Error during debug extraction for {request.machine_id}: {str(e)}")
        return {
            "success": False,
            "error": f"Error during extraction: {str(e)}",
            "debug": {
                "exception_type": str(type(e).__name__),
                "exception_message": str(e)
            }
        }

@router.get("/test-machines")
async def test_machines():
    """
    Simple test endpoint to check basic Supabase queries without error.
    This bypasses all complex logic to diagnose the issue.
    """
    try:
        # Use the existing db_service from global price_service
        db_service = price_service.db_service
        
        # Basic machines query
        machines_response = db_service.supabase.table("machines").select("id, \"Machine Name\"").limit(5).execute()
        machines_data = machines_response.data if machines_response.data else []
        
        return {
            "success": True,
            "message": "Test successful",
            "machines_count": len(machines_data),
            "machines": machines_data
        }
    except Exception as e:
        logger.exception(f"Error in test endpoint: {str(e)}")
        return {
            "success": False,
            "error": f"Error in test endpoint: {str(e)}"
        }