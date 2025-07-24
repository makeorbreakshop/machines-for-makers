#!/usr/bin/env python3
"""
Simple test to find and parse xTool's sitemap without Scrapfly
"""
import asyncio
import aiohttp
import xml.etree.ElementTree as ET
from urllib.parse import urljoin

async def test_xtool_sitemap():
    base_url = "https://www.xtool.com"
    
    # Common sitemap locations
    sitemap_urls = [
        "/sitemap.xml",
        "/sitemap_index.xml",
        "/sitemaps/sitemap.xml",
        "/sitemap/sitemap-index.xml",
        "/robots.txt"  # Check robots.txt for sitemap location
    ]
    
    async with aiohttp.ClientSession() as session:
        # First check robots.txt
        print("1. Checking robots.txt for sitemap location...")
        try:
            async with session.get(urljoin(base_url, "/robots.txt")) as response:
                if response.status == 200:
                    robots_content = await response.text()
                    print("✅ Found robots.txt:")
                    # Look for sitemap entries
                    for line in robots_content.split('\n'):
                        if 'sitemap' in line.lower():
                            print(f"   → {line.strip()}")
        except Exception as e:
            print(f"❌ Error reading robots.txt: {e}")
        
        print("\n2. Trying common sitemap locations...")
        for sitemap_path in sitemap_urls:
            if sitemap_path == "/robots.txt":
                continue
                
            sitemap_url = urljoin(base_url, sitemap_path)
            print(f"\nTrying: {sitemap_url}")
            
            try:
                async with session.get(sitemap_url, timeout=10) as response:
                    print(f"   Status: {response.status}")
                    
                    if response.status == 200:
                        content = await response.text()
                        print(f"   Content length: {len(content)} chars")
                        
                        # Check if it's XML
                        if content.strip().startswith('<?xml'):
                            print("   ✅ Found XML sitemap!")
                            
                            # Parse it
                            try:
                                root = ET.fromstring(content)
                                
                                # Check if it's a sitemap index
                                if 'sitemapindex' in root.tag:
                                    print("   This is a sitemap index. Sub-sitemaps:")
                                    sitemaps = root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}sitemap')
                                    for i, sitemap in enumerate(sitemaps[:5]):
                                        loc = sitemap.find('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')
                                        if loc is not None:
                                            print(f"     {i+1}. {loc.text}")
                                    
                                    # Try to find product sitemap
                                    for sitemap in sitemaps:
                                        loc = sitemap.find('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')
                                        if loc and 'product' in loc.text.lower():
                                            print(f"\n   📦 Found product sitemap: {loc.text}")
                                            return loc.text
                                else:
                                    # Regular sitemap
                                    urls = root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}url')
                                    print(f"   Found {len(urls)} URLs in sitemap")
                                    
                                    # Sample some URLs
                                    product_count = 0
                                    print("\n   Sample URLs:")
                                    for url_elem in urls[:10]:
                                        loc = url_elem.find('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')
                                        if loc is not None:
                                            url = loc.text
                                            print(f"     - {url}")
                                            if '/products/' in url or '/collections/' in url:
                                                product_count += 1
                                    
                                    print(f"\n   Product-like URLs in first 10: {product_count}")
                                    return sitemap_url
                                    
                            except ET.ParseError as e:
                                print(f"   ❌ XML parse error: {e}")
                        else:
                            print("   Not XML content")
                            
            except asyncio.TimeoutError:
                print("   ❌ Timeout")
            except Exception as e:
                print(f"   ❌ Error: {e}")
    
    return None

async def main():
    print("TESTING XTOOL SITEMAP DISCOVERY")
    print("=" * 50)
    
    sitemap = await test_xtool_sitemap()
    
    if sitemap:
        print(f"\n✅ Successfully found sitemap at: {sitemap}")
    else:
        print("\n❌ Could not find a sitemap")

if __name__ == "__main__":
    asyncio.run(main())