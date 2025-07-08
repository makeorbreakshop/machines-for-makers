#!/usr/bin/env python3
"""
Test Thunder Laser with JavaScript rendering using requests-html.
"""

import pytest
import time
from loguru import logger

try:
    from requests_html import HTMLSession
    RH_AVAILABLE = True
except ImportError:
    RH_AVAILABLE = False


class TestThunderLaserJS:
    """Test Thunder Laser with JavaScript rendering."""
    
    def setup_method(self):
        """Setup for each test method."""
        self.test_urls = [
            "https://www.thunderlaserusa.com/nova-35/",
            "https://www.thunderlaserusa.com/nova-51/",
        ]
    
    @pytest.mark.skipif(not RH_AVAILABLE, reason="requests-html not available")
    def test_requests_html_rendering(self):
        """Test Thunder Laser with JavaScript rendering via requests-html."""
        logger.info("🔥 Testing Thunder Laser with JavaScript rendering...")
        
        try:
            session = HTMLSession()
            
            # Enhanced headers for anti-detection
            session.headers.update({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Referer': 'https://www.google.com/',
                'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"Windows"',
                'Cache-Control': 'max-age=0'
            })
            
            url = self.test_urls[0]
            logger.info(f"Fetching with JS rendering: {url}")
            
            # Get the page
            r = session.get(url, timeout=30)
            logger.info(f"Initial response status: {r.status_code}")
            
            if r.status_code != 200:
                logger.error(f"❌ Failed with status {r.status_code}")
                return False
            
            # Check initial content
            initial_content = r.html.text.lower()
            logger.info(f"Initial content length: {len(initial_content)}")
            
            # Check for Cloudflare challenge
            cf_indicators = ['checking your browser', 'cloudflare', 'please wait', 'challenge']
            is_challenge = any(indicator in initial_content for indicator in cf_indicators)
            
            if is_challenge:
                logger.info("⏳ Cloudflare challenge detected - rendering JavaScript...")
                
                # Render JavaScript (this will launch a browser)
                r.html.render(timeout=30, wait=5, sleep=2)
                
                # Check rendered content
                rendered_content = r.html.text.lower()
                logger.info(f"Rendered content length: {len(rendered_content)}")
                
                # Check if challenge was passed
                is_still_challenge = any(indicator in rendered_content for indicator in cf_indicators)
                
                if is_still_challenge:
                    logger.error("❌ JavaScript rendering didn't pass Cloudflare challenge")
                    return False
                else:
                    logger.success("✅ JavaScript rendering passed Cloudflare challenge!")
            else:
                logger.info("No Cloudflare challenge detected")
                rendered_content = initial_content
            
            # Check for Thunder Laser content
            success_indicators = ['nova', 'laser', 'thunder', 'price', 'buy']
            has_content = any(indicator in rendered_content for indicator in success_indicators)
            
            if has_content:
                logger.success("🎉 SUCCESS! Found Thunder Laser content!")
                
                # Try to find price elements
                price_selectors = [
                    'span[class*="price"]',
                    'div[class*="price"]', 
                    '.woocommerce-Price-amount',
                    '*[data-price]'
                ]
                
                for selector in price_selectors:
                    try:
                        elements = r.html.find(selector)
                        for element in elements[:3]:
                            text = element.text.strip()
                            if text and ('$' in text or any(c.isdigit() for c in text)):
                                logger.success(f"💰 Found price: {text} (selector: {selector})")
                    except Exception as e:
                        continue
                
                return True
            else:
                logger.error("❌ No Thunder Laser content found")
                logger.info(f"Content preview: {rendered_content[:200]}...")
                return False
                
        except Exception as e:
            logger.error(f"❌ JavaScript rendering test failed: {str(e)}")
            return False
    
    @pytest.mark.skipif(not RH_AVAILABLE, reason="requests-html not available")
    def test_session_persistence(self):
        """Test with session persistence and cookies."""
        logger.info("🔥 Testing Thunder Laser with session persistence...")
        
        try:
            session = HTMLSession()
            
            # Enhanced headers
            session.headers.update({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Referer': 'https://www.google.com/',
                'DNT': '1'
            })
            
            # Step 1: Visit Google to get cookies
            logger.info("Step 1: Visiting Google...")
            google_r = session.get('https://www.google.com/', timeout=15)
            logger.info(f"Google visit status: {google_r.status_code}")
            time.sleep(2)
            
            # Step 2: Visit Thunder Laser main page
            logger.info("Step 2: Visiting Thunder Laser main page...")
            main_r = session.get('https://www.thunderlaserusa.com/', timeout=30)
            logger.info(f"Main page status: {main_r.status_code}")
            
            if main_r.status_code == 200:
                logger.success("✅ Main page accessible!")
                
                # Step 3: Try product page
                time.sleep(3)
                logger.info("Step 3: Visiting product page...")
                
                product_r = session.get(self.test_urls[0], timeout=30)
                logger.info(f"Product page status: {product_r.status_code}")
                
                if product_r.status_code == 200:
                    content = product_r.html.text.lower()
                    if 'nova' in content or 'laser' in content:
                        logger.success("🎉 SESSION PERSISTENCE SUCCESS!")
                        return True
                
            logger.error("❌ Session persistence failed")
            return False
            
        except Exception as e:
            logger.error(f"❌ Session persistence test failed: {str(e)}")
            return False


if __name__ == "__main__":
    if RH_AVAILABLE:
        pytest.main([__file__, "-v", "-s"])
    else:
        print("⚠️ requests-html not available")
        print("Install with: pip install requests-html")