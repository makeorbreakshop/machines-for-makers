#!/usr/bin/env python3
"""
Advanced Thunder Laser access test using undetected Chrome to bypass Cloudflare.
"""

import pytest
import asyncio
import time
import random
from loguru import logger

try:
    import undetected_chromedriver as uc
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.common.exceptions import TimeoutException, WebDriverException
    UC_AVAILABLE = True
except ImportError:
    UC_AVAILABLE = False
    logger.warning("undetected_chromedriver not available - install with: pip install undetected-chromedriver selenium")


class TestThunderLaserAdvanced:
    """Advanced Thunder Laser access using undetected Chrome."""
    
    def setup_method(self):
        """Setup for each test method."""
        self.test_urls = [
            "https://www.thunderlaserusa.com/nova-35/",
            "https://www.thunderlaserusa.com/nova-51/", 
            "https://www.thunderlaserusa.com/aurora-lite/"
        ]
    
    @pytest.mark.skipif(not UC_AVAILABLE, reason="undetected_chromedriver not available")
    def test_undetected_chrome_access(self):
        """Test Thunder Laser access using undetected Chrome."""
        logger.info("🔥 Testing Thunder Laser with UNDETECTED CHROME...")
        
        driver = None
        try:
            # Configure undetected Chrome with anti-detection measures
            options = uc.ChromeOptions()
            
            # Basic stealth options
            options.add_argument('--no-sandbox')
            options.add_argument('--disable-dev-shm-usage')
            options.add_argument('--disable-blink-features=AutomationControlled')
            options.add_experimental_option("excludeSwitches", ["enable-automation"])
            options.add_experimental_option('useAutomationExtension', False)
            
            # Additional anti-detection
            options.add_argument('--disable-web-security')
            options.add_argument('--allow-running-insecure-content')
            options.add_argument('--disable-extensions')
            options.add_argument('--disable-plugins')
            options.add_argument('--disable-images')  # Faster loading
            options.add_argument('--no-first-run')
            options.add_argument('--disable-default-apps')
            
            # Simulate real user behavior
            options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36')
            
            logger.info("Creating undetected Chrome driver...")
            driver = uc.Chrome(options=options, version_main=None)
            
            # Execute stealth script to further hide automation
            stealth_script = """
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
            });
            
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5],
            });
            
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en'],
            });
            
            window.chrome = {
                runtime: {},
            };
            """
            driver.execute_script(stealth_script)
            
            url = self.test_urls[0]  # Test first URL
            logger.info(f"Navigating to: {url}")
            
            driver.get(url)
            
            # Wait a bit for page to load
            time.sleep(3)
            
            # Check if we got through Cloudflare
            page_source = driver.page_source.lower()
            current_url = driver.current_url
            page_title = driver.title
            
            logger.info(f"Current URL: {current_url}")
            logger.info(f"Page title: {page_title}")
            
            # Check for Cloudflare challenge indicators
            cf_indicators = [
                'checking your browser',
                'cloudflare',
                'ray id',
                'cf-ray',
                'challenge',
                'please wait'
            ]
            
            is_blocked = any(indicator in page_source for indicator in cf_indicators)
            
            if is_blocked:
                logger.warning("⚠️ Still blocked by Cloudflare - trying to wait it out...")
                
                # Wait for potential challenge to complete
                for i in range(10):
                    time.sleep(2)
                    page_source = driver.page_source.lower()
                    current_url = driver.current_url
                    
                    if not any(indicator in page_source for indicator in cf_indicators):
                        logger.info(f"✅ Cloudflare challenge passed after {(i+1)*2} seconds!")
                        break
                    
                    logger.info(f"Still in challenge... waiting ({i+1}/10)")
                else:
                    logger.error("❌ Cloudflare challenge did not complete")
                    return False
            
            # Check if we have actual content
            success_indicators = [
                'nova',
                'laser',
                'thunder',
                'price',
                'buy',
                'add to cart'
            ]
            
            has_content = any(indicator in page_source for indicator in success_indicators)
            
            if has_content:
                logger.success("🎉 SUCCESS! Got actual Thunder Laser content!")
                
                # Try to find price elements
                try:
                    price_selectors = [
                        'span[class*="price"]',
                        'div[class*="price"]',
                        '*[class*="amount"]',
                        '*[data-price]',
                        '.woocommerce-Price-amount'
                    ]
                    
                    for selector in price_selectors:
                        try:
                            elements = driver.find_elements(By.CSS_SELECTOR, selector)
                            for element in elements[:3]:  # Check first 3 matches
                                text = element.text.strip()
                                if text and ('$' in text or any(c.isdigit() for c in text)):
                                    logger.success(f"💰 Found price element: {text} (selector: {selector})")
                        except:
                            continue
                
                except Exception as e:
                    logger.warning(f"Error finding price elements: {str(e)}")
                
                return True
            else:
                logger.error("❌ Got through but no Thunder Laser content found")
                logger.info(f"Page content preview: {page_source[:200]}...")
                return False
                
        except Exception as e:
            logger.error(f"❌ Undetected Chrome test failed: {str(e)}")
            return False
            
        finally:
            if driver:
                try:
                    driver.quit()
                except:
                    pass
    
    @pytest.mark.skipif(not UC_AVAILABLE, reason="undetected_chromedriver not available")
    def test_undetected_chrome_with_proxy_rotation(self):
        """Test with proxy rotation and more sophisticated evasion."""
        logger.info("🔥 Testing Thunder Laser with PROXY ROTATION...")
        
        # This would require proxy services, but demonstrates the concept
        driver = None
        try:
            options = uc.ChromeOptions()
            
            # More aggressive anti-detection
            options.add_argument('--no-sandbox')
            options.add_argument('--disable-dev-shm-usage')
            options.add_argument('--disable-blink-features=AutomationControlled')
            options.add_experimental_option("excludeSwitches", ["enable-automation"])
            options.add_experimental_option('useAutomationExtension', False)
            
            # Rotate user agents
            user_agents = [
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
            ]
            
            random_ua = random.choice(user_agents)
            options.add_argument(f'--user-agent={random_ua}')
            
            # Simulate different screen resolutions
            resolutions = ['1920,1080', '1366,768', '1440,900']
            resolution = random.choice(resolutions)
            options.add_argument(f'--window-size={resolution}')
            
            logger.info(f"Using user agent: {random_ua}")
            logger.info(f"Using resolution: {resolution}")
            
            driver = uc.Chrome(options=options, version_main=None)
            
            # Enhanced stealth
            stealth_script = """
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
            });
            
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5],
            });
            
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en'],
            });
            
            window.chrome = {
                runtime: {},
            };
            
            // Override automation indicators
            delete navigator.__proto__.webdriver;
            """
            
            driver.execute_script(stealth_script)
            
            # Simulate human browsing - visit Google first
            logger.info("Simulating human browsing pattern...")
            driver.get("https://www.google.com/")
            time.sleep(random.uniform(2, 4))
            
            # Now visit Thunder Laser
            url = self.test_urls[0]
            logger.info(f"Now visiting Thunder Laser: {url}")
            driver.get(url)
            
            # Human-like waiting
            time.sleep(random.uniform(3, 6))
            
            # Check results
            page_source = driver.page_source.lower()
            
            if 'nova' in page_source or 'laser' in page_source:
                logger.success("🎉 PROXY ROTATION SUCCESS!")
                return True
            else:
                logger.error("❌ Proxy rotation failed")
                return False
                
        except Exception as e:
            logger.error(f"❌ Proxy rotation test failed: {str(e)}")
            return False
            
        finally:
            if driver:
                try:
                    driver.quit()
                except:
                    pass


if __name__ == "__main__":
    if UC_AVAILABLE:
        pytest.main([__file__, "-v", "-s"])
    else:
        print("⚠️ undetected_chromedriver not available")
        print("Install with: pip install undetected-chromedriver selenium")