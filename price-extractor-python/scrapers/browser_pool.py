"""
Browser Pool Manager for concurrent price extraction.
Provides dedicated browser instances to prevent resource conflicts.
"""

import asyncio
from typing import Optional, List
from loguru import logger
from playwright.async_api import async_playwright, Browser, BrowserContext, Page
from contextlib import asynccontextmanager


class BrowserPool:
    """Manages a pool of dedicated browser instances for concurrent processing."""
    
    def __init__(self, pool_size: int = 5):
        """
        Initialize browser pool.
        
        Args:
            pool_size (int): Number of browser instances to maintain in pool
        """
        self.pool_size = pool_size
        self.playwright = None
        self.browsers: List[Browser] = []
        self.available_browsers = asyncio.Queue()
        self.is_initialized = False
        
    async def initialize(self):
        """Initialize the browser pool with dedicated instances."""
        if self.is_initialized:
            return
            
        logger.info(f"🚀 Initializing browser pool with {self.pool_size} instances...")
        
        try:
            # Start Playwright
            self.playwright = await async_playwright().start()
            
            # Create browser instances
            for i in range(self.pool_size):
                browser = await self._create_browser_instance(i)
                self.browsers.append(browser)
                await self.available_browsers.put(browser)
                logger.info(f"✅ Browser instance {i+1}/{self.pool_size} created")
            
            self.is_initialized = True
            logger.info(f"🎉 Browser pool initialized successfully with {self.pool_size} instances")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize browser pool: {str(e)}")
            await self.cleanup()
            raise
    
    async def _create_browser_instance(self, instance_id: int) -> Browser:
        """Create a single browser instance with optimal settings."""
        try:
            # Try Chromium first
            browser = await self.playwright.chromium.launch(
                headless=True,
                args=[
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--no-first-run',
                    '--no-default-browser-check',
                    '--disable-default-apps',
                    '--disable-extensions',
                    '--disable-background-timer-throttling',
                    '--disable-renderer-backgrounding',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-ipc-flooding-protection',
                    f'--user-data-dir=/tmp/browser-pool-{instance_id}'
                ]
            )
            logger.debug(f"Browser instance {instance_id} created with Chromium")
            return browser
            
        except Exception as e:
            logger.warning(f"Chromium launch failed for instance {instance_id}, trying Firefox: {str(e)}")
            # Fallback to Firefox
            browser = await self.playwright.firefox.launch(
                headless=True,
                args=['--no-sandbox']
            )
            logger.debug(f"Browser instance {instance_id} created with Firefox")
            return browser
    
    @asynccontextmanager
    async def get_browser(self):
        """
        Get a browser instance from the pool.
        
        Yields:
            Browser: A dedicated browser instance
        """
        if not self.is_initialized:
            await self.initialize()
        
        # Get browser from pool (blocks if none available)
        browser = await self.available_browsers.get()
        
        try:
            # Verify browser is still connected
            if not browser.is_connected():
                logger.warning("Browser disconnected, creating new instance...")
                browser = await self._create_browser_instance(len(self.browsers))
            
            yield browser
            
        finally:
            # Return browser to pool
            await self.available_browsers.put(browser)
    
    async def cleanup(self):
        """Clean up all browser instances and resources."""
        if not self.is_initialized:
            return
            
        logger.info("🧹 Cleaning up browser pool...")
        
        # Close all browsers
        for i, browser in enumerate(self.browsers):
            try:
                if browser.is_connected():
                    await browser.close()
                    logger.debug(f"Browser instance {i+1} closed")
            except Exception as e:
                logger.warning(f"Error closing browser instance {i+1}: {str(e)}")
        
        # Stop Playwright
        if self.playwright:
            try:
                await self.playwright.stop()
                logger.debug("Playwright stopped")
            except Exception as e:
                logger.warning(f"Error stopping Playwright: {str(e)}")
        
        # Reset state
        self.browsers.clear()
        self.available_browsers = asyncio.Queue()
        self.is_initialized = False
        
        logger.info("✅ Browser pool cleanup completed")


# Global browser pool instance
_browser_pool: Optional[BrowserPool] = None


async def get_browser_pool(pool_size: int = 5) -> BrowserPool:
    """Get or create the global browser pool instance."""
    global _browser_pool
    
    if _browser_pool is None:
        _browser_pool = BrowserPool(pool_size)
        await _browser_pool.initialize()
    
    return _browser_pool


async def cleanup_browser_pool():
    """Clean up the global browser pool."""
    global _browser_pool
    
    if _browser_pool:
        await _browser_pool.cleanup()
        _browser_pool = None


class PooledDynamicScraper:
    """
    Dynamic scraper that uses the browser pool for resource isolation.
    Drop-in replacement for DynamicScraper with better concurrency support.
    """
    
    def __init__(self, pool_size: int = 5):
        self.pool_size = pool_size
        self.browser = None
        self.context = None
        self.page = None
        self.browser_pool = None
        
    async def __aenter__(self):
        """Async context manager entry - get browser from pool."""
        self.browser_pool = await get_browser_pool(self.pool_size)
        
        # Get dedicated browser from pool
        self.browser_manager = self.browser_pool.get_browser()
        self.browser = await self.browser_manager.__aenter__()
        
        # Create fresh context and page
        self.context = await self.browser.new_context()
        self.page = await self.context.new_page()
        
        # Set realistic headers
        await self.page.set_extra_http_headers({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        
        logger.debug("✅ PooledDynamicScraper initialized with dedicated browser")
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit - return browser to pool."""
        try:
            # Close page and context (but keep browser)
            if self.page:
                await self.page.close()
            if self.context:
                await self.context.close()
            
            # Return browser to pool
            if self.browser_manager:
                await self.browser_manager.__aexit__(exc_type, exc_val, exc_tb)
                
            logger.debug("✅ PooledDynamicScraper cleaned up, browser returned to pool")
            
        except Exception as e:
            logger.warning(f"Error during PooledDynamicScraper cleanup: {str(e)}")
    
    # All the essential methods from DynamicScraper
    async def extract_price_with_variants(self, url, machine_name, variant_rules, machine_data=None):
        """Extract price from a page that requires variant selection - using pooled browser."""
        # Import the implementation from the original DynamicScraper
        from scrapers.dynamic_scraper import DynamicScraper
        
        # Create a temporary instance to access the methods
        temp_scraper = DynamicScraper()
        
        # Copy the state to the temporary scraper
        temp_scraper.page = self.page
        temp_scraper.browser = self.browser
        temp_scraper.playwright = self.browser_pool.playwright
        
        # Call the original method
        return await temp_scraper.extract_price_with_variants(url, machine_name, variant_rules, machine_data)
    
    async def get_html_after_variant_selection(self, url, machine_name):
        """Get HTML content after variant selection - using pooled browser."""
        from scrapers.dynamic_scraper import DynamicScraper
        
        temp_scraper = DynamicScraper()
        temp_scraper.page = self.page
        temp_scraper.browser = self.browser
        temp_scraper.playwright = self.browser_pool.playwright
        
        return await temp_scraper.get_html_after_variant_selection(url, machine_name)