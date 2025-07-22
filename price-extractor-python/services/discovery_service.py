"""
Discovery Service
Handles manufacturer website product discovery and data extraction
"""
import asyncio
import logging
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
import json
from datetime import datetime

from crawlers.site_crawler import SiteCrawler, CrawlConfig
from normalizers.machine_data_normalizer import MachineDataNormalizer, ValidationResult
from scrapers.price_extractor import PriceExtractor
from scrapers.dynamic_scraper import DynamicScraper
from scrapers.hybrid_web_scraper import get_hybrid_scraper
from services.database import DatabaseService
from services.cost_tracker import CostTracker
from services.scrapfly_service import get_scrapfly_service

logger = logging.getLogger(__name__)


@dataclass
class DiscoveryRequest:
    """Request parameters for product discovery"""
    scan_log_id: str
    site_id: str
    base_url: str
    sitemap_url: Optional[str]
    scraping_config: Dict
    scan_type: str = 'discovery'


@dataclass
class DiscoveryResult:
    """Result of product discovery operation"""
    success: bool
    discovered_count: int
    processed_count: int
    error_count: int
    total_cost: float
    errors: List[str]
    warnings: List[str]


class DiscoveryService:
    """Service for discovering and processing manufacturer products"""

    def __init__(self):
        self.db = DatabaseService()
        self.price_extractor = PriceExtractor()
        self.dynamic_scraper = None  # Initialize when needed
        self.normalizer = MachineDataNormalizer()
        self.cost_tracker = CostTracker()

    async def discover_products(self, request: DiscoveryRequest) -> DiscoveryResult:
        """
        Main discovery method - crawl site and extract product data
        
        Args:
            request: Discovery request parameters
            
        Returns:
            DiscoveryResult with statistics and errors
        """
        logger.info(f"Starting product discovery for {request.base_url}")
        
        discovered_count = 0
        processed_count = 0
        error_count = 0
        total_cost = 0.0
        errors = []
        warnings = []

        try:
            # Update scan log status
            await self._update_scan_log(request.scan_log_id, {
                'status': 'running',
                'started_at': datetime.utcnow().isoformat() + 'Z'
            })

            # Step 1: Discover product URLs
            logger.info("=" * 60)
            logger.info("STEP 1: DISCOVERING PRODUCT URLs")
            logger.info("=" * 60)
            logger.info(f"Site: {request.base_url}")
            logger.info(f"Sitemap URL: {request.sitemap_url or 'Will auto-detect'}")
            
            product_urls, crawl_stats = await self._discover_urls(request)
            discovered_count = len(product_urls)

            # Update scan log with crawl stats
            await self._update_scan_log(request.scan_log_id, {
                'products_found': discovered_count  # This column exists
            })

            if not product_urls:
                logger.warning("⚠️ NO PRODUCT URLs DISCOVERED!")
                logger.info("This could mean:")
                logger.info("  - The sitemap doesn't contain product URLs")
                logger.info("  - Product URL patterns need adjustment")
                logger.info("  - The site structure is different than expected")
                
                await self._update_scan_log(request.scan_log_id, {
                    'status': 'completed',
                    'completed_at': datetime.utcnow().isoformat() + 'Z',
                    'error_message': 'No product URLs discovered'
                })
                return DiscoveryResult(
                    success=True,
                    discovered_count=0,
                    processed_count=0,
                    error_count=0,
                    total_cost=0.0,
                    errors=[],
                    warnings=['No product URLs discovered']
                )

            logger.info(f"✅ Discovered {discovered_count} product URLs")
            logger.info("Sample URLs:")
            for i, url in enumerate(product_urls[:5]):
                logger.info(f"  {i+1}. {url}")
            if len(product_urls) > 5:
                logger.info(f"  ... and {len(product_urls) - 5} more")

            # Step 2: Store discovered URLs (skip extraction for now)
            logger.info("")
            logger.info("=" * 60)
            logger.info("STEP 2: STORING DISCOVERED URLs")
            logger.info("=" * 60)
            
            # For now, just store the URLs without extracting data
            for url in product_urls[:20]:  # Limit to first 20 for testing
                try:
                    # Check if already exists
                    exists = await self._check_existing_url(url)
                    if not exists:
                        # Store basic record matching actual schema
                        record = {
                            'scan_log_id': request.scan_log_id,
                            'source_url': url,  # Changed from discovered_url
                            'raw_data': {'url': url, 'title': 'Pending extraction'},  # Changed from extracted_data
                            'normalized_data': {},
                            'validation_errors': [],  # Must be array not null
                            'validation_warnings': [],
                            'status': 'pending',
                            'machine_type': None,
                            'ai_extraction_cost': 0.0
                        }
                        
                        stored = await self._store_discovered_machine(record)
                        if stored:
                            processed_count += 1
                            logger.info(f"✅ Stored URL {processed_count}/{min(20, len(product_urls))}: {url}")
                        else:
                            error_count += 1
                            logger.error(f"❌ Failed to store URL: {url}")
                    else:
                        logger.info(f"⏭️  Skipping existing URL: {url}")
                        
                except Exception as e:
                    error_count += 1
                    logger.error(f"❌ Error storing URL {url}: {str(e)}")
            
            logger.info(f"Stored {processed_count} new URLs")

            # Step 3: Complete scan
            logger.info("")
            logger.info("=" * 60)
            logger.info("STEP 3: DISCOVERY COMPLETE")
            logger.info("=" * 60)
            
            await self._update_scan_log(request.scan_log_id, {
                'status': 'completed',
                'completed_at': datetime.utcnow().isoformat() + 'Z',
                'products_processed': processed_count,  # Changed from new_products
                'ai_cost_usd': total_cost  # Changed from cost_usd
            })

            result = DiscoveryResult(
                success=True,
                discovered_count=discovered_count,
                processed_count=processed_count,
                error_count=error_count,
                total_cost=total_cost,
                errors=errors,
                warnings=warnings
            )

            logger.info(f"✅ Discovery Summary:")
            logger.info(f"   URLs discovered: {discovered_count}")
            logger.info(f"   Products processed: {processed_count}")
            logger.info(f"   Errors: {error_count}")
            logger.info(f"   Total cost: ${total_cost:.2f}")
            logger.info(f"   Success rate: {(processed_count/discovered_count*100 if discovered_count > 0 else 0):.1f}%")
            return result

        except Exception as e:
            error_msg = f"Discovery failed: {str(e)}"
            logger.error(error_msg, exc_info=True)
            errors.append(error_msg)

            # Update scan log with error
            await self._update_scan_log(request.scan_log_id, {
                'status': 'failed',
                'completed_at': datetime.utcnow().isoformat() + 'Z',
                'error_message': error_msg  # Changed from error_log
            })

            return DiscoveryResult(
                success=False,
                discovered_count=discovered_count,
                processed_count=processed_count,
                error_count=error_count + 1,
                total_cost=total_cost,
                errors=errors,
                warnings=warnings
            )

    async def _discover_urls(self, request: DiscoveryRequest) -> Tuple[List[str], Dict]:
        """Discover product URLs using the site crawler"""
        try:
            # Convert scraping config to CrawlConfig
            config_dict = request.scraping_config or {}
            crawl_config = CrawlConfig(
                crawl_delay=config_dict.get('crawl_delay', 3.0),
                user_agent=config_dict.get('user_agent', 'MachinesForMakers/1.0'),
                respect_robots=config_dict.get('respect_robots', True),
                product_url_patterns=config_dict.get('product_url_patterns', ['/products/*']),
                exclude_patterns=config_dict.get('exclude_patterns', ['/blog/*', '/support/*']),
                use_sitemap=config_dict.get('use_sitemap', True),
                max_pages=config_dict.get('max_pages', 1000)
            )

            async with SiteCrawler(request.base_url, crawl_config) as crawler:
                urls, stats = await crawler.discover_product_urls()
                return urls, stats

        except Exception as e:
            logger.error(f"Error discovering URLs: {e}")
            return [], {'error': str(e)}

    async def _process_batch(self, request: DiscoveryRequest, urls: List[str]) -> Dict:
        """Process a batch of URLs"""
        processed = 0
        errors = 0
        cost = 0.0
        error_messages = []
        warnings = []

        for idx, url in enumerate(urls):
            try:
                logger.info(f"   [{idx+1}/{len(urls)}] Processing: {url}")
                result = await self._process_single_url(request, url)
                
                if result['success']:
                    processed += 1
                    logger.info(f"      ✅ Success - extracted product data")
                else:
                    errors += 1
                    error_reason = result.get('error', 'Unknown error')
                    logger.warning(f"      ⚠️ Failed: {error_reason}")
                    if result.get('error'):
                        error_messages.append(f"{url}: {result['error']}")
                
                cost += result.get('cost', 0.0)
                if result.get('warnings'):
                    warnings.extend(result['warnings'])

            except Exception as e:
                errors += 1
                error_msg = f"Failed to process {url}: {str(e)}"
                logger.error(f"      ❌ Error: {str(e)}")
                error_messages.append(error_msg)

            # Brief delay between requests
            await asyncio.sleep(0.5)

        return {
            'processed': processed,
            'errors': errors,
            'cost': cost,
            'error_messages': error_messages,
            'warnings': warnings
        }

    async def _process_single_url(self, request: DiscoveryRequest, url: str) -> Dict:
        """Process a single product URL"""
        try:
            # Check if URL already exists
            existing = await self._check_existing_url(url)
            if existing:
                return {
                    'success': False,
                    'error': 'URL already exists',
                    'cost': 0.0
                }

            # Extract product data
            logger.debug(f"Extracting data from: {url}")
            extraction_result = await self._extract_product_data(url)
            
            if not extraction_result['success']:
                return extraction_result

            raw_data = extraction_result['data']
            cost = extraction_result.get('cost', 0.0)

            # Normalize data
            normalized_data, validation = self.normalizer.normalize(raw_data)

            # Store in discovered_machines table with correct schema
            discovery_record = {
                'scan_log_id': request.scan_log_id,
                'source_url': url,
                'raw_data': raw_data,
                'normalized_data': normalized_data,
                'validation_errors': validation.errors if validation.errors else [],
                'validation_warnings': validation.warnings if validation.warnings else [],
                'status': 'passed' if validation.is_valid else 'failed',
                'machine_type': self._infer_machine_type(raw_data),
                'ai_extraction_cost': cost
            }

            await self._store_discovered_machine(discovery_record)

            return {
                'success': True,
                'cost': cost,
                'warnings': validation.warnings if validation.warnings else None
            }

        except Exception as e:
            logger.error(f"Error processing {url}: {e}")
            return {
                'success': False,
                'error': str(e),
                'cost': 0.0
            }

    async def _extract_product_data(self, url: str) -> Dict:
        """Extract comprehensive product data from URL"""
        try:
            # Check budget before proceeding
            budget_status = await self.cost_tracker.check_budget_limits('discovery')
            if not budget_status.get('within_budget', True):
                logger.warning(f"Budget limit exceeded for discovery operations")
                await self.cost_tracker.create_budget_alert(
                    f"Discovery budget exceeded: ${budget_status.get('operation_cost', 0):.2f}",
                    budget_status
                )
                return {
                    'success': False,
                    'error': 'Budget limit exceeded',
                    'cost': 0.0
                }
            
            # Check if we should use Scrapfly for this site
            scrapfly_service = None
            try:
                scrapfly_service = get_scrapfly_service()
                if scrapfly_service.should_use_scrapfly(url):
                    logger.info(f"🚀 Using Scrapfly for discovery: {url}")
                    
                    # Scrape with Scrapfly
                    html_content, metadata = await scrapfly_service.scrape_page(url, render_js=True)
                    
                    if html_content and metadata.get('success'):
                        # Extract price from HTML using our price extractor
                        from bs4 import BeautifulSoup
                        soup = BeautifulSoup(html_content, 'html.parser')
                        
                        price_extractor = PriceExtractor()
                        price, method = await price_extractor.extract_price(
                            soup=soup,
                            html_content=html_content,
                            url=url,
                            current_price=None,
                            machine_name=None
                        )
                        
                        # Build product data
                        product_data = {
                            'name': soup.find('h1').text.strip() if soup.find('h1') else 'Unknown Product',
                            'price': price,
                            'url': url,
                            'extraction_method': f'scrapfly_{method}' if method else 'scrapfly',
                            'scrapfly_credits': metadata.get('cost', 0)
                        }
                        
                        # Track cost
                        actual_cost = await self.cost_tracker.track_discovery_cost(
                            scan_id=f"discovery_{datetime.utcnow().isoformat()}",
                            site_id=url.split('/')[2] if '/' in url else 'unknown',
                            url=url,
                            model='scrapfly',
                            tokens=int(metadata.get('cost', 1) * 1000),  # Convert credits to pseudo-tokens
                            success=bool(price)
                        )
                        
                        if price:
                            return {
                                'success': True,
                                'data': product_data,
                                'cost': actual_cost
                            }
                        else:
                            logger.warning(f"Scrapfly scraped but no price found for {url}")
                            # Fall through to dynamic scraper
                    else:
                        logger.warning(f"Scrapfly failed for {url}: {metadata.get('error')}")
                        # Fall through to dynamic scraper
            except Exception as e:
                logger.info(f"Scrapfly not available or failed: {e}")
                # Fall through to dynamic scraper
            
            # Use dynamic scraper as fallback or primary method
            # Initialize dynamic scraper if needed
            if not self.dynamic_scraper:
                self.dynamic_scraper = DynamicScraper()
                await self.dynamic_scraper.start_browser()
            
            logger.info(f"Extracting full product data from: {url}")
            
            # Extract comprehensive product data
            product_data = await self.dynamic_scraper.extract_full_product_data(url)
            
            # Track cost (estimated tokens based on extraction success)
            estimated_tokens = 2000 if product_data else 500
            actual_cost = await self.cost_tracker.track_discovery_cost(
                scan_id=f"discovery_{datetime.utcnow().isoformat()}",
                site_id=url.split('/')[2] if '/' in url else 'unknown',
                url=url,
                model='claude-3-sonnet',
                tokens=estimated_tokens,
                success=bool(product_data and product_data.get('name'))
            )
            
            if product_data and product_data.get('name'):
                # Enhance with price extraction if needed
                if not product_data.get('price'):
                    logger.info(f"No price found in full extraction, trying price extractor")
                    price_result = await self.price_extractor.extract_price(url)
                    if price_result and price_result.get('price'):
                        product_data['price'] = price_result['price']
                        product_data['extraction_method'] = price_result.get('method', 'price_extractor')
                
                return {
                    'success': True,
                    'data': product_data,
                    'cost': actual_cost
                }
            else:
                # Fallback to price-only extraction
                logger.info(f"Full extraction failed, falling back to price extraction for: {url}")
                result = await self.price_extractor.extract_price(url)
                
                if result and 'price' in result:
                    # Track fallback extraction cost
                    fallback_cost = await self.cost_tracker.track_discovery_cost(
                        scan_id=f"fallback_{datetime.utcnow().isoformat()}",
                        site_id=url.split('/')[2] if '/' in url else 'unknown',
                        url=url,
                        model='claude-3-haiku',
                        tokens=1000,
                        success=True
                    )
                    
                    # Convert price result to product data format
                    product_data = {
                        'name': result.get('name') or 'Unknown Product',
                        'price': result.get('price'),
                        'url': url,
                        'extraction_method': result.get('method', 'price_extractor_fallback')
                    }
                    return {
                        'success': True,
                        'data': product_data,
                        'cost': actual_cost + fallback_cost
                    }
                else:
                    return {
                        'success': False,
                        'error': 'No product data extracted',
                        'cost': actual_cost
                    }

        except Exception as e:
            logger.error(f"Error extracting product data from {url}: {str(e)}")
            
            # Track error cost
            try:
                error_cost = await self.cost_tracker.track_discovery_cost(
                    scan_id=f"error_{datetime.utcnow().isoformat()}",
                    site_id=url.split('/')[2] if '/' in url else 'unknown',
                    url=url,
                    model='claude-3-haiku',
                    tokens=100,
                    success=False
                )
            except:
                error_cost = 0.01  # Fallback cost
            
            return {
                'success': False,
                'error': str(e),
                'cost': error_cost
            }

    async def _check_existing_url(self, url: str) -> bool:
        """Check if URL already exists in discovered_machines"""
        try:
            # Use Supabase client with correct column name
            result = self.db.supabase.table("discovered_machines") \
                .select("id") \
                .eq("source_url", url) \
                .limit(1) \
                .execute()
            
            return len(result.data) > 0 if result.data else False
        except Exception as e:
            logger.warning(f"Error checking existing URL: {e}")
            return False

    async def _store_discovered_machine(self, record: Dict) -> bool:
        """Store discovered machine record"""
        try:
            # Use Supabase client with correct column names
            data = {
                'scan_log_id': record['scan_log_id'],
                'source_url': record['source_url'],
                'raw_data': record['raw_data'],
                'normalized_data': record['normalized_data'],
                'validation_errors': record['validation_errors'],
                'validation_warnings': record['validation_warnings'],
                'status': record['status'],
                'machine_type': record['machine_type'],
                'ai_extraction_cost': record['ai_extraction_cost']
            }
            
            result = self.db.supabase.table("discovered_machines").insert(data).execute()
            
            if result.data:
                logger.debug(f"Stored discovered machine: {record['page_title']}")
                return True
            else:
                logger.error(f"Failed to store discovered machine: no data returned")
                return False
        except Exception as e:
            logger.error(f"Error storing discovered machine: {e}")
            return False
    
    def _infer_machine_type(self, product_data: Dict) -> str:
        """Infer machine type from product data"""
        try:
            name = product_data.get('name', '').lower()
            description = product_data.get('description', '').lower()
            brand = product_data.get('brand', '').lower()
            
            combined_text = f"{name} {description} {brand}"
            
            # Machine type detection patterns
            if any(term in combined_text for term in ['laser', 'engraver', 'engraving', 'cutter']):
                return 'laser-cutter'
            elif any(term in combined_text for term in ['3d print', 'printer', 'fdm', 'sla', 'resin']):
                return '3d-printer' 
            elif any(term in combined_text for term in ['cnc', 'mill', 'router', 'machining']):
                return 'cnc-machine'
            elif any(term in combined_text for term in ['uv print', 'dtf', 'vinyl']):
                return 'uv-dtf-printer'
            else:
                return 'unknown'
                
        except Exception as e:
            logger.warning(f"Error inferring machine type: {e}")
            return 'unknown'
    
    async def cleanup(self):
        """Clean up resources"""
        try:
            if self.dynamic_scraper:
                await self.dynamic_scraper.close_browser()
                self.dynamic_scraper = None
        except Exception as e:
            logger.error(f"Error cleaning up discovery service: {e}")

    async def _update_scan_log(self, scan_log_id: str, updates: Dict) -> bool:
        """Update scan log with progress/status"""
        try:
            # Use Supabase client
            result = self.db.supabase.table("site_scan_logs") \
                .update(updates) \
                .eq("id", scan_log_id) \
                .execute()
            
            return bool(result.data)
        except Exception as e:
            logger.error(f"Error updating scan log: {e}")
            return False


# FastAPI endpoint function
async def start_discovery(request_data: Dict) -> Dict:
    """
    FastAPI endpoint function for starting discovery
    
    Args:
        request_data: Dictionary with discovery request parameters
        
    Returns:
        Dictionary with success status and details
    """
    try:
        request = DiscoveryRequest(**request_data)
        service = DiscoveryService()
        result = await service.discover_products(request)
        
        return {
            'success': result.success,
            'scan_log_id': request.scan_log_id,
            'discovered_count': result.discovered_count,
            'processed_count': result.processed_count,
            'error_count': result.error_count,
            'total_cost': result.total_cost,
            'errors': result.errors,
            'warnings': result.warnings
        }
        
    except Exception as e:
        logger.error(f"Error in start_discovery: {e}")
        return {
            'success': False,
            'error': str(e)
        }
    finally:
        # Clean up resources
        if 'service' in locals():
            await service.cleanup()