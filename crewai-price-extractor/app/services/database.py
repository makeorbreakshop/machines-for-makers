import os
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from supabase import create_client, Client
from app.config import (
    SUPABASE_URL, 
    SUPABASE_SERVICE_KEY, 
    STORE_HTML, 
    HTML_RETENTION_DAYS
)

logger = logging.getLogger(__name__)

# Database client singleton
_db_client = None

def get_database_client() -> Client:
    """
    Returns a singleton instance of the Supabase client
    """
    global _db_client
    
    if _db_client is None:
        if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
            raise EnvironmentError("Supabase credentials not properly configured")
        
        _db_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        logger.info("Supabase client initialized")
    
    return _db_client

async def get_machine_by_id(machine_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve a machine record by ID from the database
    """
    try:
        supabase = get_database_client()
        response = supabase.table("machines").select(
            "id, \"Machine Name\", \"Company\", \"Affiliate Link\", product_link, Price, price_configuration_identifier"
        ).eq("id", machine_id).execute()
        
        if not response.data or len(response.data) == 0:
            logger.warning(f"Machine with ID {machine_id} not found")
            return None
        
        return response.data[0]
    
    except Exception as e:
        logger.error(f"Error retrieving machine with ID {machine_id}: {str(e)}")
        raise

async def get_machines_by_ids(machine_ids: List[str]) -> List[Dict[str, Any]]:
    """
    Retrieve multiple machine records by their IDs
    """
    try:
        supabase = get_database_client()
        response = supabase.table("machines").select(
            "id, \"Machine Name\", \"Company\", \"Affiliate Link\", product_link, Price, price_configuration_identifier"
        ).in_("id", machine_ids).execute()
        
        if not response.data:
            logger.warning(f"No machines found for the provided IDs")
            return []
        
        return response.data
    
    except Exception as e:
        logger.error(f"Error retrieving machines: {str(e)}")
        raise

async def update_machine_price(
    machine_id: str, 
    new_price: float, 
    currency: str = "USD",
    html_content: Optional[str] = None,
    debug_info: Optional[Dict[str, Any]] = None
) -> bool:
    """
    Update a machine's price in the database and store extraction history
    """
    try:
        supabase = get_database_client()
        
        # Update the machine price
        update_response = supabase.table("machines").update({
            "Price": new_price,
            "currency": currency,
            "last_price_update": datetime.now().isoformat()
        }).eq("id", machine_id).execute()
        
        if not update_response.data or len(update_response.data) == 0:
            logger.error(f"Failed to update price for machine {machine_id}")
            return False
        
        # Store extraction history if enabled
        if STORE_HTML and html_content:
            # Create price history record
            history_response = supabase.table("price_extraction_history").insert({
                "machine_id": machine_id,
                "price": new_price,
                "currency": currency,
                "html_content": html_content,
                "extraction_date": datetime.now().isoformat(),
                "debug_info": debug_info
            }).execute()
            
            if not history_response.data:
                logger.warning(f"Failed to store price extraction history for machine {machine_id}")
        
        # Clean up old HTML content if needed
        if STORE_HTML and HTML_RETENTION_DAYS > 0:
            retention_date = datetime.now() - timedelta(days=HTML_RETENTION_DAYS)
            
            supabase.table("price_extraction_history").update({
                "html_content": None
            }).lt("extraction_date", retention_date.isoformat()).execute()
        
        return True
    
    except Exception as e:
        logger.error(f"Error updating price for machine {machine_id}: {str(e)}")
        raise

async def get_featured_machines(limit: int = 10) -> List[Dict[str, Any]]:
    """
    Get a list of featured machines with product links
    """
    try:
        supabase = get_database_client()
        response = supabase.table("machines").select(
            "id, \"Machine Name\", \"Company\", \"Affiliate Link\", product_link, Price, price_configuration_identifier"
        ).not_("product_link", "is", None).eq("Is A Featured Resource?", "true").limit(limit).execute()
        
        if not response.data:
            logger.warning("No featured machines found with product links")
            return []
        
        return response.data
    
    except Exception as e:
        logger.error(f"Error retrieving featured machines: {str(e)}")
        raise

async def get_all_machines_with_product_links(limit: int = 100) -> List[Dict[str, Any]]:
    """
    Get all machines that have product links defined
    """
    try:
        supabase = get_database_client()
        response = supabase.table("machines").select(
            "id, \"Machine Name\", \"Company\", \"Affiliate Link\", product_link, Price, price_configuration_identifier"
        ).not_("product_link", "is", None).limit(limit).execute()
        
        if not response.data:
            logger.warning("No machines found with product links")
            return []
        
        return response.data
    
    except Exception as e:
        logger.error(f"Error retrieving machines with product links: {str(e)}")
        raise

async def store_html_content(machine_id: str, html_content: str, scraped_url: str, final_url: str, 
                             scrape_success: bool = True) -> dict:
    """
    Store HTML content from a machine page scrape for debugging and pattern learning
    
    Args:
        machine_id: UUID of the machine
        html_content: HTML content from the page
        scraped_url: Original URL that was scraped
        final_url: Final URL after redirects
        scrape_success: Whether the scrape was successful
        
    Returns:
        Dictionary with response data
    """
    try:
        supabase = get_database_client()
        
        # Insert HTML content record
        response = supabase.table("machine_html_scrapes").insert({
            "machine_id": machine_id,
            "html_content": html_content,
            "scraped_url": scraped_url,
            "final_url": final_url,
            "scrape_success": scrape_success
        }).execute()
        
        if response.data:
            logger.info(f"Stored HTML content for machine {machine_id}")
            return {"success": True, "id": response.data[0]['id']}
        else:
            logger.warning(f"Failed to store HTML content for machine {machine_id}")
            return {"success": False, "error": "No data returned from insert operation"}
    except Exception as e:
        logger.error(f"Error storing HTML content for machine {machine_id}: {str(e)}")
        return {"success": False, "error": str(e)}

async def get_latest_html_content(machine_id: str) -> dict:
    """
    Get the most recent HTML content for a machine
    
    Args:
        machine_id: UUID of the machine
        
    Returns:
        Dictionary with HTML content data or error
    """
    try:
        supabase = get_database_client()
        
        # Get most recent HTML content
        response = supabase.table("machine_html_scrapes")\
            .select("*")\
            .eq("machine_id", machine_id)\
            .order("scrape_date", {"ascending": False})\
            .limit(1)\
            .execute()
        
        if response.data and len(response.data) > 0:
            logger.info(f"Retrieved HTML content for machine {machine_id}")
            return {"success": True, "data": response.data[0]}
        else:
            logger.info(f"No HTML content found for machine {machine_id}")
            return {"success": True, "data": None}
    except Exception as e:
        logger.error(f"Error getting HTML content for machine {machine_id}: {str(e)}")
        return {"success": False, "error": str(e)} 