"""
Hybrid Web Scraper
Combines regular scraping with Scrapfly API for difficult sites
"""
import os
import asyncio
import logging
from typing import Tuple, Optional
from urllib.parse import urlparse

from scrapers.web_scraper import WebScraper
from services.scrapfly_service import get_scrapfly_service, ScrapflyService
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


class HybridWebScraper(WebScraper):
    """Enhanced web scraper that uses Scrapfly for difficult sites"""
    
    def __init__(self):
        """Initialize hybrid scraper with both regular and Scrapfly capabilities"""
        super().__init__()
        
        # Try to initialize Scrapfly if API key is available
        self.scrapfly_service = None
        if os.getenv('SCRAPFLY_API_KEY'):
            try:
                self.scrapfly_service = get_scrapfly_service()
                logger.info("✅ Scrapfly service initialized for hybrid scraping")
            except Exception as e:
                logger.warning(f"⚠️ Scrapfly service not available: {e}")
        else:
            logger.info("ℹ️ Scrapfly API key not set, using regular scraping only")
    
    async def get_page_content(self, url, max_retries=3):
        """
        Get page content using the most appropriate method.
        
        First checks if Scrapfly should be used for difficult sites,
        then falls back to regular scraping with retries.
        
        Args:
            url (str): The URL to fetch
            max_retries (int): Maximum retry attempts for regular scraping
            
        Returns:
            tuple: (html_content, BeautifulSoup object) or (None, None) on failure
        """
        # Check if we should use Scrapfly
        if self.scrapfly_service and self.scrapfly_service.should_use_scrapfly(url):
            logger.info(f"🚀 Using Scrapfly for difficult site: {url}")
            
            try:
                # Try Scrapfly first
                html_content, metadata = await self.scrapfly_service.scrape_page(url, render_js=True)
                
                if html_content and metadata.get('success'):
                    logger.info(f"✅ Scrapfly successfully scraped {url} (Cost: {metadata.get('cost')} credits)")
                    soup = BeautifulSoup(html_content, 'html.parser')
                    return html_content, soup
                else:
                    logger.warning(f"⚠️ Scrapfly failed for {url}: {metadata.get('error')}")
                    # Fall through to regular scraping
            except Exception as e:
                logger.error(f"❌ Scrapfly error for {url}: {e}")
                # Fall through to regular scraping
        
        # Use regular scraping (either as primary method or fallback)
        logger.info(f"📡 Using regular scraping for: {url}")
        return await super().get_page_content(url, max_retries)
    
    async def validate_url_health(self, url):
        """
        Validate URL health with Scrapfly support for difficult sites.
        
        Args:
            url (str): URL to validate
            
        Returns:
            dict: Health check results
        """
        # If it's a Scrapfly site, do a lightweight check
        if self.scrapfly_service and self.scrapfly_service.should_use_scrapfly(url):
            logger.info(f"🔍 Validating Scrapfly site: {url}")
            
            try:
                # Do a quick scrape without JS rendering to check URL validity
                html_content, metadata = await self.scrapfly_service.scrape_page(url, render_js=False)
                
                if metadata.get('status_code') == 404:
                    return {
                        'is_healthy': False,
                        'status_code': 404,
                        'issues': ['Page not found (404)'],
                        'checked_with': 'scrapfly'
                    }
                elif metadata.get('success'):
                    return {
                        'is_healthy': True,
                        'status_code': metadata.get('status_code', 200),
                        'issues': [],
                        'checked_with': 'scrapfly'
                    }
                else:
                    return {
                        'is_healthy': False,
                        'status_code': metadata.get('status_code'),
                        'issues': [metadata.get('error', 'Unknown error')],
                        'checked_with': 'scrapfly'
                    }
            except Exception as e:
                logger.warning(f"Scrapfly validation failed, using regular check: {e}")
                # Fall through to regular validation
        
        # Use regular validation
        return await super().validate_url_health(url)
    
    def get_scraping_stats(self):
        """Get statistics about scraping performance"""
        stats = {
            'scrapfly_available': self.scrapfly_service is not None,
            'scrapfly_sites': ScrapflyService.SCRAPFLY_SITES if self.scrapfly_service else []
        }
        
        return stats


# Singleton instance
_hybrid_scraper = None


def get_hybrid_scraper():
    """Get or create hybrid scraper singleton"""
    global _hybrid_scraper
    
    if _hybrid_scraper is None:
        _hybrid_scraper = HybridWebScraper()
    
    return _hybrid_scraper