#!/usr/bin/env python3
"""
Test EMP ST100J price extraction
The issue is that it's extracting $4995 instead of $11995
"""

import asyncio
from loguru import logger
from scrapers.scrapfly_web_scraper import ScrapflyWebScraper
from services.database import DatabaseService
from bs4 import BeautifulSoup

async def analyze_emp_table():
    """Analyze the EMP price table structure"""
    
    db_service = DatabaseService()
    scraper = ScrapflyWebScraper(database_service=db_service)
    
    url = "https://emplaser.com/emp-galvo-lasers"
    logger.info(f"Fetching {url}")
    
    try:
        html, soup = await scraper.get_page_content(url)
        
        # Find all table cells with prices
        price_cells = soup.select('td:contains("$")')
        
        logger.info(f"Found {len(price_cells)} price cells")
        
        # Show all prices in order
        for i, cell in enumerate(price_cells):
            text = cell.get_text(strip=True)
            logger.info(f"Column {i}: {text}")
            
        # Try to find the pricing row specifically
        logger.info("\n" + "="*60)
        logger.info("Looking for pricing table row...")
        
        # Find the pricing row
        pricing_rows = soup.select('tr:contains("Pricing")')
        if pricing_rows:
            for row in pricing_rows:
                cells = row.find_all('td')
                logger.info(f"Found pricing row with {len(cells)} cells:")
                for i, cell in enumerate(cells):
                    text = cell.get_text(strip=True)
                    logger.info(f"  Cell {i}: {text}")
        
        # Look for ST100J specifically
        logger.info("\n" + "="*60)
        logger.info("Looking for ST100J in the page...")
        
        page_text = soup.get_text()
        import re
        
        # Find ST100J and nearby prices
        pattern = r'ST100J.*?\$[\d,]+|ST\s*100J.*?\$[\d,]+'
        matches = re.findall(pattern, page_text, re.DOTALL)[:5]  # First 5 matches
        
        for match in matches:
            # Clean up the match
            match_clean = ' '.join(match.split())[:100]  # First 100 chars
            logger.info(f"Found: {match_clean}")
            
        # Check what column has $11,995
        logger.info("\n" + "="*60)
        logger.info("Looking for $11,995 specifically...")
        
        eleven_k_cells = soup.find_all(text=re.compile(r'\$11,?995'))
        for cell in eleven_k_cells:
            parent = cell.parent
            if parent.name == 'td':
                # Find the column index
                row = parent.parent
                cells = row.find_all('td')
                for i, td in enumerate(cells):
                    if td == parent:
                        logger.info(f"$11,995 found in column {i}")
                        break
                        
    except Exception as e:
        logger.error(f"Error: {str(e)}")

if __name__ == "__main__":
    asyncio.run(analyze_emp_table())