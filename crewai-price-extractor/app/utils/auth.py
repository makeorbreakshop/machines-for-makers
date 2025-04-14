import os
import logging
from app.config import API_SECRET

logger = logging.getLogger(__name__)

def verify_api_key(api_key: str) -> bool:
    """
    Verify if the provided API key is valid
    
    Args:
        api_key: The API key to verify
        
    Returns:
        bool: True if the API key is valid, False otherwise
    """
    if not API_SECRET:
        logger.warning("API_SECRET not set. Authentication disabled.")
        return True
    
    if not api_key:
        logger.warning("No API key provided for authentication")
        return False
    
    return api_key == API_SECRET 