from loguru import logger
from datetime import datetime

from services.database import DatabaseService
from scrapers.web_scraper import WebScraper
from scrapers.price_extractor import PriceExtractor

class PriceService:
    """Service to coordinate price extraction and database updates."""
    
    def __init__(self):
        """Initialize dependencies."""
        self.db_service = DatabaseService()
        self.web_scraper = WebScraper()
        self.price_extractor = PriceExtractor()
        logger.info("Price service initialized")
    
    async def update_machine_price(self, machine_id):
        """
        Update the price for a specific machine.
        
        Args:
            machine_id (str): The ID of the machine to update.
            
        Returns:
            dict: Result of the price update operation.
        """
        logger.info(f"Processing price update for machine {machine_id}")
        
        # Get machine data from the database
        machine = self.db_service.get_machine_by_id(machine_id)
        if not machine:
            error_msg = f"Machine with ID {machine_id} not found"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}
        
        # Check if URL is present
        url = machine.get("url")
        if not url or not self.web_scraper.is_valid_url(url):
            error_msg = f"Invalid or missing URL for machine {machine_id}: {url}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}
        
        # Scrape the page
        soup, html_content = self.web_scraper.get_page_content(url)
        if not soup or not html_content:
            error_msg = f"Failed to scrape page for machine {machine_id} at URL: {url}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}
        
        # Extract price
        new_price, method = self.price_extractor.extract_price(soup, html_content, url)
        if new_price is None:
            error_msg = f"Failed to extract price for machine {machine_id} at URL: {url}"
            logger.error(error_msg)
            
            # Record the failed attempt in price history
            old_price = machine.get("price")
            self.db_service.add_price_history(
                machine_id=machine_id,
                old_price=old_price,
                new_price=old_price,  # Same as old since we couldn't find a new one
                success=False,
                error_message=error_msg
            )
            
            return {"success": False, "error": error_msg}
        
        # Get the old price
        old_price = machine.get("price")
        
        # Skip update if the price hasn't changed
        if old_price == new_price:
            logger.info(f"Price unchanged for machine {machine_id}: {new_price}")
            
            # Record in price history anyway
            self.db_service.add_price_history(
                machine_id=machine_id,
                old_price=old_price,
                new_price=new_price,
                success=True,
                error_message=None
            )
            
            return {
                "success": True, 
                "message": "Price unchanged", 
                "old_price": old_price,
                "new_price": new_price,
                "method": method
            }
        
        # Update the price in the database
        update_success = self.db_service.update_machine_price(
            machine_id=machine_id,
            new_price=new_price,
            html_content=html_content
        )
        
        if not update_success:
            error_msg = f"Failed to update price in database for machine {machine_id}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}
        
        # Add to price history
        history_added = self.db_service.add_price_history(
            machine_id=machine_id,
            old_price=old_price,
            new_price=new_price,
            success=True,
            error_message=None
        )
        
        if not history_added:
            logger.warning(f"Failed to add price history entry for machine {machine_id}")
        
        logger.info(f"Successfully updated price for machine {machine_id} from {old_price} to {new_price} using {method}")
        
        return {
            "success": True,
            "message": "Price updated successfully",
            "old_price": old_price,
            "new_price": new_price,
            "method": method,
            "price_change": new_price - old_price if old_price is not None else None,
            "percentage_change": ((new_price - old_price) / old_price) * 100 if old_price is not None and old_price > 0 else None
        }
    
    async def batch_update_machines(self, days_threshold=7):
        """
        Update prices for all machines that need an update.
        
        Args:
            days_threshold (int): Minimum days since last update to consider for updating.
            
        Returns:
            dict: Summary of batch update operation.
        """
        logger.info(f"Starting batch update for machines with threshold of {days_threshold} days")
        
        # Get machines needing update
        machines = self.db_service.get_machines_needing_update(days_threshold)
        
        if not machines:
            logger.info("No machines need price updates at this time")
            return {"success": True, "message": "No machines need price updates", "count": 0}
        
        # Update each machine
        results = {
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
        
        logger.info(f"Batch update completed. Results: {results['successful']} successful, {results['failed']} failed")
        
        return {
            "success": True,
            "message": "Batch update completed",
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
            batch_data = self.db_service.get_batch_results(batch_id)
            
            if not batch_data:
                logger.warning(f"No batch data found for batch_id: {batch_id}")
                return None
            
            # Get additional stats without triggering processing
            stats = self.db_service.get_batch_stats(batch_id)
            
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