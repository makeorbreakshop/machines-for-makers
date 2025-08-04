"""
Smart URL Discovery API Endpoints
Enhanced URL discovery with intelligent classification
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
from loguru import logger

from services.url_discovery import URLDiscoveryService
from services.smart_url_classifier import SmartURLClassifier

router = APIRouter()

class SmartDiscoveryRequest(BaseModel):
    """Request for smart URL discovery"""
    manufacturer_id: str
    base_url: str
    manufacturer_name: str
    max_pages: Optional[int] = 5
    apply_smart_filtering: Optional[bool] = True

class SmartDiscoveryResponse(BaseModel):
    """Response from smart URL discovery"""
    success: bool
    total_urls_found: int
    classification_summary: Dict
    classified_urls: Dict
    discovery_method: str
    credits_used: int
    estimated_credits_for_products: int
    auto_skip_reasons: Dict
    message: str

@router.post("/smart-discover-urls", response_model=SmartDiscoveryResponse)
async def smart_discover_urls(request: SmartDiscoveryRequest):
    """
    Intelligent URL discovery with automatic classification
    
    This endpoint:
    1. Discovers URLs from manufacturer sites
    2. Applies smart classification to filter out obvious non-products
    3. Returns organized results by confidence level
    4. Provides detailed statistics and cost estimates
    """
    try:
        logger.info(f"Starting smart URL discovery for {request.manufacturer_name} at {request.base_url}")
        
        # Initialize services
        discovery_service = URLDiscoveryService()
        
        # Discover URLs
        discovery_result = await discovery_service.discover_urls(
            start_url=request.base_url,
            max_pages=request.max_pages
        )
        
        if not discovery_result or not discovery_result.get('urls'):
            return SmartDiscoveryResponse(
                success=False,
                total_urls_found=0,
                classification_summary={},
                classified_urls={},
                discovery_method='none',
                credits_used=0,
                estimated_credits_for_products=0,
                auto_skip_reasons={},
                message="No URLs discovered from the site"
            )
        
        total_found = discovery_result.get('total_urls_found', 0)
        discovery_method = discovery_result.get('discovery_method', 'unknown')
        credits_used = discovery_result.get('credits_used', 0)
        
        # Get classification results
        classified_urls = discovery_result.get('classified', {})
        classification_summary = discovery_result.get('classification_summary', {})
        
        # Calculate estimated credits for actual products
        products_to_scrape = len(classified_urls.get('high_confidence', [])) + len(classified_urls.get('needs_review', []))
        estimated_credits = products_to_scrape * 20
        
        # Extract auto-skip reasons for better insights
        auto_skip_reasons = classification_summary.get('skip_reasons', {})
        
        logger.info(f"Smart discovery complete: {total_found} URLs found, "
                   f"{classification_summary.get('auto_skip', 0)} auto-skipped, "
                   f"{classification_summary.get('high_confidence', 0)} high confidence, "
                   f"{classification_summary.get('needs_review', 0)} need review")
        
        return SmartDiscoveryResponse(
            success=True,
            total_urls_found=total_found,
            classification_summary=classification_summary,
            classified_urls=classified_urls,
            discovery_method=discovery_method,
            credits_used=credits_used,
            estimated_credits_for_products=estimated_credits,
            auto_skip_reasons=auto_skip_reasons,
            message=f"Successfully discovered and classified {total_found} URLs. "
                   f"{classification_summary.get('auto_skip', 0)} automatically filtered out, "
                   f"{products_to_scrape} ready for review/scraping."
        )
        
    except Exception as e:
        logger.error(f"Error in smart URL discovery: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Smart discovery failed: {str(e)}")

@router.post("/classify-urls")
async def classify_urls(urls: List[str]):
    """
    Classify a batch of URLs without discovery
    Useful for re-classifying existing URL lists
    """
    try:
        logger.info(f"Classifying {len(urls)} URLs")
        
        classifier = SmartURLClassifier()
        classifications = classifier.classify_batch(urls)
        summary = classifier.get_classification_summary(classifications)
        
        # Organize results
        classified_urls = {
            'auto_skip': [],
            'high_confidence': [],
            'needs_review': [],
            'duplicate_likely': []
        }
        
        for url, classification in classifications.items():
            status_key = classification.status.lower()
            classified_urls[status_key].append({
                'url': url,
                'classification': classification.status,
                'confidence': classification.confidence,
                'reason': classification.reason,
                'category': classification.category_hint,
                'details': classification.details
            })
        
        return {
            'success': True,
            'total_urls': len(urls),
            'classification_summary': summary,
            'classified_urls': classified_urls,
            'auto_skip_reasons': summary.get('skip_reasons', {})
        }
        
    except Exception as e:
        logger.error(f"Error classifying URLs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Classification failed: {str(e)}")

# Add classification insight endpoints
@router.get("/classification-stats")
async def get_classification_stats():
    """Get statistics about classification patterns"""
    return {
        "common_skip_patterns": [
            "Image files (.jpg, .png, etc.)",
            "Document files (.pdf, .doc, etc.)",
            "Collection/category pages",
            "Blog and news pages",
            "Support and help pages"
        ],
        "product_indicators": [
            "Product URL patterns (/products/item-name)",
            "Machine-specific terms (laser, cutter, cnc)",
            "Power ratings (100w, 50watt)",
            "Model identifiers (K40, Pro-2000)"
        ],
        "category_detection": [
            "laser_cutters: CO2, fiber, diode lasers",
            "laser_engravers: Desktop lasers, marking",
            "3d_printers: FDM, SLA, resin printers", 
            "cnc_machines: Mills, routers, spindles"
        ]
    }