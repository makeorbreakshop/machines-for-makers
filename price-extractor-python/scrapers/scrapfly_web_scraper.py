"""
Scrapfly Web Scraper - Drop-in replacement for Puppeteer/Playwright HTML fetching
Implements tiered credit optimization while maintaining exact same interface
"""
import asyncio
from typing import Dict, Optional, Tuple, Any
from urllib.parse import urlparse
from bs4 import BeautifulSoup
from loguru import logger
import time
from datetime import datetime, timedelta

from scrapfly import ScrapflyClient, ScrapeConfig, ScrapeApiResponse
from scrapfly import (
    ScrapflyError,
    UpstreamHttpClientError,
    UpstreamHttpServerError,
    ScrapflyScrapeError
)

from services.database import DatabaseService


class ScrapflyWebScraper:
    """
    Scrapfly-based web scraper that implements the same interface as the existing web scraper.
    Uses tiered fetching to minimize credit usage while maintaining high success rates.
    """
    
    def __init__(self, api_key: Optional[str] = None, database_service: Optional[DatabaseService] = None):
        """
        Initialize Scrapfly web scraper
        
        Args:
            api_key: Scrapfly API key (defaults to env var SCRAPFLY_API_KEY)
            database_service: Database service for tier history tracking
        """
        import os
        
        self.api_key = api_key or os.getenv('SCRAPFLY_API_KEY')
        if not self.api_key:
            raise ValueError("Scrapfly API key not provided. Set SCRAPFLY_API_KEY environment variable.")
        
        self.client = ScrapflyClient(
            key=self.api_key,
            max_concurrency=5  # Reduced to prevent 429 throttling in production
        )
        
        self.db_service = database_service or DatabaseService()
        
        # Track last operation for credit logging
        self.last_operation = {
            'tier': 1,
            'credits': 1,
            'success': False
        }
        
        # Rate limiting for failed requests and concurrency control
        self.failed_requests = []  # List of timestamps for failed requests
        self.max_failed_per_minute = 15  # Stay well under Scrapfly's 25/min limit
        self.throttle_until = None  # Timestamp when throttling ends
        self.concurrent_requests = 0  # Track active concurrent requests
        self.max_concurrent = 3  # Limit concurrent requests to prevent 429s
        
        logger.info("Scrapfly web scraper initialized with tiered fetching and rate limiting")
    
    async def get_page_content(self, url: str) -> Tuple[Optional[str], Optional[BeautifulSoup]]:
        """
        Main interface method - fetches page content using tiered approach.
        Maintains exact same return format as existing web scraper.
        
        Args:
            url: URL to scrape
            
        Returns:
            Tuple of (html_content, BeautifulSoup object)
        """
        logger.info(f"🚀 Scrapfly fetch: {url}")
        
        # Get domain for tier history lookup
        domain = self._extract_domain(url)
        
        # Get optimal starting tier based on history
        start_tier = await self._get_optimal_tier(domain)
        
        # Try tiers in escalating order
        for tier in range(start_tier, 4):  # Tiers 1, 2, 3
            html_content, metadata = await self._fetch_with_tier(url, tier)
            
            if html_content:
                # Success - update tier history and return
                await self._record_success(domain, tier, metadata)
                soup = BeautifulSoup(html_content, 'html.parser')
                
                # Track operation for credit logging
                self.last_operation = {
                    'tier': tier,
                    'credits': metadata.get('cost', 1),
                    'success': True
                }
                
                logger.info(f"✅ Scrapfly success: Tier {tier}, {metadata.get('cost', 0)} credits")
                return html_content, soup
            
            # Log failure and try next tier
            logger.warning(f"❌ Tier {tier} failed for {url}: {metadata.get('error', 'Unknown error')}")
        
        # All tiers failed
        self.last_operation = {
            'tier': 3,  # Highest tier attempted
            'credits': 0,  # No credits charged for failures
            'success': False
        }
        
        logger.error(f"❌ All tiers failed for {url}")
        return None, None
    
    async def validate_url_health(self, url: str) -> Dict[str, Any]:
        """
        Validate URL health using Scrapfly Tier 1 (minimal credits).
        Maintains same interface as existing web scraper.
        
        Args:
            url: URL to validate
            
        Returns:
            Dict with health status and issues
        """
        try:
            # Use minimal Tier 1 for health check
            html_content, metadata = await self._fetch_with_tier(url, 1)
            
            if metadata.get('success'):
                return {
                    'is_healthy': True,
                    'status_code': metadata.get('status_code', 200),
                    'issues': []
                }
            else:
                return {
                    'is_healthy': False,
                    'status_code': metadata.get('status_code', 0),
                    'issues': [metadata.get('error', 'Unknown error')]
                }
        except Exception as e:
            logger.warning(f"Error validating URL health for {url}: {str(e)}")
            return {
                'is_healthy': False,
                'status_code': 0,
                'issues': [f"Health check error: {str(e)}"]
            }
    
    def suggest_url_fixes(self, health_result: Dict[str, Any]) -> list:
        """
        Suggest URL fixes based on health check results.
        Maintains same interface as existing web scraper.
        
        Args:
            health_result: Result from validate_url_health
            
        Returns:
            List of suggested URL fixes
        """
        # For now, return empty list - existing logic handles this
        # Could be enhanced later to suggest domain variations
        return []
    
    async def _check_rate_limit(self) -> None:
        """Check and enforce rate limiting for failed requests and concurrency."""
        # If we're currently throttled, wait
        if self.throttle_until and datetime.now() < self.throttle_until:
            wait_seconds = (self.throttle_until - datetime.now()).total_seconds()
            logger.warning(f"⏱️ Rate limited - waiting {wait_seconds:.1f}s before next request")
            await asyncio.sleep(wait_seconds)
            self.throttle_until = None
        
        # Clean up old failed requests (older than 60 seconds)
        cutoff_time = datetime.now() - timedelta(seconds=60)
        self.failed_requests = [ts for ts in self.failed_requests if ts > cutoff_time]
        
        # If we're approaching the failed request limit, add delay
        if len(self.failed_requests) >= self.max_failed_per_minute - 5:
            logger.warning(f"⚠️ Approaching rate limit ({len(self.failed_requests)} failed requests in last minute)")
            await asyncio.sleep(3)  # Slow down
        
        # Enforce concurrency limit to prevent 429 errors
        while self.concurrent_requests >= self.max_concurrent:
            logger.info(f"⏳ Waiting for concurrent request slot ({self.concurrent_requests}/{self.max_concurrent})")
            await asyncio.sleep(0.5)  # Wait for a slot to open
    
    async def _fetch_with_tier(self, url: str, tier: int) -> Tuple[Optional[str], Dict]:
        """
        Fetch URL using specific tier configuration
        
        Args:
            url: URL to fetch
            tier: Tier level (1, 2, or 3)
            
        Returns:
            Tuple of (html_content, metadata)
        """
        # Check rate limiting and get request slot
        await self._check_rate_limit()
        
        # Increment concurrent request counter
        self.concurrent_requests += 1
        
        try:
            config = self._get_tier_config(url, tier)
            
            # Run the synchronous scrape method in thread pool to avoid blocking event loop
            # This enables true concurrent processing while maintaining response integrity
            try:
                loop = asyncio.get_event_loop()
                response: ScrapeApiResponse = await loop.run_in_executor(
                    None,  # Use default thread pool executor
                    self.client.scrape,
                    config
                )
                
                # Debug logging for thread pool response
                if response is None:
                    logger.error(f"Thread pool returned None response for {url}")
                    return None, {
                        'tier': tier,
                        'status_code': None,
                        'success': False,
                        'error': 'Thread pool returned None response',
                        'cost': 0,
                        'url': url
                    }
                    
            except Exception as e:
                logger.error(f"Scrapfly request failed for {url} (tier {tier}): {str(e)}")
                return None, {
                    'tier': tier,
                    'status_code': None,
                    'success': False,
                    'error': f"Request failed: {str(e)}",
                    'cost': 0,
                    'url': url
                }
            
            # Extract results with safety checks
            if not response or not hasattr(response, 'scrape_result'):
                logger.error(f"Invalid response object from Scrapfly for {url}")
                return None, {
                    'tier': tier,
                    'status_code': None,
                    'success': False,
                    'error': 'Invalid response object',
                    'cost': 0,
                    'url': url
                }
            
            result = response.scrape_result
            if result is None:
                logger.error(f"No scrape result in response for {url}")
                return None, {
                    'tier': tier,
                    'status_code': None,
                    'success': False,
                    'error': 'No scrape result in response',
                    'cost': 0,
                    'url': url
                }
            
            # Ensure result is a dict before calling .get()
            if not isinstance(result, dict):
                logger.error(f"scrape_result is not a dict for {url}: {type(result)}")
                return None, {
                    'tier': tier,
                    'status_code': None,
                    'success': False,
                    'error': f'scrape_result is {type(result)}, not dict',
                    'cost': 0,
                    'url': url
                }
            
            html_content = result.get('content', '')
            
            # Build metadata - with safe access to response attributes
            try:
                metadata = {
                    'tier': tier,
                    'status_code': getattr(response, 'upstream_status_code', None),
                    'success': getattr(response, 'upstream_status_code', None) == 200,
                    'url': result.get('url', url),
                    'cost': getattr(response, 'cost', 0),
                    'asp_used': result.get('asp', {}).get('enabled', False) if isinstance(result.get('asp'), dict) else False,
                    'js_rendered': result.get('browser_data') is not None,
                    'duration': result.get('duration'),
                    'error': None
                }
            except Exception as meta_error:
                logger.error(f"Error building metadata for {url}: {meta_error}")
                # Return basic metadata on error
                metadata = {
                    'tier': tier,
                    'status_code': None,
                    'success': False,
                    'url': url,
                    'cost': 0,
                    'asp_used': False,
                    'js_rendered': False,
                    'duration': None,
                    'error': f'Metadata error: {meta_error}'
                }
            
            return html_content, metadata
            
        except UpstreamHttpClientError as e:
            # Track failed request
            self.failed_requests.append(datetime.now())
            
            return None, {
                'tier': tier,
                'status_code': e.http_status_code,
                'success': False,
                'error': f"Client error: {e.message}",
                'cost': 0,
                'url': url
            }
            
        except UpstreamHttpServerError as e:
            # Track failed request
            self.failed_requests.append(datetime.now())
            
            return None, {
                'tier': tier,
                'status_code': e.http_status_code,
                'success': False,
                'error': f"Server error: {e.message}",
                'cost': 0,
                'url': url
            }
            
        except ScrapflyScrapeError as e:
            # Track failed request
            self.failed_requests.append(datetime.now())
            
            # Check if it's a 429 throttling error
            if "429" in str(e) or "throttled" in str(e).lower():
                logger.error(f"🚫 Scrapfly throttling detected: {e.message}")
                # Set throttle until 60 seconds from now
                self.throttle_until = datetime.now() + timedelta(seconds=60)
            
            return None, {
                'tier': tier,
                'status_code': None,
                'success': False,
                'error': f"Scrapfly error: {e.message}",
                'cost': 0,
                'url': url
            }
            
        except Exception as e:
            # Track failed request
            self.failed_requests.append(datetime.now())
            
            # Check if it's a 429 throttling error
            if "429" in str(e) or "throttled" in str(e).lower():
                logger.error(f"🚫 Throttling detected: {str(e)}")
                # Set throttle until 60 seconds from now
                self.throttle_until = datetime.now() + timedelta(seconds=60)
            
            return None, {
                'tier': tier,
                'status_code': None,
                'success': False,
                'error': f"Unexpected error: {str(e)}",
                'cost': 0,
                'url': url
            }
        finally:
            # Always decrement concurrent request counter
            self.concurrent_requests = max(0, self.concurrent_requests - 1)
    
    def _get_tier_config(self, url: str, tier: int) -> ScrapeConfig:
        """
        Get Scrapfly configuration for specific tier
        
        Args:
            url: URL to scrape
            tier: Tier level (1, 2, or 3)
            
        Returns:
            ScrapeConfig object
        """
        if tier == 1:
            # Tier 1: Basic fetch - 1 credit
            return ScrapeConfig(
                url=url,
                asp=False,
                render_js=False,
                country='US',
                cost_budget=5,  # Safety limit
                retry=True
                # timeout not allowed with retry=True
            )
        elif tier == 2:
            # Tier 2: JavaScript rendering - 5 credits
            return ScrapeConfig(
                url=url,
                asp=False,
                render_js=True,
                country='US',
                cost_budget=10,  # Safety limit
                retry=True,
                wait_for_selector=None,  # Could be optimized with learned selectors
                auto_scroll=False  # Keep costs down
                # timeout not allowed with retry=True
            )
        elif tier == 3:
            # Tier 3: Full anti-bot protection - 25+ credits
            return ScrapeConfig(
                url=url,
                asp=True,  # Anti-bot protection
                render_js=True,
                country='US',
                cost_budget=50,  # Higher limit for difficult sites
                retry=True,
                auto_scroll=True,  # Load lazy content
                wait_for_selector=None
                # timeout not allowed with retry=True
            )
        else:
            raise ValueError(f"Invalid tier: {tier}")
    
    def _extract_domain(self, url: str) -> str:
        """Extract clean domain from URL"""
        try:
            domain = urlparse(url).netloc.lower()
            # Remove www. prefix
            return domain.replace('www.', '')
        except Exception:
            return url
    
    async def _get_optimal_tier(self, domain: str) -> int:
        """
        Get optimal starting tier based on historical success
        
        Args:
            domain: Domain to check
            
        Returns:
            Optimal starting tier (1, 2, or 3)
        """
        try:
            # Query tier history directly from Supabase
            response = self.db_service.supabase.table('scrapfly_tier_history') \
                .select('successful_tier, success_count, last_success_at') \
                .eq('domain', domain) \
                .order('last_success_at', desc=True) \
                .limit(1) \
                .execute()
            
            if response.data and len(response.data) > 0:
                history = response.data[0]
                success_count = history.get('success_count', 0)
                successful_tier = history.get('successful_tier', 1)
                
                # If tier has been successful 3+ times, start there
                if success_count >= 3:
                    logger.info(f"📊 Using learned tier {successful_tier} for {domain} ({success_count} successes)")
                    return successful_tier
            
            # Default to Tier 1 for new domains
            return 1
            
        except Exception as e:
            logger.warning(f"Error getting optimal tier for {domain}: {str(e)}")
            return 1
    
    async def _record_success(self, domain: str, tier: int, metadata: Dict):
        """
        Record successful tier usage for future optimization
        
        Args:
            domain: Domain that succeeded
            tier: Tier that worked
            metadata: Response metadata
        """
        try:
            from datetime import datetime
            
            # Try to upsert tier history using Supabase upsert
            data = {
                'domain': domain,
                'successful_tier': tier,
                'success_count': 1,
                'last_success_at': datetime.utcnow().isoformat()
            }
            
            # First check if record exists
            existing = self.db_service.supabase.table('scrapfly_tier_history') \
                .select('success_count') \
                .eq('domain', domain) \
                .execute()
            
            if existing.data:
                # Update existing record
                current_count = existing.data[0].get('success_count', 0)
                data['success_count'] = current_count + 1
                
                self.db_service.supabase.table('scrapfly_tier_history') \
                    .update(data) \
                    .eq('domain', domain) \
                    .execute()
            else:
                # Insert new record
                self.db_service.supabase.table('scrapfly_tier_history') \
                    .insert(data) \
                    .execute()
            
            logger.debug(f"📊 Recorded tier {tier} success for {domain}")
            
        except Exception as e:
            logger.warning(f"Error recording success for {domain}: {str(e)}")
    
    async def log_credit_usage(self, batch_id: str, machine_id: str, url: str, tier: int = None, credits: int = None, success: bool = None):
        """
        Log credit usage for batch tracking
        
        Args:
            batch_id: Batch ID
            machine_id: Machine ID
            url: URL scraped
            tier: Tier used (defaults to last operation)
            credits: Credits consumed (defaults to last operation)
            success: Whether scrape succeeded (defaults to last operation)
        """
        try:
            # Use last operation data if not provided
            actual_tier = tier if tier is not None else self.last_operation.get('tier', 1)
            actual_credits = credits if credits is not None else self.last_operation.get('credits', 1)
            actual_success = success if success is not None else self.last_operation.get('success', False)
            
            # Insert credit log directly using Supabase
            data = {
                'url': url,
                'tier_used': actual_tier,
                'credits_used': actual_credits,
                'success': actual_success
            }
            
            # Only add batch_id and machine_id if they're valid UUIDs and exist
            if batch_id:
                data['batch_id'] = batch_id
            if machine_id:
                data['machine_id'] = machine_id
            
            self.db_service.supabase.table('scrapfly_credit_log') \
                .insert(data) \
                .execute()
            
            logger.debug(f"📊 Logged {actual_credits} credits for tier {actual_tier} on {url}")
            
        except Exception as e:
            logger.warning(f"Error logging credit usage: {str(e)}")