#!/usr/bin/env python3
"""
Test ComMarker Price Extraction

This script tests the actual price extraction system against ComMarker pages
to understand why it's failing on certain products.
"""

import requests
from bs4 import BeautifulSoup
import json
import re
import time
from urllib.parse import urljoin

# URLs to test
TEST_URLS = {
    "B6 20W": "https://commarker.com/product/commarker-b6/",
    "B6 30W": "https://commarker.com/product/commarker-b6",
    "B6 MOPA 30W": "https://commarker.com/product/commarker-b6-jpt-mopa/",
    "B6 MOPA 60W": "https://commarker.com/product/commarker-b6-jpt-mopa/"
}

def fetch_page_content(url):
    """Fetch page content with proper headers"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        return response.text
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

def extract_json_ld(html):
    """Extract JSON-LD structured data"""
    soup = BeautifulSoup(html, 'html.parser')
    scripts = soup.find_all('script', type='application/ld+json')
    
    json_ld_data = []
    for script in scripts:
        try:
            data = json.loads(script.string)
            json_ld_data.append(data)
        except json.JSONDecodeError:
            continue
    
    return json_ld_data

def extract_prices_various_methods(html):
    """Try various methods to extract prices"""
    soup = BeautifulSoup(html, 'html.parser')
    
    results = {
        'method_1_span_price': [],
        'method_2_del_ins': [],
        'method_3_currency_regex': [],
        'method_4_woocommerce': [],
        'method_5_json_ld': [],
        'method_6_meta_tags': []
    }
    
    # Method 1: span.price elements
    price_spans = soup.find_all('span', class_='price')
    for span in price_spans:
        results['method_1_span_price'].append(span.get_text(strip=True))
    
    # Method 2: del and ins tags (strikethrough and highlighted prices)
    del_prices = soup.find_all('del')
    ins_prices = soup.find_all('ins')
    for del_price in del_prices:
        results['method_2_del_ins'].append(f"ORIGINAL: {del_price.get_text(strip=True)}")
    for ins_price in ins_prices:
        results['method_2_del_ins'].append(f"SALE: {ins_price.get_text(strip=True)}")
    
    # Method 3: Currency regex
    currency_pattern = r'\$[\d,]+(?:\.\d{2})?'
    currency_matches = re.findall(currency_pattern, html)
    results['method_3_currency_regex'] = list(set(currency_matches))
    
    # Method 4: WooCommerce specific classes
    woo_classes = [
        'woocommerce-Price-amount',
        'amount',
        'price-range',
        'price-from',
        'price-to',
        'regular-price',
        'sale-price'
    ]
    for class_name in woo_classes:
        elements = soup.find_all(class_=class_name)
        for elem in elements:
            results['method_4_woocommerce'].append(f"{class_name}: {elem.get_text(strip=True)}")
    
    # Method 5: JSON-LD structured data
    json_ld_data = extract_json_ld(html)
    for data in json_ld_data:
        if isinstance(data, dict):
            # Look for Product schema
            if data.get('@type') == 'Product':
                offers = data.get('offers', {})
                if isinstance(offers, dict):
                    if 'lowPrice' in offers:
                        results['method_5_json_ld'].append(f"LOW: ${offers['lowPrice']}")
                    if 'highPrice' in offers:
                        results['method_5_json_ld'].append(f"HIGH: ${offers['highPrice']}")
                    if 'price' in offers:
                        results['method_5_json_ld'].append(f"PRICE: ${offers['price']}")
            
            # Look for graph structure
            if '@graph' in data:
                for item in data['@graph']:
                    if item.get('@type') == 'Product':
                        offers = item.get('offers', {})
                        if isinstance(offers, dict):
                            if 'lowPrice' in offers:
                                results['method_5_json_ld'].append(f"GRAPH LOW: ${offers['lowPrice']}")
                            if 'highPrice' in offers:
                                results['method_5_json_ld'].append(f"GRAPH HIGH: ${offers['highPrice']}")
    
    # Method 6: Meta tags
    meta_tags = soup.find_all('meta')
    for meta in meta_tags:
        if meta.get('property') == 'product:price:amount':
            results['method_6_meta_tags'].append(f"META: {meta.get('content', '')}")
        elif meta.get('name') == 'twitter:data1':
            results['method_6_meta_tags'].append(f"TWITTER: {meta.get('content', '')}")
    
    return results

def test_extraction_on_url(name, url):
    """Test price extraction on a specific URL"""
    print(f"\n{'='*60}")
    print(f"TESTING: {name}")
    print(f"URL: {url}")
    print(f"{'='*60}")
    
    html = fetch_page_content(url)
    if not html:
        print("❌ Failed to fetch page content")
        return
    
    results = extract_prices_various_methods(html)
    
    for method, prices in results.items():
        print(f"\n{method.upper().replace('_', ' ')}:")
        if prices:
            for price in prices:
                print(f"  - {price}")
        else:
            print("  - No prices found")
    
    # Additional analysis
    print(f"\nADDITIONAL ANALYSIS:")
    print(f"Page title: {BeautifulSoup(html, 'html.parser').title.string if BeautifulSoup(html, 'html.parser').title else 'N/A'}")
    print(f"Page length: {len(html)} characters")
    
    # Check for JavaScript that might affect pricing
    if 'variation_form' in html:
        print("⚠️  Contains variation_form JavaScript - dynamic pricing likely")
    if 'jQuery' in html:
        print("⚠️  Contains jQuery - dynamic content updates likely")
    if 'woocommerce' in html.lower():
        print("✅ WooCommerce detected")

def main():
    """Run the extraction tests"""
    print("COMMARKER PRICE EXTRACTION TESTING")
    print("="*60)
    
    for name, url in TEST_URLS.items():
        test_extraction_on_url(name, url)
        time.sleep(2)  # Be respectful to the server
    
    print(f"\n{'='*60}")
    print("SUMMARY AND RECOMMENDATIONS")
    print(f"{'='*60}")
    print("1. Test multiple extraction methods on each page")
    print("2. Prioritize JSON-LD structured data for accuracy")
    print("3. Handle dynamic pricing with JavaScript execution")
    print("4. Use sale prices (ins tags) over original prices (del tags)")
    print("5. Validate extracted prices against expected ranges")

if __name__ == "__main__":
    main()