import requests
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
import json
from typing import Dict, List, Optional, Tuple
from loguru import logger
import re
import xml.etree.ElementTree as ET
from datetime import datetime


class ConfigDiscoveryService:
    """
    Auto-discovers manufacturer website structure and generates scraping configuration
    """
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'MachinesForMakers/1.0'
        })
    
    async def discover_site_config(self, base_url: str, site_name: str) -> Dict:
        """
        Discover site structure and generate configuration
        
        Args:
            base_url: Base URL of the manufacturer site
            site_name: Name of the manufacturer
            
        Returns:
            Generated configuration dictionary
        """
        logger.info(f"Starting auto-discovery for {site_name} at {base_url}")
        
        # Initialize configuration template
        config = {
            "user_agent": "MachinesForMakers/1.0",
            "crawl_delay": 3000,
            "use_sitemap": True,
            "category_urls": []
        }
        
        try:
            # Step 1: Discover sitemap
            sitemap_url = await self._discover_sitemap(base_url)
            if sitemap_url:
                logger.info(f"Found sitemap: {sitemap_url}")
                
                # Step 2: Analyze sitemap for category URLs
                category_urls = await self._analyze_sitemap_for_categories(sitemap_url)
                config["category_urls"] = category_urls
                
            else:
                # Fallback: Crawl main page for category links
                logger.info("No sitemap found, analyzing main page structure")
                category_urls = await self._discover_categories_from_page(base_url)
                config["category_urls"] = category_urls
                config["use_sitemap"] = False
            
            # Step 3: Test optimal crawl delay
            optimal_delay = await self._test_crawl_delay(base_url)
            config["crawl_delay"] = optimal_delay
            
            logger.info(f"Discovery complete for {site_name}")
            logger.info(f"Found {len(category_urls)} category URLs")
            
            return config
            
        except Exception as e:
            logger.error(f"Error during site discovery for {site_name}: {e}")
            # Return minimal default config
            return {
                "user_agent": "MachinesForMakers/1.0",
                "crawl_delay": 3000,
                "use_sitemap": False,
                "category_urls": []
            }
    
    async def _discover_sitemap(self, base_url: str) -> Optional[str]:
        """Try to find the sitemap URL"""
        
        # Common sitemap locations
        sitemap_paths = [
            "/sitemap.xml",
            "/sitemap_index.xml",
            "/sitemaps.xml",
            "/sitemap/sitemap.xml"
        ]
        
        for path in sitemap_paths:
            sitemap_url = urljoin(base_url, path)
            try:
                response = self.session.get(sitemap_url, timeout=10)
                if response.status_code == 200 and 'xml' in response.headers.get('content-type', ''):
                    # Verify it's actually a sitemap
                    if 'sitemap' in response.text.lower() or 'url>' in response.text:
                        return sitemap_url
            except Exception as e:
                logger.debug(f"Failed to check {sitemap_url}: {e}")
                continue
        
        # Check robots.txt for sitemap
        try:
            robots_url = urljoin(base_url, "/robots.txt")
            response = self.session.get(robots_url, timeout=10)
            if response.status_code == 200:
                for line in response.text.split('\n'):
                    if line.lower().startswith('sitemap:'):
                        sitemap_url = line.split(':', 1)[1].strip()
                        return sitemap_url
        except Exception as e:
            logger.debug(f"Failed to check robots.txt: {e}")
        
        return None
    
    async def _analyze_sitemap_for_categories(self, sitemap_url: str) -> List[str]:
        """Analyze sitemap to find category URLs"""
        
        category_urls = []
        category_keywords = [
            'laser', 'cutter', 'engraver', 'printer', '3d', 'cnc', 'mill', 'router',
            'collection', 'category', 'product', 'shop', 'machine', 'tool'
        ]
        
        try:
            response = self.session.get(sitemap_url, timeout=15)
            if response.status_code != 200:
                return category_urls
            
            # Parse XML sitemap
            root = ET.fromstring(response.content)
            
            # Handle namespace
            namespace = {'sitemap': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
            
            # Find all URLs
            urls = []
            for url_elem in root.findall('.//sitemap:url', namespace):
                loc_elem = url_elem.find('sitemap:loc', namespace)
                if loc_elem is not None:
                    urls.append(loc_elem.text)
            
            # If no URLs found, try without namespace (some sitemaps don't use it)
            if not urls:
                for url_elem in root.findall('.//url'):
                    loc_elem = url_elem.find('loc')
                    if loc_elem is not None:
                        urls.append(loc_elem.text)
            
            logger.info(f"Found {len(urls)} URLs in sitemap")
            
            # Filter for category-like URLs
            for url in urls:
                url_lower = url.lower()
                path = urlparse(url).path.lower()
                
                # Skip individual product pages (usually have IDs or specific product names)
                if re.search(r'/products?/[^/]+$', path):
                    continue
                
                # Look for category indicators
                if any(keyword in url_lower for keyword in category_keywords):
                    # Prefer collection/category pages over individual items
                    if any(indicator in path for indicator in ['/collection', '/category', '/shop', '/products']):
                        category_urls.append(url)
            
            # Remove duplicates and sort
            category_urls = list(set(category_urls))
            category_urls.sort()
            
            # Limit to reasonable number
            category_urls = category_urls[:10]
            
        except Exception as e:
            logger.error(f"Error analyzing sitemap {sitemap_url}: {e}")
        
        return category_urls
    
    async def _discover_categories_from_page(self, base_url: str) -> List[str]:
        """Fallback: discover categories by crawling main page"""
        
        category_urls = []
        
        try:
            response = self.session.get(base_url, timeout=10)
            if response.status_code != 200:
                return category_urls
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Look for navigation links
            nav_selectors = [
                'nav a[href]',
                '.navigation a[href]',
                '.menu a[href]',
                '.navbar a[href]',
                'header a[href]'
            ]
            
            category_keywords = [
                'laser', 'cutter', 'engraver', 'printer', '3d', 'cnc', 'mill', 'router',
                'collection', 'category', 'product', 'shop', 'machine', 'tool'
            ]
            
            for selector in nav_selectors:
                links = soup.select(selector)
                for link in links:
                    href = link.get('href')
                    text = link.get_text().strip().lower()
                    
                    if href and any(keyword in text or keyword in href.lower() for keyword in category_keywords):
                        full_url = urljoin(base_url, href)
                        category_urls.append(full_url)
            
            # Remove duplicates and sort
            category_urls = list(set(category_urls))
            category_urls.sort()
            
            # Limit to reasonable number
            category_urls = category_urls[:10]
            
        except Exception as e:
            logger.error(f"Error discovering categories from main page: {e}")
        
        return category_urls
    
    async def _test_crawl_delay(self, base_url: str) -> int:
        """Test different crawl delays to find optimal speed"""
        
        delays = [1000, 2000, 3000, 5000]  # milliseconds
        
        for delay_ms in delays:
            try:
                # Test 3 requests with this delay
                import time
                start_time = time.time()
                
                for i in range(3):
                    response = self.session.get(base_url, timeout=10)
                    if response.status_code != 200:
                        break
                    
                    if i < 2:  # Don't delay after last request
                        time.sleep(delay_ms / 1000)
                
                total_time = time.time() - start_time
                
                # If all requests succeeded and took reasonable time
                if response.status_code == 200 and total_time < 20:
                    logger.info(f"Optimal crawl delay found: {delay_ms}ms")
                    return delay_ms
                    
            except Exception as e:
                logger.debug(f"Failed test with {delay_ms}ms delay: {e}")
                continue
        
        # Default to 3 seconds if no optimal delay found
        return 3000
    
    def format_config_for_ui(self, config: Dict, site_name: str, base_url: str) -> str:
        """Format the discovered configuration as JSON string for the UI"""
        
        # Create the final configuration structure
        formatted_config = {
            "user_agent": config.get("user_agent", "MachinesForMakers/1.0"),
            "crawl_delay": config.get("crawl_delay", 3000),
            "use_sitemap": config.get("use_sitemap", True),
            "category_urls": config.get("category_urls", [])
        }
        
        # Pretty format the JSON
        return json.dumps(formatted_config, indent=2)
    
    async def generate_discovery_report(self, base_url: str, site_name: str) -> Dict:
        """Generate a detailed report of what was discovered"""
        
        config = await self.discover_site_config(base_url, site_name)
        
        report = {
            "site_name": site_name,
            "base_url": base_url,
            "discovery_timestamp": datetime.now().isoformat(),
            "sitemap_found": config.get("use_sitemap", False),
            "category_count": len(config.get("category_urls", [])),
            "suggested_delay": config.get("crawl_delay", 3000),
            "category_urls": config.get("category_urls", []),
            "configuration": self.format_config_for_ui(config, site_name, base_url)
        }
        
        return report