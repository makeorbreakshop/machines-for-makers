#!/usr/bin/env python3
"""Quick test to see what's on xTool homepage"""
import asyncio
from services.progressive_scraper import create_progressive_scraper
from bs4 import BeautifulSoup
import re

async def test_homepage():
    scraper = create_progressive_scraper()
    
    # Just get the homepage
    data, credits = await scraper.extract_product_progressive("https://www.xtool.com/collections/laser-engravers")
    
    print(f"Credits used: {credits}")
    
    if data and 'name' in data:
        print(f"Found: {data['name']}")
        print(f"Price: ${data.get('price', 'N/A')}")

asyncio.run(test_homepage())