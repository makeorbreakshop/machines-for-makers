#!/usr/bin/env python3
"""
Reprocess existing discovered machines with enhanced OpenAI mapping
to populate additional fields that were previously missed.
"""
import asyncio
import json
from loguru import logger
from services.database import DatabaseService
from services.openai_mapper import create_openai_mapper

async def reprocess_discovered_machines():
    """Reprocess all discovered machines with enhanced mapping"""
    db = DatabaseService()
    mapper = create_openai_mapper()
    
    try:
        # Get all discovered machines
        machines = await db.get_discovered_machines()
        logger.info(f"Found {len(machines)} discovered machines to reprocess")
        
        success_count = 0
        error_count = 0
        
        for machine in machines:
            try:
                logger.info(f"Reprocessing machine {machine['id']}: {machine.get('normalized_data', {}).get('name', 'Unknown')}")
                
                # Get the raw data for mapping
                raw_data = machine.get('raw_data', {})
                if not raw_data:
                    logger.warning(f"No raw data found for machine {machine['id']}")
                    continue
                
                # Apply enhanced OpenAI mapping
                mapped_data, warnings = mapper.map_to_database_schema(raw_data)
                
                if warnings:
                    logger.warning(f"Mapping warnings for machine {machine['id']}: {warnings}")
                
                # Update the normalized data in the database
                await db.update_discovered_machine_normalized_data(machine['id'], mapped_data)
                
                success_count += 1
                logger.info(f"Successfully reprocessed machine {machine['id']}")
                
            except Exception as e:
                error_count += 1
                logger.error(f"Failed to reprocess machine {machine['id']}: {str(e)}")
        
        logger.info(f"Reprocessing complete. Success: {success_count}, Errors: {error_count}")
        
    except Exception as e:
        logger.error(f"Failed to reprocess machines: {str(e)}")
    finally:
        await db.close()

if __name__ == "__main__":
    asyncio.run(reprocess_discovered_machines())