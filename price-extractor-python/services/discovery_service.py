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
from services.database import DatabaseService

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
        self.normalizer = MachineDataNormalizer()

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
            logger.info("Step 1: Discovering product URLs...")
            product_urls, crawl_stats = await self._discover_urls(request)
            discovered_count = len(product_urls)

            # Update scan log with crawl stats
            await self._update_scan_log(request.scan_log_id, {
                'pages_crawled': crawl_stats.get('pages_crawled', 0),
                'products_found': discovered_count
            })

            if not product_urls:
                await self._update_scan_log(request.scan_log_id, {
                    'status': 'completed',
                    'completed_at': datetime.utcnow().isoformat() + 'Z',
                    'error_log': {'warning': 'No product URLs discovered'}
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

            logger.info(f"Discovered {discovered_count} product URLs")

            # Step 2: Process each URL
            logger.info("Step 2: Extracting and processing product data...")
            batch_size = 10  # Process in batches to manage memory
            
            for i in range(0, len(product_urls), batch_size):
                batch_urls = product_urls[i:i + batch_size]
                logger.info(f"Processing batch {i//batch_size + 1}/{(len(product_urls)-1)//batch_size + 1}")

                batch_results = await self._process_batch(request, batch_urls)
                
                processed_count += batch_results['processed']
                error_count += batch_results['errors']
                total_cost += batch_results['cost']
                errors.extend(batch_results['error_messages'])
                warnings.extend(batch_results['warnings'])

                # Update progress
                progress_pct = int((i + len(batch_urls)) / len(product_urls) * 100)
                await self._update_scan_log(request.scan_log_id, {
                    'new_products': processed_count
                })
                
                logger.info(f"Progress: {progress_pct}% ({processed_count}/{discovered_count} processed)")

            # Step 3: Complete scan
            logger.info("Step 3: Finalizing discovery...")
            await self._update_scan_log(request.scan_log_id, {
                'status': 'completed',
                'completed_at': datetime.utcnow().isoformat() + 'Z',
                'new_products': processed_count,
                'cost_usd': total_cost
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

            logger.info(f"Discovery completed: {processed_count}/{discovered_count} products processed")
            return result

        except Exception as e:
            error_msg = f"Discovery failed: {str(e)}"
            logger.error(error_msg, exc_info=True)
            errors.append(error_msg)

            # Update scan log with error
            await self._update_scan_log(request.scan_log_id, {
                'status': 'failed',
                'completed_at': datetime.utcnow().isoformat() + 'Z',
                'error_log': {'error': error_msg, 'errors': errors}
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

        for url in urls:
            try:
                result = await self._process_single_url(request, url)
                if result['success']:
                    processed += 1
                else:
                    errors += 1
                    if result.get('error'):
                        error_messages.append(f"{url}: {result['error']}")
                
                cost += result.get('cost', 0.0)
                if result.get('warnings'):
                    warnings.extend(result['warnings'])

            except Exception as e:
                errors += 1
                error_msg = f"Failed to process {url}: {str(e)}"
                logger.error(error_msg)
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

            # Store in discovered_machines table
            discovery_record = {
                'site_id': request.site_id,
                'discovered_url': url,
                'page_title': raw_data.get('name') or raw_data.get('title', ''),
                'extracted_data': raw_data,
                'normalized_data': normalized_data,
                'validation_status': 'passed' if validation.is_valid else 'failed',
                'validation_errors': {
                    'errors': validation.errors,
                    'warnings': validation.warnings
                } if not validation.is_valid else None,
                'discovered_at': datetime.utcnow().isoformat() + 'Z'
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
        """Extract product data from URL"""
        try:
            # Use existing price extractor for now
            # TODO: Extend for full product extraction
            result = await self.price_extractor.extract_price(url)
            
            if result and 'price' in result:
                return {
                    'success': True,
                    'data': result,
                    'cost': 0.02  # Estimated cost per extraction
                }
            else:
                return {
                    'success': False,
                    'error': 'No product data extracted',
                    'cost': 0.01
                }

        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'cost': 0.01
            }

    async def _check_existing_url(self, url: str) -> bool:
        """Check if URL already exists in discovered_machines"""
        try:
            query = """
                SELECT id FROM discovered_machines 
                WHERE discovered_url = %s 
                LIMIT 1
            """
            result = await self.db.execute_query(query, (url,))
            return len(result) > 0
        except Exception as e:
            logger.warning(f"Error checking existing URL: {e}")
            return False

    async def _store_discovered_machine(self, record: Dict) -> bool:
        """Store discovered machine record"""
        try:
            query = """
                INSERT INTO discovered_machines 
                (site_id, discovered_url, page_title, extracted_data, normalized_data, 
                 validation_status, validation_errors, discovered_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """
            params = (
                record['site_id'],
                record['discovered_url'],
                record['page_title'],
                json.dumps(record['extracted_data']),
                json.dumps(record['normalized_data']),
                record['validation_status'],
                json.dumps(record['validation_errors']) if record['validation_errors'] else None,
                record['discovered_at']
            )
            
            await self.db.execute_query(query, params)
            return True
        except Exception as e:
            logger.error(f"Error storing discovered machine: {e}")
            return False

    async def _update_scan_log(self, scan_log_id: str, updates: Dict) -> bool:
        """Update scan log with progress/status"""
        try:
            set_clause = ", ".join([f"{key} = %s" for key in updates.keys()])
            query = f"UPDATE site_scan_logs SET {set_clause} WHERE id = %s"
            params = list(updates.values()) + [scan_log_id]
            
            await self.db.execute_query(query, params)
            return True
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