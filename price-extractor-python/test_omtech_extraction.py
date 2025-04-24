#!/usr/bin/env python3
"""
Test script to verify OMTech-specific price extraction.
This script tests both the current selector and proposed selectors to fix OMTech price extraction.
"""

import asyncio
import sys
from decimal import Decimal
from bs4 import BeautifulSoup
import re
import httpx
from loguru import logger

# URL of the OMTech product to test
DEFAULT_URL = "https://omtechlaser.com/products/60w-co2-laser-engraver-with-16-x-24-working-area"

async def fetch_html(url):
    """Fetch HTML content from URL"""
    logger.info(f"Fetching content from {url}")
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Referer": "https://www.google.com/",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Cache-Control": "max-age=0",
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url, headers=headers, follow_redirects=True)
        response.raise_for_status()
        return response.text
        
def normalize_price(price_str):
    """Normalize price string to float"""
    if not price_str:
        return None
    
    # Handle OMTech's special format where price is repeated like "$2,59999$2,599.99"
    if price_str.count('$') > 1:
        # Split by $ and take the last part which usually has correct format
        parts = price_str.split('$')
        price_str = parts[-1]
    
    # Remove currency symbols, commas, spaces, etc.
    price_str = re.sub(r'[^\d.]', '', price_str)
    
    # Handle multiple decimal points
    parts = price_str.split('.')
    if len(parts) > 2:
        price_str = parts[0] + '.' + ''.join(parts[1:])
    
    try:
        price = Decimal(price_str)
        # Sanity check
        if price > 0 and price < 100000:
            return price
    except:
        pass
    
    return None

def extract_price_current_method(html):
    """Current method that's producing incorrect results"""
    soup = BeautifulSoup(html, 'html.parser')
    elements = soup.select('.product__price')
    
    if elements:
        price_text = elements[0].get_text().strip()
        return price_text, normalize_price(price_text)
    
    return None, None

def extract_price_new_method(html):
    """Proposed fix with multiple selectors"""
    soup = BeautifulSoup(html, 'html.parser')
    
    # Try multiple selectors in order of reliability
    price_selectors = [
        ".product-price span.money",
        ".product__price--regular",
        "meta[property='og:price:amount']",
        "[data-product-price]",
        ".price.price--large",
        ".product-single__price"
    ]
    
    for selector in price_selectors:
        elements = soup.select(selector)
        if elements:
            if selector.startswith('meta'):
                price_text = elements[0].get('content', '').strip()
            else:
                price_text = elements[0].get_text().strip()
            
            normalized = normalize_price(price_text)
            if normalized:
                return selector, price_text, normalized
    
    # If we couldn't find a price with specific selectors, try to find prices
    # near "Add to cart" buttons
    cart_buttons = soup.select('button[name="add"], .add-to-cart, [id*="AddToCart"]')
    for button in cart_buttons:
        # Look at siblings and parent elements for price
        for element in list(button.parent.find_all()) + list(button.find_previous_siblings()) + list(button.find_next_siblings()):
            text = element.get_text().strip()
            if '$' in text and len(text) < 100:  # Only short text sections, not entire divs
                normalized = normalize_price(text)
                if normalized:
                    return "near-cart-button", text, normalized
    
    # Try another approach - find all standalone price elements
    price_pattern = r'\$\s*([\d,]+\.?\d*)'
    for element in soup.find_all(string=re.compile(r'\$\s*[\d,]+')):
        if len(element.strip()) < 100:  # Only match shorter strings, not large blocks of text
            match = re.search(price_pattern, element)
            if match:
                price_text = match.group(0)
                normalized = normalize_price(price_text)
                if normalized:
                    return "regex-in-html", price_text, normalized
    
    return None, None, None

async def main():
    # Get URL from command line or use default
    url = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_URL
    
    try:
        html_content = await fetch_html(url)
        
        # Test current method
        current_text, current_price = extract_price_current_method(html_content)
        print("\n=== Current Method ===")
        print(f"Selector: .product__price")
        print(f"Raw text: {current_text}")
        print(f"Normalized price: {current_price}")
        
        # Test new method
        selector, new_text, new_price = extract_price_new_method(html_content)
        print("\n=== New Method ===")
        print(f"Selector used: {selector}")
        print(f"Raw text: {new_text}")
        print(f"Normalized price: {new_price}")
        
        # Compare results
        print("\n=== Comparison ===")
        if current_price and new_price:
            if current_price != new_price:
                print(f"✅ Results differ: Old ${current_price} vs New ${new_price}")
                if current_price > 1000000:  # Likely incorrect
                    print(f"✅ The new method fixed the issue (old price was unreasonably large)")
                else:
                    print(f"⚠️  Need to verify which price is correct")
            else:
                print(f"⚠️  Both methods produced the same price: ${current_price}")
        elif new_price and not current_price:
            print(f"✅ New method found a price (${new_price}) while the current method failed")
        elif current_price and not new_price:
            print(f"❌ Current method found a price (${current_price}) but the new method failed")
        else:
            print(f"❌ Both methods failed to extract a price")
            
        # Check HTML for price mentions
        print("\n=== HTML Price Check ===")
        price_pattern = r'\$\s*[\d,]+\.?\d*'
        prices = re.findall(price_pattern, html_content)
        unique_prices = set(prices)
        print(f"Found {len(unique_prices)} unique price mentions in HTML:")
        for price in unique_prices:
            print(f"  {price}")
            
    except Exception as e:
        print(f"Error testing extraction: {str(e)}")

if __name__ == "__main__":
    asyncio.run(main()) 