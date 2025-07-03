import os
from dotenv import load_dotenv
from loguru import logger
import sys
from datetime import datetime

# Load environment variables
load_dotenv()

# API and Database Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
# Use service role key for database updates, fallback to regular key
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8000"))

# Claude AI Configuration
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
# Using the cheaper Claude model as requested
CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-3-haiku-20240307")

# Scraping Configuration
REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", "30"))
USER_AGENT = os.getenv(
    "USER_AGENT", 
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
)

# Database Tables
MACHINES_TABLE = "machines"
PRICE_HISTORY_TABLE = "price_history"

# Price Validation Configuration - TESTING MODE: ALL CHANGES REQUIRE APPROVAL
MAX_PRICE_INCREASE_PERCENT = float(os.getenv("MAX_PRICE_INCREASE_PERCENT", "0"))  # 0% = ALL increases require review
MAX_PRICE_DECREASE_PERCENT = float(os.getenv("MAX_PRICE_DECREASE_PERCENT", "0"))  # 0% = ALL decreases require review
MIN_PRICE_THRESHOLD = float(os.getenv("MIN_PRICE_THRESHOLD", "10"))  # Minimum price to consider valid

# Configure logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

# Create timestamped log filename
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
LOG_FILENAME = f"logs/price_extractor_{timestamp}.log"

# Setup logger configuration
logger.remove()
logger.add(
    sys.stderr,
    level=LOG_LEVEL,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>"
)
logger.add(
    LOG_FILENAME,
    level=LOG_LEVEL,
    format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}"
)

# Validate required environment variables
def validate_config():
    """Validates that all required environment variables are set."""
    required_vars = [
        ("SUPABASE_URL", SUPABASE_URL),
        ("SUPABASE_KEY", SUPABASE_KEY),
        ("ANTHROPIC_API_KEY", ANTHROPIC_API_KEY),
    ]
    
    missing_vars = [var_name for var_name, var_value in required_vars if not var_value]
    
    if missing_vars:
        logger.error(f"Missing required environment variables: {', '.join(missing_vars)}")
        return False
    
    return True
