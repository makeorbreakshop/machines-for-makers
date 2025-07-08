#!/usr/bin/env python3
"""
Test Thunder Laser with cloudscraper - specifically designed to bypass Cloudflare.
"""

import pytest
import time
import random
from bs4 import BeautifulSoup
from loguru import logger

try:
    import cloudscraper
    CS_AVAILABLE = True
except ImportError:
    CS_AVAILABLE = False


class TestThunderLaserCloudscraper:
    """Test Thunder Laser using cloudscraper for Cloudflare bypass."""
    
    def setup_method(self):
        """Setup for each test method."""
        self.test_urls = [
            "https://www.thunderlaserusa.com/nova-35/",
            "https://www.thunderlaserusa.com/nova-51/",
            "https://www.thunderlaserusa.com/aurora-lite/"
        ]
    
    @pytest.mark.skipif(not CS_AVAILABLE, reason="cloudscraper not available")
    def test_cloudscraper_basic(self):
        """Test Thunder Laser with basic cloudscraper."""
        logger.info("🔥 Testing Thunder Laser with CLOUDSCRAPER...")
        
        try:
            # Create cloudscraper session
            scraper = cloudscraper.create_scraper()
            
            url = self.test_urls[0]
            logger.info(f"CloudScraper requesting: {url}")
            
            # Make request with cloudscraper
            response = scraper.get(url, timeout=30)
            
            logger.info(f"CloudScraper response status: {response.status_code}")
            logger.info(f"Response headers: {dict(response.headers)}")
            
            if response.status_code == 200:
                content = response.text.lower()
                logger.info(f"Content length: {len(content)}")
                
                # Check for success indicators
                success_indicators = ['nova', 'laser', 'thunder', 'price', 'buy', 'add to cart']
                has_content = any(indicator in content for indicator in success_indicators)
                
                if has_content:
                    logger.success("🎉 CLOUDSCRAPER SUCCESS! Got Thunder Laser content!")
                    
                    # Parse with BeautifulSoup and look for prices
                    soup = BeautifulSoup(response.content, 'html.parser')
                    
                    price_selectors = [
                        'span[class*="price"]',
                        'div[class*="price"]',
                        '.woocommerce-Price-amount',
                        '*[data-price]',
                        '.price',
                        '.amount'
                    ]
                    
                    for selector in price_selectors:
                        try:
                            elements = soup.select(selector)
                            for element in elements[:3]:
                                text = element.get_text(strip=True)
                                if text and ('$' in text or any(c.isdigit() for c in text)):
                                    logger.success(f"💰 Found price: {text} (selector: {selector})")
                        except Exception as e:
                            continue
                    
                    return True
                else:
                    logger.warning("⚠️ Got 200 but no Thunder Laser content")
                    logger.info(f"Content preview: {content[:300]}...")
                    return False
            else:
                logger.error(f"❌ CloudScraper failed with status: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"❌ CloudScraper test failed: {str(e)}")
            return False
    
    @pytest.mark.skipif(not CS_AVAILABLE, reason="cloudscraper not available")
    def test_cloudscraper_with_delays(self):
        """Test cloudscraper with human-like delays."""
        logger.info("🔥 Testing Thunder Laser with CLOUDSCRAPER + DELAYS...")
        
        try:
            # Create cloudscraper with browser emulation
            scraper = cloudscraper.create_scraper(
                browser={
                    'browser': 'chrome',
                    'platform': 'windows',
                    'desktop': True
                }
            )
            
            # Step 1: Visit main page first
            logger.info("Step 1: Visiting main page...")
            main_response = scraper.get("https://www.thunderlaserusa.com/", timeout=30)
            logger.info(f"Main page status: {main_response.status_code}")
            
            # Human delay
            delay = random.uniform(2.0, 4.0)
            logger.info(f"Human delay: {delay:.1f}s")
            time.sleep(delay)
            
            # Step 2: Visit product page
            url = self.test_urls[0]
            logger.info(f"Step 2: Visiting product page: {url}")
            
            response = scraper.get(url, timeout=30)
            logger.info(f"Product page status: {response.status_code}")
            
            if response.status_code == 200:
                content = response.text.lower()
                
                if any(indicator in content for indicator in ['nova', 'laser', 'thunder']):
                    logger.success("🎉 CLOUDSCRAPER WITH DELAYS SUCCESS!")
                    return True
                else:
                    logger.warning("⚠️ Got response but no product content")
                    return False
            else:
                logger.error(f"❌ Failed with status: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"❌ CloudScraper with delays failed: {str(e)}")
            return False
    
    @pytest.mark.skipif(not CS_AVAILABLE, reason="cloudscraper not available") 
    def test_cloudscraper_all_urls(self):
        """Test all Thunder Laser URLs with cloudscraper."""
        logger.info("🔥 Testing ALL Thunder Laser URLs with CloudScraper...")
        
        success_count = 0
        total_count = len(self.test_urls)
        
        try:
            scraper = cloudscraper.create_scraper()
            
            for i, url in enumerate(self.test_urls):
                logger.info(f"Testing URL {i+1}/{total_count}: {url}")
                
                try:
                    response = scraper.get(url, timeout=30)
                    logger.info(f"Status: {response.status_code}")
                    
                    if response.status_code == 200:
                        content = response.text.lower()
                        
                        # Check for product-specific content
                        product_indicators = []
                        if 'nova-35' in url:
                            product_indicators = ['nova', '35']
                        elif 'nova-51' in url:
                            product_indicators = ['nova', '51']  
                        elif 'aurora' in url:
                            product_indicators = ['aurora']
                        
                        has_product_content = all(indicator in content for indicator in product_indicators)
                        
                        if has_product_content:
                            logger.success(f"✅ Success: {url}")
                            success_count += 1
                        else:
                            logger.warning(f"⚠️ No product content: {url}")
                    else:
                        logger.error(f"❌ Failed: {url} (status: {response.status_code})")
                        
                except Exception as e:
                    logger.error(f"❌ Error with {url}: {str(e)}")
                
                # Delay between requests
                if i < total_count - 1:
                    time.sleep(random.uniform(1.0, 3.0))
            
            logger.info(f"CloudScraper results: {success_count}/{total_count} successful")
            
            if success_count > 0:
                logger.success(f"🎉 CloudScraper worked for {success_count} URLs!")
                return True
            else:
                logger.error("❌ CloudScraper failed for all URLs")
                return False
                
        except Exception as e:
            logger.error(f"❌ CloudScraper test failed: {str(e)}")
            return False


if __name__ == "__main__":
    if CS_AVAILABLE:
        pytest.main([__file__, "-v", "-s"])
    else:
        print("⚠️ cloudscraper not available")
        print("Install with: pip install cloudscraper")