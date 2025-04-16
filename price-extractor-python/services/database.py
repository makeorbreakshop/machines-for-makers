from supabase import create_client
from datetime import datetime
from loguru import logger
import json

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
    
    def get_machine_by_id(self, machine_id):
        """
        Get a machine by its ID.
        
        Args:
            machine_id (str): The ID of the machine to retrieve.
            
        Returns:
            dict: The machine data, or None if not found.
        """
        try:
            response = self.supabase.table(MACHINES_TABLE) \
                .select("*") \
                .eq("id", machine_id) \
                .execute()
            
            if response.data and len(response.data) > 0:
                return response.data[0]
            return None
        except Exception as e:
            logger.error(f"Error getting machine with ID {machine_id}: {str(e)}")
            return None
    
    def update_machine_price(self, machine_id, new_price, html_content=None):
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
            update_data = {
                "Price": new_price,
                "html_timestamp": datetime.utcnow().isoformat(),
            }
            
            if html_content:
                update_data["html_content"] = html_content
                update_data["html_size"] = len(html_content)
            
            response = self.supabase.table(MACHINES_TABLE) \
                .update(update_data) \
                .eq("id", machine_id) \
                .execute()
            
            if response.data and len(response.data) > 0:
                logger.info(f"Updated price for machine {machine_id} to {new_price}")
                return True
            logger.warning(f"No machine found with ID {machine_id} to update")
            return False
        except Exception as e:
            logger.error(f"Error updating price for machine {machine_id}: {str(e)}")
            return False
    
    def add_price_history(self, machine_id, old_price, new_price, success=True, error_message=None):
        """
        Add a new entry to the price history table.
        
        Args:
            machine_id (str): The ID of the machine.
            old_price (float): The previous price.
            new_price (float): The new price.
            success (bool): Whether the price extraction was successful.
            error_message (str, optional): Error message if extraction failed.
            
        Returns:
            bool: True if entry was added successfully, False otherwise.
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
            
            entry = {
                "machine_id": machine_id,
                "price": new_price,
                "date": datetime.utcnow().isoformat(),
                "source": "auto-scraper",
                "currency": "USD",
                "previous_price": old_price,
                "price_change": price_change,
                "percentage_change": percentage_change
            }
            
            # Calculate if this is an all-time high or low
            # This would require additional queries to determine
            # For simplicity, we're not implementing that now
            
            response = self.supabase.table(PRICE_HISTORY_TABLE) \
                .insert(entry) \
                .execute()
            
            if response.data and len(response.data) > 0:
                logger.info(f"Added price history entry for machine {machine_id}")
                return True
            logger.warning(f"Failed to add price history entry for machine {machine_id}")
            return False
        except Exception as e:
            logger.error(f"Error adding price history for machine {machine_id}: {str(e)}")
            return False
    
    def get_machines_needing_update(self, days_threshold=7):
        """
        Get all machines that need a price update (older than the threshold).
        
        Args:
            days_threshold (int): Number of days to consider a price as needing update.
            
        Returns:
            list: List of machines needing price updates.
        """
        try:
            # Get all machines with product_link
            response = self.supabase.table(MACHINES_TABLE) \
                .select("*") \
                .not_.is_("product_link", "null") \
                .execute()
            
            # Filter machines based on html_timestamp or last update
            machines = []
            # Make sure we use an aware datetime object for consistency
            now = datetime.utcnow().replace(tzinfo=None)  # Make naive for comparison
            
            for machine in response.data:
                # Skip machines without a product link
                if not machine.get("product_link"):
                    continue
                    
                # Check if html_timestamp exists and is older than threshold
                if "html_timestamp" not in machine or machine["html_timestamp"] is None:
                    machines.append(machine)
                    continue
                
                try:
                    # Parse the timestamp and ensure it's a naive datetime for comparison
                    timestamp_str = machine["html_timestamp"]
                    
                    # Handle different timestamp formats
                    if "Z" in timestamp_str:
                        # Remove the Z and any timezone info to make it naive
                        timestamp_str = timestamp_str.replace("Z", "")
                        if "+" in timestamp_str:
                            timestamp_str = timestamp_str.split("+")[0]
                        elif "-" in timestamp_str and "T" in timestamp_str:
                            # Make sure we're not splitting on the date separator
                            date_part, time_part = timestamp_str.split("T")
                            if "-" in time_part:
                                timestamp_str = f"{date_part}T{time_part.split('-')[0]}"
                    
                    # Convert to datetime object
                    last_updated = datetime.fromisoformat(timestamp_str)
                    
                    # Make sure it's naive by removing timezone info if present
                    if last_updated.tzinfo is not None:
                        last_updated = last_updated.replace(tzinfo=None)
                    
                    days_since_update = (now - last_updated).days
                    
                    if days_since_update >= days_threshold:
                        machines.append(machine)
                except (ValueError, AttributeError) as e:
                    # If there's an issue parsing the timestamp, log the error and include the machine
                    logger.warning(f"Error parsing timestamp for machine {machine.get('id')}: {e}, timestamp: {machine.get('html_timestamp')}")
                    machines.append(machine)
            
            return machines
        except Exception as e:
            logger.error(f"Error getting machines needing update: {str(e)}")
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
                # Process the data to calculate price changes
                history_entries = response.data
                
                # Add price change information if there are multiple entries
                if len(history_entries) > 1:
                    for i in range(len(history_entries) - 1):
                        current_price = float(history_entries[i]["price"])
                        previous_price = float(history_entries[i + 1]["price"])
                        
                        history_entries[i]["previous_price"] = previous_price
                        history_entries[i]["price_change"] = current_price - previous_price
                        history_entries[i]["percentage_change"] = (
                            ((current_price - previous_price) / previous_price) * 100 
                            if previous_price > 0 else 0
                        )
                
                # For the oldest entry, we don't have a previous price to compare with
                if history_entries and len(history_entries) > 0:
                    oldest_entry = history_entries[-1]
                    oldest_entry["previous_price"] = None
                    oldest_entry["price_change"] = 0
                    oldest_entry["percentage_change"] = 0
                
                logger.info(f"Retrieved {len(history_entries)} price history entries for machine {machine_id}")
                return history_entries
            
            logger.info(f"No price history found for machine {machine_id}")
            return []
        except Exception as e:
            logger.error(f"Error getting price history for machine {machine_id}: {str(e)}")
            return []
            
    def get_batch_results(self, batch_id):
        """
        Efficiently retrieve batch results without triggering heavy processing.
        
        Args:
            batch_id (str): The ID of the batch to retrieve results for.
            
        Returns:
            dict: Dictionary of batch entries.
        """
        try:
            # Query the batch_results table using an index for efficient lookup
            response = self.supabase.table('batch_results') \
                .select("*") \
                .eq("batch_id", batch_id) \
                .execute()
                
            if not response.data or len(response.data) == 0:
                logger.warning(f"No batch results found for batch_id: {batch_id}")
                return {}
                
            # Convert list to a dictionary keyed by machine_id for efficient frontend lookup
            results_dict = {}
            for entry in response.data:
                machine_id = entry.get("machine_id")
                if machine_id:
                    results_dict[machine_id] = entry
                    
            logger.info(f"Retrieved {len(results_dict)} batch result entries for batch_id: {batch_id}")
            return results_dict
        except Exception as e:
            logger.error(f"Error retrieving batch results for batch_id {batch_id}: {str(e)}")
            return {}
            
    def get_batch_stats(self, batch_id):
        """
        Get aggregated statistics for a batch operation.
        
        Args:
            batch_id (str): The ID of the batch to retrieve stats for.
            
        Returns:
            dict: Statistics about the batch operation.
        """
        try:
            # Get batch metadata from the batches table
            metadata_response = self.supabase.table('batches') \
                .select("*") \
                .eq("id", batch_id) \
                .execute()
                
            # Get count statistics using efficient COUNT queries rather than fetching all data
            counts_response = self.supabase.rpc(
                'get_batch_stats', 
                {'batch_id_param': batch_id}
            ).execute()
            
            # Extract metadata
            metadata = {}
            if metadata_response.data and len(metadata_response.data) > 0:
                metadata = metadata_response.data[0]
                
            # Extract counts
            counts = {}
            if counts_response.data:
                counts = counts_response.data[0] if len(counts_response.data) > 0 else {}
                
            # Combine data
            start_time = metadata.get("start_time")
            end_time = metadata.get("end_time")
            
            # Calculate completion percentage
            total_machines = counts.get("total_machines", 0)
            completed_machines = counts.get("completed_machines", 0)
            progress_percentage = 0
            
            if total_machines > 0:
                progress_percentage = (completed_machines / total_machines) * 100
                
            # Return combined stats
            stats = {
                "batch_id": batch_id,
                "start_time": start_time,
                "end_time": end_time,
                "total_machines": total_machines,
                "completed_machines": completed_machines,
                "successful_machines": counts.get("successful_machines", 0),
                "failed_machines": counts.get("failed_machines", 0),
                "updated_prices": counts.get("updated_prices", 0),
                "unchanged_prices": counts.get("unchanged_prices", 0),
                "progress_percentage": round(progress_percentage, 1)
            }
            
            return stats
        except Exception as e:
            logger.error(f"Error retrieving batch stats for batch_id {batch_id}: {str(e)}")
            # Return minimal stats to avoid frontend errors
            return {
                "batch_id": batch_id,
                "total_machines": 0,
                "completed_machines": 0,
                "successful_machines": 0,
                "failed_machines": 0,
                "updated_prices": 0,
                "unchanged_prices": 0,
                "progress_percentage": 0
            } 