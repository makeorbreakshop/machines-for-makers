import os
from loguru import logger
from supabase import create_client, Client
from dotenv import load_dotenv
from datetime import datetime, timezone
import uuid
from typing import Dict, List, Optional, Any, Union
from decimal import Decimal

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
                          url: Optional[str] = None) -> bool:
        """
        Add a new entry to the price history table.
        
        Args:
            machine_id (str): The ID of the machine
            new_price (Decimal): The new price value
            old_price (Decimal, optional): The previous price value
            variant_attribute (str): Variant attribute identifier
            tier (str): The extraction tier used
            extracted_confidence (float, optional): Confidence score for extraction
            validation_confidence (float, optional): Confidence score for validation
            success (bool): Whether the extraction was successful
            error_message (str, optional): Error message if extraction failed
            source (str): Source of the price update
            currency (str): Currency of the price
            url (str, optional): The URL the price was scraped from
            
        Returns:
            bool: True if history entry was added, False otherwise
        """
        try:
            # Calculate price change metrics
            price_change = None
            percentage_change = None
            is_all_time_low = False
            is_all_time_high = False
            
            if old_price is not None and new_price is not None:
                price_change = float(new_price) - float(old_price)
                if float(old_price) > 0:
                    percentage_change = (price_change / float(old_price)) * 100
            
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
                "price_change": price_change,
                "percentage_change": percentage_change,
                "extraction_method": tier,
                "tier": tier,
                "extracted_confidence": extracted_confidence,
                "validation_confidence": validation_confidence,
                "failure_reason": error_message if not success else None
            }
            
            history_response = self.supabase.table(PRICE_HISTORY_TABLE) \
                .insert(history_data) \
                .execute()
            
            if history_response.data:
                logger.info(f"Added price history entry for {machine_id}/{variant_attribute}")
                return True
            else:
                logger.warning(f"No price history entry created for {machine_id}/{variant_attribute}")
                return False
                
        except Exception as e:
            logger.error(f"Error adding price history for {machine_id}/{variant_attribute}: {str(e)}")
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
                              flag_value: bool = True) -> bool:
        """
        Set the manual review flag for a machine variant.
        
        Args:
            machine_id (str): The ID of the machine
            variant_attribute (str): Variant attribute identifier
            flag_value (bool): Value to set the flag to
            
        Returns:
            bool: True if flag was set, False otherwise
        """
        try:
            response = self.supabase.table(MACHINES_LATEST_TABLE) \
                .update({"manual_review_flag": flag_value}) \
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
            latest_query = self.supabase.rpc(
                'get_machines_needing_updates',
                {
                    'days_threshold': days_threshold,
                    'js_interaction_filter': with_js_interaction
                }
            )
            
            # Alternative direct query approach if stored procedure not available
            # latest_query = self.supabase.table(MACHINES_LATEST_TABLE) \
            #     .select("machine_id, variant_attribute, last_checked") \
            #     .in_("machine_id", machine_ids) \
            #     .lt("last_checked", (datetime.now(timezone.utc) - timedelta(days=days_threshold)).isoformat())
            
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
        llm_usage_data: List[Dict[str, Any]] = None
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
            
        Returns:
            True if save was successful, False otherwise
        """
        try:
            # Start a transaction for atomicity
            async with self.supabase.connection() as connection:
                async with connection.transaction():
                    # 1. Insert into price_history
                    price_history_id = await self._insert_price_history(
                        connection,
                        machine_id, 
                        variant_attribute,
                        price, 
                        extraction_method, 
                        extraction_confidence,
                        validation_confidence,
                        currency
                    )
                    
                    # 2. Update machines_latest
                    await self._update_machines_latest(
                        connection,
                        machine_id, 
                        variant_attribute,
                        price, 
                        extraction_method, 
                        extraction_confidence,
                        manual_review_flag,
                        currency
                    )
                    
                    # 3. Save LLM usage data if provided
                    if llm_usage_data:
                        for usage in llm_usage_data:
                            await self._insert_llm_usage(
                                connection,
                                machine_id,
                                variant_attribute,
                                usage
                            )
            
            logger.info(f"Successfully saved price {price} for {machine_id}/{variant_attribute} using {extraction_method}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving price extraction results: {str(e)}")
            return False
    
    async def _insert_price_history(
        self, 
        connection,
        machine_id: str, 
        variant_attribute: str,
        price: Decimal, 
        extraction_method: str, 
        extraction_confidence: float,
        validation_confidence: float,
        currency: str
    ) -> Optional[str]:
        """
        Insert a new record into price_history table.
        
        Args:
            connection: Active database connection
            machine_id: ID of the machine
            variant_attribute: Variant attribute identifier
            price: Extracted price
            extraction_method: Method used for extraction
            extraction_confidence: Confidence score from extraction
            validation_confidence: Confidence score from validation
            currency: Currency of the price
            
        Returns:
            ID of the inserted record or None on failure
        """
        try:
            # Prepare the query
            query = f"""
            INSERT INTO {PRICE_HISTORY_TABLE} 
            (machine_id, variant_attribute, price, date, currency, tier, extracted_confidence, validation_confidence)
            VALUES
            ($1, $2, $3, NOW(), $4, $5, $6, $7)
            RETURNING id
            """
            
            # Execute the query with parameters
            result = await connection.fetchrow(
                query, 
                machine_id, 
                variant_attribute, 
                price, 
                currency, 
                extraction_method, 
                extraction_confidence,
                validation_confidence
            )
            
            if result:
                return result['id']
            return None
            
        except Exception as e:
            logger.error(f"Error inserting into price_history: {str(e)}")
            raise
    
    async def _update_machines_latest(
        self, 
        connection,
        machine_id: str, 
        variant_attribute: str,
        price: Decimal, 
        extraction_method: str, 
        confidence: float,
        manual_review_flag: bool,
        currency: str
    ) -> bool:
        """
        Update or insert a record in the machines_latest table.
        
        Args:
            connection: Active database connection
            machine_id: ID of the machine
            variant_attribute: Variant attribute identifier
            price: Extracted price
            extraction_method: Method used for extraction
            confidence: Confidence score
            manual_review_flag: Whether the price needs manual review
            currency: Currency of the price
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Prepare the query
            query = f"""
            INSERT INTO {MACHINES_LATEST_TABLE} 
            (machine_id, variant_attribute, machines_latest_price, currency, last_checked, tier, confidence, manual_review_flag)
            VALUES
            ($1, $2, $3, $4, NOW(), $5, $6, $7)
            ON CONFLICT (machine_id, variant_attribute) DO UPDATE
            SET 
                machines_latest_price = EXCLUDED.machines_latest_price,
                currency = EXCLUDED.currency,
                last_checked = EXCLUDED.last_checked,
                tier = EXCLUDED.tier,
                confidence = EXCLUDED.confidence,
                manual_review_flag = EXCLUDED.manual_review_flag
            """
            
            # Execute the query with parameters
            await connection.execute(
                query, 
                machine_id, 
                variant_attribute, 
                price, 
                currency, 
                extraction_method, 
                confidence,
                manual_review_flag
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Error updating machines_latest: {str(e)}")
            raise
    
    async def _insert_llm_usage(
        self, 
        connection,
        machine_id: str, 
        variant_attribute: str,
        usage_data: Dict[str, Any]
    ) -> Optional[str]:
        """
        Insert a record into the llm_usage_tracking table.
        
        Args:
            connection: Active database connection
            machine_id: ID of the machine
            variant_attribute: Variant attribute identifier
            usage_data: LLM usage data to record
            
        Returns:
            ID of the inserted record or None on failure
        """
        try:
            # Extract values from usage data
            model = usage_data.get("model", "")
            tier = usage_data.get("tier", "")
            prompt_tokens = usage_data.get("prompt_tokens", 0)
            completion_tokens = usage_data.get("completion_tokens", 0)
            estimated_cost = usage_data.get("estimated_cost", 0.0)
            success = usage_data.get("success", False)
            
            # Prepare the query
            query = f"""
            INSERT INTO {LLM_USAGE_TABLE} 
            (machine_id, variant_attribute, model, tier, prompt_tokens, completion_tokens, estimated_cost, success)
            VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
            """
            
            # Execute the query with parameters
            result = await connection.fetchrow(
                query, 
                machine_id, 
                variant_attribute,
                model, 
                tier, 
                prompt_tokens, 
                completion_tokens,
                estimated_cost,
                success
            )
            
            if result:
                return result['id']
            return None
            
        except Exception as e:
            logger.error(f"Error inserting into llm_usage_tracking: {str(e)}")
            raise
    
    async def update_api_endpoint(
        self,
        machine_id: str,
        variant_attribute: str,
        domain: str,
        api_endpoint_template: str
    ) -> bool:
        """
        Update the API endpoint for a variant.
        
        Args:
            machine_id: ID of the machine
            variant_attribute: Variant attribute identifier
            domain: Domain of the e-commerce site
            api_endpoint_template: Template for the API endpoint
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Prepare the query
            query = f"""
            INSERT INTO {VARIANT_CONFIG_TABLE} 
            (machine_id, variant_attribute, domain, api_endpoint_template, api_endpoint_discovered_at)
            VALUES
            ($1, $2, $3, $4, NOW())
            ON CONFLICT (machine_id, variant_attribute, domain) DO UPDATE
            SET 
                api_endpoint_template = EXCLUDED.api_endpoint_template,
                api_endpoint_discovered_at = EXCLUDED.api_endpoint_discovered_at
            """
            
            # Execute the query with parameters
            await self.supabase.execute(query, machine_id, variant_attribute, domain, api_endpoint_template)
            
            return True
            
        except Exception as e:
            logger.error(f"Error updating API endpoint: {str(e)}")
            return False
    
    async def get_flagged_machines(self, limit: int = 100, skip: int = 0) -> List[Dict[str, Any]]:
        """
        Get machines flagged for manual review.
        
        Args:
            limit (int): Maximum number of machines to return
            skip (int): Number of machines to skip (for pagination)
            
        Returns:
            List of machines flagged for manual review with details.
        """
        try:
            # Query machines_latest table for machines with manual_review_flag=true
            response = self.supabase.table(MACHINES_LATEST_TABLE) \
                .select("*") \
                .eq("manual_review_flag", True) \
                .range(skip, skip + limit - 1) \
                .execute()
                
            if not response.data:
                logger.info("No machines flagged for manual review found")
                return []
                
            flagged_machines = response.data
            logger.info(f"Found {len(flagged_machines)} machines flagged for manual review")
            
            # Enrich with machine details and previous prices
            enriched_machines = []
            for machine in flagged_machines:
                machine_id = machine.get("machine_id")
                variant = machine.get("variant_attribute", "DEFAULT")
                
                # Get machine details
                machine_details = await self.get_machine_by_id(machine_id)
                if machine_details:
                    # Get previous price from price history
                    previous_price = await self.get_previous_price(machine_id, variant)
                    
                    # Add machine details and previous price
                    machine["machine_name"] = machine_details.get("Machine Name")
                    machine["company"] = machine_details.get("Company")
                    machine["product_link"] = machine_details.get("product_link")
                    machine["previous_price"] = previous_price
                    
                    # Calculate flag reason
                    machine["flag_reason"] = self._determine_flag_reason(
                        machine.get("machines_latest_price"), 
                        previous_price, 
                        machine.get("confidence")
                    )
                    
                    enriched_machines.append(machine)
                
            return enriched_machines
        except Exception as e:
            logger.error(f"Error fetching flagged machines: {str(e)}")
            return []
            
    async def get_flagged_machines_count(self) -> int:
        """Get the total count of machines flagged for manual review."""
        try:
            # Count machines with manual_review_flag=true
            response = self.supabase.table(MACHINES_LATEST_TABLE) \
                .select("machine_id", "count") \
                .eq("manual_review_flag", True) \
                .execute()
                
            if response.count is not None:
                return response.count
            
            # Fallback if count is not available
            if response.data:
                return len(response.data)
                
            return 0
        except Exception as e:
            logger.error(f"Error counting flagged machines: {str(e)}")
            return 0
    
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
    
    def _determine_flag_reason(self, new_price: float, old_price: float, confidence: float) -> str:
        """
        Determine the reason for flagging a price.
        
        Args:
            new_price (float): New price
            old_price (float): Old price
            confidence (float): Confidence score
            
        Returns:
            Reason string
        """
        # Set default thresholds
        low_confidence_threshold = 0.90
        high_change_threshold = 0.25  # 25% change
        
        if confidence is not None and confidence < low_confidence_threshold:
            return "Low extraction confidence"
            
        if old_price is not None and new_price is not None and old_price > 0:
            percentage_change = abs((new_price - old_price) / old_price)
            if percentage_change > high_change_threshold:
                direction = "increase" if new_price > old_price else "decrease"
                return f"Large price {direction} ({int(percentage_change * 100)}%)"
                
        return "Multiple issues detected"
    
    async def get_machines_with_variants(
        self,
        limit: int = 100,
        skip: int = 0,
        days_threshold: Optional[int] = None,
        search: Optional[str] = None,
        company: Optional[str] = None,
        category: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get machines with their variant price information.
        
        Args:
            limit (int): Maximum number of machines to return
            skip (int): Number of machines to skip (for pagination)
            days_threshold (int, optional): Filter by days since last update
            search (str, optional): Search term for machine name
            company (str, optional): Filter by company name
            category (str, optional): Filter by machine category
            
        Returns:
            List of machines with their variant information
        """
        try:
            # Build query for machines table
            query = self.supabase.table(MACHINES_TABLE).select("id, \"Machine Name\", Company, \"Equipment Type\", Price, product_link, html_timestamp")
            
            # Apply filters
            if days_threshold is not None:
                # Not ideal to do date calculation in SQL, but Supabase doesn't support date operations in the query builder
                # We'll filter after fetching the data
                pass
                
            if search:
                query = query.ilike("Machine Name", f"%{search}%")
                
            if company:
                query = query.eq("Company", company)
                
            if category:
                query = query.eq("Equipment Type", category)
                
            # Execute query with pagination
            response = query.range(skip, skip + limit - 1).execute()
            
            if not response.data:
                logger.info("No machines found matching criteria")
                return []
                
            machines = response.data
            
            # Apply days_threshold filter if specified
            if days_threshold is not None:
                from datetime import datetime, timezone, timedelta
                cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_threshold)
                machines = [m for m in machines if not m.get("html_timestamp") or datetime.fromisoformat(m.get("html_timestamp").replace("Z", "+00:00")) < cutoff_date]
            
            # Fetch variant information for each machine
            machines_with_variants = []
            for machine in machines:
                machine_id = machine.get("id")
                
                # Get variants for this machine
                variants_response = self.supabase.table(MACHINES_LATEST_TABLE) \
                    .select("*") \
                    .eq("machine_id", machine_id) \
                    .execute()
                    
                variants = variants_response.data if variants_response.data else []
                
                # Add variants to machine data
                machine["variants"] = variants
                machines_with_variants.append(machine)
                
            return machines_with_variants
        except Exception as e:
            logger.error(f"Error fetching machines with variants: {str(e)}")
            return []
    
    async def get_machines_count(
        self,
        days_threshold: Optional[int] = None,
        search: Optional[str] = None,
        company: Optional[str] = None,
        category: Optional[str] = None
    ) -> int:
        """
        Get total count of machines matching criteria.
        
        Args:
            days_threshold (int, optional): Filter by days since last update
            search (str, optional): Search term for machine name
            company (str, optional): Filter by company name
            category (str, optional): Filter by machine category
            
        Returns:
            Total count of machines matching criteria
        """
        try:
            # Build query for machines table
            query = self.supabase.table(MACHINES_TABLE).select("id", "count")
            
            # Apply filters
            if search:
                query = query.ilike("Machine Name", f"%{search}%")
                
            if company:
                query = query.eq("Company", company)
                
            if category:
                query = query.eq("Equipment Type", category)
                
            # Execute count query
            response = query.execute()
            
            if response.count is not None:
                count = response.count
                
                # If days_threshold is specified, we can't accurately count with Supabase's limitations
                # We'll return an approximate count
                if days_threshold is not None:
                    # This is a very rough approximation
                    # In a real implementation, you'd need a more accurate approach
                    count = int(count * 0.7)  # Assuming ~70% of machines need updates
                    
                return count
                
            # Fallback if count is not available
            return len(response.data) if response.data else 0
        except Exception as e:
            logger.error(f"Error counting machines: {str(e)}")
            return 0
            
    async def get_price_history(
        self,
        machine_id: str,
        variant_attribute: str = "DEFAULT",
        limit: int = 30,
        skip: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Get price history for a machine and optional variant.
        
        Args:
            machine_id (str): Machine ID
            variant_attribute (str): Variant attribute (optional)
            limit (int): Maximum number of history entries
            skip (int): Number of entries to skip
            
        Returns:
            List of price history entries
        """
        try:
            # Build query for price_history table
            query = self.supabase.table(PRICE_HISTORY_TABLE) \
                .select("*") \
                .eq("machine_id", machine_id)
                
            # Add variant filter if not "ALL"
            if variant_attribute.upper() != "ALL":
                query = query.eq("variant_attribute", variant_attribute)
                
            # Order by date descending and apply pagination
            response = query.order("date", desc=True).range(skip, skip + limit - 1).execute()
            
            if not response.data:
                logger.info(f"No price history found for {machine_id}/{variant_attribute}")
                return []
                
            # Calculate price change percentage for each entry
            price_history = response.data
            for i, entry in enumerate(price_history):
                old_price = entry.get("old_price")
                new_price = entry.get("price")
                
                if old_price is not None and old_price > 0 and new_price is not None:
                    entry["percentage_change"] = ((new_price - old_price) / old_price) * 100
                else:
                    entry["percentage_change"] = None
                    
            return price_history
        except Exception as e:
            logger.error(f"Error fetching price history for {machine_id}/{variant_attribute}: {str(e)}")
            return []
            
    async def get_price_history_count(
        self,
        machine_id: str,
        variant_attribute: str = "DEFAULT"
    ) -> int:
        """
        Get count of price history entries for a machine and optional variant.
        
        Args:
            machine_id (str): Machine ID
            variant_attribute (str): Variant attribute (optional)
            
        Returns:
            Count of price history entries
        """
        try:
            # Build query for price_history table
            query = self.supabase.table(PRICE_HISTORY_TABLE) \
                .select("id", "count") \
                .eq("machine_id", machine_id)
                
            # Add variant filter if not "ALL"
            if variant_attribute.upper() != "ALL":
                query = query.eq("variant_attribute", variant_attribute)
                
            # Execute count query
            response = query.execute()
            
            if response.count is not None:
                return response.count
                
            # Fallback if count is not available
            return len(response.data) if response.data else 0
        except Exception as e:
            logger.error(f"Error counting price history for {machine_id}/{variant_attribute}: {str(e)}")
            return 0
    
    async def get_llm_usage_summary(self, days: int = 30) -> Optional[Dict[str, Any]]:
        """
        Get overall LLM usage summary for the past number of days.
        
        Args:
            days (int): Number of days to include in summary
            
        Returns:
            Summary of usage including total cost, requests, and breakdowns
        """
        try:
            from datetime import datetime, timezone, timedelta
            
            # Calculate cutoff date
            cutoff_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
            
            # Get total usage
            usage_response = self.supabase.table(LLM_USAGE_TABLE) \
                .select("estimated_cost, model, tier") \
                .gte("timestamp", cutoff_date) \
                .execute()
                
            if not usage_response.data:
                logger.info(f"No LLM usage found in the past {days} days")
                return None
                
            usage_data = usage_response.data
            
            # Calculate total cost and requests
            total_cost = sum(entry.get("estimated_cost", 0) for entry in usage_data)
            total_requests = len(usage_data)
            
            # Calculate model breakdown
            model_usage = {}
            for entry in usage_data:
                model = entry.get("model", "unknown")
                cost = entry.get("estimated_cost", 0)
                
                if model not in model_usage:
                    model_usage[model] = {
                        "model": model,
                        "cost": 0,
                        "requests": 0
                    }
                    
                model_usage[model]["cost"] += cost
                model_usage[model]["requests"] += 1
            
            # Calculate tier breakdown
            tier_usage = {}
            for entry in usage_data:
                tier = entry.get("tier", "unknown")
                cost = entry.get("estimated_cost", 0)
                
                if tier not in tier_usage:
                    tier_usage[tier] = {
                        "tier": tier,
                        "cost": 0,
                        "requests": 0
                    }
                    
                tier_usage[tier]["cost"] += cost
                tier_usage[tier]["requests"] += 1
            
            # Format the summary
            summary = {
                "total_cost": total_cost,
                "total_requests": total_requests,
                "models": list(model_usage.values()),
                "tiers": list(tier_usage.values())
            }
            
            return summary
        except Exception as e:
            logger.error(f"Error getting LLM usage summary: {str(e)}")
            return None
            
    async def get_llm_usage_by_model(self, days: int = 30) -> List[Dict[str, Any]]:
        """
        Get LLM usage breakdown by model for the past number of days.
        
        Args:
            days (int): Number of days to include
            
        Returns:
            List of usage statistics by model
        """
        try:
            from datetime import datetime, timezone, timedelta
            
            # Calculate cutoff date
            cutoff_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
            
            # Get usage grouped by model
            usage_response = self.supabase.from_(LLM_USAGE_TABLE) \
                .select("model, estimated_cost, prompt_tokens, completion_tokens, success") \
                .gte("timestamp", cutoff_date) \
                .execute()
                
            if not usage_response.data:
                return []
                
            usage_data = usage_response.data
            
            # Calculate model breakdown
            model_usage = {}
            for entry in usage_data:
                model = entry.get("model", "unknown")
                cost = entry.get("estimated_cost", 0)
                prompt_tokens = entry.get("prompt_tokens", 0)
                completion_tokens = entry.get("completion_tokens", 0)
                success = entry.get("success", False)
                
                if model not in model_usage:
                    model_usage[model] = {
                        "model": model,
                        "cost": 0,
                        "requests": 0,
                        "successful_requests": 0,
                        "prompt_tokens": 0,
                        "completion_tokens": 0,
                        "total_tokens": 0
                    }
                    
                model_usage[model]["cost"] += cost
                model_usage[model]["requests"] += 1
                model_usage[model]["successful_requests"] += 1 if success else 0
                model_usage[model]["prompt_tokens"] += prompt_tokens
                model_usage[model]["completion_tokens"] += completion_tokens
                model_usage[model]["total_tokens"] += prompt_tokens + completion_tokens
            
            # Calculate success rate
            for model in model_usage.values():
                if model["requests"] > 0:
                    model["success_rate"] = (model["successful_requests"] / model["requests"]) * 100
                else:
                    model["success_rate"] = 0
            
            return sorted(list(model_usage.values()), key=lambda x: x["cost"], reverse=True)
        except Exception as e:
            logger.error(f"Error getting LLM usage by model: {str(e)}")
            return []
            
    async def get_llm_usage_by_tier(self, days: int = 30) -> List[Dict[str, Any]]:
        """
        Get LLM usage breakdown by extraction tier for the past number of days.
        
        Args:
            days (int): Number of days to include
            
        Returns:
            List of usage statistics by extraction tier
        """
        try:
            from datetime import datetime, timezone, timedelta
            
            # Calculate cutoff date
            cutoff_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
            
            # Get usage grouped by tier
            usage_response = self.supabase.from_(LLM_USAGE_TABLE) \
                .select("tier, estimated_cost, model, success") \
                .gte("timestamp", cutoff_date) \
                .execute()
                
            if not usage_response.data:
                return []
                
            usage_data = usage_response.data
            
            # Calculate tier breakdown
            tier_usage = {}
            for entry in usage_data:
                tier = entry.get("tier", "unknown")
                cost = entry.get("estimated_cost", 0)
                model = entry.get("model", "unknown")
                success = entry.get("success", False)
                
                if tier not in tier_usage:
                    tier_usage[tier] = {
                        "tier": tier,
                        "cost": 0,
                        "requests": 0,
                        "successful_requests": 0,
                        "models": {}
                    }
                    
                tier_usage[tier]["cost"] += cost
                tier_usage[tier]["requests"] += 1
                tier_usage[tier]["successful_requests"] += 1 if success else 0
                
                # Track model usage within tier
                if model not in tier_usage[tier]["models"]:
                    tier_usage[tier]["models"][model] = 0
                tier_usage[tier]["models"][model] += 1
            
            # Calculate success rate and format model usage
            for tier in tier_usage.values():
                if tier["requests"] > 0:
                    tier["success_rate"] = (tier["successful_requests"] / tier["requests"]) * 100
                else:
                    tier["success_rate"] = 0
                    
                # Convert models dict to list of objects
                models_list = []
                for model, count in tier["models"].items():
                    models_list.append({
                        "model": model,
                        "count": count,
                        "percentage": (count / tier["requests"]) * 100 if tier["requests"] > 0 else 0
                    })
                tier["models"] = models_list
            
            return sorted(list(tier_usage.values()), key=lambda x: x["cost"], reverse=True)
        except Exception as e:
            logger.error(f"Error getting LLM usage by tier: {str(e)}")
            return []
            
    async def get_llm_usage_by_date(self, days: int = 30, group_by: str = "day") -> List[Dict[str, Any]]:
        """
        Get LLM usage trends over time for the past number of days.
        
        Args:
            days (int): Number of days to include
            group_by (str): Grouping level (day, week, month)
            
        Returns:
            List of usage statistics grouped by date
        """
        try:
            from datetime import datetime, timezone, timedelta
            
            # Calculate cutoff date
            cutoff_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
            
            # Get usage data
            usage_response = self.supabase.from_(LLM_USAGE_TABLE) \
                .select("timestamp, estimated_cost, model") \
                .gte("timestamp", cutoff_date) \
                .execute()
                
            if not usage_response.data:
                return []
                
            usage_data = usage_response.data
            
            # Group by date based on specified level
            date_usage = {}
            for entry in usage_data:
                timestamp_str = entry.get("timestamp")
                if not timestamp_str:
                    continue
                    
                timestamp = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
                
                # Format date string based on grouping level
                if group_by == "day":
                    date_key = timestamp.strftime("%Y-%m-%d")
                elif group_by == "week":
                    # ISO week format: YYYY-WW
                    date_key = f"{timestamp.isocalendar()[0]}-W{timestamp.isocalendar()[1]:02d}"
                elif group_by == "month":
                    date_key = timestamp.strftime("%Y-%m")
                else:
                    # Default to day
                    date_key = timestamp.strftime("%Y-%m-%d")
                
                cost = entry.get("estimated_cost", 0)
                model = entry.get("model", "unknown")
                
                if date_key not in date_usage:
                    date_usage[date_key] = {
                        "date": date_key,
                        "cost": 0,
                        "requests": 0,
                        "models": {}
                    }
                    
                date_usage[date_key]["cost"] += cost
                date_usage[date_key]["requests"] += 1
                
                # Track model usage within date
                if model not in date_usage[date_key]["models"]:
                    date_usage[date_key]["models"][model] = {
                        "model": model,
                        "cost": 0,
                        "requests": 0
                    }
                date_usage[date_key]["models"][model]["cost"] += cost
                date_usage[date_key]["models"][model]["requests"] += 1
            
            # Format model usage for each date
            for date_entry in date_usage.values():
                date_entry["models"] = list(date_entry["models"].values())
            
            # Convert to list and sort by date
            result = list(date_usage.values())
            result.sort(key=lambda x: x["date"])
            
            return result
        except Exception as e:
            logger.error(f"Error getting LLM usage by date: {str(e)}")
            return []
    
    async def get_machine_variants(self, machine_id: str) -> List[Dict[str, Any]]:
        """
        Get all variants for a machine.
        
        Args:
            machine_id (str): Machine ID
            
        Returns:
            List of variant records for the machine
        """
        try:
            # Get variants from machines_latest table
            response = self.supabase.table(MACHINES_LATEST_TABLE) \
                .select("*") \
                .eq("machine_id", machine_id) \
                .execute()
                
            if not response.data:
                logger.info(f"No variants found for machine {machine_id}")
                return []
                
            return response.data
        except Exception as e:
            logger.error(f"Error fetching variants for machine {machine_id}: {str(e)}")
            return []
    
    async def create_machine_variant(self, machine_id: str, variant_attribute: str, initial_price: float) -> bool:
        """
        Create a new variant for a machine.
        
        Args:
            machine_id (str): Machine ID
            variant_attribute (str): Variant attribute
            initial_price (float): Initial price for the variant
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Check if variant already exists
            existing = await self.get_machine_latest_price(machine_id, variant_attribute)
            if existing:
                logger.warning(f"Variant {variant_attribute} already exists for machine {machine_id}")
                return False
                
            # Get machine to ensure it exists
            machine = await self.get_machine_by_id(machine_id)
            if not machine:
                logger.error(f"Machine {machine_id} not found")
                return False
                
            # Current time for timestamp
            now = datetime.now(timezone.utc)
            
            # Create the variant in machines_latest
            variant_data = {
                "machine_id": machine_id,
                "variant_attribute": variant_attribute,
                "machines_latest_price": float(initial_price),
                "currency": "USD",  # Default to USD
                "last_checked": now.isoformat(),
                "tier": "MANUAL_CREATE",
                "confidence": 1.0,
                "manual_review_flag": False
            }
            
            response = self.supabase.table(MACHINES_LATEST_TABLE) \
                .insert(variant_data) \
                .execute()
                
            if response.data:
                logger.info(f"Created variant {variant_attribute} for machine {machine_id}")
                
                # Add to price history
                await self.add_price_history(
                    machine_id=machine_id,
                    variant_attribute=variant_attribute,
                    new_price=initial_price,
                    old_price=None,
                    tier="MANUAL_CREATE",
                    extracted_confidence=1.0,
                    validation_confidence=1.0,
                    success=True,
                    error_message=None,
                    source="admin_create_variant"
                )
                
                return True
            else:
                logger.error(f"Failed to create variant {variant_attribute} for machine {machine_id}")
                return False
        except Exception as e:
            logger.error(f"Error creating variant for machine {machine_id}: {str(e)}")
            return False
    
    async def delete_machine_variant(self, machine_id: str, variant_attribute: str) -> bool:
        """
        Delete a variant for a machine.
        
        Args:
            machine_id (str): Machine ID
            variant_attribute (str): Variant attribute
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Don't allow deleting the DEFAULT variant
            if variant_attribute == "DEFAULT":
                logger.warning(f"Cannot delete the DEFAULT variant for machine {machine_id}")
                return False
                
            # Delete from machines_latest
            response = self.supabase.table(MACHINES_LATEST_TABLE) \
                .delete() \
                .eq("machine_id", machine_id) \
                .eq("variant_attribute", variant_attribute) \
                .execute()
                
            if response.data:
                logger.info(f"Deleted variant {variant_attribute} for machine {machine_id}")
                
                # Also delete any configuration for this variant
                await self.delete_variant_configs(machine_id, variant_attribute)
                
                return True
            else:
                logger.error(f"Failed to delete variant {variant_attribute} for machine {machine_id}")
                return False
        except Exception as e:
            logger.error(f"Error deleting variant for machine {machine_id}: {str(e)}")
            return False
    
    async def update_variant_config(self, machine_id: str, variant_attribute: str, domain: str, config_data: Dict[str, Any]) -> bool:
        """
        Update configuration for a variant.
        
        Args:
            machine_id (str): Machine ID
            variant_attribute (str): Variant attribute
            domain (str): Domain
            config_data (dict): Configuration updates
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Check if config exists
            existing = await self.get_variant_config(machine_id, variant_attribute, domain)
            if not existing:
                logger.warning(f"No configuration exists for {machine_id}/{variant_attribute}/{domain}")
                return False
                
            # Update the configuration
            response = self.supabase.table(VARIANT_CONFIG_TABLE) \
                .update(config_data) \
                .eq("machine_id", machine_id) \
                .eq("variant_attribute", variant_attribute) \
                .eq("domain", domain) \
                .execute()
                
            if response.data:
                logger.info(f"Updated configuration for {machine_id}/{variant_attribute}/{domain}")
                return True
            else:
                logger.error(f"Failed to update configuration for {machine_id}/{variant_attribute}/{domain}")
                return False
        except Exception as e:
            logger.error(f"Error updating configuration for {machine_id}/{variant_attribute}/{domain}: {str(e)}")
            return False
    
    async def create_variant_config(self, config_data: Dict[str, Any]) -> bool:
        """
        Create a new configuration for a variant.
        
        Args:
            config_data (dict): Configuration data
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Ensure required fields are present
            required_fields = ["machine_id", "variant_attribute", "domain"]
            for field in required_fields:
                if field not in config_data:
                    logger.error(f"Missing required field {field} in configuration data")
                    return False
                    
            # Create the configuration
            response = self.supabase.table(VARIANT_CONFIG_TABLE) \
                .insert(config_data) \
                .execute()
                
            if response.data:
                logger.info(f"Created configuration for {config_data['machine_id']}/{config_data['variant_attribute']}/{config_data['domain']}")
                return True
            else:
                logger.error(f"Failed to create configuration for {config_data['machine_id']}/{config_data['variant_attribute']}/{config_data['domain']}")
                return False
        except Exception as e:
            logger.error(f"Error creating configuration: {str(e)}")
            return False
    
    async def delete_variant_configs(self, machine_id: str, variant_attribute: str) -> bool:
        """
        Delete all configurations for a variant.
        
        Args:
            machine_id (str): Machine ID
            variant_attribute (str): Variant attribute
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Delete all configurations for this variant
            response = self.supabase.table(VARIANT_CONFIG_TABLE) \
                .delete() \
                .eq("machine_id", machine_id) \
                .eq("variant_attribute", variant_attribute) \
                .execute()
                
            logger.info(f"Deleted configurations for {machine_id}/{variant_attribute}")
            return True
        except Exception as e:
            logger.error(f"Error deleting configurations for {machine_id}/{variant_attribute}: {str(e)}")
            return False 