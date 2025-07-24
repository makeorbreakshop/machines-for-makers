"""
Progressive Scraping Service
Starts with cheapest options and escalates only when needed
"""
import re
import json
from typing import Dict, Optional, Tuple, List
from urllib.parse import urlparse
from bs4 import BeautifulSoup
from scrapfly import ScrapflyClient, ScrapeConfig
from loguru import logger
import os
from dotenv import load_dotenv

load_dotenv()

class ProgressiveScraper:
    """
    Progressive scraping that starts cheap and escalates intelligently
    
    Credit costs:
    - Level 1: Basic HTML (1-2 credits)
    - Level 2: With JavaScript (5-10 credits)  
    - Level 3: With Anti-bot bypass (15-25 credits)
    - Level 4: With AI extraction (40-60 credits)
    """
    
    def __init__(self):
        api_key = os.getenv('SCRAPFLY_API_KEY')
        if not api_key:
            raise ValueError("SCRAPFLY_API_KEY not set")
        self.client = ScrapflyClient(key=api_key)
        
    async def extract_product_progressive(self, url: str) -> Tuple[Optional[Dict], int]:
        """
        Extract product data using progressive enhancement
        
        Returns:
            Tuple of (extracted_data, total_credits_used)
        """
        total_credits = 0
        
        # Level 1: Try basic HTML scraping first (1-2 credits)
        logger.info(f"🟢 Level 1: Basic HTML scraping for {url}")
        try:
            config = ScrapeConfig(
                url=url,
                country='US',
                # Minimal options - cheapest
                asp=False,
                render_js=False,
                cost_budget=5  # Safety limit
            )
            
            result = await self.client.async_scrape(config)
            credits_used = result.context.get('cost', {}).get('total', 2)
            total_credits += credits_used
            logger.info(f"Level 1 used {credits_used} credits")
            
            # Try to extract data from plain HTML
            data = self._extract_from_html(result.content, url)
            if self._is_data_complete(data):
                logger.info(f"✅ Success at Level 1! Total credits: {total_credits}")
                return data, total_credits
            else:
                logger.info(f"Level 1 incomplete. Missing: {self._get_missing_fields(data)}")
                
        except Exception as e:
            logger.warning(f"Level 1 failed: {str(e)}")
        
        # Level 2: Try with JavaScript rendering (5-10 credits)
        logger.info(f"🟡 Level 2: JavaScript rendering for {url}")
        try:
            config = ScrapeConfig(
                url=url,
                country='US',
                asp=False,  # Still no anti-bot
                render_js=True,  # Enable JS
                wait_for_selector='img',  # Wait for images to load
                cost_budget=15
            )
            
            result = await self.client.async_scrape(config)
            credits_used = result.context.get('cost', {}).get('total', 10)
            total_credits += credits_used
            logger.info(f"Level 2 used {credits_used} credits")
            
            # Extract from JS-rendered content
            data = self._extract_from_html(result.content, url)
            if self._is_data_complete(data):
                logger.info(f"✅ Success at Level 2! Total credits: {total_credits}")
                return data, total_credits
            else:
                logger.info(f"Level 2 incomplete. Missing: {self._get_missing_fields(data)}")
                
        except Exception as e:
            logger.warning(f"Level 2 failed: {str(e)}")
        
        # Level 3: Add anti-bot bypass (15-25 credits)
        logger.info(f"🟠 Level 3: Anti-bot bypass for {url}")
        try:
            config = ScrapeConfig(
                url=url,
                country='US',
                asp=True,  # Enable anti-bot
                render_js=True,
                auto_scroll=True,  # Scroll to load lazy content
                cost_budget=30
            )
            
            result = await self.client.async_scrape(config)
            credits_used = result.context.get('cost', {}).get('total', 20)
            total_credits += credits_used
            logger.info(f"Level 3 used {credits_used} credits")
            
            # Extract with all content loaded
            data = self._extract_from_html(result.content, url)
            if self._is_data_complete(data):
                logger.info(f"✅ Success at Level 3! Total credits: {total_credits}")
                return data, total_credits
            else:
                logger.info(f"Level 3 incomplete. Missing: {self._get_missing_fields(data)}")
                
        except Exception as e:
            logger.warning(f"Level 3 failed: {str(e)}")
        
        # Level 4: Use AI extraction as last resort (40-60 credits)
        logger.info(f"🔴 Level 4: AI extraction for {url}")
        try:
            config = ScrapeConfig(
                url=url,
                country='US',
                asp=True,
                render_js=True,
                extraction_model='product',  # AI extraction
                cost_budget=100
            )
            
            result = await self.client.async_scrape(config)
            credits_used = result.context.get('cost', {}).get('total', 50)
            total_credits += credits_used
            logger.info(f"Level 4 used {credits_used} credits")
            
            # Get AI-extracted data
            if hasattr(result, 'scrape_result') and result.scrape_result:
                extracted = result.scrape_result.get('extracted_data', {})
                if 'data' in extracted:
                    product_data = extracted['data']
                    if isinstance(product_data, list) and product_data:
                        product_data = product_data[0]
                    
                    logger.info(f"✅ Success at Level 4! Total credits: {total_credits}")
                    return product_data, total_credits
                    
        except Exception as e:
            logger.error(f"Level 4 failed: {str(e)}")
        
        logger.error(f"❌ All levels failed. Total credits used: {total_credits}")
        return None, total_credits
    
    def _extract_from_html(self, html: str, url: str) -> Dict:
        """Extract product data from HTML using BeautifulSoup"""
        soup = BeautifulSoup(html, 'html.parser')
        data = {}
        
        # Extract title/name
        for selector in ['h1', '[class*="product-title"]', '[class*="product-name"]', 'title']:
            elem = soup.select_one(selector)
            if elem and elem.text.strip():
                data['name'] = elem.text.strip()
                break
        
        # Extract price - look for various patterns
        price_patterns = [
            r'\$[\d,]+\.?\d*',
            r'USD\s*[\d,]+\.?\d*',
            r'Price:\s*\$?[\d,]+\.?\d*'
        ]
        
        for pattern in price_patterns:
            price_match = re.search(pattern, html)
            if price_match:
                price_text = price_match.group()
                price_value = re.sub(r'[^\d.]', '', price_text)
                try:
                    data['price'] = float(price_value)
                    break
                except:
                    pass
        
        # Extract images
        images = []
        for img in soup.find_all('img'):
            src = img.get('src', '')
            if src and any(word in src.lower() for word in ['product', 'laser', 'machine']):
                if src.startswith('//'):
                    src = 'https:' + src
                elif src.startswith('/'):
                    parsed_url = urlparse(url)
                    src = f"{parsed_url.scheme}://{parsed_url.netloc}{src}"
                images.append(src)
        
        if images:
            data['images'] = images[:10]  # Limit to 10 images
        
        # Extract description
        for selector in ['[class*="description"]', '[class*="product-desc"]', 'meta[name="description"]']:
            elem = soup.select_one(selector)
            if elem:
                if elem.name == 'meta':
                    data['description'] = elem.get('content', '')
                else:
                    data['description'] = elem.text.strip()
                break
        
        # Extract specifications if visible
        specs = {}
        for spec_elem in soup.find_all(['li', 'div'], string=re.compile(r'(Power|Area|Size|Speed|Focus):', re.I)):
            text = spec_elem.text.strip()
            if ':' in text:
                key, value = text.split(':', 1)
                specs[key.strip().lower()] = value.strip()
        
        if specs:
            data['specifications'] = specs
        
        # Add source URL
        data['url'] = url
        
        return data
    
    def _is_data_complete(self, data: Optional[Dict]) -> bool:
        """Check if extracted data has minimum required fields"""
        if not data:
            return False
        
        required_fields = ['name', 'price']
        return all(field in data and data[field] for field in required_fields)
    
    def _get_missing_fields(self, data: Optional[Dict]) -> List[str]:
        """Get list of missing required fields"""
        if not data:
            return ['name', 'price', 'images']
        
        required = ['name', 'price', 'images']
        return [field for field in required if field not in data or not data[field]]


def create_progressive_scraper() -> ProgressiveScraper:
    """Factory function"""
    return ProgressiveScraper()