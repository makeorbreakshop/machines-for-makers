import os
from loguru import logger
from supabase import create_client, Client
from dotenv import load_dotenv
from datetime import datetime, timezone, timedelta
import uuid
from typing import Dict, List, Optional, Any, Union
from decimal import Decimal
import json

# Load environment variables
load_dotenv()

# Import config for table names and other constants
from config import (
    MACHINES_TABLE, 
    PRICE_HISTORY_TABLE, 
    MACHINES_LATEST_TABLE,
    VARIANT_CONFIG_TABLE,
    LLM_USAGE_TABLE,
    TIER_STATIC
)

class DatabaseService:
    """Service for interacting with the Supabase database."""
    
    def __init__(self):
        """Initialize the database service with Supabase credentials."""
        try:
            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_KEY")
            
            if not supabase_url or not supabase_key:
                raise ValueError("Missing Supabase credentials in environment variables")
                
            self.supabase: Client = create_client(supabase_url, supabase_key)
            logger.info("Database service initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize database service: {str(e)}")
            raise
    
    async def get_machine_by_id(self, machine_id: str) -> Optional[Dict[str, Any]]:
        """
        Get machine data from the database.
        
        Args:
            machine_id (str): ID of the machine in the database.
            
        Returns:
            dict: Machine data or None if not found.
        """
        try:
            # Query the machines table for the specific machine
            response = self.supabase.table(MACHINES_TABLE).select("*").eq("id", machine_id).execute()
            
            # Check if we got any data back
            if response.data and len(response.data) > 0:
                machine_data = response.data[0]
                logger.info(f"Retrieved machine data for {machine_id}")
                return machine_data
            else:
                # Try with lowercase ID as fallback (older machines in DB)
                lowercase_response = self.supabase.table(MACHINES_TABLE).select("*").eq("id", machine_id.lower()).execute()
                if lowercase_response.data and len(lowercase_response.data) > 0:
                    machine_data = lowercase_response.data[0]
                    logger.info(f"Retrieved machine data for {machine_id} (lowercase match)")
                    return machine_data
                
                logger.warning(f"No machine found with ID {machine_id}")
                return None
        except Exception as e:
            logger.error(f"Error fetching machine data for {machine_id}: {str(e)}")
            return None
    
    async def get_machine_with_variants(self, machine_id: str) -> Optional[Dict[str, Any]]:
        """
        Get machine data with all its variant configurations.
        
        Args:
            machine_id (str): ID of the machine in the database.
            
        Returns:
            dict: Machine data with variant info, or None if not found.
        """
        try:
            # Get basic machine data
            machine_data = await self.get_machine_by_id(machine_id)
            if not machine_data:
                return None
            
            # Get variant configurations
            variants_response = self.supabase.table(MACHINES_LATEST_TABLE) \
                .select("*") \
                .eq("machine_id", machine_id) \
                .execute()
            
            # Add variants to machine data
            machine_data["variants"] = variants_response.data if variants_response.data else []
            
            return machine_data
        except Exception as e:
            logger.error(f"Error fetching machine with variants for {machine_id}: {str(e)}")
            return None
    
    async def get_variant_config(self, machine_id: str, variant_attribute: str = "DEFAULT", domain: str = None) -> Optional[Dict[str, Any]]:
        """
        Get the extraction configuration for a specific machine variant and domain.
        
        Args:
            machine_id (str): ID of the machine
            variant_attribute (str): Variant attribute identifier
            domain (str, optional): Domain to filter by
            
        Returns:
            dict: Configuration for the variant, or None if not found
        """
        try:
            query = self.supabase.table(VARIANT_CONFIG_TABLE) \
                .select("*") \
                .eq("machine_id", machine_id) \
                .eq("variant_attribute", variant_attribute)
            
            if domain:
                query = query.eq("domain", domain)
                
            response = query.execute()
            
            if response.data and len(response.data) > 0:
                return response.data[0]
            
            # If no specific variant config, try to get the DEFAULT variant config
            if variant_attribute != "DEFAULT":
                default_response = self.supabase.table(VARIANT_CONFIG_TABLE) \
                    .select("*") \
                    .eq("machine_id", machine_id) \
                    .eq("variant_attribute", "DEFAULT") \
                    .execute()
                
                if default_response.data and len(default_response.data) > 0:
                    return default_response.data[0]
            
            return None
        except Exception as e:
            logger.error(f"Error fetching variant config for {machine_id}/{variant_attribute}: {str(e)}")
            return None
    
    async def update_machine_price(self, machine_id: str, new_price: Decimal, variant_attribute: str = "DEFAULT", 
                             html_content: str = None, tier: str = TIER_STATIC, confidence: float = None,
                             currency: str = "USD") -> bool:
        """
        Update the machine price in both the machines table and machines_latest.
        
        Args:
            machine_id (str): The ID of the machine to update
            new_price (Decimal): The new price value
            variant_attribute (str): The variant attribute identifier
            html_content (str, optional): HTML content from the product page
            tier (str): The extraction tier used to get this price
            confidence (float, optional): Confidence score
            currency (str): Currency of the price
            
        Returns:
            bool: True if update was successful, False otherwise
        """
        try:
            # Current time for update timestamp
            now = datetime.now(timezone.utc)
            
            # Update in machines table (for backward compatibility)
            update_response = self.supabase.table(MACHINES_TABLE) \
                .update({"Price": float(new_price), "html_timestamp": now.isoformat()}) \
                .eq("id", machine_id) \
                .execute()
            
            # Store HTML content if provided
            if html_content:
                self.supabase.table(MACHINES_TABLE) \
                    .update({
                        "html_content": html_content, 
                        "html_size": len(html_content), 
                        "html_timestamp": now.isoformat()
                    }) \
                    .eq("id", machine_id) \
                    .execute()
            
            # Update in machines_latest table
            latest_data = {
                "machine_id": machine_id,
                "variant_attribute": variant_attribute,
                "machines_latest_price": float(new_price),
                "currency": currency,
                "last_checked": now.isoformat(),
                "tier": tier
            }
            
            if confidence is not None:
                latest_data["confidence"] = confidence
            
            latest_response = self.supabase.table(MACHINES_LATEST_TABLE) \
                .upsert(latest_data) \
                .execute()
            
            if update_response.data or latest_response.data:
                logger.info(f"Updated price for {machine_id}/{variant_attribute} to {new_price} using {tier}")
                # Add explicit logging for machines_latest table update
                if latest_response.data:
                    logger.info(f"Updated machines_latest table for {machine_id}/{variant_attribute} to {new_price} (tier: {tier}, currency: {currency}, confidence: {confidence})")
                return True
            else:
                logger.warning(f"No updates made for {machine_id}/{variant_attribute}")
                return False
                
        except Exception as e:
            logger.error(f"Error updating price for {machine_id}/{variant_attribute}: {str(e)}")
            return False
    
    async def add_price_history(self, machine_id: str, new_price: Decimal, old_price: Optional[Decimal] = None,
                          variant_attribute: str = "DEFAULT", tier: str = TIER_STATIC, 
                          extracted_confidence: Optional[float] = None, validation_confidence: Optional[float] = None,
                          success: bool = True, error_message: Optional[str] = None,
                          source: str = "price_extractor", currency: str = "USD", 
                          url: Optional[str] = None, batch_id: Optional[str] = None) -> bool:
        """
        Add a price history record.
        
        Args:
            machine_id: ID of the machine
            new_price: New price value
            old_price: Previous price value (optional)
            variant_attribute: Variant attribute (default "DEFAULT")
            tier: Extraction tier used
            extracted_confidence: Confidence score for extraction
            validation_confidence: Confidence score for validation
            success: Whether the extraction was successful
            error_message: Error message if extraction failed
            source: Source of the price update
            currency: Currency of the price
            url: URL where the price was scraped from
            batch_id: ID of the batch that created this history entry (optional)
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Calculate price change if old_price is available
            price_change = None
            percentage_change = None
            is_all_time_low = False
            is_all_time_high = False
            
            # Convert old_price from float to Decimal if needed
            if old_price is not None and not isinstance(old_price, Decimal):
                old_price = Decimal(str(old_price))
            
            if old_price is not None and new_price is not None:
                price_change = new_price - old_price
                if old_price > 0:
                    percentage_change = (price_change / old_price) * 100
            
            # Check for all-time low/high (could be optimized with a separate query)
            if new_price is not None:
                # Get previous price history
                history_response = self.supabase.table(PRICE_HISTORY_TABLE) \
                    .select("price") \
                    .eq("machine_id", machine_id) \
                    .order("date", desc=False) \
                    .execute()
                
                if history_response.data:
                    prices = [entry.get("price") for entry in history_response.data if entry.get("price") is not None]
                    if prices:
                        is_all_time_low = float(new_price) <= min(prices)
                        is_all_time_high = float(new_price) >= max(prices)
            
            # If url is not provided but we're saving a price change, try to fetch it from the machines table
            if url is None and machine_id is not None:
                try:
                    machine_data = await self.get_machine_by_id(machine_id)
                    if machine_data and "product_link" in machine_data:
                        url = machine_data.get("product_link")
                        logger.info(f"Retrieved URL {url} from machine data for {machine_id}")
                except Exception as e:
                    logger.warning(f"Failed to retrieve URL for machine {machine_id}: {str(e)}")
            
            # Create history entry
            history_data = {
                "id": str(uuid.uuid4()),
                "machine_id": machine_id,
                "variant_attribute": variant_attribute,
                "price": float(new_price) if new_price is not None else None,
                "previous_price": float(old_price) if old_price is not None else None,
                "date": datetime.now(timezone.utc).isoformat(),
                "source": source,
                "currency": currency,
                "scraped_from_url": url,
                "is_all_time_low": is_all_time_low,
                "is_all_time_high": is_all_time_high,
                "price_change": float(price_change) if price_change is not None else None,
                "percentage_change": float(percentage_change) if percentage_change is not None else None,
                "extraction_method": tier if success else None,
                "tier": tier,
                "extracted_confidence": extracted_confidence,
                "validation_confidence": validation_confidence,
                "failure_reason": error_message if not success else None
            }
            
            # Add batch_id if provided
            if batch_id:
                history_data["batch_id"] = batch_id
            
            history_response = self.supabase.table(PRICE_HISTORY_TABLE) \
                .insert(history_data) \
                .execute()
            
            if history_response.data:
                logger.info(f"Added price history entry for {machine_id}/{variant_attribute}")
                
                # No need to call _update_all_time_flags since we've already set the flags
                # based on our query above
                
                return True
            else:
                logger.warning(f"No price history entry created for {machine_id}/{variant_attribute}")
                return False
                
        except Exception as e:
            logger.error(f"Error adding price history for {machine_id}: {str(e)}")
            return False
    
    async def log_llm_usage(self, machine_id: str, model: str, tier: str, prompt_tokens: int,
                      completion_tokens: int, estimated_cost: float, success: bool,
                      variant_attribute: str = "DEFAULT") -> bool:
        """
        Log LLM usage for price extraction.
        
        Args:
            machine_id (str): The ID of the machine
            model (str): The LLM model used
            tier (str): The extraction tier
            prompt_tokens (int): Number of prompt tokens
            completion_tokens (int): Number of completion tokens
            estimated_cost (float): Estimated cost of the API call
            success (bool): Whether the extraction was successful
            variant_attribute (str): Variant attribute identifier
            
        Returns:
            bool: True if log entry was added, False otherwise
        """
        try:
            usage_data = {
                "machine_id": machine_id,
                "variant_attribute": variant_attribute,
                "model": model,
                "tier": tier,
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "estimated_cost": estimated_cost,
                "success": success,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            usage_response = self.supabase.table(LLM_USAGE_TABLE) \
                .insert(usage_data) \
                .execute()
            
            if usage_response.data:
                logger.info(f"Logged LLM usage for {machine_id}/{variant_attribute} using {model}")
                return True
            else:
                logger.warning(f"Failed to log LLM usage for {machine_id}/{variant_attribute}")
                return False
                
        except Exception as e:
            logger.error(f"Error logging LLM usage for {machine_id}/{variant_attribute}: {str(e)}")
            return False
    
    async def set_manual_review_flag(self, machine_id: str, variant_attribute: str = "DEFAULT", 
                              flag_value: bool = True, flag_reason: str = None) -> bool:
        """
        Set the manual review flag for a machine variant.
        
        Args:
            machine_id (str): The ID of the machine
            variant_attribute (str): Variant attribute identifier
            flag_value (bool): Value to set the flag to
            flag_reason (str): Reason for flagging the machine for review
            
        Returns:
            bool: True if flag was set, False otherwise
        """
        try:
            update_data = {"manual_review_flag": flag_value}
            
            # Add flag reason if provided and flag is being set
            if flag_value and flag_reason:
                update_data["flag_reason"] = flag_reason
            
            # Clear flag reason if flag is being removed
            if not flag_value:
                update_data["flag_reason"] = None
            
            response = self.supabase.table(MACHINES_LATEST_TABLE) \
                .update(update_data) \
                .eq("machine_id", machine_id) \
                .eq("variant_attribute", variant_attribute) \
                .execute()
            
            if response.data:
                logger.info(f"Set manual review flag to {flag_value} for {machine_id}/{variant_attribute}")
                return True
            else:
                logger.warning(f"No entry found to set manual review flag for {machine_id}/{variant_attribute}")
                return False
                
        except Exception as e:
            logger.error(f"Error setting manual review flag for {machine_id}/{variant_attribute}: {str(e)}")
            return False
    
    async def save_api_endpoint(self, machine_id: str, variant_attribute: str, domain: str, 
                         api_endpoint_template: str) -> bool:
        """
        Save a discovered API endpoint for a machine variant.
        
        Args:
            machine_id (str): The ID of the machine
            variant_attribute (str): Variant attribute identifier
            domain (str): Domain of the e-commerce site
            api_endpoint_template (str): Template for the API endpoint
            
        Returns:
            bool: True if endpoint was saved, False otherwise
        """
        try:
            now = datetime.now(timezone.utc)
            
            # Check if config exists
            config_response = self.supabase.table(VARIANT_CONFIG_TABLE) \
                .select("*") \
                .eq("machine_id", machine_id) \
                .eq("variant_attribute", variant_attribute) \
                .eq("domain", domain) \
                .execute()
            
            if config_response.data and len(config_response.data) > 0:
                # Update existing config
                response = self.supabase.table(VARIANT_CONFIG_TABLE) \
                    .update({
                        "api_endpoint_template": api_endpoint_template,
                        "api_endpoint_discovered_at": now.isoformat()
                    }) \
                    .eq("machine_id", machine_id) \
                    .eq("variant_attribute", variant_attribute) \
                    .eq("domain", domain) \
                    .execute()
            else:
                # Insert new config
                response = self.supabase.table(VARIANT_CONFIG_TABLE) \
                    .insert({
                        "machine_id": machine_id,
                        "variant_attribute": variant_attribute,
                        "domain": domain,
                        "api_endpoint_template": api_endpoint_template,
                        "api_endpoint_discovered_at": now.isoformat()
                    }) \
                    .execute()
            
            if response.data:
                logger.info(f"Saved API endpoint for {machine_id}/{variant_attribute} on {domain}")
                return True
            else:
                logger.warning(f"Failed to save API endpoint for {machine_id}/{variant_attribute} on {domain}")
                return False
                
        except Exception as e:
            logger.error(f"Error saving API endpoint for {machine_id}/{variant_attribute} on {domain}: {str(e)}")
            return False
    
    async def get_machines_for_update(self, days_threshold: int = 7, limit: int = None, 
                               with_js_interaction: bool = False) -> List[Dict[str, Any]]:
        """
        Get machines that need price updates based on last check date.
        
        Args:
            days_threshold (int): Number of days since last check
            limit (int, optional): Limit number of results
            with_js_interaction (bool): Whether to include machines requiring JS interaction
            
        Returns:
            list: List of machines that need updates
        """
        try:
            # Start by querying machines that have product links
            query = self.supabase.table(MACHINES_TABLE) \
                .select("id, \"Machine Name\", product_link") \
                .not_.is_("product_link", "null") \
                .not_.eq("product_link", "")
            
            # Apply limit if provided
            if limit:
                query = query.limit(limit)
                
            response = query.execute()
            
            if not response.data:
                return []
            
            # Get the latest updates for these machines
            machine_ids = [machine.get("id") for machine in response.data]
            
            # Query machines_latest table to filter by days threshold
            # Use direct query approach instead of stored procedure
            if days_threshold > 0:
                latest_query = self.supabase.table(MACHINES_LATEST_TABLE) \
                    .select("machine_id, variant_attribute, last_checked") \
                    .in_("machine_id", machine_ids) \
                    .lt("last_checked", (datetime.now(timezone.utc) - timedelta(days=days_threshold)).isoformat())
            else:
                # If days_threshold is 0, don't filter by date
                latest_query = self.supabase.table(MACHINES_LATEST_TABLE) \
                    .select("machine_id, variant_attribute, last_checked") \
                    .in_("machine_id", machine_ids)
            
            if with_js_interaction:
                # Get the domains that require JS interaction
                domains_query = self.supabase.table(VARIANT_CONFIG_TABLE) \
                    .select("machine_id, variant_attribute, domain") \
                    .eq("requires_js_interaction", True) \
                    .execute()
                
                js_machines = set()
                if domains_query.data:
                    for entry in domains_query.data:
                        js_machines.add(entry.get("machine_id"))
                
                # Filter machines by those requiring JS interaction
                if js_machines:
                    machine_ids = [m_id for m_id in machine_ids if m_id in js_machines]
                else:
                    return []  # No machines require JS interaction
            
            latest_response = latest_query.execute()
            
            # Combine the data
            if latest_response.data:
                update_needed_ids = set(item.get("machine_id") for item in latest_response.data)
                machines_to_update = [
                    machine for machine in response.data 
                    if machine.get("id") in update_needed_ids
                ]
                return machines_to_update
            else:
                # If no matches in machines_latest, these machines need initial update
                return response.data
                
        except Exception as e:
            logger.error(f"Error getting machines for update: {str(e)}")
            return []
    
    async def save_price_extraction_results(
        self, 
        machine_id: str, 
        variant_attribute: str,
        price: Decimal, 
        extraction_method: str, 
        extraction_confidence: float,
        validation_confidence: float = 0.0,
        currency: str = "USD",
        manual_review_flag: bool = False,
        llm_usage_data: List[Dict[str, Any]] = None,
        batch_id: Optional[str] = None,
        url: Optional[str] = None
    ) -> bool:
        """
        Save price extraction results to both price_history and machines_latest tables.
        
        Args:
            machine_id: ID of the machine
            variant_attribute: Variant attribute identifier
            price: Extracted price
            extraction_method: Method used for extraction (tier)
            extraction_confidence: Confidence score from extraction
            validation_confidence: Confidence score from validation
            currency: Currency of the price
            manual_review_flag: Whether the price needs manual review
            llm_usage_data: List of LLM usage data for tracking
            batch_id: ID of the batch that created this entry (optional)
            url: URL where the price was scraped from
            
        Returns:
            True if save was successful, False otherwise
        """
        try:
            # Update the machines_latest table directly
            now = datetime.now(timezone.utc)
            
            # Update machines_latest table
            latest_data = {
                "machine_id": machine_id,
                "variant_attribute": variant_attribute,
                "machines_latest_price": float(price),
                "currency": currency,
                "last_checked": now.isoformat(),
                "tier": extraction_method,
                "confidence": extraction_confidence,
                "manual_review_flag": manual_review_flag
            }
            
            latest_response = self.supabase.table(MACHINES_LATEST_TABLE) \
                .upsert(latest_data) \
                .execute()
            
            # Add to price history
            previous_price = await self.get_previous_price(machine_id, variant_attribute)
            
            await self.add_price_history(
                machine_id=machine_id,
                variant_attribute=variant_attribute,
                new_price=price,
                old_price=previous_price,
                tier=extraction_method,
                extracted_confidence=extraction_confidence,
                validation_confidence=validation_confidence,
                success=True,
                error_message=None,
                source="price_extractor_v2",
                currency=currency,
                batch_id=batch_id,
                url=url
            )
            
            # Log LLM usage if provided
            if llm_usage_data:
                for usage in llm_usage_data:
                    await self.log_llm_usage(
                        machine_id=machine_id,
                        variant_attribute=variant_attribute,
                        model=usage.get("model", ""),
                        tier=usage.get("tier", ""),
                        prompt_tokens=usage.get("prompt_tokens", 0),
                        completion_tokens=usage.get("completion_tokens", 0),
                        estimated_cost=usage.get("estimated_cost", 0.0),
                        success=usage.get("success", False)
                    )
            
            logger.info(f"Successfully saved price {price} for {machine_id}/{variant_attribute} using {extraction_method}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving price extraction results: {str(e)}")
            return False
    
    async def get_batch_results(self, batch_id: str) -> Optional[Dict[str, Any]]:
        """
        Get batch results data from the database.
        
        Args:
            batch_id (str): ID of the batch
            
        Returns:
            Dict containing batch results or None if not found
        """
        try:
            # Get price history entries related to this batch
            response = self.supabase.table(PRICE_HISTORY_TABLE) \
                .select("*") \
                .eq("batch_id", batch_id) \
                .execute()
                
            if not response.data:
                logger.info(f"No batch results found for batch_id: {batch_id}")
                return None
            
            # Check if we need to look in old 'batches' table instead of price_extraction_batches
            batch_response = self.supabase.table("batches") \
                .select("*") \
                .eq("id", batch_id) \
                .execute()
            
            if batch_response.data and len(batch_response.data) > 0:
                logger.info(f"Found batch record in 'batches' table for {batch_id}")
                batch_info = batch_response.data[0]
                
                # If the batch exists, enhance the results with the batch info
                return {
                    "batch_info": batch_info,
                    "price_histories": response.data,
                    "count": len(response.data)
                }
            
            return response.data
        except Exception as e:
            logger.error(f"Error fetching batch results for {batch_id}: {str(e)}")
            return None
    
    async def get_batch_stats(self, batch_id: str) -> Optional[Dict[str, Any]]:
        """
        Get statistics for a batch job.
        
        Args:
            batch_id (str): ID of the batch
            
        Returns:
            Dict containing batch statistics or None if not found
        """
        try:
            # Use the batches table since price_extraction_batches doesn't exist
            batch_response = self.supabase.table("batches") \
                .select("*") \
                .eq("id", batch_id) \
                .execute()
                
            if not batch_response.data or len(batch_response.data) == 0:
                logger.warning(f"No batch record found for batch_id: {batch_id}")
                return None
                
            batch_data = batch_response.data[0]
            
            # First check if we have data in batch_results table
            results_response = self.supabase.table("batch_results") \
                .select("*") \
                .eq("batch_id", batch_id) \
                .execute()
            
            # If we have batch_results, use that data
            if results_response.data and len(results_response.data) > 0:
                logger.info(f"Found {len(results_response.data)} entries in batch_results table for {batch_id}")
                entries = results_response.data
                
                # Calculate statistics
                total_entries = len(entries)
                successful = sum(1 for entry in entries if entry.get("success") is True)
                failed = total_entries - successful
                
                # Calculate price changes
                price_increases = 0
                price_decreases = 0
                unchanged = 0
                
                for entry in entries:
                    old_price = entry.get("old_price")
                    new_price = entry.get("new_price")
                    
                    if old_price is None or new_price is None:
                        continue
                    
                    if new_price > old_price:
                        price_increases += 1
                    elif new_price < old_price:
                        price_decreases += 1
                    else:
                        unchanged += 1
                
                # Calculate method usage
                methods = {}
                for entry in entries:
                    method = entry.get("extraction_method")
                    if method:
                        if method not in methods:
                            methods[method] = 0
                        methods[method] += 1
                
                # Format method usage as list
                method_stats = [{"method": method, "count": count} for method, count in methods.items()]
                
            # Otherwise, check price_history table
            else:
                logger.info(f"No batch_results found, checking price_history for batch_id: {batch_id}")
                
                # Get price history entries for this batch
                history_response = self.supabase.table(PRICE_HISTORY_TABLE) \
                    .select("machine_id, price, previous_price, price_change, percentage_change, extraction_method, failure_reason") \
                    .eq("batch_id", batch_id) \
                    .execute()
                
                entries = history_response.data if history_response.data else []
                logger.info(f"Found {len(entries)} entries in price_history for batch_id: {batch_id}")
                
                # Calculate statistics
                total_entries = len(entries)
                successful = sum(1 for entry in entries if entry.get("failure_reason") is None)
                failed = total_entries - successful
                
                # Calculate price changes
                price_increases = 0
                price_decreases = 0
                unchanged = 0
                
                for entry in entries:
                    if entry.get("price_change") is None:
                        continue
                        
                    if entry.get("price_change") > 0:
                        price_increases += 1
                    elif entry.get("price_change") < 0:
                        price_decreases += 1
                    else:
                        unchanged += 1
                
                # Calculate method usage
                methods = {}
                for entry in entries:
                    method = entry.get("extraction_method")
                    if method:
                        if method not in methods:
                            methods[method] = 0
                        methods[method] += 1
                
                # Format method usage as list
                method_stats = [{"method": method, "count": count} for method, count in methods.items()]
            
            # Return statistics
            stats = {
                "batch_id": batch_id,
                "total_machines": batch_data.get("total_machines", 0),
                "processed": total_entries,
                "successful": successful,
                "failed": failed,
                "price_increases": price_increases,
                "price_decreases": price_decreases,
                "unchanged": unchanged,
                "methods": method_stats,
                "start_time": batch_data.get("start_time"),
                "end_time": batch_data.get("end_time"),
                "status": batch_data.get("status")
            }
            
            return stats
        except Exception as e:
            logger.error(f"Error getting batch stats for {batch_id}: {str(e)}")
            return None

    async def get_machine_latest_price(self, machine_id: str, variant_attribute: str = "DEFAULT") -> Optional[Dict[str, Any]]:
        """
        Get the latest price record for a machine and variant.
        
        Args:
            machine_id (str): Machine ID
            variant_attribute (str): Variant attribute
            
        Returns:
            Latest price record or None if not found
        """
        try:
            response = self.supabase.table(MACHINES_LATEST_TABLE) \
                .select("*") \
                .eq("machine_id", machine_id) \
                .eq("variant_attribute", variant_attribute) \
                .execute()
                
            if response.data and len(response.data) > 0:
                return response.data[0]
            
            # If no entry in machines_latest, fall back to machines table
            logger.info(f"No entry in machines_latest for {machine_id}/{variant_attribute}, falling back to machines table")
            machines_response = self.supabase.table(MACHINES_TABLE) \
                .select("id, \"Price\"") \
                .eq("id", machine_id) \
                .execute()
                
            if machines_response.data and len(machines_response.data) > 0 and machines_response.data[0].get("Price"):
                # Convert machines table data to machines_latest format
                machine_price = machines_response.data[0].get("Price")
                now = datetime.now(timezone.utc)
                
                return {
                    "machine_id": machine_id,
                    "variant_attribute": variant_attribute,
                    "machines_latest_price": machine_price,
                    "currency": "USD",  # Default assumption
                    "last_checked": now.isoformat(),
                    "tier": "FALLBACK_FROM_MACHINES",
                    "confidence": 0.95  # Default confidence
                }
                
            return None
        except Exception as e:
            logger.error(f"Error fetching latest price for {machine_id}/{variant_attribute}: {str(e)}")
            return None
    
    async def get_previous_price(self, machine_id: str, variant_attribute: str = "DEFAULT") -> Optional[float]:
        """
        Get the previous price for a machine and variant from price history.
        
        Args:
            machine_id (str): Machine ID
            variant_attribute (str): Variant attribute
            
        Returns:
            Previous price or None if not found
        """
        try:
            # Query price history for the machine and variant, ordered by date
            response = self.supabase.table(PRICE_HISTORY_TABLE) \
                .select("price") \
                .eq("machine_id", machine_id) \
                .eq("variant_attribute", variant_attribute) \
                .order("date", desc=True) \
                .limit(2) \
                .execute()
                
            # If we have at least 2 records, return the second one (previous price)
            if response.data and len(response.data) >= 2:
                return response.data[1].get("price")
                
            # If we only have 1 record, return that price
            if response.data and len(response.data) == 1:
                return response.data[0].get("price")
                
            return None
        except Exception as e:
            logger.error(f"Error fetching previous price for {machine_id}/{variant_attribute}: {str(e)}")
            return None
    
    async def create_batch(self, count: int, days_threshold: int = 7, machine_ids: list = None, limit: Optional[int] = None, max_workers: Optional[int] = None) -> str:
        """
        Create a new batch record for tracking batch updates.
        
        Args:
            count (int): Number of machines in this batch
            days_threshold (int): Days threshold used for this batch
            machine_ids (list, optional): List of specific machine IDs in this batch
            limit (Optional[int], optional): Limit used for this batch
            max_workers (Optional[int], optional): Max workers used for this batch
            
        Returns:
            str: ID of the created batch record or None if creation failed
        """
        try:
            batch_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc)
            
            # Create metadata object for additional fields
            metadata = {
                "limit": limit,
                "max_workers": max_workers,
                "machine_ids": machine_ids[:5] if machine_ids and len(machine_ids) > 5 else machine_ids
            }
            
            # Prepare batch data according to the database schema
            batch_data = {
                "id": batch_id,
                "status": "in_progress",
                "start_time": now.isoformat(),
                "end_time": None,
                "total_machines": count,
                "days_threshold": days_threshold,
                "metadata": json.dumps(metadata)
            }
            
            logger.debug(f"Attempting to insert batch data: {batch_data}")
            
            # Insert into batches table
            response = self.supabase.table("batches").insert(batch_data).execute()
            
            if response.data:
                logger.info(f"Created batch record with ID: {batch_id}")
                return batch_id
            else:
                logger.error("Failed to create batch record: empty response data")
                if hasattr(response, 'error'):
                    logger.error(f"Response error: {response.error}")
                return None
                
        except Exception as e:
            logger.error(f"Error creating batch record: {str(e)}")
            # Print more detailed error info
            if hasattr(e, '__dict__'):
                logger.error(f"Error details: {e.__dict__}")
            return None
    
    async def update_batch_status(self, batch_id: str, status: str, end_time: bool = True) -> bool:
        """
        Update the status of a batch job.
        
        Args:
            batch_id (str): ID of the batch to update
            status (str): New status value ('in_progress', 'completed', 'failed')
            end_time (bool): Whether to set the end_time to now
            
        Returns:
            bool: True if update was successful, False otherwise
        """
        try:
            update_data = {"status": status}
            
            if end_time:
                update_data["end_time"] = datetime.now(timezone.utc).isoformat()
                
            response = self.supabase.table("batches") \
                .update(update_data) \
                .eq("id", batch_id) \
                .execute()
                
            if response.data:
                logger.info(f"Updated batch {batch_id} status to {status}")
                return True
            else:
                logger.warning(f"Failed to update batch {batch_id} status")
                return False
                
        except Exception as e:
            logger.error(f"Error updating batch status: {str(e)}")
            return False
    
    async def update_batch_count(self, batch_id: str, count: int) -> bool:
        """
        Update the machine count of a batch job.
        
        Args:
            batch_id (str): ID of the batch to update
            count (int): New machine count
            
        Returns:
            bool: True if update was successful, False otherwise
        """
        try:
            response = self.supabase.table("batches") \
                .update({"total_machines": count}) \
                .eq("id", batch_id) \
                .execute()
                
            if response.data:
                logger.info(f"Updated batch {batch_id} count to {count}")
                return True
            else:
                logger.warning(f"Failed to update batch {batch_id} count")
                return False
                
        except Exception as e:
            logger.error(f"Error updating batch count: {str(e)}")
            return False

    async def add_batch_result(self, batch_id: str, machine_id: str, 
                            machine_name: str, url: str, 
                            success: bool, old_price: Optional[float] = None, 
                            new_price: Optional[float] = None, 
                            extraction_method: Optional[str] = None,
                            error: Optional[str] = None,
                            start_time: Optional[str] = None,
                            end_time: Optional[str] = None,
                            http_status: Optional[int] = None,
                            html_size: Optional[int] = None,
                            extraction_attempts: Optional[List[Dict[str, Any]]] = None,
                            needs_review: bool = False,
                            review_reason: Optional[str] = None,
                            tier: Optional[str] = None,
                            extracted_confidence: Optional[float] = None,
                            validation_confidence: Optional[float] = None,
                            confidence: Optional[float] = None) -> bool:
        """
        Add a result entry to the batch_results table.
        
        Args:
            batch_id: ID of the batch
            machine_id: ID of the machine
            machine_name: Name of the machine
            url: URL that was scraped
            success: Whether extraction was successful
            old_price: Previous price of the machine
            new_price: New extracted price
            extraction_method: Method used for extraction
            error: Error message if extraction failed
            start_time: When extraction started
            end_time: When extraction completed
            http_status: HTTP status code from scraping
            html_size: Size of HTML content in bytes
            extraction_attempts: Details of extraction attempts
            needs_review: Whether this result needs manual review
            review_reason: Reason for manual review flag
            tier: Extraction tier used
            extracted_confidence: Confidence of extraction
            validation_confidence: Confidence of validation
            confidence: Overall confidence score
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            now = datetime.now(timezone.utc)
            
            # Calculate duration if we have start and end times
            duration_seconds = None
            if start_time and end_time:
                try:
                    start = datetime.fromisoformat(start_time.replace('Z', '+00:00')) if isinstance(start_time, str) else start_time
                    end = datetime.fromisoformat(end_time.replace('Z', '+00:00')) if isinstance(end_time, str) else end_time
                    duration_seconds = (end - start).total_seconds()
                except (ValueError, TypeError) as e:
                    logger.warning(f"Error calculating duration: {str(e)}")
            
            # Calculate price change
            price_change = None
            percentage_change = None
            if old_price is not None and new_price is not None:
                price_change = new_price - old_price
                if old_price > 0:
                    percentage_change = (price_change / old_price) * 100
            
            # Prepare batch result data
            result_data = {
                "id": str(uuid.uuid4()),
                "batch_id": batch_id,
                "machine_id": machine_id,
                "machine_name": machine_name,
                "url": url,
                "success": success,
                "old_price": old_price,
                "new_price": new_price,
                "price_change": price_change,
                "percentage_change": percentage_change,
                "error": error,
                "start_time": start_time or now.isoformat(),
                "end_time": end_time or now.isoformat(),
                "duration_seconds": duration_seconds,
                "extraction_method": extraction_method,
                "http_status": http_status,
                "html_size": html_size,
                "needs_review": needs_review,
                "review_reason": review_reason,
                "tier": tier or extraction_method,
                "extracted_confidence": extracted_confidence,
                "validation_confidence": validation_confidence,
                "confidence": confidence or extracted_confidence
            }
            
            # Add extraction attempts if provided
            if extraction_attempts:
                result_data["extraction_attempts"] = json.dumps(extraction_attempts)
            
            # Insert into batch_results table
            response = self.supabase.table("batch_results").insert(result_data).execute()
            
            if response.data:
                logger.info(f"Added batch result for {machine_id} to batch {batch_id}")
                return True
            else:
                logger.warning(f"Failed to add batch result for {machine_id} to batch {batch_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error adding batch result for {machine_id} to batch {batch_id}: {str(e)}")
            return False
            
    async def get_flagged_machines(self, limit: int = 100, skip: int = 0, reason: str = None, 
                           confidence: float = None, sort_by: str = None, 
                           sort_order: str = "desc", search: str = None) -> List[Dict[str, Any]]:
        """
        Get machines flagged for manual review.
        
        Args:
            limit (int): Maximum number of machines to return
            skip (int): Number of machines to skip (for pagination)
            reason (str, optional): Filter by specific flag reason
            confidence (float, optional): Filter by minimum confidence
            sort_by (str, optional): Field to sort by
            sort_order (str): Sort order ("asc" or "desc")
            search (str, optional): Search term for machine name
            
        Returns:
            List of machines flagged for manual review with details.
        """
        try:
            # Query the machines_latest table for flagged machines
            query = self.supabase.table(MACHINES_LATEST_TABLE) \
                .select("*") \
                .eq("manual_review_flag", True) \
                .order("last_checked", desc=(sort_order.lower() == "desc"))
            
            # Apply filters if provided
            if reason and "flag_reason" in self.get_columns(MACHINES_LATEST_TABLE):
                query = query.ilike("flag_reason", f"%{reason}%")
                
            if confidence is not None:
                query = query.gte("confidence", confidence)
                
            # Apply custom sorting if provided
            if sort_by:
                # Map frontend sort fields to database fields
                sort_field_map = {
                    "date": "last_checked",
                    "confidence": "confidence",
                    "price": "machines_latest_price",
                }
                
                # Use mapped field or original if not in map
                db_sort_field = sort_field_map.get(sort_by, sort_by)
                query = query.order(db_sort_field, desc=(sort_order.lower() == "desc"))
            
            # Apply pagination
            if limit:
                query = query.range(skip, skip + limit - 1)
                
            response = query.execute()
            
            # Process the results to get the previous prices and machine names
            results = []
            for item in response.data:
                # Get the previous price from price history
                previous_price = await self.get_previous_price(item.get("machine_id"), item.get("variant_attribute"))
                
                # Get machine name directly
                machine_data = await self.get_machine_by_id(item.get("machine_id"))
                machine_name = machine_data.get("Machine Name") if machine_data else "Unknown"
                
                # Build the result item
                result_item = {
                    "machine_id": item.get("machine_id"),
                    "variant_attribute": item.get("variant_attribute"),
                    "machine_name": machine_name,
                    "machines_latest_price": item.get("machines_latest_price"),
                    "previous_price": previous_price,
                    "currency": item.get("currency"),
                    "tier": item.get("tier"),
                    "confidence": item.get("confidence"),
                    "last_checked": item.get("last_checked"),
                    "flag_reason": item.get("flag_reason") if "flag_reason" in item else "Price change"
                }
                
                # Filter by search query if provided
                if search and machine_name:
                    if search.lower() not in machine_name.lower():
                        continue
                    
                results.append(result_item)
                
            return results
            
        except Exception as e:
            logger.error(f"Error fetching flagged machines: {str(e)}")
            return []
            
    def get_columns(self, table_name: str) -> List[str]:
        """
        Get list of column names for a table.
        
        Args:
            table_name (str): Name of the table
            
        Returns:
            List of column names
        """
        try:
            # First try to get a single row to examine columns
            response = self.supabase.table(table_name).select("*").limit(1).execute()
            
            if response.data and len(response.data) > 0:
                return list(response.data[0].keys())
            return []
            
        except Exception as e:
            logger.warning(f"Error fetching columns for {table_name}: {str(e)}")
            return []
            
    async def get_flagged_machines_count(self) -> int:
        """
        Get the total count of machines flagged for manual review.
        
        Returns:
            int: Count of flagged machines
        """
        try:
            response = self.supabase.table(MACHINES_LATEST_TABLE) \
                .select("count", count="exact") \
                .eq("manual_review_flag", True) \
                .execute()
            
            return response.count if hasattr(response, 'count') else 0
            
        except Exception as e:
            logger.error(f"Error fetching flagged machines count: {str(e)}")
            return 0