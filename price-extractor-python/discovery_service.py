#!/usr/bin/env python3
"""
Standalone Discovery Service
This runs separately from the main price extractor to avoid dependency conflicts
"""
import uvicorn
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import logging
import sys
import os

# Add the current directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.discovery_service import start_discovery

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create the FastAPI application
app = FastAPI(
    title="Discovery Service API",
    description="API for discovering products from manufacturer websites",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class DiscoveryRequest(BaseModel):
    """Request model for product discovery."""
    scan_log_id: str
    site_id: str
    base_url: str
    sitemap_url: Optional[str] = None
    scraping_config: Optional[dict] = {}
    scan_type: str = 'discovery'


@app.get("/")
async def root():
    """Root endpoint that returns status information."""
    return {
        "status": "online",
        "service": "Discovery Service API",
        "version": "1.0.0",
        "note": "This is a separate service from the main price extractor"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring."""
    return {"status": "healthy"}


@app.get("/test-crawl")
async def test_crawl(url: str = "https://www.xtool.com"):
    """Test endpoint to check if crawling works."""
    try:
        from crawlers.site_crawler import discover_products
        
        logger.info(f"Testing crawl for: {url}")
        
        # Simple test config
        config = {
            'crawl_delay': 0.5,
            'timeout': 5,
            'max_pages': 10,
            'use_sitemap': True
        }
        
        urls, stats = await discover_products(url, config)
        
        return {
            "success": True,
            "url_tested": url,
            "urls_found": len(urls),
            "sample_urls": urls[:5] if urls else [],
            "stats": stats
        }
    except Exception as e:
        logger.error(f"Test crawl failed: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@app.post("/api/v1/discover-products")
async def discover_products_endpoint(request: DiscoveryRequest, background_tasks: BackgroundTasks):
    """
    Start product discovery for a manufacturer site.
    
    This endpoint triggers the discovery process which:
    1. Crawls the manufacturer website to find product URLs
    2. Extracts data from each product page
    3. Normalizes and validates the data
    4. Stores discovered products for admin review
    """
    try:
        logger.info(f"Starting product discovery for site {request.site_id}: {request.base_url}")
        
        # Start discovery in background task
        background_tasks.add_task(
            _process_discovery,
            request.dict()
        )
        
        return {
            "success": True,
            "message": f"Product discovery started for {request.base_url}",
            "scan_log_id": request.scan_log_id,
            "site_id": request.site_id
        }
        
    except Exception as e:
        logger.exception(f"Error starting product discovery: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error starting discovery: {str(e)}")


async def _process_discovery(request_data: dict):
    """Process discovery in background task."""
    try:
        result = await start_discovery(request_data)
        logger.info(f"Discovery completed: {result}")
    except Exception as e:
        logger.exception(f"Error in discovery background task: {str(e)}")


if __name__ == "__main__":
    # Run on a different port (8001) to avoid conflicts with main service
    port = int(os.getenv("DISCOVERY_PORT", "8001"))
    host = os.getenv("DISCOVERY_HOST", "0.0.0.0")
    
    logger.info(f"Starting Discovery Service on {host}:{port}")
    logger.info(f"API docs available at: http://localhost:{port}/docs")
    
    uvicorn.run(app, host=host, port=port)