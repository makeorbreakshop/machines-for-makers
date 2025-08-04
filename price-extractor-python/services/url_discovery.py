"""
URL Discovery Service - Stage 1 of product discovery
Finds product URLs from manufacturer sites with minimal credit usage
"""
import re
from typing import List, Dict, Optional, Set
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
from scrapfly import ScrapflyClient, ScrapeConfig
from loguru import logger
import os
from dotenv import load_dotenv
import gzip
from io import BytesIO
import xml.etree.ElementTree as ET
from .smart_url_classifier import SmartURLClassifier

load_dotenv()

class URLDiscoveryService:
    """
    Discovers product URLs from manufacturer sites
    Uses minimal credits - just basic HTML scraping
    """
    
    def __init__(self):
        api_key = os.getenv('SCRAPFLY_API_KEY')
        if not api_key:
            raise ValueError("SCRAPFLY_API_KEY not set")
        self.client = ScrapflyClient(key=api_key)
        self.classifier = SmartURLClassifier()
        
        # Common product URL patterns
        self.product_patterns = [
            r'/products?/[\w-]+',
            r'/collections?/[\w-]+/products?/[\w-]+',
            r'/shop/[\w-]+',
            r'/items?/[\w-]+',
            r'/[\w-]+-laser-(?:cutter|engraver)',
            r'/[\w-]+-(?:laser|cnc|printer)/[\w-]+',
        ]
        
        # Exclude patterns (blog posts, categories, etc)
        self.exclude_patterns = [
            r'/blog/',
            r'/news/',
            r'/support/',
            r'/help/',
            r'/category/',
            r'/collections?/?$',
            r'/pages?/',
            r'\.(jpg|jpeg|png|gif|pdf|zip)$',
            r'/cart',
            r'/checkout',
            r'/account',
            r'/search',
        ]
    
    async def discover_from_sitemap(self, base_url: str) -> Optional[List[str]]:
        """
        Try to discover URLs from sitemap.xml first (most efficient)
        
        Args:
            base_url: Base URL of the site
            
        Returns:
            List of product URLs from sitemap, or None if no sitemap
        """
        # Common sitemap locations
        sitemap_urls = [
            urljoin(base_url, '/sitemap.xml'),
            urljoin(base_url, '/sitemap_index.xml'),
            urljoin(base_url, '/product-sitemap.xml'),
            urljoin(base_url, '/sitemap/products.xml'),
        ]
        
        all_urls = []
        
        for sitemap_url in sitemap_urls:
            try:
                logger.info(f"Checking sitemap: {sitemap_url}")
                
                config = ScrapeConfig(
                    url=sitemap_url,
                    country='US',
                    asp=False,
                    render_js=False,
                    cache=True,  # Cache sitemap requests
                    cost_budget=2
                )
                
                result = await self.client.async_scrape(config)
                
                if result.upstream_status_code != 200:
                    continue
                
                # Handle gzipped sitemaps
                content = result.content
                if sitemap_url.endswith('.gz') or content.startswith(b'\x1f\x8b'):
                    content = gzip.decompress(content)
                
                # Parse XML
                if isinstance(content, bytes):
                    content = content.decode('utf-8')
                
                root = ET.fromstring(content)
                
                # Handle sitemap index
                if 'sitemapindex' in root.tag:
                    # This is a sitemap index, get child sitemaps
                    for sitemap in root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc'):
                        child_urls = await self.discover_from_sitemap(sitemap.text)
                        if child_urls:
                            all_urls.extend(child_urls)
                else:
                    # Regular sitemap, extract URLs
                    for url_elem in root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc'):
                        url = url_elem.text
                        if self._is_product_url(url):
                            all_urls.append(url)
                
                logger.info(f"Found {len(all_urls)} product URLs in sitemap")
                
                if all_urls:
                    return all_urls
                    
            except Exception as e:
                logger.debug(f"Sitemap check failed for {sitemap_url}: {str(e)}")
                continue
        
        return None if not all_urls else all_urls

    async def discover_urls(self, start_url: str, max_pages: int = 5) -> Dict:
        """
        Discover product URLs from a manufacturer site
        First tries sitemap, then falls back to crawling
        
        Args:
            start_url: Starting URL (e.g., https://xtool.com)
            max_pages: Maximum pages to crawl
            
        Returns:
            Dict with discovered URLs and metadata
        """
        base_domain = urlparse(start_url).netloc
        logger.info(f"Starting URL discovery for {base_domain}")
        
        # Try sitemap first (most efficient)
        sitemap_urls = await self.discover_from_sitemap(start_url)
        if sitemap_urls:
            logger.info(f"Success! Found {len(sitemap_urls)} URLs from sitemap (minimal credits used)")
            
            # Apply smart classification to all URLs
            logger.info(f"Applying smart classification to {len(sitemap_urls)} URLs...")
            classifications = self.classifier.classify_batch(sitemap_urls)
            summary = self.classifier.get_classification_summary(classifications)
            
            logger.info(f"Classification results: {summary['auto_skip']} auto-skip, "
                       f"{summary['high_confidence']} high confidence, "
                       f"{summary['needs_review']} needs review, "
                       f"{summary['duplicate_likely']} likely duplicates")
            
            # Organize URLs by classification (including auto_skip for auditing)
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
            
            categorized = self._categorize_urls(sitemap_urls)
            
            return {
                'domain': base_domain,
                'start_url': start_url,
                'pages_crawled': 1,  # Just the sitemap
                'credits_used': 2,  # Approximate for sitemap fetch
                'total_urls_found': len(sitemap_urls),
                'urls': sitemap_urls,
                'categorized': categorized,
                'classified': classified_urls,
                'classification_summary': summary,
                'discovery_method': 'sitemap',
                'estimated_credits_per_product': len(classified_urls['high_confidence']) * 20 + len(classified_urls['needs_review']) * 20,
                'estimated_total_credits': len(sitemap_urls) * 20
            }
        
        # Fall back to crawling
        logger.info("No sitemap found, falling back to crawling")
        
        discovered_urls = set()
        visited_urls = set()
        to_visit = [start_url]
        credits_used = 0
        pages_crawled = 0
        
        while to_visit and pages_crawled < max_pages:
            current_url = to_visit.pop(0)
            
            if current_url in visited_urls:
                continue
                
            visited_urls.add(current_url)
            
            try:
                # Minimal scraping - no JS, no anti-bot
                config = ScrapeConfig(
                    url=current_url,
                    country='US',
                    asp=False,  # No anti-bot
                    render_js=False,  # No JavaScript
                    cache=True,  # Use cache to avoid re-scraping
                    cost_budget=5  # Max 5 credits per page
                )
                
                result = await self.client.async_scrape(config)
                credits = result.context.get('cost', {}).get('total', 1)
                credits_used += credits
                pages_crawled += 1
                
                logger.info(f"Crawled {current_url} ({credits} credits)")
                
                # Parse HTML
                soup = BeautifulSoup(result.content, 'html.parser')
                
                # Find all links
                for link in soup.find_all('a', href=True):
                    href = link['href']
                    full_url = urljoin(current_url, href)
                    
                    # Only process same-domain URLs
                    if urlparse(full_url).netloc != base_domain:
                        continue
                    
                    # Check if it's excluded
                    if any(re.search(pattern, full_url, re.I) for pattern in self.exclude_patterns):
                        continue
                    
                    # Check if it looks like a product URL
                    if self._is_product_url(full_url):
                        discovered_urls.add(full_url)
                    elif self._is_category_url(full_url) and full_url not in visited_urls:
                        # Add category pages to crawl queue
                        to_visit.append(full_url)
                
            except Exception as e:
                logger.error(f"Error crawling {current_url}: {str(e)}")
        
        # Analyze discovered URLs
        product_urls = list(discovered_urls)
        categorized = self._categorize_urls(product_urls)
        
        return {
            'domain': base_domain,
            'start_url': start_url,
            'pages_crawled': pages_crawled,
            'credits_used': credits_used,
            'total_urls_found': len(product_urls),
            'urls': product_urls,
            'categorized': categorized,
            'discovery_method': 'crawling',
            'estimated_credits_per_product': 20,  # Progressive scraping average
            'estimated_total_credits': len(product_urls) * 20
        }
    
    def _is_product_url(self, url: str) -> bool:
        """Check if URL looks like a product page"""
        # Check positive patterns
        for pattern in self.product_patterns:
            if re.search(pattern, url, re.I):
                return True
        
        # Additional heuristics
        path = urlparse(url).path.lower()
        
        # Common product indicators
        product_keywords = [
            'laser', 'cutter', 'engraver', 'printer', 'cnc', 
            'machine', 'tool', 'kit', 'bundle', 'system'
        ]
        
        return any(keyword in path for keyword in product_keywords)
    
    def _is_category_url(self, url: str) -> bool:
        """Check if URL is a category/collection page worth crawling"""
        path = urlparse(url).path.lower()
        
        category_indicators = [
            '/collections/',
            '/category/',
            '/shop',
            '/products',
            '/catalog',
            '/laser-',
            '/cnc-',
            '/3d-printer'
        ]
        
        return any(indicator in path for indicator in category_indicators)
    
    def _categorize_urls(self, urls: List[str]) -> Dict[str, List[str]]:
        """Categorize URLs by product type"""
        categories = {
            'laser_cutters': [],
            'laser_engravers': [],
            'cnc_machines': [],
            '3d_printers': [],
            'accessories': [],
            'unknown': []
        }
        
        for url in urls:
            path = url.lower()
            
            if 'laser' in path and ('cutter' in path or 'cut' in path):
                categories['laser_cutters'].append(url)
            elif 'laser' in path and ('engrav' in path or 'mark' in path):
                categories['laser_engravers'].append(url)
            elif 'cnc' in path or 'router' in path or 'mill' in path:
                categories['cnc_machines'].append(url)
            elif '3d' in path or 'printer' in path:
                categories['3d_printers'].append(url)
            elif any(word in path for word in ['accessory', 'accessories', 'attachment', 'upgrade']):
                categories['accessories'].append(url)
            else:
                categories['unknown'].append(url)
        
        # Remove empty categories
        return {k: v for k, v in categories.items() if v}
    
    async def quick_validate_urls(self, urls: List[str], sample_size: int = 3) -> Dict[str, bool]:
        """
        Quickly validate a sample of URLs to ensure they're real product pages
        Uses HEAD requests first for efficiency
        
        Args:
            urls: List of URLs to validate
            sample_size: Number of URLs to sample
            
        Returns:
            Dict of URL -> is_valid
        """
        import random
        
        sample_urls = random.sample(urls, min(sample_size, len(urls)))
        results = {}
        
        for url in sample_urls:
            try:
                # First try HEAD request (cheaper)
                head_config = ScrapeConfig(
                    url=url,
                    country='US',
                    asp=False,
                    render_js=False,
                    method='HEAD',
                    cost_budget=1
                )
                
                head_result = await self.client.async_scrape(head_config)
                
                # If 404 or redirect, mark as invalid
                if head_result.upstream_status_code != 200:
                    results[url] = False
                    continue
                
                # For 200 responses, do a full check with caching
                config = ScrapeConfig(
                    url=url,
                    country='US',
                    asp=False,
                    render_js=False,
                    cache=True,
                    cost_budget=2
                )
                
                result = await self.client.async_scrape(config)
                
                # Check if it's a valid product page
                if result.upstream_status_code == 200:
                    soup = BeautifulSoup(result.content, 'html.parser')
                    
                    # Look for product indicators
                    has_price = bool(soup.find(string=re.compile(r'\$[\d,]+', re.I)))
                    has_title = bool(soup.find(['h1', 'h2']))
                    has_images = len(soup.find_all('img')) > 2
                    
                    results[url] = has_price or (has_title and has_images)
                else:
                    results[url] = False
                    
            except Exception as e:
                logger.error(f"Validation error for {url}: {str(e)}")
                results[url] = False
        
        return results