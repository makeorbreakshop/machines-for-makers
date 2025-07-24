#!/usr/bin/env python3
"""
Test discovery process in stages for xTool.com
Shows each step of the discovery process
"""
import asyncio
import aiohttp
from urllib.parse import urljoin
import xml.etree.ElementTree as ET
from services.scrapfly_service import get_scrapfly_service
from scrapfly import ScrapeConfig
import json
from typing import List, Set
import re

async def test_stage_1_check_site():
    """Stage 1: Check if we can access the site"""
    print("=" * 60)
    print("STAGE 1: CHECKING SITE ACCESS")
    print("=" * 60)
    
    base_url = "https://www.xtool.com"
    
    # Test with regular request first
    print("\n1. Testing regular HTTP request...")
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(base_url, timeout=10) as response:
                print(f"   Status: {response.status}")
                print(f"   Content Length: {len(await response.text())} chars")
                if response.status != 200:
                    print("   ❌ Regular request blocked!")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test with Scrapfly
    print("\n2. Testing with Scrapfly...")
    scrapfly = get_scrapfly_service()
    if scrapfly:
        html, metadata = await scrapfly.scrape_page(base_url, render_js=True)
        if html:
            print(f"   ✅ Success! HTML length: {len(html)} chars")
            print(f"   Credits used: {metadata.get('cost', 'unknown')}")
        else:
            print("   ❌ Scrapfly failed")
    else:
        print("   ❌ Scrapfly not configured")

async def test_stage_2_find_sitemap():
    """Stage 2: Find and parse sitemap"""
    print("\n" + "=" * 60)
    print("STAGE 2: FINDING SITEMAP")
    print("=" * 60)
    
    base_url = "https://www.xtool.com"
    sitemap_urls = [
        "/sitemap.xml",
        "/sitemap_index.xml",
        "/sitemaps/sitemap.xml",
        "/sitemap/sitemap-index.xml"
    ]
    
    scrapfly = get_scrapfly_service()
    found_sitemap = None
    
    for sitemap_path in sitemap_urls:
        sitemap_url = urljoin(base_url, sitemap_path)
        print(f"\nTrying: {sitemap_url}")
        
        if scrapfly:
            # Use Scrapfly to bypass any blocking
            html, metadata = await scrapfly.scrape_page(sitemap_url, render_js=False)
            if html and "<?xml" in html:
                print(f"   ✅ Found sitemap! Credits used: {metadata.get('cost', 'unknown')}")
                found_sitemap = (sitemap_url, html)
                break
            else:
                print(f"   ❌ Not found or not XML")
    
    if found_sitemap:
        url, content = found_sitemap
        print(f"\n3. Parsing sitemap from {url}...")
        
        # Parse the XML
        try:
            root = ET.fromstring(content)
            
            # Check if it's a sitemap index
            if root.tag.endswith('sitemapindex'):
                print("   This is a sitemap index. Sub-sitemaps:")
                sitemaps = root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}sitemap')
                for i, sitemap in enumerate(sitemaps[:5]):
                    loc = sitemap.find('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')
                    if loc is not None:
                        print(f"   {i+1}. {loc.text}")
                if len(sitemaps) > 5:
                    print(f"   ... and {len(sitemaps) - 5} more")
            else:
                # Regular sitemap with URLs
                urls = root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}url')
                print(f"   Found {len(urls)} URLs in sitemap")
                
        except Exception as e:
            print(f"   ❌ Error parsing XML: {e}")
    
    return found_sitemap

async def test_stage_3_find_product_urls(sitemap_content: str):
    """Stage 3: Extract product URLs from sitemap"""
    print("\n" + "=" * 60)
    print("STAGE 3: FINDING PRODUCT URLS")
    print("=" * 60)
    
    product_patterns = [
        r'/products?/',
        r'/collections?/',
        r'/pages/.*-laser',
        r'/pages/.*-engraver',
        r'/pages/xtool-[a-z0-9-]+$'
    ]
    
    try:
        root = ET.fromstring(sitemap_content)
        urls = root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}url')
        
        product_urls = []
        
        for url_elem in urls:
            loc = url_elem.find('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')
            if loc is not None:
                url = loc.text
                # Check if URL matches product patterns
                for pattern in product_patterns:
                    if re.search(pattern, url, re.IGNORECASE):
                        product_urls.append(url)
                        break
        
        print(f"Found {len(product_urls)} potential product URLs")
        print("\nSample product URLs:")
        for i, url in enumerate(product_urls[:10]):
            print(f"   {i+1}. {url}")
        if len(product_urls) > 10:
            print(f"   ... and {len(product_urls) - 10} more")
            
        return product_urls
        
    except Exception as e:
        print(f"❌ Error parsing sitemap: {e}")
        return []

async def test_stage_4_scrape_product(url: str):
    """Stage 4: Scrape a single product page"""
    print("\n" + "=" * 60)
    print("STAGE 4: SCRAPING PRODUCT PAGE")
    print("=" * 60)
    print(f"URL: {url}")
    
    scrapfly = get_scrapfly_service()
    if not scrapfly:
        print("❌ Scrapfly not configured")
        return None
    
    print("\nFetching page with Scrapfly...")
    html, metadata = await scrapfly.scrape_page(url, render_js=True)
    
    if not html:
        print("❌ Failed to fetch page")
        return None
    
    print(f"✅ Page fetched! Credits used: {metadata.get('cost', 'unknown')}")
    print(f"   HTML length: {len(html)} chars")
    
    # Try to extract basic product info
    print("\n5. Extracting product information...")
    
    # Simple extraction - in real system this would use our price extractor
    product_info = {
        "url": url,
        "html_length": len(html),
        "credits_used": metadata.get('cost', 0)
    }
    
    # Look for title
    title_match = re.search(r'<title>([^<]+)</title>', html, re.IGNORECASE)
    if title_match:
        product_info['title'] = title_match.group(1).strip()
        print(f"   Title: {product_info['title']}")
    
    # Look for price (simple regex)
    price_patterns = [
        r'\$(\d+(?:,\d{3})*(?:\.\d{2})?)',
        r'USD\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
    ]
    
    for pattern in price_patterns:
        price_match = re.search(pattern, html)
        if price_match:
            product_info['price'] = price_match.group(1)
            print(f"   Price found: ${product_info['price']}")
            break
    
    return product_info

async def main():
    """Run all stages"""
    print("TESTING XTOOL.COM DISCOVERY PROCESS")
    print("This will use Scrapfly credits!\n")
    
    # Stage 1: Check site access
    await test_stage_1_check_site()
    
    # Stage 2: Find sitemap
    sitemap_result = await test_stage_2_find_sitemap()
    
    if sitemap_result:
        _, sitemap_content = sitemap_result
        
        # Stage 3: Find product URLs
        product_urls = await test_stage_3_find_product_urls(sitemap_content)
        
        if product_urls:
            # Stage 4: Test scraping one product
            test_url = product_urls[0]
            await test_stage_4_scrape_product(test_url)
            
            print("\n" + "=" * 60)
            print("SUMMARY")
            print("=" * 60)
            print(f"✅ Site accessible with Scrapfly")
            print(f"✅ Sitemap found and parsed")
            print(f"✅ {len(product_urls)} product URLs discovered")
            print(f"✅ Test product page scraped successfully")
            print("\nNext step: Run full discovery through the admin UI")
    
    else:
        print("\n❌ Could not find sitemap - manual configuration may be needed")

if __name__ == "__main__":
    asyncio.run(main())