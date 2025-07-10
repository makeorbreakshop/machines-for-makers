#!/usr/bin/env python3
"""
Investigation script for specific machines mentioned in the user's screenshot.
Tests actual price extraction and compares with manual corrections.
"""

import asyncio
import json
import re
from datetime import datetime
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup
from loguru import logger

# Configure logging
logger.add("logs/machine_investigation.log", rotation="10 MB", level="INFO")

# Machines from the screenshot that needed manual correction
MACHINES_TO_INVESTIGATE = [
    {
        'name': 'xTool S1',
        'url': 'https://www.xtool.com/products/xtool-s1-laser-cutter',
        'manual_corrected_price': 1899.00,
        'expected_current_price': None  # Will check current price
    },
    {
        'name': 'ComMarker B6 MOPA 60W',
        'url': 'https://commarker.com/product/commarker-b6-jpt-mopa/',
        'manual_corrected_price': 4589.00,
        'expected_current_price': 3059.00  # From WebFetch
    },
    {
        'name': 'ComMarker B4 100W MOPA',
        'url': 'https://commarker.com/product/b4-100w-jpt-mopa',
        'manual_corrected_price': 6666.00,
        'expected_current_price': 6666.00  # From WebFetch
    },
    {
        'name': 'xTool F1',
        'url': 'https://www.xtool.com/products/xtool-f1',
        'manual_corrected_price': 1169.00,
        'expected_current_price': None  # Will check current price
    },
    {
        'name': 'ComMarker B6 30W',
        'url': 'https://commarker.com/product/commarker-b6',
        'manual_corrected_price': 2399.00,
        'expected_current_price': 1839.00  # From WebFetch (sale price)
    },
    {
        'name': 'xTool F2 Ultra',
        'url': 'https://www.xtool.com/products/xtool-f2-ultra-60w-mopa-40w-diode-dual-laser-engraver',
        'manual_corrected_price': 5999.99,
        'expected_current_price': None  # Will check current price
    }
]

