from loguru import logger
from datetime import datetime

from services.database import DatabaseService
from scrapers.web_scraper import WebScraper
from scrapers.price_extractor import PriceExtractor
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
        self.web_scraper = WebScraper()
        self.price_extractor = PriceExtractor()
        logger.info("Price service initialized")
    
    def _should_require_manual_approval(self, old_price, new_price):
        """
        Determine if a price change requires manual approval based on thresholds.
        
        Args:
            old_price (float): Previous price
            new_price (float): New price
            
        Returns:
            tuple: (requires_approval, reason)
        """
        if old_price is None or new_price is None:
            return False, None
            
        # Skip validation for very low prices (likely test data)
        if new_price < MIN_PRICE_THRESHOLD:
            return True, f"New price ${new_price} below minimum threshold ${MIN_PRICE_THRESHOLD}"
        
        # Calculate percentage change
        percentage_change = ((new_price - old_price) / old_price) * 100
        
        # Check for large increases
        if percentage_change > MAX_PRICE_INCREASE_PERCENT:
            return True, f"Price increase of {percentage_change:.1f}% exceeds threshold of {MAX_PRICE_INCREASE_PERCENT}%"
        
        # Check for large decreases
        if percentage_change < -MAX_PRICE_DECREASE_PERCENT:
            return True, f"Price decrease of {abs(percentage_change):.1f}% exceeds threshold of {MAX_PRICE_DECREASE_PERCENT}%"
        
        return False, None
    
    async def update_machine_price(self, machine_id, url=None):
        """
        Update the price for a specific machine by scraping its URL.
        
        Args:
            machine_id (str): The ID of the machine to update.
            url (str, optional): URL to override the one in the database.
            
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
            
            # Get current price from database
            current_price = machine.get("Price")
            
            # Scrape the product page
            html_content, soup = await self.web_scraper.get_page_content(product_url)
            if not html_content or not soup:
                logger.error(f"Failed to fetch content from {product_url}")
                return {"success": False, "error": "Failed to fetch product page", "machine_id": machine_id, "url": product_url}
            
            # Get machine name for variant selection
            machine_name = machine.get("Machine Name")
            logger.info(f"Using machine name for variant selection: '{machine_name}'")
            
            # Extract price - now passing machine data for learned selectors
            new_price, method = await self.price_extractor.extract_price(soup, html_content, product_url, current_price, machine_name, machine)
            
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
                    error_message="Failed to extract price"
                )
                return {
                    "success": False,
                    "error": "Failed to extract price",
                    "machine_id": machine_id,
                    "url": product_url
                }
            
            # Get the old price (proper case for Supabase column)
            old_price = machine.get("Price")
            logger.debug(f"Old price: {old_price}, New price: {new_price}")
            
            # Skip update if the price hasn't changed
            if old_price == new_price:
                logger.info(f"Price unchanged for machine {machine_id}: {new_price}")
                
                # Record in price history anyway
                await self.db_service.add_price_history(
                    machine_id=machine_id,
                    old_price=old_price,
                    new_price=new_price,
                    success=True,
                    error_message=None
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
            requires_approval, approval_reason = self._should_require_manual_approval(old_price, new_price)
            
            if requires_approval:
                # Log price change for manual review - don't update machines table
                logger.warning(f"Price change for machine {machine_id} flagged for manual review: {approval_reason}")
                
                # Add to price history with PENDING_REVIEW status for manual review
                history_added = await self.db_service.add_price_history(
                    machine_id=machine_id,
                    old_price=old_price,
                    new_price=new_price,
                    success=False,  # Mark as pending review
                    error_message=f"Pending review: {approval_reason}"
                )
                
                price_change = new_price - old_price if old_price is not None else None
                percentage_change = ((new_price - old_price) / old_price) * 100 if old_price is not None and old_price > 0 else None
                
                return {
                    "success": False,
                    "error": f"Price change requires manual approval: {approval_reason}",
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
                error_message=None
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
        
        for machine in machines:
            machine_id = machine.get("id")
            result = await self.update_machine_price(machine_id)
            
            # Track the result in batch_results table
            await self.db_service.add_batch_result(batch_id, machine_id, result)
            
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
        
        # Mark batch as completed
        await self.db_service.complete_batch(batch_id)
        
        logger.info(f"Batch update completed. Results: {results['successful']} successful, {results['failed']} failed")
        
        return {
            "success": True,
            "message": "Batch update completed",
            "batch_id": batch_id,
            "results": results
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