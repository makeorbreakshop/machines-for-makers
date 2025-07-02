from supabase import create_client
from datetime import datetime, timedelta
from loguru import logger
import json
import uuid
from typing import List, Dict, Optional

from config import (
    SUPABASE_URL, 
    SUPABASE_KEY, 
    MACHINES_TABLE, 
    PRICE_HISTORY_TABLE
)

class DatabaseService:
    """Service for interacting with the Supabase database."""
    
    def __init__(self):
        """Initialize the Supabase client."""
        self.supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("Database service initialized")
    
    async def get_machine_by_id(self, machine_id):
        """
        Get a machine record by ID.
        
        Args:
            machine_id (str): The ID of the machine to retrieve.
            
        Returns:
            dict or None: The machine record, or None if not found.
        """
        try:
            # Create a detailed error for debugging
            if not machine_id:
                logger.error("get_machine_by_id called with None/empty machine_id")
                return None
                
            # Ensure machine_id is a string and lowercase for consistency
            machine_id_str = str(machine_id).strip().lower()
            logger.debug(f"Looking for machine with normalized ID: {machine_id_str}")
            
            # First try direct exact match
            response = self.supabase.table("machines") \
                .select("*") \
                .eq("id", machine_id) \
                .single() \
                .execute()
                
            if response.data:
                logger.debug(f"Found machine with exact ID match: {machine_id}")
                return response.data
                
            # If exact match failed, try with lowercase ID
            if machine_id != machine_id_str:
                logger.debug(f"Exact match failed, trying case-insensitive match: {machine_id_str}")
                response = self.supabase.table("machines") \
                    .select("*") \
                    .eq("id", machine_id_str) \
                    .single() \
                    .execute()
                    
                if response.data:
                    logger.debug(f"Found machine with lowercase ID match: {machine_id_str}")
                    return response.data
                    
            # If both exact and lowercase failed, try with trimmed whitespace
            if ' ' in machine_id:
                trimmed_id = machine_id.replace(' ', '')
                logger.debug(f"Trying with whitespace removed: {trimmed_id}")
                response = self.supabase.table("machines") \
                    .select("*") \
                    .eq("id", trimmed_id) \
                    .single() \
                    .execute()
                    
                if response.data:
                    logger.debug(f"Found machine with trimmed ID: {trimmed_id}")
                    return response.data
            
            # Log detailed info about the failed lookup
            logger.warning(f"Machine with ID {machine_id} not found in database (tried exact, lowercase, and trimmed formats)")
            
            # If we get here, we didn't find the machine
            return None
        except Exception as e:
            logger.error(f"Error retrieving machine {machine_id}: {str(e)}")
            return None
    
    async def update_machine_price(self, machine_id, new_price, html_content=None):
        """
        Update a machine's price and store the HTML content.
        
        Args:
            machine_id (str): The ID of the machine to update.
            new_price (float): The new price value.
            html_content (str, optional): The HTML content of the scraped page.
            
        Returns:
            bool: True if update was successful, False otherwise.
        """
        try:
            # First verify the machine exists
            verify_machine = await self.get_machine_by_id(machine_id)
            if not verify_machine:
                logger.warning(f"Cannot update price: Machine with ID {machine_id} not found in database")
                return False
            
            update_data = {
                "Price": new_price,
                "html_timestamp": datetime.utcnow().isoformat() + "Z",
            }
            
            if html_content:
                update_data["html_content"] = html_content
                update_data["html_size"] = len(html_content)
            
            # Log the exact update we're making
            logger.debug(f"Updating machine {machine_id} with price {new_price}")
            
            response = self.supabase.table(MACHINES_TABLE) \
                .update(update_data) \
                .eq("id", machine_id) \
                .execute()
            
            if not response:
                logger.error(f"Empty response when updating machine {machine_id}")
                return False
                
            if response.data and len(response.data) > 0:
                logger.info(f"Updated price for machine {machine_id} to {new_price}")
                return True
                
            # If we reach here, the response data was empty but request didn't fail
            logger.warning(f"No machine found with ID {machine_id} to update")
            return False
        except Exception as e:
            logger.error(f"Error updating price for machine {machine_id}: {str(e)}")
            return False
    
    async def add_price_history(self, machine_id, old_price, new_price, success=True, error_message=None):
        """
        Add an entry to the price history for a machine.
        
        Args:
            machine_id (str): The ID of the machine.
            old_price (float): The previous price value.
            new_price (float): The new price value.
            success (bool): Whether the price update was successful.
            error_message (str, optional): Error message if the update failed.
            
        Returns:
            bool: True if the history entry was added successfully, False otherwise.
        """
        try:
            # Calculate price change if there's an old price
            price_change = None
            percentage_change = None
            
            if old_price is not None and new_price is not None:
                try:
                    old_price_float = float(old_price)
                    new_price_float = float(new_price)
                    
                    price_change = new_price_float - old_price_float
                    
                    if old_price_float > 0:
                        percentage_change = (price_change / old_price_float) * 100
                except (ValueError, TypeError):
                    logger.warning(f"Could not calculate price change for machine {machine_id}: invalid price values")
            
            # Create entry data - using the correct column names from the database
            entry_data = {
                "machine_id": machine_id,
                "price": new_price,  # This is the current price
                "previous_price": old_price,  # This is the old price
                "date": datetime.utcnow().isoformat() + "Z",  # Use UTC time with Z suffix
                "source": "auto-scraper",
                "currency": "USD"
            }
            
            # Set status based on success parameter and error message
            if success:
                entry_data["status"] = "AUTO_APPLIED"
            else:
                entry_data["status"] = "PENDING_REVIEW"
                if error_message:
                    entry_data["failure_reason"] = error_message
            
            # Add price change data if calculated
            if price_change is not None:
                entry_data["price_change"] = price_change
            
            if percentage_change is not None:
                entry_data["percentage_change"] = percentage_change
            
            # Add to price history table
            response = self.supabase.table(PRICE_HISTORY_TABLE) \
                .insert(entry_data) \
                .execute()
            
            if response.data and len(response.data) > 0:
                logger.info(f"Added price history entry for machine {machine_id}")
                return True
            logger.warning(f"Failed to add price history entry for machine {machine_id}")
            return False
        except Exception as e:
            logger.error(f"Error adding price history for machine {machine_id}: {str(e)}")
            return False
    
    async def get_machines_needing_update(self, days_threshold: int = 7, machine_ids: List[str] = None, limit: Optional[int] = None) -> List[Dict]:
        """
        Get machines that need price updates.
        
        Args:
            days_threshold (int): Days threshold for considering a machine needs update.
                                 If 0, returns all machines regardless of update time.
            machine_ids (List[str], optional): List of specific machine IDs to update.
            limit (Optional[int], optional): Maximum number of machines to return.
            
        Returns:
            List[Dict]: List of machines needing updates.
        """
        try:
            selected_columns = "id, \"Machine Name\", \"Company\", Price, product_link, \"Affiliate Link\", html_timestamp"
            
            # If specific machine IDs are provided, only get those
            if machine_ids:
                query = (
                    self.supabase.table("machines")
                    .select(selected_columns)
                    .in_("id", machine_ids)
                )
            elif days_threshold > 0:
                # Only apply the date threshold if days_threshold > 0
                today = datetime.now()
                
                # Calculate the threshold date
                threshold_date = today - timedelta(days=days_threshold)
                threshold_date_str = threshold_date.strftime("%Y-%m-%d")
                
                # First query: Get machines with html_timestamp less than threshold
                query1 = (
                    self.supabase.table("machines")
                    .select(selected_columns)
                    .lt("html_timestamp", threshold_date_str)
                )
                
                # Second query: Get machines with null html_timestamp
                query2 = (
                    self.supabase.table("machines")
                    .select(selected_columns)
                    .is_("html_timestamp", "null")
                )
                
                # Execute both queries
                response1 = query1.execute()
                response2 = query2.execute()
                
                # Combine results - no need to check for error attribute
                machines = response1.data + response2.data
                
                # Apply limit if provided
                if limit is not None and len(machines) > limit:
                    machines = machines[:limit]
                    logger.info(f"Limited combined results to {limit} machines")
                
                if not machines:
                    logger.info("No machines found for price update")
                    return []
                
                logger.info(f"Found {len(machines)} machines for price update")
                return machines
            else:
                # If days_threshold is 0, we're getting all machines
                query = (
                    self.supabase.table("machines")
                    .select(selected_columns)
                )
            
            # Apply limit if provided (for the single query cases)
            if limit is not None:
                query = query.limit(limit)
                logger.info(f"Limiting query to {limit} machines")
            
            # Execute the query (only for the single query cases)
            response = query.execute()
            
            # No need to check for error attribute
            machines = response.data
            
            if not machines:
                logger.info("No machines found for price update")
                return []
            
            logger.info(f"Found {len(machines)} machines for price update")
            return machines
            
        except Exception as e:
            logger.exception(f"Error in get_machines_needing_update: {str(e)}")
            return []
    
    def get_price_history_for_machine(self, machine_id):
        """
        Get the price history for a specific machine.
        
        Args:
            machine_id (str): The ID of the machine to retrieve history for.
            
        Returns:
            list: List of price history entries sorted by date (newest first).
        """
        try:
            # Query the price history table for this machine
            response = self.supabase.table(PRICE_HISTORY_TABLE) \
                .select("*") \
                .eq("machine_id", machine_id) \
                .order("date", desc=True) \
                .execute()
            
            if response.data and len(response.data) > 0:
                return response.data
            return []
        except Exception as e:
            logger.error(f"Error getting price history for machine {machine_id}: {str(e)}")
            return []

    # Batch Operations
    async def create_batch(self, count: int, days_threshold: int = None, machine_ids: List[str] = None, limit: Optional[int] = None, max_workers: Optional[int] = None) -> str:
        """
        Create a new batch record for batch processing.
        
        Args:
            count (int): Number of machines in the batch.
            days_threshold (int, optional): Days threshold used for the batch.
            machine_ids (List[str], optional): List of specific machine IDs for this batch.
            limit (Optional[int], optional): Limit used for this batch.
            max_workers (Optional[int], optional): Max workers used for this batch.
            
        Returns:
            str: The ID of the created batch.
        """
        try:
            # Generate a unique batch ID
            batch_id = str(uuid.uuid4())
            
            logger.info(f"Creating new batch with ID {batch_id} for {count} machines")
            
            # Create metadata object for additional fields
            metadata = {
                "limit": limit,
                "max_workers": max_workers,
                "machine_ids": machine_ids[:5] if machine_ids and len(machine_ids) > 5 else machine_ids
            }
            
            # Prepare batch data
            batch_data = {
                "id": batch_id,
                "start_time": datetime.utcnow().isoformat() + "Z",
                "total_machines": count,
                "days_threshold": days_threshold,
                "batch_type": "price_update",
                "status": "started",
                "metadata": json.dumps(metadata)
            }
            
            logger.debug(f"Batch data being inserted: {batch_data}")
            
            # Create new batch record - no await needed for Supabase operations
            response = self.supabase.table("batches").insert(batch_data).execute()
            
            if not response:
                logger.error("Empty response when creating batch record")
                return None
                
            if response.data and len(response.data) > 0:
                logger.info(f"Successfully created batch record with ID {batch_id}")
                
                # Double-check that the batch was created by immediately querying for it
                # No await needed for Supabase operations
                verify_response = self.supabase.table("batches") \
                    .select("id, status") \
                    .eq("id", batch_id) \
                    .execute()
                    
                if verify_response.data and len(verify_response.data) > 0:
                    logger.info(f"Verified batch {batch_id} exists in database")
                else:
                    logger.warning(f"Could not verify batch {batch_id} in database!")
                
                return batch_id
            
            logger.error(f"Failed to create batch record - no data in response")
            return None
        except Exception as e:
            logger.exception(f"Error creating batch: {str(e)}")
            return None
            
    async def complete_batch(self, batch_id):
        """
        Mark a batch as completed.
        
        Args:
            batch_id (str): ID of the batch to complete.
            
        Returns:
            bool: True if updated successfully, False otherwise.
        """
        try:
            update_data = {
                "end_time": datetime.utcnow().isoformat() + "Z",
                "status": "completed"
            }
            
            response = self.supabase.table("batches") \
                .update(update_data) \
                .eq("id", batch_id) \
                .execute()
                
            if response.data and len(response.data) > 0:
                logger.info(f"Marked batch {batch_id} as completed")
                return True
                
            logger.warning(f"Failed to update batch {batch_id}")
            return False
            
        except Exception as e:
            logger.error(f"Error completing batch {batch_id}: {str(e)}")
            return False
            
    async def add_batch_result(self, batch_id, machine_id, result):
        """
        Add a result entry to a batch operation.
        
        Args:
            batch_id (str): ID of the batch.
            machine_id (str): ID of the machine.
            result (dict): Result data from price update operation.
            
        Returns:
            bool: True if added successfully, False otherwise.
        """
        try:
            # Get machine name
            machine = await self.get_machine_by_id(machine_id)
            machine_name = machine.get("Machine Name") if machine else "Unknown"
            
            # Calculate duration if we have start and end times
            duration = None
            if "start_time" in result and "end_time" in result:
                try:
                    start = datetime.fromisoformat(result["start_time"].replace('Z', '+00:00'))
                    end = datetime.fromisoformat(result["end_time"].replace('Z', '+00:00'))
                    duration = (end - start).total_seconds()
                except (ValueError, TypeError):
                    pass
            
            # Get URL used
            url = result.get("url")
            if not url and machine:
                url_sources = ['product_link', 'Affiliate Link', 'url']
                for source in url_sources:
                    if source in machine and machine.get(source):
                        url = machine.get(source)
                        break
            
            # Ensure start_time is set if not provided
            current_time = datetime.utcnow().isoformat() + "Z"
            
            # Create a batch_results entry
            entry_data = {
                "batch_id": batch_id,
                "machine_id": machine_id,
                "machine_name": machine_name,
                "success": result.get("success", False),
                "old_price": result.get("old_price"),
                "new_price": result.get("new_price"),
                "extraction_method": result.get("method"),
                "error": result.get("error"),
                "duration_seconds": duration,
                "url": result.get("url"),
                "html_size": result.get("html_size"),
                "start_time": result.get("start_time", current_time),
                "end_time": result.get("end_time", current_time)
            }
            
            response = self.supabase.table("batch_results") \
                .insert(entry_data) \
                .execute()
                
            if response.data and len(response.data) > 0:
                logger.info(f"Added result for machine {machine_id} to batch {batch_id}")
                return True
                
            logger.warning(f"Failed to add result for machine {machine_id} to batch {batch_id}")
            return False
            
        except Exception as e:
            logger.error(f"Error adding batch result for machine {machine_id}: {str(e)}")
            return False
            
    async def get_batch_results(self, batch_id):
        """
        Get results for a batch operation.
        
        Args:
            batch_id (str): ID of the batch.
            
        Returns:
            dict: Results indexed by machine ID.
        """
        try:
            # Query batch results table
            response = self.supabase.table("batch_results") \
                .select("*") \
                .eq("batch_id", batch_id) \
                .execute()
                
            if not response.data:
                logger.warning(f"No results found for batch {batch_id}")
                return {}
                
            # Index results by machine_id for easy lookup
            results = {}
            for result in response.data:
                results[result.get("machine_id")] = result
                
            return results
            
        except Exception as e:
            logger.error(f"Error getting batch results for batch {batch_id}: {str(e)}")
            return {}
            
    async def get_batch_stats(self, batch_id):
        """
        Get statistics for a batch operation.
        
        Args:
            batch_id (str): ID of the batch.
            
        Returns:
            dict: Batch statistics.
        """
        try:
            # Get batch metadata
            batch_response = self.supabase.table("batches") \
                .select("*") \
                .eq("id", batch_id) \
                .single() \
                .execute()
                
            if not batch_response.data:
                logger.warning(f"No batch found with ID {batch_id}")
                return None
                
            batch = batch_response.data
            
            # Prepare success counts
            success_counts = {
                "total": 0,
                "successful": 0,
                "failed": 0,
                "percent_complete": 0
            }
            
            # Count successful results - use separate queries instead of group()
            successful_response = self.supabase.table("batch_results") \
                .select("*", count="exact") \
                .eq("batch_id", batch_id) \
                .eq("success", True) \
                .execute()
                
            # Count failed results
            failed_response = self.supabase.table("batch_results") \
                .select("*", count="exact") \
                .eq("batch_id", batch_id) \
                .eq("success", False) \
                .execute()
            
            # Calculate status counts
            if successful_response and hasattr(successful_response, 'count'):
                success_counts["successful"] = successful_response.count
            elif successful_response and successful_response.data:
                success_counts["successful"] = len(successful_response.data)
                
            if failed_response and hasattr(failed_response, 'count'):
                success_counts["failed"] = failed_response.count
            elif failed_response and failed_response.data:
                success_counts["failed"] = len(failed_response.data)
                
            success_counts["total"] = success_counts["successful"] + success_counts["failed"]
            
            # Calculate percent complete if we know the total
            if batch.get("total_machines", 0) > 0:
                expected_total = batch.get("total_machines")
                success_counts["percent_complete"] = (success_counts["total"] / expected_total) * 100
            
            # Get stats about price changes
            price_stats = {
                "updated": 0,
                "unchanged": 0,
                "increased": 0,
                "decreased": 0,
                "avg_change_pct": None,
                "max_increase_pct": None,
                "max_decrease_pct": None
            }
            
            # Manually calculate price changes instead of using database function
            try:
                # Get all successful results with price data
                price_data_response = self.supabase.table("batch_results") \
                    .select("old_price, new_price") \
                    .eq("batch_id", batch_id) \
                    .eq("success", True) \
                    .not_.is_("old_price", "null") \
                    .not_.is_("new_price", "null") \
                    .execute()
                
                if price_data_response.data and len(price_data_response.data) > 0:
                    for result in price_data_response.data:
                        old_price = result.get("old_price")
                        new_price = result.get("new_price")
                        
                        if old_price is not None and new_price is not None:
                            if new_price > old_price:
                                price_stats["increased"] += 1
                            elif new_price < old_price:
                                price_stats["decreased"] += 1
                            else:
                                price_stats["unchanged"] += 1
                    
                    price_stats["updated"] = price_stats["increased"] + price_stats["decreased"]
            except Exception as e:
                logger.warning(f"Error calculating price stats for batch {batch_id}: {str(e)}")
            
            return {
                "batch": batch,
                "success_counts": success_counts,
                "price_stats": price_stats
            }
            
        except Exception as e:
            logger.exception(f"Error getting batch stats for batch {batch_id}: {str(e)}")
            return None

    async def update_batch_status(self, batch_id, status):
        """
        Update the status of a batch.
        
        Args:
            batch_id (str): ID of the batch to update.
            status (str): New status value.
            
        Returns:
            bool: True if updated successfully, False otherwise.
        """
        try:
            update_data = {
                "status": status
            }
            
            # If status is "completed", also update the end_time
            if status == "completed":
                update_data["end_time"] = datetime.utcnow().isoformat() + "Z"
            
            response = self.supabase.table("batches") \
                .update(update_data) \
                .eq("id", batch_id) \
                .execute()
                
            if response.data and len(response.data) > 0:
                logger.info(f"Updated batch {batch_id} status to {status}")
                return True
                
            logger.warning(f"Failed to update batch {batch_id} status")
            return False
            
        except Exception as e:
            logger.error(f"Error updating batch status for batch {batch_id}: {str(e)}")
            return False

    async def get_machines_by_url(self, url):
        """
        Get machines that have the specified URL.
        
        Args:
            url (str): The URL to search for.
            
        Returns:
            list: List of machine records that match the URL.
        """
        try:
            # Search for machines with matching product_link or Affiliate Link
            response = self.supabase.table("machines") \
                .select("*") \
                .or_(f'product_link.eq.{url},"Affiliate Link".eq.{url}') \
                .execute()
                
            return response.data or []
            
        except Exception as e:
            logger.error(f"Error getting machines by URL {url}: {str(e)}")
            return []

    async def update_machine_learned_selectors(self, machine_id, learned_selectors):
        """
        Update the learned_selectors field for a machine.
        
        Args:
            machine_id (str): The ID of the machine to update.
            learned_selectors (dict): The learned selectors data.
            
        Returns:
            bool: True if updated successfully, False otherwise.
        """
        try:
            response = self.supabase.table("machines") \
                .update({"learned_selectors": learned_selectors}) \
                .eq("id", machine_id) \
                .execute()
                
            if response.data and len(response.data) > 0:
                logger.info(f"Updated learned selectors for machine {machine_id}")
                return True
                
            logger.warning(f"Failed to update learned selectors for machine {machine_id}")
            return False
            
        except Exception as e:
            logger.error(f"Error updating learned selectors for machine {machine_id}: {str(e)}")
            return False
    
    async def get_batch_results_since(self, cutoff_date):
        """
        Get all batch results since a specific date for learning analysis.
        
        Args:
            cutoff_date: datetime to get results since
            
        Returns:
            List of batch result records
        """
        try:
            # Get batch results with machine and pricing data
            response = self.supabase.table("batch_results") \
                .select("""
                    *,
                    machines!inner(
                        Machine Name,
                        Company,
                        product_link,
                        Price
                    )
                """) \
                .gte("created_at", cutoff_date.isoformat()) \
                .order("created_at", desc=True) \
                .execute()
            
            if response.data:
                # Flatten the data for easier analysis
                results = []
                for record in response.data:
                    machine = record.get("machines", {})
                    result = {
                        "id": record.get("id"),
                        "machine_id": record.get("machine_id"),
                        "machine_name": machine.get("Machine Name"),
                        "company": machine.get("Company"),
                        "url": machine.get("product_link"),
                        "old_price": record.get("old_price"),
                        "new_price": record.get("new_price"),
                        "success": record.get("success"),
                        "error": record.get("error_message"),
                        "method": record.get("extraction_method"),
                        "date": record.get("created_at"),
                        "batch_id": record.get("batch_id")
                    }
                    results.append(result)
                
                logger.info(f"Retrieved {len(results)} batch results since {cutoff_date}")
                return results
            
            return []
            
        except Exception as e:
            logger.error(f"Error getting batch results since {cutoff_date}: {str(e)}")
            return [] 