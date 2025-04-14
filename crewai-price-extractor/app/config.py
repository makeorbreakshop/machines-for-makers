import os
from dotenv import load_dotenv

# Load environment variables from .env file if available
load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://xspderyoeancoqhdcloo.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# Claude API configuration
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-3-7-sonnet-20250219")

# API security
API_SECRET = os.getenv("API_SECRET", "your-secret-key")

# Web scraping settings
REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", "30"))
USER_AGENT = os.getenv(
    "USER_AGENT", 
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36"
)

# CrewAI settings
CREW_VERBOSE = os.getenv("CREW_VERBOSE", "True").lower() in ("true", "1", "t")
MAX_BATCH_SIZE = int(os.getenv("MAX_BATCH_SIZE", "5"))
DEBUG_MODE = os.getenv("DEBUG_MODE", "False").lower() in ("true", "1", "t")

# Database settings
STORE_HTML = os.getenv("STORE_HTML", "True").lower() in ("true", "1", "t")
HTML_RETENTION_DAYS = int(os.getenv("HTML_RETENTION_DAYS", "90"))

# Validate required environment variables
def validate_config():
    """Validate that all required configuration variables are set"""
    required_vars = [
        ("SUPABASE_URL", SUPABASE_URL),
        ("SUPABASE_SERVICE_KEY", SUPABASE_SERVICE_KEY),
        ("ANTHROPIC_API_KEY", ANTHROPIC_API_KEY),
    ]
    
    missing = [name for name, value in required_vars if not value]
    
    if missing:
        raise EnvironmentError(
            f"Missing required environment variables: {', '.join(missing)}"
        )
    
    return True 