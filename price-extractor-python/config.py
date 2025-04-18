import os
from dotenv import load_dotenv
from loguru import logger
import sys

# Load environment variables
load_dotenv()

# API and Database Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8000"))

# Claude AI Configuration
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# LLM Models
CLAUDE_HAIKU_MODEL = os.getenv("CLAUDE_HAIKU_MODEL", "claude-3-haiku-20240307")
CLAUDE_SONNET_MODEL = os.getenv("CLAUDE_SONNET_MODEL", "claude-3-sonnet-20240229")
GPT4O_MODEL = os.getenv("GPT4O_MODEL", "gpt-4o")

# Extraction Tiers
TIER_STATIC = "STATIC"
TIER_SLICE_FAST = "SLICE_FAST"
TIER_SLICE_BALANCED = "SLICE_BALANCED"
TIER_JS_INTERACTION = "JS_INTERACTION"
TIER_FULL_HTML = "FULL_HTML"

# Confidence Thresholds
DEFAULT_EXTRACTION_CONFIDENCE = float(os.getenv("DEFAULT_EXTRACTION_CONFIDENCE", "0.85"))
DEFAULT_VALIDATION_CONFIDENCE = float(os.getenv("DEFAULT_VALIDATION_CONFIDENCE", "0.90"))
DEFAULT_SANITY_THRESHOLD = float(os.getenv("DEFAULT_SANITY_THRESHOLD", "0.25"))

# Scraping Configuration
REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", "30"))
USER_AGENT = os.getenv(
    "USER_AGENT", 
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
)

# Database Tables
MACHINES_TABLE = "machines"
PRICE_HISTORY_TABLE = "price_history"
MACHINES_LATEST_TABLE = "machines_latest"
VARIANT_CONFIG_TABLE = "variant_extraction_config"
LLM_USAGE_TABLE = "llm_usage_tracking"

# Model Token Pricing (per 1M tokens)
LLM_COSTS = {
    "claude-3-haiku-20240307": {
        "input": 0.25,   # $0.25 per 1M input tokens
        "output": 1.25,  # $1.25 per 1M output tokens
    },
    "claude-3-sonnet-20240229": {
        "input": 3.0,    # $3.00 per 1M input tokens
        "output": 15.0,  # $15.00 per 1M output tokens
    },
    "gpt-4o": {
        "input": 5.0,    # $5.00 per 1M input tokens
        "output": 15.0,  # $15.00 per 1M output tokens
    }
}

# Configure logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

# Setup logger configuration
logger.remove()
logger.add(
    sys.stderr,
    level=LOG_LEVEL,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>"
)
logger.add(
    "logs/price_extractor.log",
    rotation="10 MB",
    retention="1 week",
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
    
    # OpenAI key is optional for now, only needed for GPT-4o tier
    if OPENAI_API_KEY:
        logger.info("OpenAI API key found - Full HTML tier with GPT-4o will be available")
    else:
        logger.warning("OpenAI API key not found - Full HTML tier with GPT-4o will not be available")
    
    missing_vars = [var_name for var_name, var_value in required_vars if not var_value]
    
    if missing_vars:
        logger.error(f"Missing required environment variables: {', '.join(missing_vars)}")
        return False
    
    return True
