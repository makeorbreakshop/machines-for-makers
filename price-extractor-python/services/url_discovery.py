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
    
    async def discover_urls(self, start_url: str, max_pages: int = 5) -> Dict:
        """
        Discover product URLs from a manufacturer site
        
        Args:
            start_url: Starting URL (e.g., https://xtool.com)
            max_pages: Maximum pages to crawl
            
        Returns:
            Dict with discovered URLs and metadata
        """
        discovered_urls = set()
        visited_urls = set()
        to_visit = [start_url]
        credits_used = 0
        pages_crawled = 0
        
        base_domain = urlparse(start_url).netloc
        
        logger.info(f"Starting URL discovery for {base_domain}")
        
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
                config = ScrapeConfig(
                    url=url,
                    country='US',
                    asp=False,
                    render_js=False,
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