"""
Scrapfly Integration Service
Handles web scraping through Scrapfly API for difficult sites
"""
import os
import logging
from typing import Dict, Optional, Tuple
from urllib.parse import urlparse

from scrapfly import ScrapflyClient, ScrapeConfig, ScrapeApiResponse
from scrapfly import (
    ScrapflyError,
    UpstreamHttpClientError,
    UpstreamHttpServerError,
    ScrapflyScrapeError
)

logger = logging.getLogger(__name__)


class ScrapflyService:
    """Service for handling Scrapfly API scraping operations"""
    
    # Sites that should use Scrapfly (difficult JavaScript-heavy sites)
    SCRAPFLY_SITES = [
        'xtool.com',
        'commarker.com',
        'makeblock.com',
        'anycubic.com'
    ]
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Scrapfly service
        
        Args:
            api_key: Scrapfly API key (defaults to env var SCRAPFLY_API_KEY)
        """
        self.api_key = api_key or os.getenv('SCRAPFLY_API_KEY')
        if not self.api_key:
            raise ValueError("Scrapfly API key not provided. Set SCRAPFLY_API_KEY environment variable.")
        
        self.client = ScrapflyClient(
            key=self.api_key,
            max_concurrency=2  # Conservative limit for testing
        )
        logger.info("Scrapfly service initialized")
    
    def should_use_scrapfly(self, url: str) -> bool:
        """
        Determine if URL should be scraped with Scrapfly
        
        Args:
            url: URL to check
            
        Returns:
            bool: True if Scrapfly should be used
        """
        try:
            domain = urlparse(url).netloc.lower()
            # Remove www. prefix if present
            domain = domain.replace('www.', '')
            
            for site in self.SCRAPFLY_SITES:
                if site in domain:
                    logger.info(f"URL {url} matches Scrapfly site: {site}")
                    return True
            
            return False
        except Exception as e:
            logger.warning(f"Error checking if should use Scrapfly for {url}: {e}")
            return False
    
    async def scrape_page(self, url: str, render_js: bool = True) -> Tuple[Optional[str], Optional[Dict]]:
        """
        Scrape a page using Scrapfly
        
        Args:
            url: URL to scrape
            render_js: Whether to render JavaScript
            
        Returns:
            Tuple of (html_content, metadata)
        """
        try:
            logger.info(f"🚀 Scraping {url} with Scrapfly (JS: {render_js})")
            
            # Configure scrape parameters
            config = ScrapeConfig(
                url=url,
                asp=True,  # Anti-Scraping Protection - bypass anti-bot systems
                render_js=render_js,  # JavaScript rendering
                country='US',  # Use US proxies
                # Cost control
                cost_budget=30,  # Max 30 credits per scrape (prevents runaway costs)
                # Note: Can't use both timeout and retry together
                retry=True,  # Enable automatic retries
                # Additional options for difficult sites
                auto_scroll=True,  # Scroll to load lazy content (adds credits)
                wait_for_selector=None,  # Can add specific selectors if needed
            )
            
            # Execute scrape
            response: ScrapeApiResponse = self.client.scrape(config)
            
            # Extract results
            result = response.scrape_result
            html_content = result.get('content', '')
            
            # Build metadata
            metadata = {
                'status_code': response.upstream_status_code,
                'success': response.upstream_status_code == 200,
                'url': result.get('url', url),
                'cost': response.cost,  # Credits used
                'asp_used': result.get('asp', {}).get('enabled', False),
                'js_rendered': result.get('browser_data') is not None,
                'ip_used': result.get('context', {}).get('proxy', {}).get('ip'),
                'country': result.get('context', {}).get('proxy', {}).get('country'),
                'duration': result.get('duration'),
                'error': None
            }
            
            logger.info(f"✅ Scrapfly success: {url} (Cost: {response.cost} credits, Status: {response.upstream_status_code})")
            
            return html_content, metadata
            
        except UpstreamHttpClientError as e:
            # 4xx errors from target site
            logger.warning(f"Client error from {url}: {e.http_status_code} - {e.message}")
            return None, {
                'status_code': e.http_status_code,
                'success': False,
                'error': f"Client error: {e.message}",
                'url': url
            }
            
        except UpstreamHttpServerError as e:
            # 5xx errors from target site
            logger.error(f"Server error from {url}: {e.http_status_code} - {e.message}")
            return None, {
                'status_code': e.http_status_code,
                'success': False,
                'error': f"Server error: {e.message}",
                'url': url
            }
            
        except ScrapflyScrapeError as e:
            # Scrapfly-specific errors
            logger.error(f"Scrapfly error for {url}: {e.message}")
            return None, {
                'status_code': None,
                'success': False,
                'error': f"Scrapfly error: {e.message}",
                'url': url
            }
            
        except Exception as e:
            # General errors
            logger.exception(f"Unexpected error scraping {url} with Scrapfly: {str(e)}")
            return None, {
                'status_code': None,
                'success': False,
                'error': f"Unexpected error: {str(e)}",
                'url': url
            }
    
    async def test_connection(self) -> bool:
        """
        Test Scrapfly connection and API key validity
        
        Returns:
            bool: True if connection successful
        """
        try:
            # Test with a simple, fast-loading page
            test_url = "https://httpbin.org/html"
            logger.info("Testing Scrapfly connection...")
            
            config = ScrapeConfig(
                url=test_url,
                asp=False,  # No ASP needed for httpbin
                render_js=False  # No JS needed
            )
            
            response = self.client.scrape(config)
            
            if response.upstream_status_code == 200:
                logger.info(f"✅ Scrapfly connection test successful (Cost: {response.cost} credits)")
                return True
            else:
                logger.error(f"❌ Scrapfly test failed with status: {response.upstream_status_code}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Scrapfly connection test failed: {str(e)}")
            return False
    
    def get_account_info(self) -> Optional[Dict]:
        """
        Get Scrapfly account information
        
        Returns:
            Dict with account info or None
        """
        try:
            # Note: Scrapfly SDK doesn't have direct account info method
            # This would need to be implemented via their REST API
            logger.info("Account info not available via SDK - use Scrapfly dashboard")
            return None
        except Exception as e:
            logger.error(f"Error getting account info: {e}")
            return None


# Singleton instance
_scrapfly_service = None


def get_scrapfly_service(api_key: Optional[str] = None) -> ScrapflyService:
    """
    Get or create Scrapfly service singleton
    
    Args:
        api_key: Optional API key override
        
    Returns:
        ScrapflyService instance
    """
    global _scrapfly_service
    
    if _scrapfly_service is None:
        _scrapfly_service = ScrapflyService(api_key)
    
    return _scrapfly_service