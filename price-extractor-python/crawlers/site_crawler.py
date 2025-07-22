"""
Site crawler for manufacturer website discovery
Handles robots.txt, sitemap.xml parsing, and product URL discovery
"""
import asyncio
import aiohttp
import logging
from typing import List, Dict, Optional, Set, Tuple
from urllib.parse import urljoin, urlparse, parse_qs
from urllib.robotparser import RobotFileParser
import xml.etree.ElementTree as ET
import re
import time
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class CrawlConfig:
    """Configuration for site crawling"""
    crawl_delay: float = 3.0  # seconds between requests
    user_agent: str = "MachinesForMakers/1.0"
    respect_robots: bool = True
    product_url_patterns: List[str] = None
    exclude_patterns: List[str] = None
    use_sitemap: bool = True
    max_pages: int = 1000
    timeout: int = 30

    def __post_init__(self):
        if self.product_url_patterns is None:
            self.product_url_patterns = ["/products/*", "/machines/*", "/printers/*"]
        if self.exclude_patterns is None:
            self.exclude_patterns = ["/blog/*", "/support/*", "/cart/*", "/checkout/*"]


class SiteCrawler:
    """Crawls manufacturer websites to discover product URLs"""

    def __init__(self, base_url: str, config: CrawlConfig):
        self.base_url = base_url.rstrip('/')
        self.config = config
        self.session: Optional[aiohttp.ClientSession] = None
        self.discovered_urls: Set[str] = set()
        self.crawled_pages = 0
        self.robots_parser: Optional[RobotFileParser] = None
        self._last_request_time = 0

    async def __aenter__(self):
        """Async context manager entry"""
        timeout = aiohttp.ClientTimeout(total=self.config.timeout)
        headers = {'User-Agent': self.config.user_agent}
        self.session = aiohttp.ClientSession(timeout=timeout, headers=headers)
        
        if self.config.respect_robots:
            await self._load_robots_txt()
        
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()

    async def _load_robots_txt(self):
        """Load and parse robots.txt"""
        try:
            robots_url = urljoin(self.base_url, '/robots.txt')
            logger.info(f"Loading robots.txt from {robots_url}")
            
            async with self.session.get(robots_url) as response:
                if response.status == 200:
                    robots_content = await response.text()
                    self.robots_parser = RobotFileParser()
                    self.robots_parser.set_url(robots_url)
                    self.robots_parser.read()
                    
                    # Parse content manually since robotparser expects file-like
                    lines = robots_content.split('\n')
                    for line in lines:
                        self.robots_parser.readline(line)
                    
                    logger.info("Successfully loaded robots.txt")
                else:
                    logger.warning(f"Could not load robots.txt (status: {response.status})")
        except Exception as e:
            logger.warning(f"Failed to load robots.txt: {e}")

    def _can_fetch(self, url: str) -> bool:
        """Check if URL can be fetched according to robots.txt"""
        if not self.robots_parser or not self.config.respect_robots:
            return True
        return self.robots_parser.can_fetch(self.config.user_agent, url)

    async def _rate_limit(self):
        """Apply rate limiting between requests"""
        if self.config.crawl_delay > 0:
            elapsed = time.time() - self._last_request_time
            if elapsed < self.config.crawl_delay:
                await asyncio.sleep(self.config.crawl_delay - elapsed)
        self._last_request_time = time.time()

    def _matches_pattern(self, url: str, patterns: List[str]) -> bool:
        """Check if URL matches any of the given patterns"""
        parsed_url = urlparse(url)
        path = parsed_url.path
        
        for pattern in patterns:
            # Convert glob-style pattern to regex
            regex_pattern = pattern.replace('*', '.*').replace('?', '.')
            if re.match(regex_pattern, path):
                return True
        return False

    def _is_product_url(self, url: str) -> bool:
        """Check if URL appears to be a product page"""
        # Check against include patterns
        if not self._matches_pattern(url, self.config.product_url_patterns):
            return False
        
        # Check against exclude patterns
        if self._matches_pattern(url, self.config.exclude_patterns):
            return False
        
        return True

    async def discover_from_sitemap(self) -> List[str]:
        """Discover product URLs from sitemap.xml"""
        product_urls = []
        
        if not self.config.use_sitemap:
            return product_urls

        sitemap_urls = [
            urljoin(self.base_url, '/sitemap.xml'),
            urljoin(self.base_url, '/sitemap_index.xml'),
            urljoin(self.base_url, '/sitemap/sitemap.xml'),
        ]

        for sitemap_url in sitemap_urls:
            try:
                logger.info(f"Checking sitemap: {sitemap_url}")
                await self._rate_limit()
                
                async with self.session.get(sitemap_url) as response:
                    if response.status == 200:
                        sitemap_content = await response.text()
                        urls = await self._parse_sitemap(sitemap_content)
                        product_urls.extend(urls)
                        logger.info(f"Found {len(urls)} URLs in {sitemap_url}")
                        break  # Use first successful sitemap
                    else:
                        logger.debug(f"Sitemap not found: {sitemap_url} (status: {response.status})")
                        
            except Exception as e:
                logger.debug(f"Error accessing sitemap {sitemap_url}: {e}")

        return product_urls

    async def _parse_sitemap(self, sitemap_content: str) -> List[str]:
        """Parse sitemap XML and extract URLs"""
        urls = []
        
        try:
            root = ET.fromstring(sitemap_content)
            
            # Handle sitemap index (contains links to other sitemaps)
            if 'sitemapindex' in root.tag:
                for sitemap in root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}sitemap'):
                    loc = sitemap.find('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')
                    if loc is not None:
                        # Recursively parse sub-sitemaps
                        sub_urls = await self._fetch_and_parse_sitemap(loc.text)
                        urls.extend(sub_urls)
            
            # Handle regular sitemap (contains URLs)
            else:
                for url_element in root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}url'):
                    loc = url_element.find('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')
                    if loc is not None and self._is_product_url(loc.text):
                        urls.append(loc.text)
                        
        except ET.ParseError as e:
            logger.error(f"Failed to parse sitemap XML: {e}")
        except Exception as e:
            logger.error(f"Unexpected error parsing sitemap: {e}")

        return urls

    async def _fetch_and_parse_sitemap(self, sitemap_url: str) -> List[str]:
        """Fetch and parse a sub-sitemap"""
        urls = []
        
        try:
            await self._rate_limit()
            async with self.session.get(sitemap_url) as response:
                if response.status == 200:
                    content = await response.text()
                    urls = await self._parse_sitemap(content)
                    logger.debug(f"Found {len(urls)} URLs in sub-sitemap {sitemap_url}")
        except Exception as e:
            logger.warning(f"Failed to fetch sub-sitemap {sitemap_url}: {e}")

        return urls

    async def discover_from_crawling(self, start_urls: List[str] = None) -> List[str]:
        """Discover product URLs by crawling category/listing pages"""
        if start_urls is None:
            start_urls = [
                urljoin(self.base_url, '/products'),
                urljoin(self.base_url, '/machines'),
                urljoin(self.base_url, '/shop'),
                urljoin(self.base_url, '/store'),
            ]

        discovered_products = []
        visited_urls = set()
        urls_to_visit = list(start_urls)

        while urls_to_visit and len(discovered_products) < self.config.max_pages:
            url = urls_to_visit.pop(0)
            
            if url in visited_urls:
                continue
                
            if not self._can_fetch(url):
                logger.debug(f"Robots.txt disallows crawling: {url}")
                continue

            visited_urls.add(url)
            
            try:
                await self._rate_limit()
                logger.debug(f"Crawling: {url}")
                
                async with self.session.get(url) as response:
                    if response.status != 200:
                        continue
                    
                    html_content = await response.text()
                    page_urls = self._extract_urls_from_html(html_content, url)
                    
                    for page_url in page_urls:
                        if self._is_product_url(page_url):
                            if page_url not in self.discovered_urls:
                                discovered_products.append(page_url)
                                self.discovered_urls.add(page_url)
                        elif self._is_category_page(page_url):
                            if page_url not in visited_urls:
                                urls_to_visit.append(page_url)
                                
                self.crawled_pages += 1
                
            except Exception as e:
                logger.warning(f"Error crawling {url}: {e}")

        return discovered_products

    def _extract_urls_from_html(self, html_content: str, base_url: str) -> List[str]:
        """Extract URLs from HTML content"""
        urls = []
        
        # Simple regex to find href attributes
        href_pattern = r'href=[\'"]([^\'"]*)[\'"]'
        matches = re.findall(href_pattern, html_content, re.IGNORECASE)
        
        for href in matches:
            # Convert relative URLs to absolute
            if href.startswith('/'):
                full_url = urljoin(self.base_url, href)
            elif href.startswith('http'):
                full_url = href
            else:
                full_url = urljoin(base_url, href)
            
            # Only include URLs from the same domain
            if urlparse(full_url).netloc == urlparse(self.base_url).netloc:
                urls.append(full_url)

        return urls

    def _is_category_page(self, url: str) -> bool:
        """Check if URL appears to be a category/listing page"""
        parsed_url = urlparse(url)
        path = parsed_url.path.lower()
        
        category_indicators = [
            '/category', '/categories', '/collection', '/collections',
            '/products', '/machines', '/printers', '/shop', '/store',
            '/laser', '/3d-printer', '/cnc'
        ]
        
        return any(indicator in path for indicator in category_indicators)

    async def discover_product_urls(self) -> Tuple[List[str], Dict]:
        """Main method to discover all product URLs from a site"""
        logger.info(f"Starting product discovery for {self.base_url}")
        
        sitemap_urls = []
        crawled_urls = []
        stats = {
            'total_discovered': 0,
            'from_sitemap': 0,
            'from_crawling': 0,
            'pages_crawled': 0,
            'errors': []
        }

        try:
            # Try sitemap first
            if self.config.use_sitemap:
                logger.info("Discovering URLs from sitemap...")
                sitemap_urls = await self.discover_from_sitemap()
                stats['from_sitemap'] = len(sitemap_urls)
                logger.info(f"Found {len(sitemap_urls)} URLs from sitemap")

            # If sitemap didn't yield many results, try crawling
            if len(sitemap_urls) < 10:
                logger.info("Discovering URLs from crawling...")
                crawled_urls = await self.discover_from_crawling()
                stats['from_crawling'] = len(crawled_urls)
                stats['pages_crawled'] = self.crawled_pages
                logger.info(f"Found {len(crawled_urls)} URLs from crawling")

            # Combine and deduplicate
            all_urls = list(set(sitemap_urls + crawled_urls))
            stats['total_discovered'] = len(all_urls)
            
            logger.info(f"Discovery complete. Total unique URLs: {len(all_urls)}")
            
            return all_urls, stats

        except Exception as e:
            error_msg = f"Error during discovery: {e}"
            logger.error(error_msg)
            stats['errors'].append(error_msg)
            return [], stats


# Convenience function for simple usage
async def discover_products(base_url: str, config: Dict = None) -> Tuple[List[str], Dict]:
    """
    Convenience function to discover products from a manufacturer site
    
    Args:
        base_url: The base URL of the manufacturer site
        config: Optional configuration dictionary
        
    Returns:
        Tuple of (discovered_urls, stats_dict)
    """
    crawl_config = CrawlConfig(**config) if config else CrawlConfig()
    
    async with SiteCrawler(base_url, crawl_config) as crawler:
        return await crawler.discover_product_urls()


# Example usage
if __name__ == "__main__":
    async def test_crawler():
        # Test with a sample configuration
        config = {
            'crawl_delay': 2.0,
            'product_url_patterns': ['/products/*', '/machines/*'],
            'exclude_patterns': ['/blog/*', '/support/*'],
            'max_pages': 50
        }
        
        urls, stats = await discover_products('https://commarker.com', config)
        
        print(f"Discovered {len(urls)} product URLs")
        print(f"Stats: {stats}")
        
        for url in urls[:10]:  # Print first 10
            print(f"  - {url}")

    # Run the test
    # asyncio.run(test_crawler())