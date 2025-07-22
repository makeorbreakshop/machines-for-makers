#!/usr/bin/env python3
"""
Manufacturer Discovery API Service
Runs on port 8001 to handle website scraping and new machine discovery
"""
import os
import sys
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import asyncio
from loguru import logger

# Add the current directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.discovery_service import DiscoveryService
from services.database import DatabaseService

# Configure logging
logger.add("logs/discovery_api.log", rotation="1 day", retention="7 days", level="INFO")

# Initialize FastAPI app
app = FastAPI(
    title="Manufacturer Discovery API",
    description="API for discovering and importing new machines from manufacturer websites",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
discovery_service = DiscoveryService()
db_service = DatabaseService()

# Request/Response models
class DiscoverRequest(BaseModel):
    site_id: str
    site_name: str
    config: Dict[str, Any]
    max_products: Optional[int] = None

class DiscoverResponse(BaseModel):
    scan_id: str
    status: str
    message: str

class ScanStatusResponse(BaseModel):
    scan_id: str
    status: str
    total_urls: int
    processed_urls: int
    discovered_products: int
    errors: List[str]
    created_at: str
    completed_at: Optional[str]

# API Routes
@app.get("/")
async def root():
    """Root endpoint - API information"""
    return {
        "service": "Manufacturer Discovery API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "discover": "/api/v1/discover-products",
            "status": "/api/v1/discovery-status/{scan_id}",
            "health": "/health",
            "docs": "/docs"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check database connection
        machines = await db_service.get_all_machines(limit=1)
        db_healthy = machines is not None
        
        # Check Scrapfly if configured
        scrapfly_healthy = False
        if os.getenv('SCRAPFLY_API_KEY'):
            try:
                from services.scrapfly_service import get_scrapfly_service
                scrapfly = get_scrapfly_service()
                scrapfly_healthy = await scrapfly.test_connection()
            except Exception as e:
                logger.warning(f"Scrapfly health check failed: {e}")
        
        return {
            "status": "healthy" if db_healthy else "unhealthy",
            "timestamp": datetime.utcnow().isoformat(),
            "services": {
                "database": "healthy" if db_healthy else "unhealthy",
                "scrapfly": "healthy" if scrapfly_healthy else "not configured"
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "error": str(e)}
        )

@app.post("/api/v1/discover-products", response_model=DiscoverResponse)
async def discover_products(request: DiscoverRequest, background_tasks: BackgroundTasks):
    """
    Start a product discovery scan for a manufacturer site
    """
    try:
        logger.info(f"Starting discovery for site: {request.site_name} (ID: {request.site_id})")
        
        # Create a scan record
        scan_id = await db_service.create_scan_record(
            site_id=request.site_id,
            site_name=request.site_name
        )
        
        if not scan_id:
            raise HTTPException(status_code=500, detail="Failed to create scan record")
        
        # Start discovery in background
        background_tasks.add_task(
            run_discovery_task,
            scan_id=scan_id,
            site_id=request.site_id,
            site_name=request.site_name,
            config=request.config,
            max_products=request.max_products
        )
        
        return DiscoverResponse(
            scan_id=scan_id,
            status="started",
            message=f"Discovery scan started for {request.site_name}"
        )
        
    except Exception as e:
        logger.error(f"Failed to start discovery: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/discovery-status/{scan_id}", response_model=ScanStatusResponse)
async def get_discovery_status(scan_id: str):
    """
    Get the status of a discovery scan
    """
    try:
        # Get scan status from database
        scan_data = await db_service.get_scan_status(scan_id)
        
        if not scan_data:
            raise HTTPException(status_code=404, detail="Scan not found")
        
        return ScanStatusResponse(
            scan_id=scan_data["id"],
            status=scan_data["status"],
            total_urls=scan_data.get("total_urls", 0),
            processed_urls=scan_data.get("processed_urls", 0),
            discovered_products=scan_data.get("discovered_products", 0),
            errors=scan_data.get("errors", []),
            created_at=scan_data["created_at"],
            completed_at=scan_data.get("completed_at")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get scan status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Background task for discovery
async def run_discovery_task(scan_id: str, site_id: str, site_name: str, config: Dict[str, Any], max_products: Optional[int]):
    """
    Run discovery task in background
    """
    try:
        logger.info(f"Starting discovery task for {site_name} (scan_id: {scan_id})")
        
        # Run discovery
        results = await discovery_service.discover_products(
            site_config=config,
            max_products=max_products,
            scan_id=scan_id
        )
        
        # Update scan record with results
        await db_service.update_scan_record(
            scan_id=scan_id,
            status="completed",
            total_urls=results.get("total_urls", 0),
            processed_urls=results.get("processed_urls", 0),
            discovered_products=results.get("discovered_products", 0),
            errors=results.get("errors", [])
        )
        
        logger.info(f"Discovery completed for {site_name}: {results.get('discovered_products', 0)} products found")
        
    except Exception as e:
        logger.error(f"Discovery task failed for {site_name}: {str(e)}")
        
        # Update scan record with error
        await db_service.update_scan_record(
            scan_id=scan_id,
            status="failed",
            errors=[str(e)]
        )

# Run the service
if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("DISCOVERY_PORT", "8001"))
    
    logger.info(f"Starting Discovery API on port {port}")
    
    # Check for Scrapfly configuration
    scrapfly_key = os.getenv('SCRAPFLY_API_KEY')
    if scrapfly_key:
        logger.info(f"Scrapfly API Key: Configured ({scrapfly_key[:10]}...)")
    else:
        logger.warning("Scrapfly API Key: Not configured - will use regular scraping for all sites")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        log_level="info"
    )