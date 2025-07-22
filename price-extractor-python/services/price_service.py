from loguru import logger
from datetime import datetime
import os
import uuid
from urllib.parse import urlparse

from services.database import DatabaseService
from scrapers.web_scraper import WebScraper
from scrapers.price_extractor import PriceExtractor
from services.variant_verification import VariantVerificationService
from config import (
    MAX_PRICE_INCREASE_PERCENT,
    MAX_PRICE_DECREASE_PERCENT,
    MIN_PRICE_THRESHOLD
)

class PriceService:
    """Service to coordinate price extraction and database updates."""
    
    def __init__(self):
        """Initialize dependencies."""
        self.db_service = DatabaseService()
        # Always use regular scraper for price service - Scrapfly is discovery only
        self.web_scraper = WebScraper()
        self.price_extractor = PriceExtractor()
        self.variant_verifier = None  # Will be initialized per batch
        logger.info("Price service initialized")
    
    def _setup_batch_logging(self, batch_id):
        """
        Set up batch-specific logging for a batch run.
        
        Args:
            batch_id (str): The batch ID to use for the log filename
            
        Returns:
            str: The log file path
        """
        # Ensure logs directory exists
        os.makedirs("logs", exist_ok=True)
        
        # Create batch-specific log filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        short_batch_id = batch_id[:8]  # Use first 8 characters for readability
        log_filename = f"batch_{timestamp}_{short_batch_id}.log"
        log_path = os.path.join("logs", log_filename)
        
        # Add new log handler for this batch
        logger.add(
            log_path,
            format="{time:YYYY-MM-DD HH:mm:ss} | {level:<8} | {name}:{function}:{line} - {message}",
            level="INFO",
            enqueue=True,
            catch=True
        )
        
        logger.info(f"=== BATCH LOG START ===")
        logger.info(f"Batch ID: {batch_id}")
        logger.info(f"Log file: {log_filename}")
        logger.info(f"Started at: {datetime.now().isoformat()}")
        logger.info(f"======================")
        
        return log_path
    
    async def _should_require_manual_approval(self, old_price, new_price, machine_id):
        """
        Determine if a price change requires manual approval based on thresholds.
        
        Args:
            old_price (float): Previous price
            new_price (float): New price
            machine_id (str): Machine ID to check price history
            
        Returns:
            tuple: (requires_approval, reason)
        """
        if old_price is None or new_price is None:
            return False, None
            
        # Skip validation for very low prices (likely test data)
        if new_price < MIN_PRICE_THRESHOLD:
            return True, f"New price ${new_price} below minimum threshold ${MIN_PRICE_THRESHOLD}"
        
        # Check if this price was recently manually corrected
        try:
            # Query recent price history for this machine
            response = self.db_service.supabase.table("price_history").select("*").eq("machine_id", machine_id).order("created_at", desc=True).limit(10).execute()
            
            if response.data:
                for entry in response.data:
                    # Check if there's a recent manual correction to this exact price
                    if (entry.get("status") == "MANUAL_CORRECTION" and 
                        entry.get("new_price") == new_price and
                        entry.get("created_at")):
                        # Check if correction was made within last 7 days
                        from datetime import datetime, timedelta
                        correction_date = datetime.fromisoformat(entry["created_at"].replace('Z', '+00:00'))
                        if datetime.now(correction_date.tzinfo) - correction_date < timedelta(days=7):
                            logger.info(f"Price ${new_price} matches recent manual correction from {entry['created_at']}, auto-approving")
                            return False, None
                            
        except Exception as e:
            logger.warning(f"Error checking price history for approval logic: {str(e)}")
        
        # Calculate percentage change
        percentage_change = ((new_price - old_price) / old_price) * 100
        
        # Check for large increases
        if percentage_change > MAX_PRICE_INCREASE_PERCENT:
            return True, f"Price increase of {percentage_change:.1f}% exceeds threshold of {MAX_PRICE_INCREASE_PERCENT}%"
        
        # Check for large decreases
        if percentage_change < -MAX_PRICE_DECREASE_PERCENT:
            return True, f"Price decrease of {abs(percentage_change):.1f}% exceeds threshold of {MAX_PRICE_DECREASE_PERCENT}%"
        
        return False, None
    
    async def _get_effective_current_price(self, machine_id, fallback_price):
        """
        Get the effective current price for a machine.
        IMPORTANT: For extraction purposes, we ALWAYS use the machine's base price,
        NOT manual corrections. This ensures price extraction selects prices
        closest to the original baseline, not temporary corrections.
        
        Args:
            machine_id (str): The machine ID
            fallback_price (float): The price from machines table
            
        Returns:
            float: The effective current price to use as baseline
        """
        # ALWAYS use the machine's base price from the machines table
        # Do NOT use manual corrections as baseline for extraction
        logger.info(f"📊 Using machines.Price as baseline: ${fallback_price}")
        return fallback_price
    
    async def update_machine_price(self, machine_id, url=None, batch_id=None):
        """
        Update the price for a specific machine by scraping its URL.
        
        Args:
            machine_id (str): The ID of the machine to update.
            url (str, optional): URL to override the one in the database.
            batch_id (str, optional): The batch ID if this update is part of a batch.
            
        Returns:
            dict: Update result with new price, old price, and status.
        """
        logger.info(f"Processing price update for machine {machine_id}")
        
        try:
            # Get machine data from database
            machine = await self.db_service.get_machine_by_id(machine_id)
            if not machine:
                logger.error(f"Machine {machine_id} not found in database")
                return {"success": False, "error": f"Machine not found in database: {machine_id}", "machine_id": machine_id}
            
            # Use provided URL or get from database
            product_url = url or machine.get("product_link")
            
            if not product_url:
                logger.error(f"No product URL available for machine {machine_id}")
                return {"success": False, "error": "No product URL available", "machine_id": machine_id}
            
            # Get current price - check for recent manual corrections first
            current_price = await self._get_effective_current_price(machine_id, machine.get("Price"))
            
            # Check if price tracking is enabled for this machine
            if not machine.get("price_tracking_enabled", True):  # Default to True for existing machines
                machine_name = machine.get("Machine Name", "Unknown")
                logger.warning(f"⚠️ Skipping {machine_name} (ID: {machine_id}) - price tracking disabled")
                await self.db_service.add_price_history(
                    machine_id=machine_id,
                    old_price=current_price,
                    new_price=None,
                    success=False,
                    error_message=f"Machine excluded from price tracking: {machine_name}",
                    batch_id=batch_id
                )
                return {
                    "success": False, 
                    "error": f"Machine excluded from price tracking: {machine_name}", 
                    "machine_id": machine_id, 
                    "machine_name": machine_name,
                    "url": product_url,
                    "excluded": True
                }
            
            # Pre-validate URL health to catch broken links early
            url_health = await self.web_scraper.validate_url_health(product_url)
            
            if not url_health['is_healthy']:
                logger.warning(f"URL health issues detected for {product_url}: {url_health['issues']}")
                
                # Try suggested URL fixes
                url_suggestions = self.web_scraper.suggest_url_fixes(url_health)
                for suggestion in url_suggestions[:2]:  # Try first 2 suggestions
                    logger.info(f"Trying suggested URL: {suggestion['url']} ({suggestion['reason']})")
                    alt_health = await self.web_scraper.validate_url_health(suggestion['url'])
                    if alt_health['is_healthy']:
                        logger.info(f"✅ Alternative URL is healthy, using: {suggestion['url']}")
                        product_url = suggestion['url']
                        break
                else:
                    # No healthy alternatives found
                    if url_health['status_code'] == 404:
                        error_msg = f"URL not found (404): {product_url}. Tried {len(url_suggestions)} alternatives."
                    else:
                        error_msg = f"URL health check failed: {', '.join(url_health['issues'])}"
                    
                    logger.error(error_msg)
                    await self.db_service.add_price_history(
                        machine_id=machine_id,
                        old_price=current_price,
                        new_price=None,
                        success=False,
                        error_message=error_msg,
                        batch_id=batch_id
                    )
                    return {"success": False, "error": error_msg, "machine_id": machine_id, "url": product_url}

            # Scrape the product page with retry logic
            html_content, soup = await self.web_scraper.get_page_content(product_url)
            if not html_content or not soup:
                logger.error(f"Failed to fetch content from {product_url} after retries")
                await self.db_service.add_price_history(
                    machine_id=machine_id,
                    old_price=current_price,
                    new_price=None,
                    success=False,
                    error_message="Failed to fetch product page after retries",
                    batch_id=batch_id
                )
                return {"success": False, "error": "Failed to fetch product page after retries", "machine_id": machine_id, "url": product_url}
            
            # Get machine name for variant selection
            machine_name = machine.get("Machine Name")
            logger.info(f"Using machine name for variant selection: '{machine_name}'")
            
            # Prepare machine data with old_price for better extraction
            machine_data_for_extraction = dict(machine)  # Create a copy
            machine_data_for_extraction['old_price'] = current_price  # Add old_price field for extraction logic
            
            # Extract price - now passing machine data for learned selectors
            new_price, method = await self.price_extractor.extract_price(soup, html_content, product_url, current_price, machine_name, machine_data_for_extraction)
            
            # Validate the extracted price - must be a reasonable value
            if new_price is not None:
                # Verify price is in a reasonable range (between $10 and $100,000)
                if not (10 <= new_price <= 100000):
                    logger.warning(f"Extracted price ${new_price} for machine {machine_id} is outside reasonable range")
                    # Try the next best extraction method - common selectors if JSON-LD was used
                    if method == "JSON-LD" or method == "JSON-LD offers":
                        logger.info(f"Falling back to common selectors for machine {machine_id}")
                        new_price, alt_method = self.price_extractor._extract_from_common_selectors(soup)
                        if new_price is not None:
                            if 10 <= new_price <= 100000:
                                logger.info(f"Found better price ${new_price} using {alt_method}")
                                method = alt_method
                            else:
                                logger.warning(f"Fallback price ${new_price} is also outside reasonable range")
                                new_price = None
                    # Try Claude if common selectors also failed
                    if new_price is None:
                        logger.info(f"Falling back to Claude AI for machine {machine_id}")
                        new_price, claude_method = await self.price_extractor._extract_using_claude(html_content, product_url, current_price)
                        if new_price is not None:
                            if 10 <= new_price <= 100000:
                                logger.info(f"Found better price ${new_price} using {claude_method}")
                                method = claude_method
                            else:
                                logger.warning(f"Claude price ${new_price} is also outside reasonable range")
                                new_price = None
            
            if new_price is None:
                logger.error(f"Failed to extract price for machine {machine_id} from {product_url}")
                await self.db_service.add_price_history(
                    machine_id=machine_id,
                    old_price=current_price,
                    new_price=None,
                    success=False,
                    error_message="Failed to extract price",
                    batch_id=batch_id
                )
                return {
                    "success": False,
                    "error": "Failed to extract price",
                    "machine_id": machine_id,
                    "url": product_url
                }
            
            # Get the old price - use same effective current price logic
            old_price = await self._get_effective_current_price(machine_id, machine.get("Price"))
            logger.debug(f"Old price: {old_price}, New price: {new_price}")
            
            # Record price for variant verification (if in batch mode)
            if batch_id and self.variant_verifier:
                machine_name = machine.get("Machine Name", "Unknown")
                self.variant_verifier.record_price(machine_name, new_price, batch_id)
            
            # Skip update if the price hasn't changed
            if old_price == new_price:
                logger.info(f"Price unchanged for machine {machine_id}: {new_price}")
                
                # Record in price history anyway
                await self.db_service.add_price_history(
                    machine_id=machine_id,
                    old_price=old_price,
                    new_price=new_price,
                    success=True,
                    error_message=None,
                    batch_id=batch_id
                )
                
                price_change = new_price - old_price if old_price is not None else None
                percentage_change = ((new_price - old_price) / old_price) * 100 if old_price is not None and old_price > 0 else None
                
                return {
                    "success": True,
                    "message": "Price unchanged",
                    "old_price": old_price,
                    "new_price": new_price,
                    "method": method,
                    "price_change": price_change,
                    "percentage_change": percentage_change,
                    "machine_id": machine_id,
                    "url": product_url
                }
            
            # Check if price change requires manual approval
            requires_approval, approval_reason = await self._should_require_manual_approval(old_price, new_price, machine_id)
            
            if requires_approval:
                # Log price change for manual review - don't update machines table
                logger.warning(f"Price change for machine {machine_id} flagged for manual review: {approval_reason}")
                
                # Add to price history with PENDING_REVIEW status for manual review
                history_added = await self.db_service.add_price_history(
                    machine_id=machine_id,
                    old_price=old_price,
                    new_price=new_price,
                    success=True,  # System worked correctly, just needs approval
                    error_message=f"Pending review: {approval_reason}",
                    batch_id=batch_id,
                    status="PENDING_REVIEW"  # Distinguish from actual failures
                )
                
                price_change = new_price - old_price if old_price is not None else None
                percentage_change = ((new_price - old_price) / old_price) * 100 if old_price is not None and old_price > 0 else None
                
                return {
                    "success": True,  # System worked correctly, just needs approval
                    "extraction_success": True,  # Price was successfully extracted
                    "requires_approval": True,
                    "approval_reason": approval_reason,
                    "old_price": old_price,
                    "new_price": new_price,
                    "method": method,
                    "price_change": price_change,
                    "percentage_change": percentage_change,
                    "machine_id": machine_id,
                    "url": product_url
                }
            
            # Update the price in the database (only if auto-approved)
            update_success = await self.db_service.update_machine_price(
                machine_id=machine_id,
                new_price=new_price,
                html_content=html_content
            )
            
            if not update_success:
                error_msg = f"Failed to update price in database for machine {machine_id}"
                logger.error(error_msg)
                return {
                    "success": False,
                    "error": error_msg,
                    "machine_id": machine_id,
                    "url": product_url
                }
            
            # Add to price history
            history_added = await self.db_service.add_price_history(
                machine_id=machine_id,
                old_price=old_price,
                new_price=new_price,
                success=True,
                error_message=None,
                batch_id=batch_id
            )
            
            if not history_added:
                logger.warning(f"Failed to add price history entry for machine {machine_id}")
            
            logger.info(f"Successfully updated price for machine {machine_id} from {old_price} to {new_price} using {method}")
            
            price_change = new_price - old_price if old_price is not None else None
            percentage_change = ((new_price - old_price) / old_price) * 100 if old_price is not None and old_price > 0 else None
            
            return {
                "success": True,
                "message": "Price updated successfully",
                "old_price": old_price,
                "new_price": new_price,
                "method": method,
                "price_change": price_change,
                "percentage_change": percentage_change,
                "machine_id": machine_id,
                "url": product_url
            }
        except Exception as e:
            logger.exception(f"Error processing price update for machine {machine_id}: {str(e)}")
            return {
                "success": False,
                "error": "An error occurred while processing the price update",
                "machine_id": machine_id,
                "url": product_url
            }
    
    async def _process_machines_concurrently(self, machines, batch_id, results, max_workers):
        """
        Process machines concurrently while maintaining comprehensive logging and result tracking.
        
        Args:
            machines: List of machine dictionaries to process
            batch_id: Batch ID for tracking
            results: Results dictionary to update (thread-safe)
            max_workers: Maximum concurrent workers
        """
        import asyncio
        from asyncio import Semaphore
        
        # Create semaphore to limit concurrent processing
        semaphore = Semaphore(max_workers)
        
        # Thread-safe result aggregation lock
        results_lock = asyncio.Lock()
        
        async def process_single_machine(machine):
            """Process a single machine with semaphore control and result tracking."""
            async with semaphore:
                try:
                    machine_id = machine.get("id")
                    machine_name = machine.get("Machine Name", "Unknown")
                    
                    # Log start of processing for this machine
                    logger.info(f"🔄 Processing machine {machine_name} (ID: {machine_id}) - Worker available")
                    
                    # Process the machine (this maintains all existing logging)
                    result = await self.update_machine_price(machine_id, batch_id=batch_id)
                    
                    # Track result in database
                    await self.db_service.add_batch_result(batch_id, machine_id, result)
                    
                    # Thread-safe result aggregation
                    async with results_lock:
                        if result["success"]:
                            results["successful"] += 1
                            if "message" in result and result["message"] == "Price unchanged":
                                results["unchanged"] += 1
                            else:
                                results["updated"] += 1
                        else:
                            results["failed"] += 1
                            results["failures"].append({
                                "machine_id": machine_id,
                                "error": result.get("error", "Unknown error")
                            })
                    
                    # Log completion
                    status = "✅ SUCCESS" if result["success"] else "❌ FAILED"
                    logger.info(f"{status} Machine {machine_name} - {results['successful'] + results['failed']}/{results['total']} completed")
                    
                    return result
                    
                except Exception as e:
                    logger.exception(f"❌ Concurrent processing error for machine {machine.get('Machine Name', 'Unknown')} (ID: {machine.get('id')}): {str(e)}")
                    
                    # Create error result
                    error_result = {
                        "success": False,
                        "error": f"Concurrent processing error: {str(e)}",
                        "machine_id": machine.get("id"),
                        "url": machine.get("product_link")
                    }
                    
                    # Track error in database
                    await self.db_service.add_batch_result(batch_id, machine.get("id"), error_result)
                    
                    # Update results
                    async with results_lock:
                        results["failed"] += 1
                        results["failures"].append({
                            "machine_id": machine.get("id"),
                            "error": str(e)
                        })
                    
                    return error_result
        
        # Log start of concurrent processing
        logger.info(f"🚀 Starting concurrent processing of {len(machines)} machines with {max_workers} workers")
        
        # Create tasks for all machines
        tasks = [process_single_machine(machine) for machine in machines]
        
        # Process all tasks concurrently
        await asyncio.gather(*tasks, return_exceptions=True)
        
        logger.info(f"🎉 Concurrent processing completed - {results['successful']} successful, {results['failed']} failed")
    
    async def batch_update_machines(self, days_threshold=7, max_workers=5, limit=None, machine_ids=None):
        """
        Update prices for all machines that need an update.
        
        Args:
            days_threshold (int): Minimum days since last update to consider for updating.
                                 If 0, updates all machines regardless of last update time.
            max_workers (int): Maximum number of concurrent update processes.
            limit (int, optional): Limit the number of machines to update.
            machine_ids (List[str], optional): Specific machine IDs to update. If provided,
                                              days_threshold is ignored.
            
        Returns:
            dict: Summary of batch update operation.
        """
        logger.info(f"Starting batch update with days_threshold={days_threshold}, limit={limit}, machine_ids={(len(machine_ids) if machine_ids else 'None')}")
        
        # Get machines needing update - use machine_ids if provided
        if machine_ids:
            logger.info(f"Using {len(machine_ids)} provided machine IDs for batch update")
            machines = await self.db_service.get_machines_needing_update(machine_ids=machine_ids)
        else:
            # Otherwise use the days_threshold
            machines = await self.db_service.get_machines_needing_update(days_threshold=days_threshold, limit=limit)
        
        if not machines:
            logger.info("No machines need price updates at this time")
            return {"success": True, "message": "No machines need price updates", "count": 0}
        
        # Log how many machines we're actually updating
        logger.info(f"Starting batch update for {len(machines)} machines")
        
        # Create a batch record
        batch_id = await self.db_service.create_batch(
            count=len(machines),
            days_threshold=days_threshold,
            machine_ids=machine_ids,
            limit=limit,
            max_workers=max_workers
        )
        
        if not batch_id:
            logger.error("Failed to create batch record")
            return {"success": False, "error": "Failed to create batch record"}
        
        # Set up batch-specific logging
        batch_log_path = self._setup_batch_logging(batch_id)
        
        # Initialize variant verifier for this batch
        self.variant_verifier = VariantVerificationService()
        
        # Set effective max workers (use config default if not specified)
        from config import MAX_CONCURRENT_EXTRACTIONS
        effective_max_workers = max_workers if max_workers is not None else MAX_CONCURRENT_EXTRACTIONS
        
        # Log concurrent processing configuration
        logger.info(f"🔧 Configured for concurrent processing with {effective_max_workers} workers")
        
        # Update each machine and track in batch_results
        results = {
            "batch_id": batch_id,
            "total": len(machines),
            "successful": 0,
            "failed": 0,
            "unchanged": 0,
            "updated": 0,
            "failures": []
        }
        
        # Process machines concurrently with controlled concurrency
        await self._process_machines_concurrently(machines, batch_id, results, effective_max_workers)
        
        # Mark batch as completed
        await self.db_service.complete_batch(batch_id)
        
        logger.info(f"Batch update completed. Results: {results['successful']} successful, {results['failed']} failed")
        
        # Generate and log variant verification report
        if self.variant_verifier:
            variant_report = self.variant_verifier.generate_report()
            logger.info("\n" + variant_report)
            
            # Check if we should block the batch due to variant issues
            if self.variant_verifier.should_block_batch():
                logger.error("🛑 CRITICAL: Batch has variant price issues that indicate broken extraction!")
                results['variant_alerts'] = self.variant_verifier.get_alerts()
        
        # Log batch completion details
        logger.info(f"======================")
        logger.info(f"=== BATCH LOG END ===")
        logger.info(f"Batch ID: {batch_id}")
        logger.info(f"Total machines: {results['total']}")
        logger.info(f"Successful: {results['successful']}")
        logger.info(f"Failed: {results['failed']}")
        logger.info(f"Completed at: {datetime.now().isoformat()}")
        logger.info(f"Log file: {batch_log_path}")
        logger.info(f"======================")
        
        return {
            "success": True,
            "message": "Batch update completed",
            "batch_id": batch_id,
            "results": results,
            "log_file": batch_log_path
        }
        
    async def get_batch_results(self, batch_id):
        """
        Efficiently retrieve batch results without triggering any processing.
        
        Args:
            batch_id (str): The batch ID to retrieve results for.
            
        Returns:
            dict: The batch results data.
        """
        logger.info(f"Retrieving batch results for batch_id: {batch_id}")
        
        try:
            # Get batch data from the database
            batch_data = await self.db_service.get_batch_results(batch_id)
            
            if not batch_data:
                logger.warning(f"No batch data found for batch_id: {batch_id}")
                return None
            
            # Get additional stats without triggering processing
            stats = await self.db_service.get_batch_stats(batch_id)
            
            # Combine data and return
            result = {
                "batch_id": batch_id,
                "entries": batch_data,
                "stats": stats,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
            
            return result
        except Exception as e:
            logger.exception(f"Error retrieving batch results for batch_id {batch_id}: {str(e)}")
            return None 
    
    async def get_batch_failures(self, batch_id):
        """
        Parse batch log file to extract failed machine IDs.
        
        Args:
            batch_id (str): The batch ID to get failures for
            
        Returns:
            List[str]: List of machine IDs that completely failed
        """
        try:
            logger.info(f"Parsing batch log for failures: {batch_id}")
            
            # Find the batch log file
            import glob
            import os
            short_batch_id = batch_id[:8]
            logger.info(f"🔧 DEBUG: Looking for batch logs with short_batch_id: {short_batch_id}")
            
            # Check both current directory and parent directory for logs
            patterns_to_try = [
                f"logs/batch_*_{short_batch_id}.log",
                f"../logs/batch_*_{short_batch_id}.log",
                f"price-extractor-python/logs/batch_*_{short_batch_id}.log"
            ]
            
            log_files = []
            for pattern in patterns_to_try:
                logger.info(f"🔧 DEBUG: Trying pattern: {pattern}")
                found_files = glob.glob(pattern)
                logger.info(f"🔧 DEBUG: Pattern {pattern} found files: {found_files}")
                if found_files:
                    log_files = found_files
                    logger.info(f"Found log files using pattern: {pattern}")
                    break
            
            if not log_files:
                logger.warning(f"No batch log file found for batch {batch_id}")
                return []
            
            log_file = log_files[0]  # Use the first matching log file
            logger.info(f"Reading batch log: {log_file}")
            
            failed_machine_ids = []
            
            with open(log_file, 'r') as f:
                lines = f.readlines()
            
            # Parse log lines to find ACTUAL extraction failures (not approval requests)
            error_lines_found = 0
            for line in lines:
                # Look for actual extraction failures - "Failed to extract price"
                if "ERROR" in line and "Failed to extract price for machine" in line:
                    error_lines_found += 1
                    logger.info(f"🔧 DEBUG: Found extraction failure line {error_lines_found}: {line.strip()[:100]}...")
                    try:
                        # Extract machine ID from: "Failed to extract price for machine ebd7976d-9fa0-4142-84cf-065d7adcb870 from https://..."
                        match_text = "Failed to extract price for machine "
                        start_idx = line.find(match_text)
                        if start_idx != -1:
                            start_idx += len(match_text)
                            # Find the end of the machine ID (next space or tab)
                            end_idx = line.find(" ", start_idx)
                            if end_idx != -1:
                                machine_id = line[start_idx:end_idx].strip()
                                logger.info(f"🔧 DEBUG: Extracted machine_id: '{machine_id}' (length: {len(machine_id)}, dashes: {machine_id.count('-')})")
                                # Validate it looks like a UUID (36 chars with 4 dashes)
                                if len(machine_id) == 36 and machine_id.count('-') == 4:
                                    if machine_id not in failed_machine_ids:
                                        failed_machine_ids.append(machine_id)
                                        logger.info(f"🔧 DEBUG: Added failed machine ID: {machine_id}")
                                else:
                                    logger.warning(f"🔧 DEBUG: Invalid machine ID format: '{machine_id}'")
                    except Exception as e:
                        logger.warning(f"Failed to parse machine ID from extraction failure line: {line.strip()}")
                        continue
                
                # Also look for database errors when adding price history - these contain machine IDs
                elif "ERROR" in line and "services.database:add_price_history" in line and "Error adding price history for machine" in line:
                    error_lines_found += 1
                    logger.info(f"🔧 DEBUG: Found database error line {error_lines_found}: {line.strip()[:100]}...")
                    try:
                        # Extract machine ID from: "Error adding price history for machine ebd7976d-9fa0-4142-84cf-065d7adcb870: {'message':..."
                        match_text = "Error adding price history for machine "
                        start_idx = line.find(match_text)
                        if start_idx != -1:
                            start_idx += len(match_text)
                            # Find the end of the machine ID (next colon)
                            end_idx = line.find(":", start_idx)
                            if end_idx != -1:
                                machine_id = line[start_idx:end_idx].strip()
                                logger.info(f"🔧 DEBUG: Extracted machine_id: '{machine_id}' (length: {len(machine_id)}, dashes: {machine_id.count('-')})")
                                # Validate it looks like a UUID (36 chars with 4 dashes)
                                if len(machine_id) == 36 and machine_id.count('-') == 4:
                                    if machine_id not in failed_machine_ids:
                                        failed_machine_ids.append(machine_id)
                                        logger.info(f"🔧 DEBUG: Added failed machine ID: {machine_id}")
                                else:
                                    logger.warning(f"🔧 DEBUG: Invalid machine ID format: '{machine_id}'")
                    except Exception as e:
                        logger.warning(f"Failed to parse machine ID from database error line: {line.strip()}")
                        continue
            
            logger.info(f"🔧 DEBUG: Found {error_lines_found} error lines total")
            logger.info(f"Found {len(failed_machine_ids)} failed machines in batch {batch_id}")
            return failed_machine_ids
            
        except Exception as e:
            logger.exception(f"Error parsing batch failures for {batch_id}: {str(e)}")
            return []
    
    async def get_batch_manual_corrections(self, batch_id):
        """
        Get machine IDs that were manually corrected in a specific batch.
        
        Args:
            batch_id: The batch ID to get manual corrections for
            
        Returns:
            list: Machine IDs that were manually corrected in this batch
        """
        try:
            logger.info(f"Getting manual corrections for batch {batch_id}")
            
            # Query price_history table for MANUAL_CORRECTION entries from this batch
            query = """
                SELECT DISTINCT machine_id 
                FROM price_history 
                WHERE batch_id = $1 
                AND status = 'MANUAL_CORRECTION'
            """
            
            result = await self.db_service.fetch_query(query, batch_id)
            
            corrected_machine_ids = [row['machine_id'] for row in result] if result else []
            
            logger.info(f"Found {len(corrected_machine_ids)} manually corrected machines in batch {batch_id}")
            return corrected_machine_ids
            
        except Exception as e:
            logger.exception(f"Error getting manual corrections for batch {batch_id}: {str(e)}")
            return []