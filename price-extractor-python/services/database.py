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
                "price": new_price,
                "price_last_updated": datetime.utcnow().isoformat(),
            }
            
            if html_content:
                update_data["html_content"] = html_content
            
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
            entry = {
                "machine_id": machine_id,
                "old_price": old_price,
                "new_price": new_price,
                "timestamp": datetime.utcnow().isoformat(),
                "success": success
            }
            
            if error_message:
                entry["error_message"] = error_message
            
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
            # This is a simplified query. In a real implementation, you might need
            # a more complex query to calculate the days since last update
            response = self.supabase.table(MACHINES_TABLE) \
                .select("*") \
                .execute()
            
            # Filter machines based on price_last_updated
            machines = []
            now = datetime.utcnow()
            
            for machine in response.data:
                if "price_last_updated" not in machine or machine["price_last_updated"] is None:
                    machines.append(machine)
                    continue
                
                last_updated = datetime.fromisoformat(machine["price_last_updated"].replace("Z", "+00:00"))
                days_since_update = (now - last_updated).days
                
                if days_since_update >= days_threshold:
                    machines.append(machine)
            
            return machines
        except Exception as e:
            logger.error(f"Error getting machines needing update: {str(e)}")
            return [] 