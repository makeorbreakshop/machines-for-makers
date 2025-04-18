#!/usr/bin/env python
"""
Script to test Claude AI price extraction functionality directly.

Usage:
  python test_claude_extraction.py --url <url> [--previous-price <price>] [--debug]
"""

import sys
import os
import argparse
from loguru import logger
import anthropic
from datetime import datetime

from config import ANTHROPIC_API_KEY, CLAUDE_HAIKU_MODEL, CLAUDE_SONNET_MODEL, validate_config
from scrapers.web_scraper import WebScraper

def extract_price_with_claude(html_content, url, previous_price=None, use_sonnet=False):
    """
    Test Claude AI price extraction.
    
    Args:
        html_content (str): HTML content of the page.
        url (str): URL of the page.
        previous_price (float, optional): Previous price for context
        use_sonnet (bool): Whether to use Claude Sonnet instead of Haiku
        
    Returns:
        str: Extracted price or error message.
    """
    try:
        # Initialize Claude client
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY,
                              default_headers={"anthropic-version": "2023-06-01"})
        
        # Prepare a truncated version of the HTML for Claude
        truncated_html = html_content[:20000] if len(html_content) > 20000 else html_content
        
        # Select model based on parameters
        model = CLAUDE_SONNET_MODEL if use_sonnet else CLAUDE_HAIKU_MODEL
        
        # Create prompt for Claude
        prompt = f"""I need to extract the current price of a product from this webpage. 
URL: {url}
{f'Previous price: ${previous_price}' if previous_price else ''}

Here is the HTML content of the page (truncated if too long):
```
{truncated_html}
```

Please analyze the HTML and extract the current price of the main product.

First, explain your analysis briefly, list all price candidates you find, then provide ONLY the final numeric price value.
Structure your answer like this:

Analysis: [your brief analysis of what you found]
Candidates: [list price candidates with locations/context]
Price: [final numeric price only, e.g., 1299.99]
Confidence: [your confidence from 0.0 to 1.0]

If there are multiple prices (like regular and sale price), return the current selling price.
For discounted items, select the SALE price, not the original price.
Your confidence should reflect how certain you are about the extracted price.
"""
        
        # Call Claude API
        print(f"Calling Claude API ({model}) to extract price...")
        response = client.messages.create(
            model=model,
            max_tokens=300,
            temperature=0,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        # Process the response
        result = response.content[0].text.strip()
        return result
    
    except Exception as e:
        logger.error(f"Error using Claude for price extraction: {str(e)}")
        return f"Error: {str(e)}"

async def main(args):
    """
    Main function to test Claude price extraction.
    
    Args:
        args: Command line arguments
    """
    url = args.url
    previous_price = args.previous_price
    debug = args.debug
    use_sonnet = args.sonnet
    
    # Ensure config is valid
    if not validate_config():
        logger.error("Configuration validation failed. Exiting.")
        sys.exit(1)
    
    # Initialize web scraper
    scraper = WebScraper()
    
    # Check if URL is valid
    if not scraper.is_valid_url(url):
        print(f"Error: Invalid URL '{url}'")
        sys.exit(1)
    
    # Fetch the page content
    print(f"Fetching content from {url}...")
    html_content, soup = await scraper.get_page_content(url)
    
    if not soup or not html_content:
        print(f"Error: Failed to fetch content from {url}")
        sys.exit(1)
    
    print(f"Successfully fetched content from {url}")
    print(f"HTML size: {len(html_content)} bytes")
    
    # Extract price using Claude
    price_result = extract_price_with_claude(html_content, url, previous_price, use_sonnet)
    
    # Output result
    print("\nClaude extraction result:")
    print("-" * 40)
    print(price_result)
    print("-" * 40)
    
    # Save HTML content for debugging if needed
    if debug:
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        output_dir = "debug"
        os.makedirs(output_dir, exist_ok=True)
        
        filename = os.path.join(output_dir, f"test_claude_{timestamp}.html")
        with open(filename, "w", encoding="utf-8") as f:
            f.write(html_content)
        
        print(f"\nHTML content saved to {filename} for debugging")

if __name__ == "__main__":
    # Set up argument parser
    parser = argparse.ArgumentParser(description='Test Claude AI price extraction')
    parser.add_argument('--url', required=True, help='URL to test price extraction on')
    parser.add_argument('--previous-price', type=float, help='Previously known price for context')
    parser.add_argument('--debug', action='store_true', help='Save HTML for debugging')
    parser.add_argument('--sonnet', action='store_true', help='Use Claude Sonnet instead of Haiku')
    
    args = parser.parse_args()
    
    # Ensure logs directory exists
    os.makedirs("logs", exist_ok=True)
    
    # Run the test
    import asyncio
    asyncio.run(main(args)) 