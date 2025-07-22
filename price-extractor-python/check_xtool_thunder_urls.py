#!/usr/bin/env python3
"""
Check what's happening with xTool S1 and Thunder Bolt URLs.
"""
import requests
from bs4 import BeautifulSoup
from loguru import logger

def check_urls():
    """Check the status of xTool S1 and Thunder Bolt URLs."""
    
    urls_to_check = [
        # xTool S1 variations
        ("xTool S1 - products", "https://www.xtool.com/products/xtool-s1"),
        ("xTool S1 - collections", "https://www.xtool.com/collections/xtool-s1"),
        ("xTool S1 - no www", "https://xtool.com/products/xtool-s1"),
        ("xTool S1 - laser engraver", "https://www.xtool.com/products/xtool-s1-laser-engraver"),
        ("xTool S1 - enclosed", "https://www.xtool.com/products/xtool-s1-enclosed-diode-laser-cutter"),
        
        # Thunder Bolt
        ("Thunder Bolt", "https://thunderlaser.com/products/thunder-bolt"),
    ]
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    for name, url in urls_to_check:
        logger.info(f"\nChecking {name}: {url}")
        try:
            response = requests.get(url, headers=headers, timeout=10, allow_redirects=True)
            logger.info(f"Status: {response.status_code}")
            
            if response.url != url:
                logger.info(f"Redirected to: {response.url}")
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Check for title
                title = soup.find('title')
                if title:
                    logger.info(f"Title: {title.text.strip()}")
                
                # Look for price indicators
                price_indicators = soup.find_all(text=lambda t: '$' in t and any(c.isdigit() for c in t))
                if price_indicators:
                    logger.success(f"Found {len(price_indicators)} price indicators")
                    # Show first few
                    for i, price in enumerate(price_indicators[:3]):
                        clean_price = price.strip()
                        if len(clean_price) < 100:  # Avoid long scripts
                            logger.info(f"  Price {i+1}: {clean_price}")
                else:
                    logger.warning("No price indicators found")
                    
        except Exception as e:
            logger.error(f"Error: {str(e)}")

if __name__ == "__main__":
    check_urls()