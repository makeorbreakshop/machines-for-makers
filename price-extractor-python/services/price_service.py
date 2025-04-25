from loguru import logger
from datetime import datetime, timezone
import requests
from bs4 import BeautifulSoup
import time
from typing import Dict, Any
from urllib.parse import urlparse
import os
import sys
import json
from decimal import Decimal, InvalidOperation
import asyncio
import re

from services.database_service import DatabaseService
from scrapers.web_scraper import WebScraper
from scrapers.price_extractor import PriceExtractor
from utils.price_validator import PriceValidator
from config import PRICE_HISTORY_TABLE
from .extraction_service import ExtractionService
from utils.dom_analyzer import DOMAnalyzer

class PriceService:
    """Service to coordinate price extraction and database updates."""
    
    def __init__(self):
        """Initialize dependencies."""
        self.db_service = DatabaseService()
        self.web_scraper = WebScraper()
        self.price_extractor = PriceExtractor()
        self.price_validator = PriceValidator()
        self.extraction_service = ExtractionService()
        self.dom_analyzer = DOMAnalyzer()
        self.sanity_check_threshold = 25  # Default threshold for price change validation (25%)
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
            machine_name = machine.get("Machine Name", "Unknown")
            company = machine.get("Company", "Unknown")
            machine_category = machine.get("Machine Category", "laser_cutter")
            
            # Apply DOM analysis if HTML content is available
            dom_metadata = {}
            if html_content:
                dom_metadata = self.dom_analyzer.analyze_html(html_content)
            
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
            
            # Add to price history with enhanced metadata
            history_added = await self.db_service.add_price_history(
                machine_id=machine_id,
                old_price=old_price,
                new_price=new_price,
                success=True,
                error_message=None,
                tier="MANUAL",
                extraction_method="MANUAL_CONFIRMATION",
                extracted_confidence=1.0,
                validation_confidence=1.0,
                source="admin_interface",
                url=product_url,
                
                # Enhanced fields
                validation_basis_price=old_price,
                dom_elements_analyzed=dom_metadata.get("dom_elements_analyzed"),
                price_location_in_dom=dom_metadata.get("price_location_in_dom"),
                structured_data_type=dom_metadata.get("structured_data_type"),
                company=company,
                category=machine_category,
                raw_price_text=str(new_price)
            )
            
            if not history_added:
                logger.warning(f"Failed to add price history record for {machine_id}")
            
            # Calculate price change values
            price_change = None
            percentage_change = None
            
            if old_price is not None and new_price is not None:
                try:
                    old_price_float = float(old_price)
                    price_change = float(new_price) - old_price_float
                    if old_price_float > 0:
                        percentage_change = (price_change / old_price_float) * 100
                except (ValueError, TypeError):
                    logger.warning(f"Could not calculate price change: invalid price value")
            
            return {
                "success": True,
                "machine_id": machine_id,
                "old_price": old_price,
                "new_price": float(new_price) if new_price is not None else None,
                "price_change": float(price_change) if price_change is not None else None,
                "percentage_change": float(percentage_change) if percentage_change is not None else None,
                "method": "MANUAL_CONFIRMATION"
            }
        except Exception as e:
            logger.exception(f"Error saving machine price: {str(e)}")
            return {
                "success": False,
                "error": f"Error saving price: {str(e)}",
                "machine_id": machine_id
            }
    
    async def update_machine_price(self, machine_id, url=None, flags_for_review=True, save_to_db=True):
        """
        Update a machine's price by extracting it from the product page.
        
        Args:
            machine_id (str): The ID of the machine to update.
            url (str, optional): Override the stored product URL.
            flags_for_review (bool): Whether to flag significant price changes for review.
            save_to_db (bool): Whether to save the results to the database.
            
        Returns:
            dict: Update result with status.
        """
        logger.info(f"Updating price for machine {machine_id}")
        
        start_time = datetime.now(timezone.utc)
        debug_info = {"start_time": start_time.isoformat()}
        
        # Get machine data
        machine = await self.db_service.get_machine_by_id(machine_id)
        if not machine:
            error_msg = f"Machine {machine_id} not found in database"
            logger.error(error_msg)
            return {"success": False, "error": error_msg, "machine_id": machine_id}
        
        # Get product URL from machine data if not provided
        product_url = url if url is not None else machine.get("product_link")
        if not product_url:
            error_msg = f"No product URL available for machine {machine_id}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg, "machine_id": machine_id, "url": None}
        
        logger.info(f"Extracting price from {product_url} for machine {machine.get('Machine Name', machine_id)}")
        
        # Get current price for reference
        current_price = machine.get("Price")
        debug_info["old_price"] = current_price
        
        # Get machine category if available
        machine_category = machine.get("Machine Category", "laser_cutter")
        machine_name = machine.get("Machine Name", "Unknown")
        company = machine.get("Company", "Unknown")
        
        # Extract price from URL
        extraction_result = await self.extraction_service.extract_price(
            url=product_url, 
            machine_id=machine_id,
            variant_attribute="DEFAULT",
            previous_price=current_price,
            machine_name=machine_name,
            product_category=machine_category,
            flags_for_review=flags_for_review,
            sanity_check_threshold=self.sanity_check_threshold
        )
        
        # Add extraction details to debug info
        debug_info.update({
            "method": extraction_result.get("method"),
            "extracted_confidence": extraction_result.get("extracted_confidence"),
            "validation_confidence": extraction_result.get("validation_confidence"),
            "http_status": extraction_result.get("http_status"),
            "html_size": extraction_result.get("html_size")
        })
        
        # If extraction failed, return error
        if not extraction_result.get("success", False):
            error_msg = extraction_result.get("error", "Unknown error during price extraction")
            logger.error(f"Price extraction failed for {machine_id}: {error_msg}")
            
            # Save failed extraction to database if requested
            if save_to_db:
                # Enhanced: Extract as much information as possible from the extraction_result for logging
                await self.db_service.add_price_history(
                    machine_id=machine_id,
                    variant_attribute="DEFAULT",
                    new_price=None,
                    old_price=current_price,
                    tier=extraction_result.get("tier", "UNKNOWN"),
                    success=False,
                    error_message=error_msg,
                    source="price_extractor",
                    extraction_method=extraction_result.get("method"),
                    extracted_confidence=extraction_result.get("extracted_confidence"),
                    validation_confidence=extraction_result.get("validation_confidence"),
                    url=product_url,
                    html_size=extraction_result.get("html_size"),
                    http_status=extraction_result.get("http_status"),
                    dom_elements_analyzed=extraction_result.get("dom_elements_analyzed"),
                    price_location_in_dom=extraction_result.get("price_location_in_dom"),
                    extraction_duration_seconds=extraction_result.get("extraction_duration_seconds"),
                    structured_data_type=extraction_result.get("structured_data_type"),
                    raw_price_text=extraction_result.get("raw_price_text"),
                    cleaned_price_string=extraction_result.get("cleaned_price_string"),
                    selectors_tried=extraction_result.get("selectors_tried"),
                    validation_basis_price=current_price
                )
            
            return {
                "success": False, 
                "error": error_msg, 
                "machine_id": machine_id, 
                "url": product_url,
                "debug": debug_info
            }
        
        # Extract the new price
        new_price = extraction_result.get("price")
        method = extraction_result.get("method", "UNKNOWN")
        
        # Add additional debug info
        debug_info.update({
            "new_price": float(new_price) if new_price is not None else None,
            "tier": method.split(":")[0] if ":" in method else method,
            "html_content_size": extraction_result.get("html_size")
        })
        
        # Check if price is unchanged
        price_unchanged = False
        if current_price is not None and new_price is not None:
            try:
                current_price_float = float(current_price)
                price_unchanged = abs(float(new_price) - current_price_float) < 0.01
                debug_info["price_unchanged"] = price_unchanged
            except (ValueError, TypeError):
                pass
        
        # Determine if price change needs review
        needs_review = extraction_result.get("needs_review", False)
        review_reason = extraction_result.get("review_reason")
        
        # If flags_for_review is enabled and we have the data to check,
        # perform our own additional validation
        if flags_for_review and current_price is not None and new_price is not None:
            try:
                current_price_float = float(current_price)
                if current_price_float > 0:
                    price_change = float(new_price) - current_price_float
                    percentage_change = (price_change / current_price_float) * 100
                    
                    # Log the price change details
                    logger.info(f"Price change: {price_change} ({percentage_change:.2f}%)")
                    
                    # Check if price change exceeds threshold
                    if abs(percentage_change) > self.sanity_check_threshold:
                        needs_review = True
                        review_reason = review_reason or f"Price change of {abs(percentage_change):.2f}% exceeds threshold of {self.sanity_check_threshold}%"
                        logger.warning(f"Flagging price for review: {review_reason}")
            except (ValueError, TypeError, InvalidOperation) as e:
                logger.warning(f"Error calculating price change: {str(e)}")
        
        # Calculate end time and duration
        end_time = datetime.now(timezone.utc)
        duration = (end_time - start_time).total_seconds()
        
        # Here we apply additional DOM analysis if HTML content is available,
        # to enhance the metadata for the price_history record
        html_content = extraction_result.get("html_content")
        dom_metadata = {}
        if html_content:
            # Analyze the HTML content with our new DOM analyzer
            dom_metadata = self.dom_analyzer.analyze_html(html_content)
            
            # Use the extraction method to enhance metadata
            dom_metadata = self.dom_analyzer.analyze_extraction_method(method, dom_metadata)
        
        # Prepare validation steps for record
        validation_steps = []
        if "validation_result" in extraction_result:
            validation_steps = [{
                "step": "main_validation",
                "result": extraction_result["validation_result"],
                "confidence": extraction_result.get("validation_confidence")
            }]
        
        # Update the database if requested
        update_success = True
        if save_to_db:
            # Always save to price_history with enhanced metadata
            hist_id = await self.db_service.add_price_history(
                machine_id=machine_id,
                variant_attribute="DEFAULT",
                new_price=new_price,
                old_price=current_price,
                validation_basis_price=current_price,  # Explicitly set validation basis
                tier=method.split(":")[0] if ":" in method else method,
                extracted_confidence=extraction_result.get("extracted_confidence"),
                validation_confidence=extraction_result.get("validation_confidence"),
                success=True,
                error_message=None,
                source="price_extractor",
                extraction_method=method,
                url=product_url,
                html_size=extraction_result.get("html_size"),
                http_status=extraction_result.get("http_status"),
                needs_review=needs_review,
                review_reason=review_reason,
                raw_price_text=extraction_result.get("raw_price_text"),
                extraction_duration_seconds=extraction_result.get("extraction_duration_seconds"),
                extraction_attempts=extraction_result.get("extraction_attempts"),
                
                # Enhanced fields from DOM analyzer
                dom_elements_analyzed=dom_metadata.get("dom_elements_analyzed") or extraction_result.get("dom_elements_analyzed"),
                price_location_in_dom=dom_metadata.get("price_location_in_dom") or extraction_result.get("price_location_in_dom"),
                structured_data_type=dom_metadata.get("structured_data_type") or extraction_result.get("structured_data_type"),
                selectors_tried=dom_metadata.get("selectors_tried") or extraction_result.get("selectors_tried"),
                cleaned_price_string=extraction_result.get("cleaned_price_string"),
                parsed_currency_from_text=extraction_result.get("parsed_currency"),
                validation_steps=validation_steps,
                company=company,
                category=machine_category
            )
            
            # Only update the machine_price if not flagged for review
            if not needs_review and not price_unchanged:
                machine_update = await self.db_service.update_machine_price(
                    machine_id=machine_id,
                    new_price=new_price,
                    variant_attribute="DEFAULT",
                    html_content=None,  # Don't duplicate the content
                    tier=method.split(":")[0] if ":" in method else method,
                    confidence=extraction_result.get("validation_confidence")
                )
                
                if not machine_update:
                    logger.warning(f"Failed to update machine price for {machine_id}")
            elif price_unchanged:
                logger.info(f"Price unchanged for machine {machine_id}, skipping update")
            else:
                logger.info(f"Price flagged for review for machine {machine_id}, not updating main price")
        
        # Prepare the return result
        price_change = None
        percentage_change = None
        
        if current_price is not None and new_price is not None:
            try:
                current_price_float = float(current_price)
                price_change = float(new_price) - current_price_float
                if current_price_float > 0:
                    percentage_change = (price_change / current_price_float) * 100
            except (ValueError, TypeError):
                logger.warning(f"Could not calculate price change: invalid price value")
        
        result = {
            "success": True,
            "machine_id": machine_id,
            "old_price": current_price,
            "new_price": float(new_price) if new_price is not None else None,
            "price_change": float(price_change) if price_change is not None else None,
            "percentage_change": float(percentage_change) if percentage_change is not None else None,
            "method": method,
            "needs_review": needs_review,
            "review_reason": review_reason,
            "price_unchanged": price_unchanged,
            "extracted_confidence": extraction_result.get("extracted_confidence"),
            "validation_confidence": extraction_result.get("validation_confidence"),
            "debug": debug_info
        }
        
        return result
    
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