from loguru import logger
from datetime import datetime, timezone
import requests
from bs4 import BeautifulSoup
import time

from services.database import DatabaseService
from scrapers.web_scraper import WebScraper
from scrapers.price_extractor import PriceExtractor
from utils.price_validator import PriceValidator

class PriceService:
    """Service to coordinate price extraction and database updates."""
    
    def __init__(self):
        """Initialize dependencies."""
        self.db_service = DatabaseService()
        self.web_scraper = WebScraper()
        self.price_extractor = PriceExtractor()
        self.price_validator = PriceValidator()
        logger.info("Price service initialized")
    
    async def extract_machine_price(self, machine_id, url=None):
        """
        Extract price for a specific machine without saving to database.
        
        Args:
            machine_id (str): The ID of the machine to extract price for.
            url (str, optional): URL to override the one in the database.
            
        Returns:
            dict: Extraction result with new price, old price, and detailed status.
        """
        logger.info(f"Processing price extraction for machine {machine_id}")
        
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
            
            # Get current price from database for comparison
            current_price = machine.get("Price")
            
            # Get product category information for validation
            product_category = machine.get("Equipment Type") or machine.get("Machine Type") or None
            
            # Scrape the product page
            html_content, soup = await self.web_scraper.get_page_content(product_url)
            if not html_content or not soup:
                logger.error(f"Failed to fetch content from {product_url}")
                return {"success": False, "error": "Failed to fetch product page", "machine_id": machine_id, "url": product_url}
            
            # Extract price using two-stage approach
            new_price, method = await self.price_extractor.extract_price(
                soup, 
                html_content, 
                product_url, 
                product_category=product_category, 
                previous_price=current_price,
                machine_id=machine_id
            )
            
            # Collect detailed extraction information
            extraction_details = {
                "method": method,
                "url": product_url,
                "html_size": len(html_content) if html_content else 0,
                "extraction_timestamp": datetime.now(timezone.utc).isoformat(),
                "selectors_tried": self.price_extractor.get_selectors_info(),
                "fallback_to_claude": method and "Claude" in method,
                "machine_name": machine.get("Machine Name"),
                "company": machine.get("Company"),
                "category": product_category
            }
            
            if new_price is None:
                logger.error(f"Failed to extract price for machine {machine_id} from {product_url}")
                return {
                    "success": False,
                    "error": "Failed to extract price",
                    "machine_id": machine_id,
                    "url": product_url,
                    "extraction_details": extraction_details
                }
            
            # Get the old price (proper case for Supabase column)
            old_price = machine.get("Price")
            logger.debug(f"Old price: {old_price}, New price: {new_price}")
            
            # Calculate price change values
            price_change = new_price - old_price if old_price is not None else None
            percentage_change = ((new_price - old_price) / old_price) * 100 if old_price is not None and old_price > 0 else None
                
            return {
                "success": True,
                "message": "Price extracted successfully",
                "old_price": old_price,
                "new_price": new_price,
                "method": method,
                "price_change": price_change,
                "percentage_change": percentage_change,
                "machine_id": machine_id,
                "url": product_url,
                "extraction_details": extraction_details
            }
        except Exception as e:
            logger.exception(f"Error processing price extraction for machine {machine_id}: {str(e)}")
            return {
                "success": False,
                "error": "An error occurred while processing the price extraction",
                "machine_id": machine_id,
                "url": url
            }
    
    async def save_machine_price(self, machine_id, new_price, html_content=None):
        """
        Save an already extracted price to the database.
        
        Args:
            machine_id (str): The ID of the machine to update.
            new_price (float): The new price value to save.
            html_content (str, optional): The HTML content of the scraped page.
            
        Returns:
            dict: Update result with status.
        """
        logger.info(f"Saving confirmed price {new_price} for machine {machine_id}")
        
        try:
            # Get machine data to get the old price
            machine = await self.db_service.get_machine_by_id(machine_id)
            if not machine:
                logger.error(f"Machine {machine_id} not found in database")
                return {"success": False, "error": f"Machine not found in database: {machine_id}", "machine_id": machine_id}
            
            old_price = machine.get("Price")
            product_url = machine.get("product_link")
            
            # Update the price in the database
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
            
            logger.info(f"Successfully updated price for machine {machine_id} from {old_price} to {new_price}")
            
            price_change = new_price - old_price if old_price is not None else None
            percentage_change = ((new_price - old_price) / old_price) * 100 if old_price is not None and old_price > 0 else None
            
            return {
                "success": True,
                "message": "Price updated successfully",
                "old_price": old_price,
                "new_price": new_price,
                "method": "Manual confirmation",
                "price_change": price_change,
                "percentage_change": percentage_change,
                "machine_id": machine_id,
                "url": product_url
            }
        except Exception as e:
            logger.exception(f"Error saving price for machine {machine_id}: {str(e)}")
            return {
                "success": False,
                "error": "An error occurred while saving the price",
                "machine_id": machine_id
            }
    
    async def update_machine_price(self, machine_id, url=None):
        """
        Extract a price for a machine and update it in the database.
        
        Args:
            machine_id (str): The ID of the machine to update.
            url (str, optional): URL to override the one in the database.
            
        Returns:
            dict: Update result with status, new price, and old price.
        """
        logger.info(f"Processing price update for machine {machine_id}")
        start_time = datetime.now(timezone.utc)
        
        debug_info = {
            "machine_id": machine_id,
            "start_time": start_time.isoformat(),
            "steps": []
        }
        
        try:
            # Get machine data from database
            machine = await self.db_service.get_machine_by_id(machine_id)
            debug_info["steps"].append({"step": "get_machine", "timestamp": datetime.now(timezone.utc).isoformat()})
            
            if not machine:
                logger.error(f"Machine {machine_id} not found in database")
                debug_info["error_step"] = "machine_lookup"
                return {
                    "success": False, 
                    "error": f"Machine not found in database: {machine_id}", 
                    "machine_id": machine_id,
                    "debug": debug_info
                }
            
            # Use provided URL or get from database
            product_url = url or machine.get("product_link")
            machine_name = machine.get("Machine Name", "Unknown")
            current_price = machine.get("Price")
            product_category = machine.get("Equipment Type") or machine.get("Machine Type") or None
            
            debug_info.update({
                "machine_name": machine_name,
                "db_id": machine.get("id"),
                "current_price": current_price,
                "product_category": product_category
            })
            
            logger.info(f"Found machine: {machine_name} (Current price: ${current_price})")
            
            if not product_url:
                error_msg = f"No product URL available for machine {machine_id}"
                logger.error(error_msg)
                debug_info["error_step"] = "missing_url"
                return {
                    "success": False, 
                    "error": error_msg, 
                    "machine_id": machine_id,
                    "debug": debug_info
                }
            
            logger.info(f"Fetching product page: {product_url}")
            debug_info["product_url"] = product_url
            debug_info["steps"].append({"step": "fetch_url", "timestamp": datetime.now(timezone.utc).isoformat()})
            
            # Scrape the product page
            html_content, soup = await self.web_scraper.get_page_content(product_url)
            
            if not html_content or not soup:
                error_msg = f"Failed to fetch content from {product_url}"
                logger.error(error_msg)
                debug_info["error_step"] = "page_fetch"
                return {
                    "success": False, 
                    "error": error_msg, 
                    "machine_id": machine_id, 
                    "url": product_url,
                    "debug": debug_info
                }
            
            html_size = len(html_content)
            logger.info(f"Successfully fetched page ({html_size} bytes)")
            debug_info["html_size"] = html_size
            debug_info["steps"].append({"step": "extract_price", "timestamp": datetime.now(timezone.utc).isoformat()})
            
            # Extract price with two-stage approach
            new_price, method = await self.price_extractor.extract_price(
                soup, 
                html_content, 
                product_url, 
                product_category=product_category,
                previous_price=current_price,
                machine_id=machine_id
            )
            
            extraction_time = datetime.now(timezone.utc)
            debug_info["steps"].append({"step": "price_extracted", "timestamp": extraction_time.isoformat()})
            debug_info.update({
                "extraction_method": method,
                "extracted_price": new_price
            })
            
            if new_price is None:
                error_msg = f"Failed to extract price from {product_url}"
                logger.error(error_msg)
                debug_info["error_step"] = "price_extraction"
                return {
                    "success": False, 
                    "error": error_msg, 
                    "machine_id": machine_id, 
                    "url": product_url,
                    "debug": debug_info
                }
            
            logger.info(f"Successfully extracted price ${new_price} using method: {method}")
            
            # Check if the price has changed
            price_changed = True
            
            if current_price is not None:
                try:
                    current_price_float = float(current_price)
                    if abs(current_price_float - new_price) < 0.01:
                        price_changed = False
                        logger.info(f"Price unchanged for machine {machine_id}: {new_price}")
                except (ValueError, TypeError):
                    logger.warning(f"Could not compare prices for machine {machine_id}: invalid price value")
            
            debug_info["price_changed"] = price_changed
            debug_info["steps"].append({"step": "update_db", "timestamp": datetime.now(timezone.utc).isoformat()})
            
            # Update the price in the database
            update_success = await self.db_service.update_machine_price(
                machine_id=machine_id, 
                new_price=new_price,
                html_content=html_content
            )
            
            end_time = datetime.now(timezone.utc)
            duration = (end_time - start_time).total_seconds()
            
            debug_info.update({
                "end_time": end_time.isoformat(),
                "duration_seconds": duration,
                "db_update_success": update_success
            })
            
            if not update_success:
                error_msg = f"Failed to update price in database for machine {machine_id}"
                logger.error(error_msg)
                debug_info["error_step"] = "db_update"
                return {
                    "success": False, 
                    "error": error_msg, 
                    "machine_id": machine_id, 
                    "url": product_url,
                    "debug": debug_info
                }
            
            # Calculate price change values for history record
            price_change = None
            percentage_change = None
            
            if current_price is not None and new_price is not None:
                try:
                    current_price_float = float(current_price)
                    price_change = new_price - current_price_float
                    if current_price_float > 0:
                        percentage_change = (price_change / current_price_float) * 100
                except (ValueError, TypeError):
                    logger.warning(f"Could not calculate price change: invalid price value")
            
            # Add history record - ONLY if it wasn't already added by the update_machine_price function
            # Check if the update_success came from the fallback path that already added a history record
            if not getattr(update_success, 'history_record_added', False):
                await self.db_service.add_price_history(
                    machine_id=machine_id,
                    old_price=current_price,
                    new_price=new_price,
                    success=True,
                    extraction_method=method
                )
            
            debug_info["steps"].append({"step": "completed", "timestamp": datetime.now(timezone.utc).isoformat()})
            
            # Return success with price details
            message = "Price updated successfully" if price_changed else "Price unchanged"
            logger.info(f"{message} for {machine_name} (ID: {machine_id})")
            
            # Add merchant domain to problematic list if Claude was used
            if method and "Claude" in method:
                merchant_domain = self._extract_domain(product_url)
                # Record this information but don't automatically add to problematic list
                debug_info["used_claude"] = True
                debug_info["merchant_domain"] = merchant_domain
            
            return {
                "success": True,
                "message": message,
                "machine_id": machine_id,
                "machine_name": machine_name,
                "old_price": current_price,
                "new_price": new_price,
                "price_change": price_change,
                "percentage_change": percentage_change,
                "url": product_url,
                "price_changed": price_changed,
                "extraction_method": method,
                "debug": debug_info
            }
        except Exception as e:
            logger.exception(f"Error processing price update for machine {machine_id}: {str(e)}")
            end_time = datetime.now(timezone.utc)
            duration = (end_time - start_time).total_seconds()
            
            debug_info.update({
                "end_time": end_time.isoformat(),
                "duration_seconds": duration,
                "error": str(e)
            })
            
            return {
                "success": False,
                "error": f"An error occurred while processing the price update: {str(e)}",
                "machine_id": machine_id,
                "debug": debug_info
            }
    
    def _extract_domain(self, url):
        """
        Extract domain name from URL for problematic merchant tracking.
        
        Args:
            url (str): URL to extract domain from.
            
        Returns:
            str: Domain name or empty string if extraction failed.
        """
        try:
            # Basic domain extraction
            import re
            domain = re.findall(r'https?://(?:www\.)?([^/]+)', url)
            if domain:
                return domain[0]
        except Exception as e:
            logger.debug(f"Error extracting domain from {url}: {str(e)}")
        
        return ""
    
    async def batch_update_machines(self, days_threshold=7, max_workers=5, limit=None, machine_ids=None, dry_run=False):
        """
        Update prices for machines that have not been updated in the specified days.
        
        Args:
            days_threshold (int): Number of days since the last update to consider for update.
            max_workers (int): Maximum number of concurrent workers.
            limit (int, optional): Maximum number of machines to update.
            machine_ids (list, optional): Specific machine IDs to update instead of using days_threshold.
            dry_run (bool): If True, extract prices but don't save to database.
            
        Returns:
            dict: Results of the batch update operation.
        """
        logger.info(f"Starting batch update with {'DRY RUN ' if dry_run else ''}threshold of {days_threshold} days")
        
        try:
            # Get machines needing update
            if machine_ids:
                logger.info(f"Using provided list of {len(machine_ids)} machine IDs")
                machines = []
                for machine_id in machine_ids:
                    machine = await self.db_service.get_machine_by_id(machine_id)
                    if machine:
                        machines.append(machine)
                    else:
                        logger.warning(f"Machine ID {machine_id} not found in database")
            else:
                logger.info(f"Fetching machines not updated in {days_threshold} days")
                machines = await self.db_service.get_machines_needing_update(days_threshold, limit)
            
            if not machines:
                logger.info("No machines found that need updates")
                return {
                    "success": True,
                    "message": "No machines found needing updates",
                    "results": {
                        "total": 0,
                        "successful": 0,
                        "failed": 0,
                        "updated": 0,
                        "unchanged": 0
                    }
                }
            
            logger.info(f"Found {len(machines)} machines to update")
            
            # Create batches for concurrency
            total = len(machines)
            successful = 0
            failed = 0
            updated = 0
            unchanged = 0
            failures = []
            extractions = []  # Store detailed extraction results for dry run
            
            # Sequential processing for now
            # TODO: Implement concurrent processing with semaphore
            for machine in machines:
                machine_id = machine.get("id")
                machine_name = machine.get("Machine Name", "Unknown")
                
                try:
                    logger.info(f"Processing machine {machine_id}: {machine_name}")
                    
                    # Extract the price
                    result = await self.extract_machine_price(machine_id)
                    
                    if not result["success"]:
                        logger.error(f"Failed to extract price for {machine_id}: {result.get('error')}")
                        failed += 1
                        failures.append({
                            "machine_id": machine_id,
                            "machine_name": machine_name,
                            "error": result.get("error", "Unknown error"),
                            "timestamp": datetime.now(timezone.utc).isoformat()
                        })
                        continue
                    
                    # Store extraction results for dry run report
                    if dry_run:
                        extractions.append({
                            "machine_id": machine_id,
                            "variant_attribute": "DEFAULT",  # Default variant for now
                            "machine_name": machine_name,
                            "old_price": result.get("old_price"),
                            "new_price": result.get("new_price"),
                            "method": result.get("method"),
                            "price_change": result.get("price_change"),
                            "percentage_change": result.get("percentage_change"),
                            "extraction_timestamp": datetime.now(timezone.utc).isoformat(),
                            "extraction_details": result.get("extraction_details")
                        })
                    
                    old_price = result.get("old_price")
                    new_price = result.get("new_price")
                    
                    if old_price == new_price:
                        logger.info(f"Price unchanged for {machine_id}: {old_price}")
                        unchanged += 1
                    else:
                        logger.info(f"Price changed for {machine_id}: {old_price} -> {new_price}")
                        
                        # Update the price in the database if not a dry run
                        if not dry_run:
                            update_result = await self.save_machine_price(machine_id, new_price)
                            
                            if update_result["success"]:
                                logger.info(f"Successfully updated price for {machine_id}")
                                updated += 1
                            else:
                                logger.error(f"Failed to save price for {machine_id}: {update_result.get('error')}")
                                failed += 1
                                failures.append({
                                    "machine_id": machine_id,
                                    "machine_name": machine_name,
                                    "error": update_result.get("error", "Failed to save price to database"),
                                    "timestamp": datetime.now(timezone.utc).isoformat()
                                })
                                continue
                        else:
                            # In dry run, just count it as would-be-updated
                            updated += 1
                    
                    successful += 1
                    
                except Exception as e:
                    logger.exception(f"Error processing machine {machine_id}: {str(e)}")
                    failed += 1
                    failures.append({
                        "machine_id": machine_id,
                        "machine_name": machine_name,
                        "error": str(e),
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    })
            
            # Prepare results
            results = {
                "total": total,
                "successful": successful,
                "failed": failed,
                "updated": updated,
                "unchanged": unchanged,
                "failures": failures
            }
            
            # Add extractions data for dry run mode
            if dry_run:
                results["extractions"] = extractions
                logger.info(f"DRY RUN completed. {successful} successful, {failed} failed.")
            else:
                logger.info(f"Batch update completed. {successful} successful, {failed} failed.")
            
            return {
                "success": True,
                "results": results
            }
            
        except Exception as e:
            logger.exception(f"Error during batch update: {str(e)}")
            return {
                "success": False,
                "error": f"Error during batch update: {str(e)}"
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
                "timestamp": datetime.utcnow().isoformat()
            }
            
            return result
        except Exception as e:
            logger.exception(f"Error retrieving batch results for batch_id {batch_id}: {str(e)}")
            return None 