class MachineInvestigator:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        
    def fetch_page(self, url, timeout=30):
        """Fetch page content with error handling."""
        try:
            logger.info(f"Fetching: {url}")
            response = self.session.get(url, timeout=timeout)
            response.raise_for_status()
            
            logger.info(f"✅ Successfully fetched {url} (Status: {response.status_code}, Size: {len(response.content)} bytes)")
            return response.text
        except requests.RequestException as e:
            logger.error(f"❌ Failed to fetch {url}: {str(e)}")
            return None
    
    def parse_price_text(self, text, domain=None):
        """Enhanced price parser with domain-specific logic."""
        if not text:
            return None
            
        try:
            # Remove currency symbols and extra whitespace
            text_clean = re.sub(r'[$€£¥]', '', str(text))
            text_clean = re.sub(r'\s+', '', text_clean)
            
            # Find numeric pattern
            matches = re.findall(r'\d+(?:[,.]?\d+)*', text_clean)
            if not matches:
                return None
                
            # Take the first match and clean it
            price_str = matches[0]
            
            # Handle thousand separators and decimal points
            if ',' in price_str and '.' in price_str:
                last_comma = price_str.rfind(',')
                last_dot = price_str.rfind('.')
                
                if last_comma > last_dot:
                    # Comma is decimal (European style): 1.234,56
                    price_str = price_str.replace('.', '').replace(',', '.')
                else:
                    # Dot is decimal (US style): 1,234.56
                    price_str = price_str.replace(',', '')
            elif ',' in price_str:
                # Only comma - check if it's decimal or thousands
                comma_parts = price_str.split(',')
                if len(comma_parts) == 2 and len(comma_parts[1]) <= 2:
                    # Likely decimal separator (e.g., "123,45")
                    price_str = price_str.replace(',', '.')
                else:
                    # Likely thousands separator (e.g., "1,234")
                    price_str = price_str.replace(',', '')
            
            price = float(price_str)
            if 1 <= price <= 100000:
                return price
                
        except (ValueError, AttributeError):
            pass
            
        return None
    
    def extract_prices_from_page(self, html, url):
        """Extract all potential prices from a page using various methods."""
        domain = urlparse(url).netloc.lower()
        if domain.startswith('www.'):
            domain = domain[4:]
            
        soup = BeautifulSoup(html, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.decompose()
            
        extracted_prices = []
        
        # Method 1: Common price selectors
        price_selectors = [
            # Generic selectors
            '.price', '.amount', '.product-price', '.current-price',
            '[data-price]', '.woocommerce-Price-amount',
            
            # xTool specific
            '.product-badge-price', '.footer-price-bold',
            '.product-page-info-price-container .footer-price-bold',
            '.price__regular .money', '.price__sale .money',
            
            # ComMarker specific (WooCommerce)
            '.entry-summary .price .amount',
            '.product-summary .price .amount',
            '.woocommerce-Price-amount.amount',
            '.summary-inner .price .amount'
        ]
        
        for selector in price_selectors:
            elements = soup.select(selector)
            for element in elements:
                # Skip if element seems to be in a bundle/addon context
                element_context = self.get_element_context(element)
                if any(avoid in element_context.lower() for avoid in 
                      ['bundle', 'package', 'addon', 'extra', 'accessory', 'related']):
                    continue
                    
                # Try to extract price from element
                price_text = element.get_text().strip()
                price = self.parse_price_text(price_text, domain)
                
                if price and 50 <= price <= 50000:  # Reasonable price range
                    extracted_prices.append({
                        'price': price,
                        'method': f'CSS selector: {selector}',
                        'text': price_text,
                        'context': element_context[:100]
                    })
        
        # Method 2: Regular expression scan
        price_patterns = [
            r'\$\s*(\d{1,2}[,.]?\d{3}(?:\.\d{2})?)',  # $1,234.56
            r'(\d{1,2}[,.]?\d{3}(?:\.\d{2})?)\s*dollars?',  # 1,234.56 dollars
            r'price[:\s]*\$?\s*(\d{1,2}[,.]?\d{3}(?:\.\d{2})?)',  # price: $1,234
        ]
        
        page_text = soup.get_text()
        for pattern in price_patterns:
            matches = re.finditer(pattern, page_text, re.IGNORECASE)
            for match in matches:
                price_str = match.group(1)
                price = self.parse_price_text(price_str, domain)
                if price and 50 <= price <= 50000:
                    extracted_prices.append({
                        'price': price,
                        'method': f'Regex: {pattern}',
                        'text': match.group(0),
                        'context': match.group(0)
                    })
        
        # Method 3: JSON-LD structured data
        json_scripts = soup.find_all('script', type='application/ld+json')
        for script in json_scripts:
            try:
                data = json.loads(script.string)
                prices = self.extract_prices_from_json_ld(data)
                for price in prices:
                    if 50 <= price <= 50000:
                        extracted_prices.append({
                            'price': price,
                            'method': 'JSON-LD structured data',
                            'text': str(price),
                            'context': 'JSON-LD'
                        })
            except (json.JSONDecodeError, AttributeError):
                continue
        
        # Remove duplicates and sort by price
        unique_prices = {}
        for item in extracted_prices:
            price_key = round(item['price'], 2)
            if price_key not in unique_prices:
                unique_prices[price_key] = item
        
        return sorted(unique_prices.values(), key=lambda x: x['price'])
    
    def extract_prices_from_json_ld(self, data):
        """Extract prices from JSON-LD structured data."""
        prices = []
        
        if isinstance(data, dict):
            # Look for offers
            if 'offers' in data:
                offers = data['offers']
                if isinstance(offers, list):
                    for offer in offers:
                        if isinstance(offer, dict) and 'price' in offer:
                            try:
                                price = float(offer['price'])
                                prices.append(price)
                            except (ValueError, TypeError):
                                pass
                elif isinstance(offers, dict) and 'price' in offers:
                    try:
                        price = float(offers['price'])
                        prices.append(price)
                    except (ValueError, TypeError):
                        pass
            
            # Look for direct price field
            if 'price' in data:
                try:
                    price = float(data['price'])
                    prices.append(price)
                except (ValueError, TypeError):
                    pass
                    
        elif isinstance(data, list):
            for item in data:
                prices.extend(self.extract_prices_from_json_ld(item))
        
        return prices
    
    def get_element_context(self, element):
        """Get contextual information about an element."""
        context_parts = []
        
        # Get element's own classes
        if element.get('class'):
            context_parts.extend(element.get('class'))
        
        # Get parent context
        current = element.parent
        depth = 0
        while current and depth < 3:
            if current.name and current.get('class'):
                context_parts.extend([f"parent-{cls}" for cls in current.get('class')])
            current = current.parent
            depth += 1
        
        return ' '.join(context_parts)
    
    def analyze_machine(self, machine_data):
        """Analyze a specific machine's price extraction."""
        logger.info(f"\n{'='*60}")
        logger.info(f"ANALYZING: {machine_data['name']}")
        logger.info(f"URL: {machine_data['url']}")
        logger.info(f"Manual corrected price: ${machine_data['manual_corrected_price']}")
        logger.info(f"Expected current price: ${machine_data['expected_current_price']}")
        logger.info(f"{'='*60}")
        
        # Fetch the page
        html = self.fetch_page(machine_data['url'])
        if not html:
            return {
                'machine': machine_data['name'],
                'status': 'failed',
                'error': 'Could not fetch page'
            }
        
        # Extract all prices
        extracted_prices = self.extract_prices_from_page(html, machine_data['url'])
        
        logger.info(f"🔍 Found {len(extracted_prices)} potential prices:")
        for i, price_data in enumerate(extracted_prices[:10]):  # Show top 10
            logger.info(f"  {i+1}. ${price_data['price']:.2f} - {price_data['method']}")
            logger.info(f"     Text: '{price_data['text']}'")
            logger.info(f"     Context: {price_data['context'][:50]}...")
        
        # Analysis
        analysis = {
            'machine': machine_data['name'],
            'url': machine_data['url'],
            'manual_corrected_price': machine_data['manual_corrected_price'],
            'expected_current_price': machine_data['expected_current_price'],
            'extracted_prices': extracted_prices,
            'analysis': {},
            'recommendations': []
        }
        
        # Check if manual corrected price is found
        manual_price_found = any(
            abs(p['price'] - machine_data['manual_corrected_price']) < 0.01
            for p in extracted_prices
        )
        
        if manual_price_found:
            analysis['analysis']['manual_price_status'] = '✅ Manual corrected price found on page'
        else:
            analysis['analysis']['manual_price_status'] = '❌ Manual corrected price NOT found on page'
        
        # Check if expected current price is found
        if machine_data['expected_current_price']:
            expected_price_found = any(
                abs(p['price'] - machine_data['expected_current_price']) < 0.01
                for p in extracted_prices
            )
            
            if expected_price_found:
                analysis['analysis']['expected_price_status'] = '✅ Expected current price found on page'
                # Find the best selector for this price
                for p in extracted_prices:
                    if abs(p['price'] - machine_data['expected_current_price']) < 0.01:
                        analysis['recommendations'].append({
                            'type': 'selector',
                            'price': p['price'],
                            'method': p['method'],
                            'confidence': 'high'
                        })
                        break
            else:
                analysis['analysis']['expected_price_status'] = '❌ Expected current price NOT found on page'
        
        # Identify most likely correct price
        if extracted_prices:
            # Prefer prices that match expected ranges for each brand
            domain = urlparse(machine_data['url']).netloc.lower()
            if 'xtool.com' in domain:
                # xTool price ranges
                reasonable_prices = [p for p in extracted_prices if 299 <= p['price'] <= 6000]
            elif 'commarker.com' in domain:
                # ComMarker price ranges
                reasonable_prices = [p for p in extracted_prices if 1000 <= p['price'] <= 8000]
            else:
                reasonable_prices = extracted_prices
            
            if reasonable_prices:
                # Take the highest reasonable price (often the main product price)
                likely_correct = max(reasonable_prices, key=lambda x: x['price'])
                analysis['analysis']['likely_correct_price'] = {
                    'price': likely_correct['price'],
                    'method': likely_correct['method'],
                    'reasoning': 'Highest price in reasonable range for brand'
                }
                
                analysis['recommendations'].append({
                    'type': 'primary_recommendation',
                    'price': likely_correct['price'],
                    'method': likely_correct['method'],
                    'confidence': 'medium'
                })
        
        return analysis

    def run_investigation(self):
        """Run the complete investigation."""
        logger.info("🔍 Starting Machine Price Investigation")
        logger.info(f"Investigating {len(MACHINES_TO_INVESTIGATE)} machines...")
        
        results = []
        
        for machine_data in MACHINES_TO_INVESTIGATE:
            try:
                result = self.analyze_machine(machine_data)
                results.append(result)
            except Exception as e:
                logger.error(f"❌ Error analyzing {machine_data['name']}: {str(e)}")
                results.append({
                    'machine': machine_data['name'],
                    'status': 'error',
                    'error': str(e)
                })
        
        # Generate summary report
        self.generate_summary_report(results)
        
        return results
    
    def generate_summary_report(self, results):
        """Generate a summary report of the investigation."""
        logger.info(f"\n{'='*80}")
        logger.info("INVESTIGATION SUMMARY REPORT")
        logger.info(f"{'='*80}")
        
        for result in results:
            if 'error' in result:
                logger.info(f"\n❌ {result['machine']}: {result['error']}")
                continue
                
            logger.info(f"\n🔍 {result['machine']}")
            logger.info(f"   Manual Corrected: ${result['manual_corrected_price']}")
            
            if result.get('expected_current_price'):
                logger.info(f"   Expected Current: ${result['expected_current_price']}")
            
            # Show analysis
            analysis = result.get('analysis', {})
            if 'manual_price_status' in analysis:
                logger.info(f"   {analysis['manual_price_status']}")
            if 'expected_price_status' in analysis:
                logger.info(f"   {analysis['expected_price_status']}")
            
            # Show likely correct price
            if 'likely_correct_price' in analysis:
                likely = analysis['likely_correct_price']
                logger.info(f"   💡 Likely correct: ${likely['price']} via {likely['method']}")
            
            # Show recommendations
            recommendations = result.get('recommendations', [])
            if recommendations:
                logger.info("   📋 Recommendations:")
                for rec in recommendations[:2]:  # Show top 2
                    logger.info(f"      • ${rec['price']} via {rec['method']} ({rec['confidence']} confidence)")
        
        logger.info(f"\n{'='*80}")
        logger.info("END INVESTIGATION SUMMARY")
        logger.info(f"{'='*80}")

def main():
    """Main function to run the investigation."""
    investigator = MachineInvestigator()
    results = investigator.run_investigation()
    
    # Save results to file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    results_file = f"machine_investigation_results_{timestamp}.json"
    
    with open(results_file, 'w') as f:
        json.dump(results, f, indent=2, default=str)
    
    logger.info(f"📁 Results saved to: {results_file}")
    
    return results

if __name__ == "__main__":
    main()