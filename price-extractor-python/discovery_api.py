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
from crawlers.site_crawler import SiteCrawler, CrawlConfig
from services.simplified_discovery import SimplifiedDiscoveryService

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
simplified_discovery = SimplifiedDiscoveryService()

# Request/Response models
class DiscoverRequest(BaseModel):
    site_id: str
    site_name: str
    config: Dict[str, Any]
    max_products: Optional[int] = None
    test_mode: Optional[bool] = False  # Add test mode flag

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
    scan_metadata: Optional[Dict[str, Any]] = None
    credits_used: Optional[int] = None

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
            "test_discover": "/api/v1/test-discover-urls",
            "status": "/api/v1/discovery-status/{scan_id}",
            "health": "/health",
            "docs": "/docs"
        }
    }

@app.get("/test-mode")
async def test_mode_info():
    """Get information about test mode"""
    return {
        "description": "Test mode allows you to test the discovery workflow without using Scrapfly credits",
        "how_to_use": "Add 'test_mode: true' to your discovery request",
        "what_happens": [
            "1. The system will simulate discovering 3 fake products",
            "2. These products will appear in your discovered products review page",
            "3. No Scrapfly credits will be used",
            "4. The scan will complete in about 3 seconds"
        ],
        "example_request": {
            "site_id": "your-site-id",
            "site_name": "Test Site",
            "config": {"url": "https://example.com"},
            "max_products": 10,
            "test_mode": True
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
            max_products=request.max_products,
            test_mode=request.test_mode
        )
        
        return DiscoverResponse(
            scan_id=scan_id,
            status="started",
            message=f"Discovery scan started for {request.site_name}"
        )
        
    except Exception as e:
        logger.error(f"Failed to start discovery: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/test-discover-urls")
async def test_discover_urls(request: DiscoverRequest):
    """
    Test endpoint that ONLY discovers URLs without scraping them.
    This helps test sitemap access without using Scrapfly credits.
    """
    try:
        logger.info(f"TEST MODE: Discovering URLs for {request.site_name}")
        
        from crawlers.site_crawler import SiteCrawler, CrawlConfig
        from urllib.parse import urlparse
        
        # Parse the base URL to get domain
        parsed_url = urlparse(request.config.get('url', ''))
        domain = parsed_url.netloc
        
        # Create crawler config with correct parameters
        crawl_config = CrawlConfig(
            crawl_delay=1.0,
            user_agent="MachinesForMakers/1.0 (Test Mode)",
            respect_robots=True,
            product_url_patterns=request.config.get('product_url_patterns', []),
            exclude_patterns=request.config.get('exclude_patterns', []),
            use_sitemap=True,
            max_pages=10  # Limit to 10 URLs for testing
        )
        
        # Initialize crawler with base URL
        base_url = request.config.get('url', '')
        crawler = SiteCrawler(base_url=base_url, config=crawl_config)
        
        # Discover URLs
        logger.info(f"Crawling {base_url} for product URLs")
        product_urls, stats = await crawler.discover_product_urls()
        
        # Format response
        response_data = {
            "site_name": request.site_name,
            "base_url": request.config.get('url', ''),
            "sitemap_url": request.config.get('sitemap_url'),
            "urls_found": len(product_urls),
            "sample_urls": product_urls[:10],  # First 10 URLs
            "crawl_stats": stats,
            "patterns_used": {
                "include": request.config.get('product_url_patterns', []),
                "exclude": request.config.get('exclude_patterns', [])
            }
        }
        
        logger.info(f"TEST COMPLETE: Found {len(product_urls)} URLs")
        return response_data
        
    except Exception as e:
        logger.error(f"Test discovery failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/discover-from-category")
async def discover_from_category(background_tasks: BackgroundTasks, request: DiscoverRequest):
    """
    Discover products from a category page using Scrapfly AI extraction
    This is the NEW simplified approach that uses product extraction
    """
    try:
        logger.info(f"Starting AI discovery for {request.site_name} from category URL")
        
        # Create scan record
        scan_id = await db_service.create_scan_record(
            site_id=request.site_id,
            site_name=request.site_name
        )
        
        if not scan_id:
            raise HTTPException(status_code=500, detail="Failed to create scan record")
        
        # Get category URL from config
        category_url = request.config.get('category_url') or request.config.get('url', '')
        
        if not category_url:
            raise HTTPException(status_code=400, detail="No category URL provided")
        
        # Start discovery in background
        background_tasks.add_task(
            simplified_discovery.discover_from_category,
            category_url=category_url,
            site_id=request.site_id,
            scan_id=scan_id,
            max_products=request.max_products or 10
        )
        
        return {
            "scan_id": scan_id,
            "status": "started",
            "message": f"AI discovery started for {request.site_name}",
            "category_url": category_url
        }
        
    except Exception as e:
        logger.error(f"Failed to start AI discovery: {str(e)}")
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
        
        # Extract metadata for real-time status
        metadata = scan_data.get("scan_metadata", {})
        total_urls = metadata.get("total_urls", scan_data.get("products_found", 0))
        processed_urls = metadata.get("processed_urls", scan_data.get("products_processed", 0))
        
        # Calculate approximate credits used
        credits_used = None
        if metadata.get("discovery_method") == "sitemap":
            credits_used = 2  # Sitemap discovery uses minimal credits
        elif processed_urls > 0:
            credits_used = processed_urls * 2  # Approximate 2 credits per URL
        
        return ScanStatusResponse(
            scan_id=scan_data["id"],
            status=scan_data["status"],
            total_urls=total_urls,
            processed_urls=processed_urls,
            discovered_products=scan_data.get("products_found", 0),
            errors=[scan_data.get("error_message", "")] if scan_data.get("error_message") else [],
            created_at=scan_data["created_at"],
            completed_at=scan_data.get("completed_at"),
            scan_metadata=metadata,
            credits_used=credits_used
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get scan status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Background task for discovery
async def run_discovery_task(scan_id: str, site_id: str, site_name: str, config: Dict[str, Any], max_products: Optional[int], test_mode: bool = False):
    """
    Run discovery task in background
    """
    try:
        logger.info(f"Starting discovery task for {site_name} (scan_id: {scan_id}, test_mode: {test_mode})")
        
        # If test mode, simulate discovery without using Scrapfly credits
        if test_mode:
            logger.info("🧪 Running in TEST MODE - simulating discovery without Scrapfly")
            
            # Create some fake discovered products for testing
            fake_products = [
                {
                    "name": f"Test Laser Cutter Model {i}",
                    "url": f"https://example.com/products/test-laser-{i}",
                    "price": 2999 + (i * 500),
                    "image_url": "https://via.placeholder.com/300",
                    "specifications": {
                        "power": f"{20 + i * 10}W",
                        "work_area": f"{300 + i * 50}x{300 + i * 50}mm",
                        "material_capability": "Wood, Acrylic, Leather"
                    }
                }
                for i in range(1, 4)
            ]
            
            # Simulate processing delay
            await asyncio.sleep(3)
            
            # Store fake products in discovered_machines table
            for product in fake_products:
                await db_service.store_discovered_machine(
                    site_id=site_id,
                    scan_id=scan_id,
                    data=product
                )
            
            results = {
                "total_urls": 3,
                "processed_urls": 3,
                "discovered_products": 3,
                "errors": [],
                "test_mode": True
            }
        else:
            # Run real discovery - create DiscoveryRequest object
            from services.discovery_service import DiscoveryRequest
            
            discovery_request = DiscoveryRequest(
                scan_log_id=scan_id,
                site_id=site_id,
                base_url=config.get('url', ''),
                sitemap_url=config.get('sitemap_url'),
                scraping_config=config,
                scan_type='discovery'
            )
            
            result = await discovery_service.discover_products(discovery_request)
            
            # Convert DiscoveryResult to dict for compatibility
            results = {
                "total_urls": result.discovered_count,
                "processed_urls": result.processed_count,
                "discovered_products": result.discovered_count,
                "errors": result.errors,
                "warnings": result.warnings
            }
        
        # Update scan record with results
        await db_service.update_scan_record(
            scan_id=scan_id,
            status="completed",
            products_found=results.get("discovered_products", 0),
            products_processed=results.get("processed_urls", 0),
            scan_metadata={
                "total_urls": results.get("total_urls", 0),
                "errors": results.get("errors", [])
            }
        )
        
        logger.info(f"Discovery completed for {site_name}: {results.get('discovered_products', 0)} products found")
        
    except Exception as e:
        logger.error(f"Discovery task failed for {site_name}: {str(e)}")
        
        # Update scan record with error
        await db_service.update_scan_record(
            scan_id=scan_id,
            status="failed",
            error_message=str(e)
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