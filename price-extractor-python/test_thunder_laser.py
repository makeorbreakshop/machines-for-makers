#!/usr/bin/env python3
"""
Test Thunder Laser access with anti-detection measures.
Work through different approaches until we can successfully access their site.
"""

import pytest
import asyncio
import requests
import time
import random
from urllib.parse import urlparse
from bs4 import BeautifulSoup
from loguru import logger

# Simplified imports to avoid Playwright dependency issues
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

class TestThunderLaserAccess:
    """Test Thunder Laser website access with various anti-detection strategies."""
    
    def setup_method(self):
        """Setup for each test method."""
        # Thunder Laser test URLs from our database
        self.test_urls = [
            "https://www.thunderlaserusa.com/nova-35/",
            "https://www.thunderlaserusa.com/nova-51/", 
            "https://www.thunderlaserusa.com/aurora-lite/",
            "https://www.thunderlaserusa.com/nova-plus-35/",
            "https://www.thunderlaserusa.com/aurora-8-mopa/"
        ]
    
    @pytest.mark.asyncio
    async def test_thunder_laser_basic_access(self):
        """Test basic access to Thunder Laser URLs."""
        logger.info("🔥 Testing basic Thunder Laser access...")
        
        url = self.test_urls[0]  # Test first URL
        logger.info(f"Testing URL: {url}")
        
        try:
            # Simple requests test
            session = requests.Session()
            session.headers.update({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            })
            
            response = session.get(url, timeout=15)
            logger.info(f"Basic access status: {response.status_code}")
            
            if response.status_code == 200:
                logger.success(f"✅ Basic access successful: {url}")
                soup = BeautifulSoup(response.content, 'html.parser')
                logger.info(f"Page title: {soup.title.string if soup.title else 'No title'}")
                return True
            else:
                logger.error(f"❌ Basic access failed: {response.status_code}")
                
        except Exception as e:
            logger.error(f"❌ Basic access exception: {str(e)}")
        
        return False
    
    @pytest.mark.asyncio 
    async def test_thunder_laser_enhanced_headers(self):
        """Test Thunder Laser access with enhanced anti-detection headers."""
        logger.info("🔥 Testing Thunder Laser with enhanced headers...")
        
        url = self.test_urls[0]  # Test first URL
        
        # Create a custom session with enhanced headers
        session = requests.Session()
        
        enhanced_headers = {
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
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache'
        }
        
        session.headers.update(enhanced_headers)
        
        try:
            logger.info(f"Testing enhanced headers on: {url}")
            
            # Add delay to avoid rate limiting
            await asyncio.sleep(random.uniform(2.0, 4.0))
            
            response = session.get(url, timeout=30, allow_redirects=True)
            
            logger.info(f"Response status: {response.status_code}")
            logger.info(f"Response headers: {dict(response.headers)}")
            
            if response.status_code == 200:
                logger.success(f"✅ SUCCESS! Accessed {url} with status 200")
                logger.info(f"Content length: {len(response.content)}")
                
                # Check if we got actual content (not just a block page)
                content = response.text.lower()
                if 'nova' in content or 'aurora' in content or 'laser' in content:
                    logger.success("✅ Got actual product page content!")
                    return True
                else:
                    logger.warning("⚠️ Got response but content seems blocked")
            else:
                logger.error(f"❌ Failed with status: {response.status_code}")
                
        except Exception as e:
            logger.error(f"❌ Exception accessing {url}: {str(e)}")
        
        return False
    
    @pytest.mark.asyncio
    async def test_thunder_laser_proxy_simulation(self):
        """Test Thunder Laser access simulating different IP origins."""
        logger.info("🔥 Testing Thunder Laser with proxy simulation...")
        
        url = self.test_urls[0]
        
        # Simulate different geographic origins
        proxy_headers = [
            {
                'X-Forwarded-For': '8.8.8.8',  # Google DNS
                'X-Real-IP': '8.8.8.8',
                'CF-Connecting-IP': '8.8.8.8',
                'X-Originating-IP': '8.8.8.8'
            },
            {
                'X-Forwarded-For': '1.1.1.1',  # Cloudflare DNS
                'X-Real-IP': '1.1.1.1', 
                'CF-Connecting-IP': '1.1.1.1',
                'X-Originating-IP': '1.1.1.1'
            },
            {
                'X-Forwarded-For': '208.67.222.222',  # OpenDNS
                'X-Real-IP': '208.67.222.222',
                'CF-Connecting-IP': '208.67.222.222'
            }
        ]
        
        for i, proxy_header in enumerate(proxy_headers):
            logger.info(f"Testing proxy simulation {i+1}/3...")
            
            session = requests.Session()
            
            # Base headers
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Connection': 'keep-alive',
                'Referer': 'https://www.google.com/',
                'DNT': '1'
            }
            
            # Add proxy headers
            headers.update(proxy_header)
            session.headers.update(headers)
            
            try:
                # Random delay
                await asyncio.sleep(random.uniform(1.0, 3.0))
                
                response = session.get(url, timeout=30)
                logger.info(f"Proxy test {i+1}: Status {response.status_code}")
                
                if response.status_code == 200:
                    logger.success(f"✅ Proxy simulation {i+1} successful!")
                    return True
                    
            except Exception as e:
                logger.error(f"Proxy test {i+1} failed: {str(e)}")
        
        return False
    
    @pytest.mark.asyncio
    async def test_thunder_laser_alternative_endpoints(self):
        """Test alternative Thunder Laser endpoints and subdomains."""
        logger.info("🔥 Testing Thunder Laser alternative endpoints...")
        
        # Try different subdomains and endpoints
        alternative_urls = [
            "https://thunderlaserusa.com/nova-35/",  # Without www
            "https://thunderlaser.com/nova-35/",     # Different domain
            "https://www.thunderlaser.com/nova-35/", # Different domain with www
            "https://thunderlaserusa.com/",          # Main page
            "https://www.thunderlaserusa.com/",      # Main page with www
        ]
        
        for url in alternative_urls:
            logger.info(f"Testing alternative URL: {url}")
            
            try:
                session = requests.Session()
                session.headers.update({
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Referer': 'https://www.google.com/'
                })
                
                response = session.get(url, timeout=15, allow_redirects=True)
                logger.info(f"Alternative URL status: {response.status_code}")
                
                if response.status_code == 200:
                    logger.success(f"✅ Alternative URL works: {url}")
                    logger.info(f"Final URL after redirects: {response.url}")
                    return True
                    
            except Exception as e:
                logger.error(f"Alternative URL {url} failed: {str(e)}")
        
        return False
    
    @pytest.mark.asyncio
    async def test_thunder_laser_stealth_mode(self):
        """Test Thunder Laser with maximum stealth anti-detection."""
        logger.info("🔥 Testing Thunder Laser STEALTH MODE...")
        
        url = self.test_urls[0]
        
        # Ultra-realistic browser headers
        stealth_headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'max-age=0',
            'Connection': 'keep-alive',
            'DNT': '1',
            'Pragma': 'no-cache',
            'Referer': 'https://www.google.com/search?q=thunder+laser+nova+35',
            'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'cross-site',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1'
        }
        
        session = requests.Session()
        session.headers.update(stealth_headers)
        
        try:
            # Simulate human browsing pattern
            logger.info("Simulating human browsing pattern...")
            
            # Step 1: Visit Google first
            await asyncio.sleep(1.0)
            
            # Step 2: Visit main site 
            logger.info("Visiting Thunder Laser main page first...")
            main_response = session.get("https://www.thunderlaserusa.com/", timeout=30)
            logger.info(f"Main page status: {main_response.status_code}")
            
            # Step 3: Wait like a human would
            await asyncio.sleep(random.uniform(2.0, 5.0))
            
            # Step 4: Visit product page
            logger.info(f"Now visiting product page: {url}")
            response = session.get(url, timeout=30)
            
            logger.info(f"STEALTH MODE result: {response.status_code}")
            
            if response.status_code == 200:
                content = response.text.lower()
                if 'nova' in content or 'laser' in content:
                    logger.success("🥷 STEALTH MODE SUCCESS! Got actual content!")
                    return True
                else:
                    logger.warning("Got 200 but content may be blocked")
            else:
                logger.error(f"STEALTH MODE failed: {response.status_code}")
                
        except Exception as e:
            logger.error(f"STEALTH MODE exception: {str(e)}")
        
        return False
    
    @pytest.mark.asyncio
    async def test_find_thunder_laser_working_domain(self):
        """Try to find Thunder Laser's actual working domain or distributor sites."""
        logger.info("🔥 Searching for Thunder Laser working domains...")
        
        # Try different possible domains and distributors
        potential_domains = [
            "https://thunderlaser.net/",
            "https://thunderlaser.net/nova-35/",
            "https://thunderlaser.org/",
            "https://thunderlaser.global/",
            "https://thunderlaser.shop/",
            "https://thunderlaserstore.com/",
            "https://shop.thunderlaser.net/",
            "https://global.thunderlaser.net/",
            "https://us.thunderlaser.net/",
            "https://thunderlaser.pro/",
            "https://thunderlasers.com/",
            "https://thunderlaser.co/",
            "https://thunderlasertech.com/",
            "https://thunderlaser.cn/",  # Chinese main site
            "https://www.thunderlaser.cn/",  # Chinese main site with www
        ]
        
        session = requests.Session()
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Referer': 'https://www.google.com/'
        })
        
        working_domains = []
        
        for domain in potential_domains:
            try:
                logger.info(f"Testing potential domain: {domain}")
                
                response = session.get(domain, timeout=10, allow_redirects=True)
                
                if response.status_code == 200:
                    content = response.text.lower()
                    if any(keyword in content for keyword in ['nova', 'aurora', 'thunder', 'laser']):
                        logger.success(f"✅ FOUND WORKING DOMAIN: {domain}")
                        logger.info(f"Final URL: {response.url}")
                        working_domains.append(domain)
                        
                        # Try to find Nova 35 on this domain
                        soup = BeautifulSoup(response.content, 'html.parser')
                        links = soup.find_all('a', href=True)
                        for link in links:
                            href = link['href'].lower()
                            if 'nova' in href and ('35' in href or '51' in href):
                                full_url = response.urljoin(link['href'])
                                logger.success(f"🎯 Found Nova product link: {full_url}")
                        
                        # Don't return yet, check all domains
                        await asyncio.sleep(1.0)  # Rate limit
                    else:
                        logger.info(f"Domain responds but no laser content: {domain}")
                else:
                    logger.info(f"Domain status {response.status_code}: {domain}")
                    
            except Exception as e:
                logger.info(f"Domain failed {domain}: {str(e)}")
                
            await asyncio.sleep(0.5)  # Small delay between requests
        
        if working_domains:
            logger.success(f"🎉 Found {len(working_domains)} working Thunder Laser domains!")
            return True
        else:
            logger.error("❌ No working Thunder Laser domains found")
            return False

if __name__ == "__main__":
    # Run the tests
    pytest.main([__file__, "-v", "-s"])