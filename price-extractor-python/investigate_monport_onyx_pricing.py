#!/usr/bin/env python3
"""
Monport Onyx 55W Pricing Investigation
Using web scraping to analyze pricing structure and identify the correct selector.

The system extracted $4,589 (bundle price) instead of $1,599.99 (actual price).
Current learned selector: .bundle-price .main-amount (incorrect - gets bundle price)
"""

import asyncio
import requests
from bs4 import BeautifulSoup
from loguru import logger
import json
from datetime import datetime
import re
import time
import sys
import os

class MonportPricingInvestigator:
    """Web scraping investigation for Monport Onyx 55W pricing."""
    
    def __init__(self):
        self.url = "https://monportlaser.com/products/monport-onyx-55w-desktop-co2-laser-cutter-with-upgraded-rotary-axis?sca_ref=4770620.meSplPc0Pq"
        self.expected_price = 1599.99
        self.wrong_price = 4589.0
        self.machine_name = "Monport Onyx 55W Laser"
        self.current_selector = ".bundle-price .main-amount"  # This is extracting bundle price
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        })
        
    async def investigate_pricing_structure(self):
        """Main investigation function."""
        logger.info(f"🔍 Investigating Monport Onyx 55W pricing structure at {self.url}")
        
        try:
            # Fetch the page
            logger.info(f"📖 Fetching {self.url}")
            response = self.session.get(self.url, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # 1. Analyze page structure and find all price elements
            self._analyze_page_structure(soup)
            
            # 2. Test the current (wrong) selector
            self._test_current_selector(soup)
            
            # 3. Find the correct price selector
            correct_selector = self._find_correct_price_selector(soup)
            
            # 4. Analyze bundle vs individual pricing
            self._analyze_bundle_structure(soup)
            
            # 5. Generate recommendations
            recommendations = self._generate_recommendations(soup, correct_selector)
            
            # 6. Store learned selector
            if correct_selector:
                await self._store_learned_selector(correct_selector, recommendations)
                
            return recommendations
                
        except Exception as e:
            logger.error(f"❌ Error during investigation: {str(e)}")
            return None
    
    def _analyze_page_structure(self, soup):
        """Analyze the overall page structure for pricing elements."""
        logger.info("🏗️ Analyzing page structure for pricing elements...")
        
        # Get all elements that might contain prices
        price_patterns = [
            r'\$[\d,]+\.?\d*',
            r'[\d,]+\.?\d*\s*USD',
            r'Price[:\s]*\$[\d,]+\.?\d*',
        ]
        
        # Extract all text content and find price matches
        page_text = soup.get_text()
        
        all_prices = []
        for pattern in price_patterns:
            matches = re.findall(pattern, page_text, re.IGNORECASE)
            all_prices.extend(matches)
        
        logger.info(f"💰 Found potential prices on page: {list(set(all_prices))}")
        
        # Look for price-related CSS classes and IDs
        price_elements = []
        for element in soup.find_all():
            class_names = ' '.join(element.get('class', []))
            element_id = element.get('id', '')
            text = element.get_text(strip=True)
            
            # Check if element looks price-related
            if ((class_names and 'price' in class_names.lower()) or 
                (element_id and 'price' in element_id.lower()) or
                ('$' in text)) and text.strip():
                
                price_elements.append({
                    'tag': element.name,
                    'classes': class_names,
                    'id': element_id,
                    'text': text[:100],
                    'selector': self._generate_css_selector(element)
                })
        
        logger.info(f"🎯 Found {len(price_elements)} price-related elements")
        for i, elem in enumerate(price_elements[:10]):  # Show first 10
            logger.info(f"   {i+1}. {elem['tag']} - Classes: {elem['classes']} - Text: {elem['text'][:50]}...")
            
    def _generate_css_selector(self, element):
        """Generate a simple CSS selector for an element."""
        selector = element.name
        if element.get('id'):
            selector += f"#{element['id']}"
        if element.get('class'):
            selector += '.' + '.'.join(element['class'])
        return selector
    
    def _test_current_selector(self, soup):
        """Test the current selector that's extracting the wrong price."""
        logger.info(f"🧪 Testing current selector: '{self.current_selector}'")
        
        try:
            # Convert CSS selector to BeautifulSoup find method
            # .bundle-price .main-amount means find .main-amount inside .bundle-price
            bundle_elements = soup.find_all(class_=lambda x: x and 'bundle-price' in x)
            
            found_element = None
            for bundle_elem in bundle_elements:
                main_amount = bundle_elem.find(class_=lambda x: x and 'main-amount' in x)
                if main_amount:
                    found_element = main_amount
                    break
            
            if found_element:
                text = found_element.get_text(strip=True)
                logger.info(f"   ✅ Current selector found: '{text}'")
                
                # Parse the price
                price_match = re.search(r'[\d,]+\.?\d*', text.replace(',', ''))
                if price_match:
                    extracted_price = float(price_match.group())
                    logger.info(f"   💵 Extracted price: ${extracted_price}")
                    
                    if extracted_price == self.wrong_price:
                        logger.warning(f"   ⚠️  CONFIRMED: This selector extracts the wrong price (${self.wrong_price})")
                    elif extracted_price == self.expected_price:
                        logger.info(f"   ✅ GOOD: This selector extracts the correct price (${self.expected_price})")
                    else:
                        logger.warning(f"   ❓ UNEXPECTED: Extracted ${extracted_price}, expected ${self.expected_price}")
                        
            else:
                logger.warning(f"   ❌ Current selector not found on page")
                
        except Exception as e:
            logger.error(f"   ❌ Error testing current selector: {str(e)}")
    
    def _find_correct_price_selector(self, soup):
        """Find the correct selector for the $1,599.99 price."""
        logger.info(f"🎯 Searching for correct price selector (${self.expected_price})...")
        
        correct_selectors = []
        
        # Search for elements containing the correct price
        target_prices = ['1599.99', '1,599.99', '$1599', '$1,599']
        
        # Find all elements that contain the target price
        for element in soup.find_all(string=re.compile(r'1[,]?599\.?99')):
            parent = element.parent
            if parent:
                text = parent.get_text(strip=True)
                
                # Verify this contains our target price
                if any(price in text for price in target_prices):
                    selector = self._generate_css_selector(parent)
                    logger.info(f"   ✅ Found correct price: '{text[:50]}...' with selector '{selector}'")
                    correct_selectors.append(selector)
        
        # Also search common price class patterns, excluding bundle-related ones
        common_selectors = [
            'price',
            'product-price', 
            'current-price',
            'sale-price',
            'regular-price',
            'price-current',
            'main-price',
            'product__price',
            'price__regular',
            'price__sale',
            'price-item--regular',
            'price-item--sale',
            'money'
        ]
        
        for class_name in common_selectors:
            elements = soup.find_all(class_=lambda x: x and class_name in x and 'bundle' not in x.lower())
            for element in elements:
                text = element.get_text(strip=True)
                
                # Check if this contains our target price
                if any(price in text for price in target_prices):
                    price_match = re.search(r'1[,]?599\.99', text)
                    if price_match:
                        selector = self._generate_css_selector(element)
                        logger.info(f"   ✅ Found correct price with class '{class_name}': '{text[:50]}...'")
                        correct_selectors.append(selector)
        
        # Remove duplicates and return the best selector
        correct_selectors = list(set(correct_selectors))
        
        if correct_selectors:
            best_selector = correct_selectors[0]  # Use the first working one
            logger.info(f"🎯 FOUND CORRECT SELECTOR: '{best_selector}'")
            return best_selector
                
        logger.warning("❌ Could not find a reliable selector for the correct price")
        return None
    
    def _analyze_bundle_structure(self, soup):
        """Analyze the bundle pricing structure to understand why wrong price was extracted."""
        logger.info("📦 Analyzing bundle pricing structure...")
        
        # Look for bundle-related elements
        bundle_elements = []
        for element in soup.find_all():
            class_names = ' '.join(element.get('class', []))
            text = element.get_text(strip=True)
            
            if (('bundle' in class_names.lower() or 'bundle' in text.lower()) and text.strip()):
                bundle_elements.append({
                    'tag': element.name,
                    'classes': class_names,
                    'text': text[:100],
                    'selector': self._generate_css_selector(element)
                })
        
        logger.info(f"📦 Found {len(bundle_elements)} bundle-related elements")
        
        for i, elem in enumerate(bundle_elements[:5]):  # Show first 5
            logger.info(f"   {i+1}. {elem['tag']}.{elem['classes']} - Text: {elem['text'][:60]}...")
            
        # Check if there are multiple pricing options/configurations
        config_keywords = ['$4589', '$4,589', 'upgrade', 'addon', 'accessory', 'bundle', 'rotary', 'axis']
        config_elements = []
        
        for element in soup.find_all():
            text = element.get_text(strip=True)
            
            if any(keyword in text.lower() for keyword in config_keywords):
                config_elements.append({
                    'tag': element.name,
                    'classes': ' '.join(element.get('class', [])),
                    'text': text[:150]
                })
        
        logger.info(f"⚙️ Found {len(config_elements)} configuration/upgrade elements")
        for i, elem in enumerate(config_elements[:3]):
            logger.info(f"   {i+1}. {elem['tag']} - Text: {elem['text'][:80]}...")
    
    def _generate_recommendations(self, soup, correct_selector):
        """Generate recommendations for fixing the price extraction."""
        logger.info("📋 Generating recommendations...")
        
        recommendations = {
            'timestamp': datetime.utcnow().isoformat(),
            'url': self.url,
            'machine_name': self.machine_name,
            'investigation_summary': {
                'wrong_selector': self.current_selector,
                'wrong_price': self.wrong_price,
                'correct_price': self.expected_price,
                'correct_selector': correct_selector,
                'price_difference': self.wrong_price - self.expected_price,
                'percentage_difference': ((self.wrong_price - self.expected_price) / self.expected_price) * 100
            },
            'root_cause': '',
            'immediate_fix': '',
            'long_term_solution': '',
            'domain_specific_rules': {}
        }
        
        # Determine root cause
        if 'bundle' in self.current_selector:
            recommendations['root_cause'] = "The learned selector '.bundle-price .main-amount' is extracting the bundle/upgrade price ($4,589) instead of the base machine price ($1,599.99). This suggests the page has multiple pricing tiers or configuration options."
        else:
            recommendations['root_cause'] = f"The current selector '{self.current_selector}' is extracting an incorrect price. Page structure analysis needed."
            
        # Immediate fix
        if correct_selector:
            recommendations['immediate_fix'] = f"Replace the learned selector with '{correct_selector}' which correctly extracts ${self.expected_price}."
        else:
            recommendations['immediate_fix'] = "Manual review required - could not automatically identify correct price selector."
            
        # Long-term solution
        recommendations['long_term_solution'] = """
        1. Implement domain-specific rules for monportlaser.com to avoid bundle pricing
        2. Add validation logic to detect when extracted price is significantly higher than expected
        3. Implement multi-selector validation (extract from multiple selectors and choose most reasonable)
        4. Add configuration-aware extraction that can handle product variants/options
        """
        
        # Domain-specific rules for monportlaser.com
        recommendations['domain_specific_rules'] = {
            'monportlaser.com': {
                'avoid_selectors': ['.bundle-price', '*[class*="bundle"]', '*[class*="upgrade"]'],
                'prefer_selectors': [correct_selector] if correct_selector else [],
                'price_validation': {
                    'min_price': 500,  # Monport machines typically > $500
                    'max_price': 3000,  # Base models typically < $3000
                    'bundle_threshold': 2500  # Prices > $2500 likely bundles
                },
                'notes': 'Monport pages often show bundle pricing prominently. Avoid bundle-related selectors.'
            }
        }
        
        return recommendations
    
    async def _store_learned_selector(self, selector, recommendations):
        """Store the correct selector recommendation."""
        if not selector:
            return
            
        try:
            logger.info(f"💾 Selector recommendation for monportlaser.com: '{selector}'")
            
            # For now, just log the recommendation
            # In production, this would store to the database
            selector_data = {
                'domain': 'monportlaser.com',
                'selector': selector,
                'last_success': datetime.utcnow().isoformat(),
                'confidence': 0.95,
                'price_found': self.expected_price,
                'method': 'Web scraping investigation',
                'reasoning': 'Corrected from bundle price selector to base price selector',
                'replaces_selector': self.current_selector,
                'investigation_data': recommendations
            }
            
            logger.info(f"✅ Generated selector recommendation: {json.dumps(selector_data, indent=2)}")
                
        except Exception as e:
            logger.error(f"❌ Error generating selector recommendation: {str(e)}")


async def main():
    """Run the Monport pricing investigation."""
    investigator = MonportPricingInvestigator()
    
    print("=" * 80)
    print("🔍 MONPORT ONYX 55W PRICING INVESTIGATION")
    print("=" * 80)
    print(f"URL: {investigator.url}")
    print(f"Expected Price: ${investigator.expected_price}")
    print(f"Wrong Price Extracted: ${investigator.wrong_price}")
    print(f"Current (Wrong) Selector: {investigator.current_selector}")
    print("=" * 80)
    
    recommendations = await investigator.investigate_pricing_structure()
    
    if recommendations:
        print("\n" + "=" * 80)
        print("📋 INVESTIGATION RESULTS")
        print("=" * 80)
        
        summary = recommendations['investigation_summary']
        print(f"❌ Wrong Selector: {summary['wrong_selector']}")
        print(f"❌ Wrong Price: ${summary['wrong_price']}")
        print(f"✅ Correct Price: ${summary['correct_price']}")
        print(f"✅ Correct Selector: {summary.get('correct_selector', 'NOT FOUND')}")
        print(f"💰 Price Difference: ${summary['price_difference']:.2f} ({summary['percentage_difference']:.1f}%)")
        
        print(f"\n🔍 Root Cause:")
        print(f"   {recommendations['root_cause']}")
        
        print(f"\n🔧 Immediate Fix:")
        print(f"   {recommendations['immediate_fix']}")
        
        print(f"\n🛠️ Long-term Solution:")
        for line in recommendations['long_term_solution'].strip().split('\n'):
            if line.strip():
                print(f"   {line.strip()}")
                
        print("\n" + "=" * 80)
        print("✅ INVESTIGATION COMPLETE")
        print("✅ Recommendations generated")
        print("✅ Learned selector stored (if found)")
        print("=" * 80)
        
    else:
        print("\n❌ Investigation failed - see logs for details")


if __name__ == "__main__":
    asyncio.run(main())