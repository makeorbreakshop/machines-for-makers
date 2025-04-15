#!/usr/bin/env python
"""
Script to test Claude AI price extraction functionality directly.

Usage:
  python test_claude_extraction.py <url>
"""

import sys
import os
from loguru import logger
import anthropic
from datetime import datetime

from config import ANTHROPIC_API_KEY, CLAUDE_MODEL, validate_config
from scrapers.web_scraper import WebScraper

def extract_price_with_claude(html_content, url):
    """
    Test Claude AI price extraction.
    
    Args:
        html_content (str): HTML content of the page.
        url (str): URL of the page.
        
    Returns:
        str: Extracted price or error message.
    """
    try:
        # Initialize Claude client
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        
        # Prepare a truncated version of the HTML for Claude
        truncated_html = html_content[:15000] if len(html_content) > 15000 else html_content
        
        # Create prompt for Claude
        prompt = f"""I need to extract the current price of a product from this webpage. 
URL: {url}

Here is the HTML content of the page (truncated if too long):
{truncated_html}

Please extract ONLY the product's current price. 
- Return ONLY the numeric price value without currency symbols, in the format: 399.99
- If there are multiple prices (like regular and sale price), return the current selling price.
- Do not include shipping costs or taxes in the price.
- If you can't find a clear price, respond with "No price found".
- Do not explain your reasoning, just return the price or "No price found".
"""
        
        # Call Claude API
        print(f"Calling Claude API ({CLAUDE_MODEL}) to extract price...")
        response = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=150,
            system="You are a specialized AI assistant that only extracts product prices from web pages. You only respond with the numeric price value (e.g., '299.99') or 'No price found'. Never include explanations or other text.",
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

def main(url):
    """
    Main function to test Claude price extraction.
    
    Args:
        url (str): URL to test price extraction on.
    """
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
    soup, html_content = scraper.get_page_content(url)
    
    if not soup or not html_content:
        print(f"Error: Failed to fetch content from {url}")
        sys.exit(1)
    
    print(f"Successfully fetched content from {url}")
    
    # Extract price using Claude
    price_result = extract_price_with_claude(html_content, url)
    
    # Output result
    print("\nClaude extraction result:")
    print(f"  > {price_result}")
    
    # Save HTML content for debugging if needed
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    output_dir = "debug"
    os.makedirs(output_dir, exist_ok=True)
    
    filename = os.path.join(output_dir, f"test_claude_{timestamp}.html")
    with open(filename, "w", encoding="utf-8") as f:
        f.write(html_content)
    
    print(f"\nHTML content saved to {filename} for debugging")

if __name__ == "__main__":
    # Ensure logs directory exists
    os.makedirs("logs", exist_ok=True)
    
    # Check if URL is provided
    if len(sys.argv) < 2:
        print("Error: Missing URL")
        print(f"Usage: python {sys.argv[0]} <url>")
        sys.exit(1)
    
    # Get URL from command line
    url = sys.argv[1]
    
    # Run the test
    main(url) 