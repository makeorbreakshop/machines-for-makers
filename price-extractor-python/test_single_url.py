#!/usr/bin/env python3
import sys
from test_database_extraction import PriceExtractor

if len(sys.argv) < 2:
    print("Usage: python test_single_url.py <url> [previous_price]")
    sys.exit(1)

url = sys.argv[1]
previous_price = float(sys.argv[2]) if len(sys.argv) > 2 else None

print(f"Testing URL: {url}")
print(f"Previous price: ${previous_price:.2f}" if previous_price else "No previous price provided")

extractor = PriceExtractor()
html_content = extractor.fetch_page(url)

if not html_content:
    print(f"ERROR: Failed to fetch content from {url}")
    sys.exit(1)
    
print("Successfully fetched page content")
price, method = extractor.extract_price(html_content, url)

if not price:
    print(f"ERROR: Failed to extract price using method: {method}")
    sys.exit(1)
    
print(f"Extracted price: ${price:.2f} using {method}")

if previous_price:
    corrected, status, confidence = extractor.verify_price(price, previous_price, "Test Machine", url)
    print(f"Verification: {status}")
    print(f"Confidence: {confidence:.2f}")
    print(f"Corrected price: ${corrected:.2f}")
    
    if corrected != price:
        print(f"NOTE: Price was corrected from ${price:.2f} to ${corrected:.2f}")
        
    price_change = abs((corrected - previous_price) / previous_price) * 100
    print(f"Price change: {price_change:.2f}% from previous ${previous_price:.2f}") 