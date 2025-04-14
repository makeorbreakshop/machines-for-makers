import os
import pathlib
from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends, Query, Path, Header, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv
from supabase import create_client
from crews.price_crew import get_price_crew
from app.services.database import get_database_client
from app.services.price_extraction import update_machine_price, update_multiple_prices, get_batch_status
from app.utils.auth import verify_api_key
from app.tools.admin_tools import get_trace, get_recent_traces

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="CrewAI Price Extractor",
    description="Machine price extraction service using CrewAI agents",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update this for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load API secret from environment
API_SECRET = os.getenv("API_SECRET", "")
if not API_SECRET:
    logger.warning("API_SECRET not set. Using default authentication.")

# Define request and response models
class PriceUpdateResponse(BaseModel):
    success: bool
    message: str
    machine_id: str
    new_price: Optional[float] = None
    currency: Optional[str] = None
    debug_info: Optional[Dict[str, Any]] = None

class BatchUpdateRequest(BaseModel):
    machine_ids: List[str]
    debug_mode: bool = False

class BatchUpdateResponse(BaseModel):
    success: bool
    message: str
    results: List[Dict[str, Any]]
    failed_count: int
    success_count: int

class BatchStatusResponse(BaseModel):
    batch_id: str
    status: str
    machine_count: int
    success_count: Optional[int] = None
    failed_count: Optional[int] = None
    created_at: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    results: Optional[List[Dict[str, Any]]] = None
    error: Optional[str] = None

# Initialize router for database operations
db_router = APIRouter(prefix="/database", tags=["Database"])

@db_router.post("/create-html-table", response_model=dict)
async def create_html_table(
    api_key: str = Query(None, description="API key for authentication"),
    x_api_key: Optional[str] = Header(None, description="API key in header (alternative)")
):
    """
    Create the machine_html_scrapes table in the database.
    """
    # Verify API key
    auth_key = api_key or x_api_key
    if not verify_api_key(auth_key):
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    try:
        # Get the SQL file path
        sql_file_path = pathlib.Path(__file__).parent / "sql" / "create_html_scrapes_table.sql"
        
        # Read SQL file
        with open(sql_file_path, "r") as f:
            sql = f.read()
        
        # Execute SQL
        supabase = get_database_client()
        result = await supabase.execute_sql(sql)
        
        return {"success": True, "message": "HTML scrapes table created successfully"}
    except Exception as e:
        logger.error(f"Error creating HTML scrapes table: {str(e)}")
        return {"success": False, "message": f"Error: {str(e)}"}

# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "service": "CrewAI Price Extractor"}

# Update a single machine price
@app.get("/update-machine-price/{machine_id}", response_model=PriceUpdateResponse, tags=["Price Extraction"])
async def update_price(
    machine_id: str = Path(..., description="ID of the machine to update price for"),
    debug: bool = Query(False, description="If true, returns detailed debug information"),
    api_key: str = Query(None, description="API key for authentication"),
    x_api_key: Optional[str] = Header(None, description="API key in header (alternative)")
):
    # Verify API key
    auth_key = api_key or x_api_key
    if not verify_api_key(auth_key):
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    try:
        # Call the price extraction service
        result = await update_machine_price(machine_id, debug_mode=debug)
        return result
    except Exception as e:
        logger.error(f"Error updating price for {machine_id}: {str(e)}")
        return PriceUpdateResponse(
            success=False,
            message=f"Error: {str(e)}",
            machine_id=machine_id,
            debug_info={"error": str(e)} if debug else None
        )

# Update multiple machine prices
@app.post("/update-prices", response_model=BatchUpdateResponse, tags=["Price Extraction"])
async def update_prices(
    request: BatchUpdateRequest,
    background_tasks: BackgroundTasks,
    api_key: str = Query(None, description="API key for authentication"),
    x_api_key: Optional[str] = Header(None, description="API key in header (alternative)")
):
    # Verify API key
    auth_key = api_key or x_api_key
    if not verify_api_key(auth_key):
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    # Get batch size limit from environment
    max_batch_size = int(os.getenv("MAX_BATCH_SIZE", "25"))
    
    # Check batch size
    if len(request.machine_ids) > max_batch_size:
        raise HTTPException(
            status_code=400, 
            detail=f"Batch size exceeds maximum allowed ({max_batch_size})"
        )
    
    # Create a batch job and start processing in background
    batch_id = await update_multiple_prices(
        machine_ids=request.machine_ids,
        debug_mode=request.debug_mode
    )
    
    return BatchUpdateResponse(
        success=True,
        message=f"Processing {len(request.machine_ids)} machine(s) in background. Batch ID: {batch_id}",
        results=[],
        failed_count=0,
        success_count=0
    )

# Get batch status endpoint
@app.get("/batch-status/{batch_id}", response_model=BatchStatusResponse, tags=["Price Extraction"])
async def get_batch_job_status(
    batch_id: str = Path(..., description="ID of the batch job to check"),
    api_key: str = Query(None, description="API key for authentication"),
    x_api_key: Optional[str] = Header(None, description="API key in header (alternative)")
):
    # Verify API key
    auth_key = api_key or x_api_key
    if not verify_api_key(auth_key):
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    # Get batch status
    batch_info = get_batch_status(batch_id)
    
    if not batch_info:
        raise HTTPException(status_code=404, detail=f"Batch job with ID {batch_id} not found")
    
    return {**batch_info}

# Initialize router for admin visualization
admin_router = APIRouter(prefix="/admin", tags=["Admin"])

@admin_router.get("/traces", response_model=List[Dict[str, Any]])
async def get_recent_agent_traces(
    limit: int = Query(10, description="Maximum number of traces to return"),
    api_key: str = Query(None, description="API key for authentication"),
    x_api_key: Optional[str] = Header(None, description="API key in header (alternative)")
):
    """
    Get recent agent execution traces
    """
    # Verify API key
    auth_key = api_key or x_api_key
    if not verify_api_key(auth_key):
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    try:
        traces = get_recent_traces(limit=limit)
        return traces
    except Exception as e:
        logger.error(f"Error getting recent traces: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting recent traces: {str(e)}")

@admin_router.get("/traces/{trace_id}", response_model=Dict[str, Any])
async def get_agent_trace(
    trace_id: str = Path(..., description="ID of the trace to get"),
    api_key: str = Query(None, description="API key for authentication"),
    x_api_key: Optional[str] = Header(None, description="API key in header (alternative)")
):
    """
    Get a specific agent execution trace
    """
    # Verify API key
    auth_key = api_key or x_api_key
    if not verify_api_key(auth_key):
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    try:
        trace = get_trace(trace_id)
        if not trace:
            raise HTTPException(status_code=404, detail=f"Trace {trace_id} not found")
        return trace
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting trace {trace_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting trace: {str(e)}")

# Include the database router
app.include_router(db_router)

# Include the admin router
app.include_router(admin_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 