from typing import List, Dict, Optional, Tuple, Any
import asyncio
import time
import logging

logger = logging.getLogger(__name__)

async def batch_update_machines(self, days_threshold: int = 7, machine_ids: List[str] = None, limit: Optional[int] = None, max_workers: Optional[int] = None) -> Dict:
        """
        Batch update machine prices.
        
        Args:
            days_threshold (int): Days threshold for update.
            machine_ids (List[str], optional): List of specific machine IDs to update.
            limit (Optional[int], optional): Maximum number of machines to update.
            max_workers (Optional[int], optional): Maximum number of concurrent workers.
            
        Returns:
            Dict: Batch results.
        """
        try:
            logger.info(f"Starting batch update of machine prices. days_threshold={days_threshold}, limit={limit}")
            start_time = time.time()
            
            # Get machines that need updates
            machines = await self.db_service.get_machines_needing_update(
                days_threshold=days_threshold,
                machine_ids=machine_ids,
                limit=limit
            )
            
            if not machines:
                logger.info("No machines to update")
                return {"success": True, "message": "No machines to update", "count": 0}
            
            # Create a new batch record
            batch_id = await self.db_service.create_batch(
                count=len(machines),
                days_threshold=days_threshold,
                machine_ids=machine_ids,
                limit=limit,
                max_workers=max_workers
            )
            
            if not batch_id:
                logger.error("Failed to create batch record")
                return {"success": False, "message": "Failed to create batch record", "count": 0}
            
            # Determine the number of workers
            if not max_workers:
                max_workers = min(10, len(machines))  # Default to 10 or less if fewer machines
            else:
                max_workers = min(max_workers, len(machines))
            
            logger.info(f"Processing {len(machines)} machines with {max_workers} workers")
            
            # Create a queue for the workers
            queue = asyncio.Queue()
            
            # Add all machines to the queue
            for machine in machines:
                await queue.put(machine)
            
            # Create workers
            workers = []
            for i in range(max_workers):
                worker = asyncio.create_task(self._worker_process_machine(queue, batch_id))
                workers.append(worker)
            
            # Wait for all workers to complete
            await asyncio.gather(*workers)
            
            # Update batch status to complete
            await self.db_service.update_batch_status(batch_id, "completed")
            
            end_time = time.time()
            duration = end_time - start_time
            
            logger.info(f"Batch update completed in {duration:.2f} seconds. Updated {len(machines)} machines.")
            return {
                "success": True,
                "message": f"Updated {len(machines)} machines",
                "count": len(machines),
                "batch_id": batch_id,
                "duration": duration
            }
            
        except Exception as e:
            logger.exception(f"Error in batch_update_machines: {str(e)}")
            return {"success": False, "message": f"Error: {str(e)}", "count": 0} 