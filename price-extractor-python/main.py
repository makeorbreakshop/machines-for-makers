import uvicorn
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
import os

from config import API_HOST, API_PORT, validate_config
from api.routes import router as api_router

# Create the FastAPI application
app = FastAPI(
    title="Price Extractor API",
    description="API for extracting and updating product prices",
    version="0.1.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
async def root():
    """Root endpoint that returns status information."""
    return {
        "status": "online",
        "service": "Price Extractor API",
        "version": "0.1.0",
    }

@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring."""
    return {"status": "healthy"}

def start():
    """Start the FastAPI application with uvicorn."""
    # Ensure logs directory exists
    os.makedirs("logs", exist_ok=True)
    
    # Validate required configuration
    if not validate_config():
        logger.error("Configuration validation failed. Exiting.")
        return
    
    # Start the server
    logger.info(f"Starting Price Extractor API on {API_HOST}:{API_PORT}")
    uvicorn.run(
        "main:app",
        host=API_HOST,
        port=API_PORT,
        reload=False,
        log_level="info",
    )

if __name__ == "__main__":
    start()
