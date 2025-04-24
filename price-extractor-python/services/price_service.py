from loguru import logger
from datetime import datetime, timezone
import requests
from bs4 import BeautifulSoup
import time
from typing import Dict, Any
from urllib.parse import urlparse

from services.database_service import DatabaseService
from scrapers.web_scraper import WebScraper
from scrapers.price_extractor import PriceExtractor
from utils.price_validator import PriceValidator
from config import PRICE_HISTORY_TABLE

class PriceService:
    """Service to coordinate price extraction and database updates."""
    
    def __init__(self):
        """Initialize dependencies."""
        self.db_service = DatabaseService()
        self.web_scraper = WebScraper()
        self.price_extractor = PriceExtractor()
        self.price_validator = PriceValidator()
        logger.info("Price service initialized")
    
    async def extract_machine_price(self, machine_id: str, variant_attribute: str = "DEFAULT", dry_run: bool = False) -> Dict[str, Any]:
        """
        Extract the latest price for a machine from its product page.
        
        Args:
            machine_id: ID of the machine to extract price for
            variant_attribute: Optional variant attribute to extract price for
            dry_run: If True, don't save to database, just return extraction result
            
        Returns:
            Dictionary with extraction result
        """
        try:
            # Get machine details from database
            machine = await self.get_machine_details(machine_id)
            
            if not machine:
                return {
                    "success": False,
                    "error": f"Machine not found with ID: {machine_id}"
                }
                
            url = machine.get("url") or machine.get("product_link")
            machine_name = machine.get("name") or machine.get("Machine Name", "Unknown Machine")
            
            if not url:
                return {
                    "success": False, 
                    "error": f"No URL found for machine: {machine_id}"
                }
                
            # Get the latest price from machines_latest
            latest_price = await self.get_latest_price(machine_id, variant_attribute)
            previous_price = latest_price.get("price") if latest_price else None
            
            # Extract the price using the existing price_extractor
            html_content, soup = await self.web_scraper.get_page_content(url)
            
            if not html_content or not soup:
                return {
                    "success": False, 
                    "error": f"Failed to fetch content from {url}"
                }
            
            # Extract price with the price_extractor
            new_price, method = await self.price_extractor.extract_price(
                soup, 
                html_content, 
                url, 
                product_category=machine.get("category"),
                previous_price=previous_price,
                machine_id=machine_id
            )
            
            if new_price is None:
                return {
                    "success": False,
                    "error": f"Failed to extract price from {url}"
                }
            
            # Determine if Claude was used in any extraction method
            extraction_methods = []
            used_claude = "Claude" in method if method else False
            
            # Calculate price changes
            price_change = None
            percentage_change = None
            
            if previous_price:
                price_change = new_price - previous_price
                percentage_change = (price_change / previous_price) * 100
                
            cleaned_result = {
                "success": True,
                "error": None,
                "old_price": previous_price,
                "new_price": new_price,
                "price_change": price_change,
                "percentage_change": percentage_change,
                "method": method,
                "extraction_confidence": 0.9,  # Default placeholder
                "validation_confidence": 0.9,  # Default placeholder
                "needs_review": abs(percentage_change) > 25 if percentage_change else False,
                "review_reason": "price_change_threshold_exceeded" if percentage_change and abs(percentage_change) > 25 else None,
                "duration_seconds": 0.0,
                "fallback_to_claude": used_claude,
                "extraction_details": {
                    "method": method,
                    "url": url,
                    "html_size": len(html_content) if html_content else 0,
                    "extraction_timestamp": datetime.now().isoformat(),
                    "fallback_to_claude": used_claude,
                    "machine_name": machine_name,
                    "company": self._extract_company(machine),
                    "category": machine.get("category")
                }
            }
            
            return cleaned_result
            
        except Exception as e:
            logger.exception(f"Error extracting price for {machine_id}: {str(e)}")
            return {
                "success": False,
                "error": f"Error extracting price: {str(e)}"
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
            product_category = machine.get("Machine Category") or machine.get("Laser Category") or None
            
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
                    tier=method
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
                machines = await self.db_service.get_machines_for_update(days_threshold=days_threshold, limit=limit)
            
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
            
            # Log if stats are missing
            if stats is None:
                logger.warning(f"Stats are missing for batch_id: {batch_id}, attempting to generate from price_history")
                # Try to generate stats from price_history if not available
                try:
                    # Get price history entries for this batch
                    history_response = self.db_service.supabase.table(PRICE_HISTORY_TABLE) \
                        .select("machine_id, price, previous_price, price_change, percentage_change, extraction_method, failure_reason") \
                        .eq("batch_id", batch_id) \
                        .execute()
                    
                    if history_response.data and len(history_response.data) > 0:
                        entries = history_response.data
                        total_entries = len(entries)
                        successful = sum(1 for entry in entries if entry.get("failure_reason") is None)
                        failed = total_entries - successful
                        
                        # Get batch info
                        batch_response = self.db_service.supabase.table("batches") \
                            .select("total_machines, start_time, end_time, status") \
                            .eq("id", batch_id) \
                            .execute()
                        
                        if batch_response.data and len(batch_response.data) > 0:
                            batch_info = batch_response.data[0]
                            
                            # Generate stats
                            result["stats"] = {
                                "batch_id": batch_id,
                                "total_machines": batch_info.get("total_machines", 0),
                                "processed": total_entries,
                                "successful": successful,
                                "failed": failed,
                                "start_time": batch_info.get("start_time"),
                                "end_time": batch_info.get("end_time"),
                                "status": batch_info.get("status")
                            }
                            
                            logger.info(f"Generated stats for batch_id: {batch_id} from price_history")
                except Exception as e:
                    logger.error(f"Error generating stats from price_history: {str(e)}")
            
            return result
        except Exception as e:
            logger.exception(f"Error retrieving batch results for batch_id {batch_id}: {str(e)}")
            return None

    def _format_extraction_attempts(self, attempts: list) -> dict:
        """Format extraction attempts for API response."""
        result = {
            "structured_data": {
                "tried": False,
                "found": False,
                "details": None
            },
            "css_selectors": {
                "tried": False,
                "found": False,
                "details": None,
                "selectors_checked": []
            },
            "regex_patterns": {
                "tried": False,
                "found": False,
                "details": None,
                "patterns_checked": []
            },
            "add_to_cart_proximity": {
                "tried": False,
                "found": False,
                "details": None
            },
            "claude_ai": {
                "tried": False,
                "found": False,
                "details": None
            }
        }
        
        for attempt in attempts:
            tier = attempt.get("tier")
            success = attempt.get("success", False)
            method = str(attempt.get("method", ""))
            
            if tier == "STATIC":
                if "STRUCTURED" in method.upper():
                    result["structured_data"]["tried"] = True
                    result["structured_data"]["found"] = success
                    result["structured_data"]["details"] = "Found JSON-LD script tags" if success else None
                elif "SELECTOR" in method.upper():
                    result["css_selectors"]["tried"] = True
                    result["css_selectors"]["found"] = success
                    if success:
                        selector = method.split(":")[-1].split(" ")[0] if ":" in method else ""
                        result["css_selectors"]["details"] = f"Found price {attempt.get('price')} using selector '{selector}'"
                        if selector and selector not in result["css_selectors"]["selectors_checked"]:
                            result["css_selectors"]["selectors_checked"].append(selector)
                elif "REGEX" in method.upper():
                    result["regex_patterns"]["tried"] = True
                    result["regex_patterns"]["found"] = success
                    if success:
                        result["regex_patterns"]["details"] = f"Found price {attempt.get('price')} using pattern"
                elif "ADD_TO_CART" in method.upper():
                    result["add_to_cart_proximity"]["tried"] = True
                    result["add_to_cart_proximity"]["found"] = success
                    if success:
                        result["add_to_cart_proximity"]["details"] = f"Found price {attempt.get('price')} near add-to-cart button"
            elif "SLICE" in tier or "FULL_HTML" in tier:
                result["claude_ai"]["tried"] = True
                result["claude_ai"]["found"] = success
                if success:
                    result["claude_ai"]["details"] = f"Found price {attempt.get('price')} using {tier}"
        
        return result

    def _extract_company(self, machine: dict) -> str:
        """Extract company name from machine data."""
        # Try different possible field names
        company = machine.get("company")
        if not company:
            company = machine.get("Company")
        if not company:
            # Try to extract from the URL
            url = machine.get("url", "")
            parsed_url = urlparse(url)
            domain = parsed_url.netloc.lower()
            if domain.startswith("www."):
                domain = domain[4:]
            # Extract the first part of the domain
            company = domain.split(".")[0] if "." in domain else domain
        
        return company.lower() if company else "unknown"

    async def get_machine_details(self, machine_id: str) -> dict:
        """Get machine details from the database."""
        try:
            response = self.db_service.supabase.table("machines").select("*").eq("id", machine_id).execute()
            if response.data and len(response.data) > 0:
                return response.data[0]
            return None
        except Exception as e:
            logger.error(f"Error getting machine details: {str(e)}")
            return None
        
    async def get_latest_price(self, machine_id: str, variant_attribute: str = "DEFAULT") -> dict:
        """Get the latest price for a machine variant."""
        try:
            response = self.db_service.supabase.table("machines_latest").select("*").eq("machine_id", machine_id).eq("variant_attribute", variant_attribute).execute()
            if response.data and len(response.data) > 0:
                return response.data[0]
            return None
        except Exception as e:
            logger.error(f"Error getting latest price: {str(e)}")
            return None
    
    async def get_machine_data(self, machine_id: str, variant_attribute: str = "DEFAULT") -> Dict[str, Any]:
        """
        Get machine data including product URL and price information.
        
        Args:
            machine_id: ID of the machine to get data for
            variant_attribute: Variant attribute to get data for, defaults to "DEFAULT"
            
        Returns:
            Dictionary with machine data including last price and product link
        """
        try:
            # Get basic machine details
            machine_details = await self.get_machine_details(machine_id)
            if not machine_details:
                logger.error(f"Machine {machine_id} not found in database")
                return None
                
            # Get latest price info
            latest_price = await self.get_latest_price(machine_id, variant_attribute)
            
            # Combine the data
            result = {
                "machine_id": machine_id,
                "Machine Name": machine_details.get("Machine Name", "Unknown"),
                "product_link": machine_details.get("product_link"),
                "Price": latest_price.get("price") if latest_price else None,
                "category": machine_details.get("Machine Category") or machine_details.get("Laser Category")
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Error getting machine data for {machine_id}: {str(e)}")
            return None
    
    async def get_extraction_config(self, machine_id: str) -> Dict[str, Any]:
        """
        Get extraction configuration for a machine.
        
        Args:
            machine_id: ID of the machine to get configuration for
            
        Returns:
            Dictionary with extraction configuration
        """
        try:
            # Query the variant_extraction_config table
            response = self.db_service.supabase.table("variant_extraction_config") \
                .select("*") \
                .eq("machine_id", machine_id) \
                .execute()
                
            if response.data and len(response.data) > 0:
                return response.data[0]
                
            # If no specific config, return empty dict
            return {}
            
        except Exception as e:
            logger.error(f"Error getting extraction config for {machine_id}: {str(e)}")
            return {} 