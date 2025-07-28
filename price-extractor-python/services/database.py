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
    
    async def add_price_history(self, machine_id, old_price, new_price, success=True, error_message=None, batch_id=None, status=None):
        """
        Add an entry to the price history for a machine.
        
        Args:
            machine_id (str): The ID of the machine.
            old_price (float): The previous price value.
            new_price (float): The new price value.
            success (bool): Whether the price update was successful.
            error_message (str, optional): Error message if the update failed.
            batch_id (str, optional): The batch ID if this update is part of a batch.
            status (str, optional): Override status (e.g., 'MANUAL_CORRECTION').
            
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
            
            # Add batch_id if provided
            if batch_id:
                entry_data["batch_id"] = batch_id
            
            # Set status based on status parameter or success/error_message
            if status:
                entry_data["status"] = status
            elif success:
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
        Get machines that need price updates based on last price check (price_history), not last price change.
        
        Args:
            days_threshold (int): Days threshold for considering a machine needs update.
                                 If 0, returns all machines regardless of update time.
            machine_ids (List[str], optional): List of specific machine IDs to update.
            limit (Optional[int], optional): Maximum number of machines to return.
            
        Returns:
            List[Dict]: List of machines needing updates.
        """
        try:
            selected_columns = "id, \"Machine Name\", \"Company\", Price, product_link, \"Affiliate Link\", html_timestamp, price_tracking_enabled"
            
            # If specific machine IDs are provided, only get those
            if machine_ids:
                logger.info(f"Getting {len(machine_ids)} specific machines for batch update")
                query = (
                    self.supabase.table("machines")
                    .select(selected_columns)
                    .in_("id", machine_ids)
                    .eq("price_tracking_enabled", True)  # Only include machines with price tracking enabled
                )
                
                # Execute the query for specific machine IDs
                response = query.execute()
                machines = response.data
                
                if not machines:
                    logger.warning(f"No machines found for provided IDs (after filtering exclusions): {machine_ids[:5]}...")
                    return []
                
                excluded_count = len(machine_ids) - len(machines)
                if excluded_count > 0:
                    logger.info(f"Excluded {excluded_count} machines with price tracking disabled from batch")
                
                logger.info(f"Found {len(machines)} machines for specific IDs (after filtering)")
                return machines
            elif days_threshold > 0:
                # Use the database function for efficient filtering
                logger.info(f"Finding machines that haven't been checked in {days_threshold} days using database function")
                
                try:
                    # Use the Supabase database function
                    response = self.supabase.rpc(
                        'get_machines_needing_price_check', 
                        {
                            'days_threshold': days_threshold,
                            'machine_limit': limit
                        }
                    ).execute()
                    
                    if response.data:
                        machines = response.data
                        logger.info(f"Found {len(machines)} machines needing price check (not checked in {days_threshold} days)")
                        return machines
                    else:
                        logger.info("No machines found needing price check")
                        return []
                        
                except Exception as e:
                    logger.warning(f"Database function failed, falling back to manual method: {str(e)}")
                    
                    # Fallback to manual method if function doesn't exist
                    today = datetime.now()
                    threshold_date = today - timedelta(days=days_threshold)
                    
                    logger.info(f"Finding machines that haven't been checked since {threshold_date.isoformat()}")
                    
                    # Get all machines first (only those with price tracking enabled)
                    all_machines_response = (
                        self.supabase.table("machines")
                        .select(selected_columns)
                        .eq("price_tracking_enabled", True)
                        .execute()
                    )
                    
                    if not all_machines_response.data:
                        logger.info("No machines found in database")
                        return []
                    
                    machines_needing_update = []
                    
                    # Check each machine's last price history entry
                    for machine in all_machines_response.data:
                        machine_id = machine.get("id")
                        
                        # Get the most recent price history entry for this machine
                        history_response = (
                            self.supabase.table("price_history")
                            .select("date")
                            .eq("machine_id", machine_id)
                            .order("date", desc=True)
                            .limit(1)
                            .execute()
                        )
                        
                        # Check if machine needs update
                        needs_update = False
                        if not history_response.data:
                            # Never checked
                            needs_update = True
                            logger.debug(f"Machine {machine_id} never checked - needs update")
                        else:
                            last_check = datetime.fromisoformat(history_response.data[0]["date"].replace('Z', '+00:00'))
                            if last_check < threshold_date:
                                # Last checked before threshold
                                needs_update = True
                                logger.debug(f"Machine {machine_id} last checked {last_check} - needs update")
                            else:
                                logger.debug(f"Machine {machine_id} last checked {last_check} - no update needed")
                        
                        if needs_update:
                            machines_needing_update.append(machine)
                            
                        # Apply limit
                        if limit and len(machines_needing_update) >= limit:
                            logger.info(f"Reached limit of {limit} machines")
                            break
                    
                    logger.info(f"Found {len(machines_needing_update)} machines needing price check (fallback method)")
                    return machines_needing_update
            else:
                # If days_threshold is 0, we're getting all machines
                query = (
                    self.supabase.table("machines")
                    .select(selected_columns)
                )
                
                # Apply limit if provided
                if limit is not None:
                    query = query.limit(limit)
                    logger.info(f"Limiting query to {limit} machines")
                
                # Execute the query
                response = query.execute()
                machines = response.data
                
                if not machines:
                    logger.info("No machines found for price update")
                    return []
                
                logger.info(f"Found {len(machines)} machines for price update (all machines)")
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
                "excluded": 0,
                "percent_complete": 0
            }
            
            # Count successful results - use separate queries instead of group()
            successful_response = self.supabase.table("batch_results") \
                .select("*", count="exact") \
                .eq("batch_id", batch_id) \
                .eq("success", True) \
                .execute()
                
            # Count failed results - excluding intentionally skipped machines
            failed_response = self.supabase.table("batch_results") \
                .select("*", count="exact") \
                .eq("batch_id", batch_id) \
                .eq("success", False) \
                .not_.like("error_message", "%excluded from price tracking%") \
                .execute()
                
            # Count excluded/skipped machines
            excluded_response = self.supabase.table("batch_results") \
                .select("*", count="exact") \
                .eq("batch_id", batch_id) \
                .eq("success", False) \
                .like("error_message", "%excluded from price tracking%") \
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
                
            if excluded_response and hasattr(excluded_response, 'count'):
                success_counts["excluded"] = excluded_response.count
            elif excluded_response and excluded_response.data:
                success_counts["excluded"] = len(excluded_response.data)
                
            success_counts["total"] = success_counts["successful"] + success_counts["failed"] + success_counts["excluded"]
            
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
            
            # Get details about excluded machines if any exist
            excluded_machines = []
            if success_counts["excluded"] > 0:
                try:
                    excluded_details = self.supabase.table("batch_results") \
                        .select("machine_id, url") \
                        .eq("batch_id", batch_id) \
                        .eq("success", False) \
                        .like("error_message", "%excluded from price tracking%") \
                        .execute()
                    
                    if excluded_details.data:
                        # Get machine names for the excluded machines
                        machine_ids = [r["machine_id"] for r in excluded_details.data]
                        machines_response = self.supabase.table("machines") \
                            .select("id, Machine Name") \
                            .in_("id", machine_ids) \
                            .execute()
                        
                        if machines_response.data:
                            machine_names = {m["id"]: m["Machine Name"] for m in machines_response.data}
                            for result in excluded_details.data:
                                excluded_machines.append({
                                    "machine_id": result["machine_id"],
                                    "machine_name": machine_names.get(result["machine_id"], "Unknown"),
                                    "url": result["url"]
                                })
                except Exception as e:
                    logger.warning(f"Could not get excluded machine details: {str(e)}")
            
            return {
                "batch": batch,
                "success_counts": success_counts,
                "price_stats": price_stats,
                "excluded_machines": excluded_machines
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

    async def update_price_history_entry(self, price_history_id, new_price, status="MANUAL_CORRECTION", correction_reason=None):
        """
        Update an existing price history entry with corrected price.
        
        Args:
            price_history_id (str): The ID of the price history entry to update.
            new_price (float): The corrected price.
            status (str): New status for the entry.
            correction_reason (str, optional): Reason for the correction.
            
        Returns:
            dict or None: Updated price history entry or None if failed.
        """
        try:
            update_data = {
                "price": new_price,
                "status": status
            }
            
            if correction_reason:
                update_data["failure_reason"] = correction_reason
                
            response = self.supabase.table(PRICE_HISTORY_TABLE) \
                .update(update_data) \
                .eq("id", price_history_id) \
                .execute()
                
            if response.data and len(response.data) > 0:
                logger.info(f"Updated price history entry {price_history_id} with corrected price {new_price}")
                return response.data[0]
                
            logger.warning(f"Failed to update price history entry {price_history_id}")
            return None
            
        except Exception as e:
            logger.error(f"Error updating price history entry {price_history_id}: {str(e)}")
            return None

    async def add_price_correction(self, machine_id, batch_id, extracted_price, correct_price, 
                                 extraction_method, url, corrected_by, html_content=None, reason=None):
        """
        Add a price correction entry for analysis.
        
        Args:
            machine_id (str): The ID of the machine.
            batch_id (str): The batch ID where the mistake occurred.
            extracted_price (float): The incorrectly extracted price.
            correct_price (float): The correct price provided by user.
            extraction_method (str): Method that was used for extraction.
            url (str): URL that was scraped.
            corrected_by (str): Who made the correction.
            html_content (str, optional): HTML content for analysis.
            reason (str, optional): Additional reason/notes.
            
        Returns:
            bool: True if correction was logged successfully, False otherwise.
        """
        try:
            correction_data = {
                "machine_id": machine_id,
                "batch_id": batch_id,
                "extracted_price": extracted_price,
                "correct_price": correct_price,
                "extraction_method": extraction_method,
                "url": url,
                "corrected_by": corrected_by,
                "corrected_at": datetime.utcnow().isoformat() + "Z"
            }
            
            if html_content:
                correction_data["html_content"] = html_content
                
            if reason:
                correction_data["reason"] = reason
                
            response = self.supabase.table("price_corrections") \
                .insert(correction_data) \
                .execute()
                
            if response.data and len(response.data) > 0:
                logger.info(f"Added price correction for machine {machine_id}: {extracted_price} -> {correct_price}")
                return True
                
            logger.warning(f"Failed to add price correction for machine {machine_id}")
            return False
            
        except Exception as e:
            logger.error(f"Error adding price correction for machine {machine_id}: {str(e)}")
            return False

    async def get_price_corrections_by_batch(self, batch_id):
        """
        Get all price corrections for a specific batch.
        
        Args:
            batch_id (str): The batch ID to get corrections for.
            
        Returns:
            list: List of price correction records.
        """
        try:
            response = self.supabase.table("price_corrections") \
                .select("*") \
                .eq("batch_id", batch_id) \
                .order("corrected_at", desc=True) \
                .execute()
                
            return response.data or []
            
        except Exception as e:
            logger.error(f"Error getting price corrections for batch {batch_id}: {str(e)}")
            return []
    
    async def fix_bad_learned_selectors(self):
        """
        Remove bad learned selectors that are causing incorrect price extractions.
        Specifically targets .bundle-price selectors that extract bundle pricing instead of product pricing.
        """
        try:
            logger.info("🔧 Starting fix for bad learned selectors...")
            
            # Get all machines with learned selectors
            response = self.supabase.table(MACHINES_TABLE) \
                .select("id, Machine Name, learned_selectors") \
                .execute()
            
            if not response.data:
                logger.info("No machines found with learned selectors")
                return 0
            
            affected_machines = []
            
            # Identify machines with bad bundle-price selectors
            for machine in response.data:
                learned = machine.get('learned_selectors', {})
                machine_name = machine.get('Machine Name', 'Unknown')
                machine_id = machine['id']
                
                needs_fix = False
                domains_to_fix = []
                
                # Check ComMarker domain
                if 'commarker.com' in learned:
                    selector = learned['commarker.com'].get('selector', '')
                    if 'bundle-price' in selector:
                        domains_to_fix.append(('commarker.com', selector))
                        needs_fix = True
                
                # Check Glowforge domain
                if 'glowforge.com' in learned:
                    selector = learned['glowforge.com'].get('selector', '')
                    if 'bundle-price' in selector:
                        domains_to_fix.append(('glowforge.com', selector))
                        needs_fix = True
                
                if needs_fix:
                    affected_machines.append((machine_id, machine_name, domains_to_fix, learned))
            
            if not affected_machines:
                logger.info("✅ No bad learned selectors found!")
                return 0
            
            logger.info(f"Found {len(affected_machines)} machines with bad selectors:")
            for machine_id, name, domains, _ in affected_machines:
                for domain, selector in domains:
                    logger.info(f"  - {name}: {domain} → {selector}")
            
            # Fix each machine
            fixed_count = 0
            for machine_id, name, domains_to_fix, current_selectors in affected_machines:
                try:
                    # Remove bad domains from learned_selectors
                    updated_selectors = current_selectors.copy()
                    for domain, selector in domains_to_fix:
                        if domain in updated_selectors:
                            del updated_selectors[domain]
                            logger.info(f"🗑️  Removing bad selector for {name}: {domain} → {selector}")
                    
                    # Update the machine
                    update_response = self.supabase.table(MACHINES_TABLE) \
                        .update({"learned_selectors": updated_selectors}) \
                        .eq("id", machine_id) \
                        .execute()
                    
                    if update_response.data:
                        logger.info(f"✅ Fixed: {name}")
                        fixed_count += 1
                    else:
                        logger.error(f"❌ Failed to update: {name}")
                        
                except Exception as e:
                    logger.error(f"❌ Error fixing {name}: {str(e)}")
            
            logger.info(f"🎯 FIXED {fixed_count} machines!")
            logger.info("The bad .bundle-price .main-amount selectors have been removed.")
            logger.info("These selectors were causing machines to extract $4,589 from bundle pricing instead of actual product prices.")
            logger.info("Next batch run should now extract correct prices!")
            
            return fixed_count
            
        except Exception as e:
            logger.error(f"Error fixing learned selectors: {str(e)}")
            return 0 

    async def execute_query(self, query: str, params: List = None):
        """
        Execute a raw SQL query with optional parameters.
        
        Args:
            query (str): SQL query to execute
            params (List, optional): Parameters for the query
            
        Returns:
            List[Dict]: Query results
        """
        try:
            if params:
                # For parameterized queries, we need to substitute parameters manually
                # since Supabase RPC doesn't support parameterized queries directly
                
                # Convert %s placeholders to actual values for safety
                param_query = query
                for i, param in enumerate(params):
                    # Find first %s and replace with the actual parameter value
                    if isinstance(param, str):
                        # Escape single quotes for SQL safety and always quote strings
                        escaped_param = param.replace("'", "''")
                        param_query = param_query.replace('%s', f"'{escaped_param}'", 1)
                    elif param is None:
                        param_query = param_query.replace('%s', 'NULL', 1)
                    elif isinstance(param, (int, float)):
                        # Numbers don't need quotes
                        param_query = param_query.replace('%s', str(param), 1)
                    else:
                        # For any other type, convert to string and quote it
                        escaped_param = str(param).replace("'", "''")
                        param_query = param_query.replace('%s', f"'{escaped_param}'", 1)
                
                logger.info(f"Executing parameterized query: {param_query}")
                response = self.supabase.rpc('execute_sql', {'sql': param_query}).execute()
            else:
                # Use the execute_sql function for non-parameterized queries
                response = self.supabase.rpc('execute_sql', {'sql': query}).execute()
            
            return response.data or []
            
        except Exception as e:
            logger.error(f"Error executing query: {str(e)}")
            return []
    
    async def get_machine_categories(self):
        """Get all machine categories using database function"""
        try:
            response = self.supabase.rpc('get_machine_categories').execute()
            return response.data or []
        except Exception as e:
            logger.error(f"Error getting machine categories: {str(e)}")
            return []
    
    async def get_machines_by_category(self, category: str):
        """Get machines by category using database function"""
        try:
            response = self.supabase.rpc('get_machines_by_category', {'category_name': category}).execute()
            return response.data or []
        except Exception as e:
            logger.error(f"Error getting machines for category {category}: {str(e)}")
            return []

    async def create_scan_record(self, site_id: str, site_name: str) -> Optional[str]:
        """Create a new scan record in site_scan_logs table"""
        try:
            scan_data = {
                "id": str(uuid.uuid4()),
                "site_id": site_id,
                "scan_type": "discovery",
                "status": "running",
                "started_at": datetime.utcnow().isoformat() + "Z",
                "products_found": 0,
                "products_processed": 0,
                "products_imported": 0,
                "scan_metadata": {"site_name": site_name}
            }
            
            response = self.supabase.table("site_scan_logs").insert(scan_data).execute()
            
            if response.data:
                logger.info(f"Created scan record: {scan_data['id']}")
                return scan_data["id"]
            return None
            
        except Exception as e:
            logger.error(f"Error creating scan record: {str(e)}")
            return None
    
    async def get_scan_status(self, scan_id: str) -> Optional[Dict]:
        """Get scan status from site_scan_logs table"""
        try:
            response = self.supabase.table("site_scan_logs").select("*").eq("id", scan_id).single().execute()
            return response.data
        except Exception as e:
            logger.error(f"Error getting scan status: {str(e)}")
            return None
    
    async def update_scan_record(self, scan_id: str, status: str, **kwargs):
        """Update scan record with progress or completion"""
        try:
            update_data = {
                "status": status
            }
            
            # Add optional fields - map to correct column names
            if "total_urls" in kwargs:
                update_data["products_found"] = kwargs["total_urls"]
            if "processed_urls" in kwargs:
                update_data["products_processed"] = kwargs["processed_urls"]
            if "discovered_products" in kwargs:
                update_data["products_found"] = kwargs["discovered_products"]
            if "errors" in kwargs:
                update_data["error_message"] = str(kwargs["errors"])
            if "error_message" in kwargs:
                update_data["error_message"] = kwargs["error_message"]
            if "products_imported" in kwargs:
                update_data["products_imported"] = kwargs["products_imported"]
            if "scan_metadata" in kwargs:
                update_data["scan_metadata"] = kwargs["scan_metadata"]
            if "ai_cost_usd" in kwargs:
                update_data["ai_cost_usd"] = kwargs["ai_cost_usd"]
            
            # Set completed_at if status is completed or failed
            if status in ["completed", "failed"]:
                update_data["completed_at"] = datetime.utcnow().isoformat() + "Z"
                
                # Calculate total AI cost from discovered_machines if not provided
                if "ai_cost_usd" not in kwargs and status == "completed":
                    try:
                        # Get all discovered machines for this scan and sum their AI costs
                        machines_response = self.supabase.table("discovered_machines") \
                            .select("ai_extraction_cost") \
                            .eq("scan_log_id", scan_id) \
                            .execute()
                        
                        if machines_response.data:
                            total_cost = sum(
                                m.get("ai_extraction_cost", 0) 
                                for m in machines_response.data 
                                if m.get("ai_extraction_cost") is not None
                            )
                            if total_cost > 0:
                                update_data["ai_cost_usd"] = total_cost
                                logger.info(f"Calculated total AI cost for scan {scan_id}: ${total_cost:.4f}")
                    except Exception as e:
                        logger.warning(f"Could not calculate AI cost for scan {scan_id}: {str(e)}")
            
            response = self.supabase.table("site_scan_logs").update(update_data).eq("id", scan_id).execute()
            
            if response.data:
                logger.info(f"Updated scan record {scan_id}: status={status}")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Error updating scan record: {str(e)}")
            return False
    
    async def store_discovered_machine(self, site_id: str, scan_id: str, data: Dict) -> bool:
        """
        Store a discovered machine in the discovered_machines table
        
        Args:
            site_id: The manufacturer site ID
            scan_id: The scan ID 
            data: The machine data to store
            
        Returns:
            bool: True if stored successfully
        """
        try:
            # Ensure normalized_data is properly structured
            normalized_data = data.get("normalized_data", {})
            
            # Debug logging to understand what we're receiving
            logger.info("=== DATABASE SERVICE DEBUG ===")
            logger.info(f"Received normalized_data type: {type(normalized_data)}")
            logger.info(f"Normalized data keys: {list(normalized_data.keys()) if isinstance(normalized_data, dict) else 'Not a dict'}")
            logger.info(f"Normalized data content: {json.dumps(normalized_data, indent=2, default=str)[:500]}...")
            logger.info("==============================")
            
            # Check for machine name in the expected field from Claude mapper
            machine_name_field = normalized_data.get("Machine Name") or normalized_data.get("name")
            
            if not normalized_data or not machine_name_field:
                logger.warning(f"Missing or empty normalized_data, using fallback. Original: {normalized_data}")
                normalized_data = {
                    "name": "Unknown",
                    "price": None,
                    "image_url": None,
                    "specifications": {}
                }
            else:
                # Ensure normalized_data has a 'name' field for consistency
                if "Machine Name" in normalized_data and "name" not in normalized_data:
                    normalized_data["name"] = normalized_data["Machine Name"]
            
            # Extract machine name for logging
            machine_name = normalized_data.get("name", "Unknown")
            
            # Extract AI extraction cost if available
            ai_cost = None
            raw_data = data.get("raw_data", {})
            if isinstance(raw_data, dict) and "_credits_used" in raw_data:
                # Scrapfly credits cost approximately $0.001 per credit
                ai_cost = raw_data.get("_credits_used", 0) * 0.001
            
            discovered_data = {
                "scan_log_id": scan_id,
                "source_url": data.get("source_url", ""),
                "raw_data": raw_data,
                "normalized_data": normalized_data,
                "status": data.get("status", "pending"),
                "validation_errors": data.get("validation_errors", []),
                "validation_warnings": data.get("validation_warnings", []),
                "machine_type": data.get("machine_type", "laser_cutter")
            }
            
            # Add AI extraction cost if available
            if ai_cost is not None:
                discovered_data["ai_extraction_cost"] = ai_cost
            
            # Log the data being stored for debugging
            logger.debug(f"Storing discovered machine: {machine_name}")
            logger.debug(f"Normalized data: {json.dumps(normalized_data, indent=2)[:500]}...")
            logger.debug(f"Validation errors: {discovered_data['validation_errors']}")
            logger.debug(f"Validation warnings: {discovered_data['validation_warnings']}")
            
            response = self.supabase.table("discovered_machines").insert(discovered_data).execute()
            
            if response.data:
                logger.info(f"✅ Stored discovered machine: {machine_name}")
                if ai_cost:
                    logger.info(f"   AI extraction cost: ${ai_cost:.4f}")
                return True
            
            logger.error(f"Failed to store machine {machine_name}: No data in response")
            return False
            
        except Exception as e:
            logger.error(f"Error storing discovered machine: {str(e)}")
            logger.error(f"Data that failed to store: {json.dumps(data, indent=2, default=str)[:1000]}...")
            return False

    async def get_discovered_machines(self) -> List[Dict]:
        """
        Get all discovered machines
        
        Returns:
            List[Dict]: List of discovered machine records
        """
        try:
            response = self.supabase.table("discovered_machines").select("*").execute()
            return response.data or []
        except Exception as e:
            logger.error(f"Error getting discovered machines: {str(e)}")
            return []

    async def update_discovered_machine_normalized_data(self, machine_id: str, normalized_data: Dict) -> bool:
        """
        Update the normalized_data field of a discovered machine
        
        Args:
            machine_id: The discovered machine ID
            normalized_data: The new normalized data to store
            
        Returns:
            bool: True if updated successfully
        """
        try:
            response = self.supabase.table("discovered_machines") \
                .update({"normalized_data": normalized_data}) \
                .eq("id", machine_id) \
                .execute()
            
            if response.data:
                logger.info(f"✅ Updated normalized data for machine {machine_id}")
                return True
            
            logger.error(f"Failed to update machine {machine_id}: No data in response")
            return False
            
        except Exception as e:
            logger.error(f"Error updating discovered machine {machine_id}: {str(e)}")
            return False

    async def close(self):
        """Close database connection if needed"""
        # Supabase client doesn't need explicit closing
        pass