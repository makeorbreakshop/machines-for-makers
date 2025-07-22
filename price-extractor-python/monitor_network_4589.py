#!/usr/bin/env python3
"""
Monitor network requests and dynamic content updates to catch the $4,589 price.

This script will:
1. Navigate to ComMarker page
2. Set up network request monitoring
3. Monitor for AJAX/fetch requests when selecting variants
4. Look for JSON responses containing "4589"
5. Check if price is loaded dynamically via JavaScript
6. Monitor DOM mutations during variant selection
"""

import asyncio
import sys
import os
import json
import re
from datetime import datetime
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from loguru import logger
from scrapers.dynamic_scraper import DynamicScraper
from bs4 import BeautifulSoup

# Configure logging
logger.remove()
logger.add(sys.stdout, level="INFO", format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | {message}")

class NetworkPriceMonitor:
    def __init__(self):
        self.network_requests = []
        self.ajax_responses = []
        self.price_found_in_network = []
        self.dom_mutations = []
        self.target_price = "4589"
        
    async def monitor_commarker_network(self):
        """Monitor network requests and dynamic updates for $4,589 price"""
        
        url = "https://commarker.com/product/commarker-b6-jpt-mopa/"
        machine_name = "ComMarker B6 MOPA 60W"
        
        logger.info(f"=== NETWORK MONITORING FOR $4,589 PRICE ===")
        logger.info(f"URL: {url}")
        logger.info(f"Target: {machine_name}")
        
        try:
            async with DynamicScraper() as scraper:
                # Set up network request monitoring
                await self._setup_network_monitoring(scraper.page)
                
                # Navigate to page
                logger.info("📡 Navigating to product page...")
                await scraper.page.goto(url, wait_until="networkidle", timeout=30000)
                await scraper.page.wait_for_timeout(2000)
                
                # Capture initial state
                logger.info("📸 Capturing initial page state...")
                initial_content = await scraper.page.content()
                await self._search_for_price_in_content(initial_content, "INITIAL_PAGE")
                
                # Monitor for DOM mutations
                await self._setup_dom_mutation_observer(scraper.page)
                
                # Get initial JSON-LD data
                await self._capture_structured_data(scraper.page, "INITIAL")
                
                # Select B6 MOPA 60W variant and monitor changes
                logger.info("🎯 Selecting B6 MOPA 60W variant...")
                logger.info("   🔍 Monitoring network requests during selection...")
                
                # Clear previous network data
                self.network_requests.clear()
                self.ajax_responses.clear()
                
                # Perform variant selection while monitoring
                await scraper._select_commarker_variant(machine_name)
                
                # Wait for any additional requests to complete
                await scraper.page.wait_for_timeout(5000)
                
                # Capture state after variant selection
                logger.info("📸 Capturing post-selection state...")
                post_content = await scraper.page.content()
                await self._search_for_price_in_content(post_content, "POST_SELECTION")
                
                # Check for dynamic price updates in form fields
                await self._check_form_fields(scraper.page)
                
                # Check for prices in data attributes
                await self._check_data_attributes(scraper.page)
                
                # Try bundle selection to see if it triggers more requests
                logger.info("📦 Attempting bundle selection...")
                await self._try_bundle_selection(scraper.page)
                
                # Final network request analysis
                await self._analyze_network_requests()
                
                # Get final JSON-LD data
                await self._capture_structured_data(scraper.page, "FINAL")
                
                # Try to trigger any remaining AJAX calls
                await self._trigger_additional_requests(scraper.page)
                
                # Summary report
                await self._generate_summary_report()
                
        except Exception as e:
            logger.error(f"❌ Error during monitoring: {str(e)}")
            import traceback
            traceback.print_exc()
    
    async def _setup_network_monitoring(self, page):
        """Set up comprehensive network request monitoring"""
        
        async def handle_request(request):
            """Monitor all outgoing requests"""
            request_data = {
                'url': request.url,
                'method': request.method,
                'headers': dict(request.headers),
                'post_data': request.post_data,
                'timestamp': datetime.now().isoformat(),
                'resource_type': request.resource_type
            }
            self.network_requests.append(request_data)
            
            # Log interesting requests
            if any(keyword in request.url.lower() for keyword in ['ajax', 'api', 'product', 'price', 'bundle', 'variant']):
                logger.info(f"🌐 Request: {request.method} {request.url}")
                if request.post_data:
                    logger.info(f"   📤 POST Data: {request.post_data}")
        
        async def handle_response(response):
            """Monitor all responses, especially AJAX/JSON"""
            try:
                if response.status == 200:
                    content_type = response.headers.get('content-type', '').lower()
                    
                    # Check for JSON responses
                    if 'json' in content_type or response.url.endswith('.json'):
                        try:
                            json_data = await response.json()
                            json_str = json.dumps(json_data, indent=2)
                            
                            response_data = {
                                'url': response.url,
                                'status': response.status,
                                'headers': dict(response.headers),
                                'json_data': json_data,
                                'timestamp': datetime.now().isoformat()
                            }
                            self.ajax_responses.append(response_data)
                            
                            # Check if this JSON contains our target price
                            if self.target_price in json_str:
                                logger.info(f"💰 PRICE FOUND IN JSON RESPONSE!")
                                logger.info(f"   URL: {response.url}")
                                logger.info(f"   JSON: {json_str[:500]}...")
                                self.price_found_in_network.append(response_data)
                        except:
                            # Not valid JSON
                            pass
                    
                    # Check text responses
                    elif 'text' in content_type or 'html' in content_type:
                        try:
                            text_data = await response.text()
                            if self.target_price in text_data:
                                logger.info(f"💰 PRICE FOUND IN TEXT RESPONSE!")
                                logger.info(f"   URL: {response.url}")
                                logger.info(f"   Content preview: {text_data[:500]}...")
                                
                                response_data = {
                                    'url': response.url,
                                    'status': response.status,
                                    'headers': dict(response.headers),
                                    'text_data': text_data[:1000],  # First 1000 chars
                                    'timestamp': datetime.now().isoformat()
                                }
                                self.price_found_in_network.append(response_data)
                        except:
                            pass
            except Exception as e:
                logger.debug(f"Error processing response: {e}")
        
        # Set up event listeners
        page.on('request', handle_request)
        page.on('response', handle_response)
        
        logger.info("🔍 Network monitoring enabled")
    
    async def _setup_dom_mutation_observer(self, page):
        """Set up DOM mutation observer to catch dynamic price updates"""
        
        observer_script = f"""
        // Set up MutationObserver to watch for DOM changes
        window.priceChanges = [];
        
        const observer = new MutationObserver(function(mutations) {{
            mutations.forEach(function(mutation) {{
                if (mutation.type === 'childList') {{
                    mutation.addedNodes.forEach(function(node) {{
                        if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.ELEMENT_NODE) {{
                            const text = node.textContent || node.innerText || '';
                            if (text.includes('{self.target_price}')) {{
                                window.priceChanges.push({{
                                    type: 'added',
                                    text: text,
                                    nodeName: node.nodeName,
                                    className: node.className || '',
                                    timestamp: new Date().toISOString(),
                                    outerHTML: node.outerHTML || node.textContent
                                }});
                                console.log('Price found in added node:', text);
                            }}
                        }}
                    }});
                }} else if (mutation.type === 'attributes') {{
                    const text = mutation.target.textContent || mutation.target.innerText || '';
                    if (text.includes('{self.target_price}')) {{
                        window.priceChanges.push({{
                            type: 'attribute_changed',
                            attribute: mutation.attributeName,
                            text: text,
                            nodeName: mutation.target.nodeName,
                            className: mutation.target.className || '',
                            timestamp: new Date().toISOString(),
                            outerHTML: mutation.target.outerHTML
                        }});
                        console.log('Price found in attribute change:', text);
                    }}
                }}
            }});
        }});
        
        // Start observing
        observer.observe(document.body, {{
            childList: true,
            subtree: true,
            attributes: true,
            attributeOldValue: true,
            characterData: true,
            characterDataOldValue: true
        }});
        
        console.log('DOM mutation observer started');
        """
        
        await page.evaluate(observer_script)
        logger.info("👁️ DOM mutation observer enabled")
    
    async def _search_for_price_in_content(self, content, stage):
        """Search for the target price in page content"""
        
        soup = BeautifulSoup(content, 'html.parser')
        
        # Search for price patterns
        price_patterns = [
            r'\$4,?589',
            r'4,?589\.?0*',
            r'4589'
        ]
        
        found_count = 0
        for pattern in price_patterns:
            matches = soup.find_all(string=re.compile(pattern, re.IGNORECASE))
            if matches:
                found_count += len(matches)
                logger.info(f"💰 [{stage}] Found {len(matches)} instances of pattern '{pattern}'")
                
                for i, match in enumerate(matches[:3]):  # Show first 3
                    parent = match.parent
                    if parent:
                        logger.info(f"   Match {i+1}: '{match.strip()}' in <{parent.name}> {parent.get('class', [])}")
        
        if found_count == 0:
            logger.warning(f"🔍 [{stage}] No instances of ${self.target_price} found in page content")
    
    async def _capture_structured_data(self, page, stage):
        """Capture JSON-LD and other structured data"""
        
        try:
            # Get JSON-LD data
            json_ld_elements = await page.query_selector_all('script[type="application/ld+json"]')
            
            for i, element in enumerate(json_ld_elements):
                try:
                    json_content = await element.inner_text()
                    json_data = json.loads(json_content)
                    json_str = json.dumps(json_data, indent=2)
                    
                    if self.target_price in json_str:
                        logger.info(f"💰 [{stage}] PRICE FOUND IN JSON-LD {i+1}!")
                        logger.info(f"   JSON-LD: {json_str[:500]}...")
                    else:
                        logger.debug(f"[{stage}] JSON-LD {i+1} checked - no target price")
                        
                except json.JSONDecodeError:
                    logger.debug(f"[{stage}] Invalid JSON in script tag {i+1}")
                except Exception as e:
                    logger.debug(f"[{stage}] Error reading JSON-LD {i+1}: {e}")
                    
        except Exception as e:
            logger.debug(f"Error capturing structured data: {e}")
    
    async def _check_form_fields(self, page):
        """Check hidden form fields and input values for prices"""
        
        logger.info("🔍 Checking form fields for hidden prices...")
        
        # Check all input fields
        inputs = await page.query_selector_all('input')
        for i, input_elem in enumerate(inputs):
            try:
                value = await input_elem.get_attribute('value')
                name = await input_elem.get_attribute('name')
                input_type = await input_elem.get_attribute('type')
                
                if value and self.target_price in str(value):
                    logger.info(f"💰 PRICE FOUND IN INPUT FIELD!")
                    logger.info(f"   Name: {name}")
                    logger.info(f"   Type: {input_type}")
                    logger.info(f"   Value: {value}")
            except:
                pass
        
        # Check select options
        selects = await page.query_selector_all('select option')
        for i, option in enumerate(selects):
            try:
                value = await option.get_attribute('value')
                text = await option.inner_text()
                
                if (value and self.target_price in str(value)) or (text and self.target_price in text):
                    logger.info(f"💰 PRICE FOUND IN SELECT OPTION!")
                    logger.info(f"   Value: {value}")
                    logger.info(f"   Text: {text}")
            except:
                pass
    
    async def _check_data_attributes(self, page):
        """Check data attributes for prices"""
        
        logger.info("🔍 Checking data attributes...")
        
        # Common data attributes that might contain prices
        data_attrs = [
            'data-price',
            'data-cost',
            'data-amount',
            'data-value',
            'data-product-price',
            'data-bundle-price'
        ]
        
        for attr in data_attrs:
            elements = await page.query_selector_all(f'[{attr}]')
            for element in elements:
                try:
                    attr_value = await element.get_attribute(attr)
                    if attr_value and self.target_price in str(attr_value):
                        logger.info(f"💰 PRICE FOUND IN {attr}!")
                        logger.info(f"   Value: {attr_value}")
                        
                        tag_name = await element.evaluate('el => el.tagName')
                        class_name = await element.get_attribute('class')
                        logger.info(f"   Element: <{tag_name}> class='{class_name}'")
                except:
                    pass
    
    async def _try_bundle_selection(self, page):
        """Try to select bundle options to trigger price updates"""
        
        logger.info("📦 Attempting bundle selection...")
        
        # Look for bundle-related elements
        bundle_selectors = [
            'input[value*="bundle"]',
            'input[value*="basic"]',
            'input[value*="package"]',
            'select option[value*="bundle"]',
            'select option[value*="basic"]',
            '.bundle-option',
            '.package-option',
            '[class*="bundle"]',
            '[class*="package"]'
        ]
        
        for selector in bundle_selectors:
            try:
                elements = await page.query_selector_all(selector)
                if elements:
                    logger.info(f"Found {len(elements)} elements with selector: {selector}")
                    
                    for element in elements[:2]:  # Try first 2
                        try:
                            # Get element info
                            tag_name = await element.evaluate('el => el.tagName')
                            text = await element.inner_text()
                            value = await element.get_attribute('value')
                            
                            logger.info(f"   Trying to interact with: <{tag_name}> text='{text}' value='{value}'")
                            
                            # Try clicking/selecting
                            if tag_name.lower() == 'input':
                                input_type = await element.get_attribute('type')
                                if input_type in ['radio', 'checkbox']:
                                    await element.click()
                                    await page.wait_for_timeout(2000)
                                    logger.info(f"   ✅ Clicked {input_type} input")
                            elif tag_name.lower() == 'option':
                                await element.click()
                                await page.wait_for_timeout(2000)
                                logger.info(f"   ✅ Selected option")
                            else:
                                await element.click()
                                await page.wait_for_timeout(2000)
                                logger.info(f"   ✅ Clicked element")
                                
                        except Exception as e:
                            logger.debug(f"   Could not interact with element: {e}")
                            
            except Exception as e:
                logger.debug(f"Error with selector {selector}: {e}")
    
    async def _trigger_additional_requests(self, page):
        """Try to trigger any additional AJAX requests that might load prices"""
        
        logger.info("🔄 Triggering additional requests...")
        
        # Try common actions that might trigger price updates
        actions = [
            # Scroll to trigger lazy loading
            lambda: page.evaluate('window.scrollTo(0, document.body.scrollHeight)'),
            lambda: page.wait_for_timeout(1000),
            lambda: page.evaluate('window.scrollTo(0, 0)'),
            
            # Try triggering events on price-related elements
            lambda: page.evaluate('''
                document.querySelectorAll('[class*="price"], [class*="bundle"], [class*="package"]').forEach(el => {
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                    el.dispatchEvent(new Event('click', { bubbles: true }));
                });
            '''),
            
            # Try form submission simulation
            lambda: page.evaluate('''
                document.querySelectorAll('form').forEach(form => {
                    const event = new Event('submit', { bubbles: true, cancelable: true });
                    form.dispatchEvent(event);
                });
            '''),
        ]
        
        for i, action in enumerate(actions):
            try:
                await action()
                await page.wait_for_timeout(1000)
                logger.debug(f"Executed action {i+1}")
            except Exception as e:
                logger.debug(f"Action {i+1} failed: {e}")
    
    async def _analyze_network_requests(self):
        """Analyze all captured network requests"""
        
        logger.info(f"\n📊 NETWORK ANALYSIS SUMMARY:")
        logger.info(f"   Total requests captured: {len(self.network_requests)}")
        logger.info(f"   AJAX/JSON responses: {len(self.ajax_responses)}")
        logger.info(f"   Responses containing price: {len(self.price_found_in_network)}")
        
        # Show interesting requests
        ajax_requests = [req for req in self.network_requests 
                        if any(keyword in req['url'].lower() 
                              for keyword in ['ajax', 'api', 'product', 'price', 'bundle', 'variant', 'json'])]
        
        if ajax_requests:
            logger.info(f"\n🌐 AJAX/API REQUESTS ({len(ajax_requests)}):")
            for req in ajax_requests:
                logger.info(f"   {req['method']} {req['url']}")
                if req['post_data']:
                    logger.info(f"      POST: {req['post_data'][:100]}...")
        
        # Show responses with prices
        if self.price_found_in_network:
            logger.info(f"\n💰 NETWORK RESPONSES CONTAINING ${self.target_price}:")
            for resp in self.price_found_in_network:
                logger.info(f"   URL: {resp['url']}")
                logger.info(f"   Status: {resp['status']}")
                if 'json_data' in resp:
                    logger.info(f"   Type: JSON Response")
                    logger.info(f"   Data: {json.dumps(resp['json_data'], indent=2)[:300]}...")
                elif 'text_data' in resp:
                    logger.info(f"   Type: Text Response")
                    logger.info(f"   Data: {resp['text_data'][:300]}...")
    
    async def _generate_summary_report(self):
        """Generate final summary report"""
        
        logger.info(f"\n📋 FINAL MONITORING REPORT:")
        logger.info(f"=" * 50)
        
        # Check DOM mutations
        try:
            # This would need to be called from the browser context
            # For now, we'll just note that we set up the observer
            logger.info(f"🔍 DOM Mutation Observer: Active (check browser console for mutations)")
        except:
            pass
        
        # Network summary
        logger.info(f"🌐 Network Monitoring Results:")
        logger.info(f"   • Total requests: {len(self.network_requests)}")
        logger.info(f"   • AJAX responses: {len(self.ajax_responses)}")
        logger.info(f"   • Price found in network: {len(self.price_found_in_network)}")
        
        if self.price_found_in_network:
            logger.info(f"\n✅ SUCCESS: Price ${self.target_price} found in network traffic!")
            for resp in self.price_found_in_network:
                logger.info(f"   📍 Source: {resp['url']}")
        else:
            logger.warning(f"\n❌ Price ${self.target_price} NOT found in network traffic")
            logger.info(f"   This suggests the price might be:")
            logger.info(f"   • Hard-coded in the initial HTML")
            logger.info(f"   • Loaded via a different mechanism")
            logger.info(f"   • Hidden in obfuscated JavaScript")
            logger.info(f"   • Not actually present on the page")
        
        # Recommendations
        logger.info(f"\n💡 RECOMMENDATIONS:")
        logger.info(f"   1. Check browser developer tools Network tab manually")
        logger.info(f"   2. Look for WebSocket connections")
        logger.info(f"   3. Check for price in localStorage/sessionStorage")
        logger.info(f"   4. Verify the exact bundle selection process")
        logger.info(f"   5. Check if price appears after longer delays")

async def main():
    """Main execution function"""
    monitor = NetworkPriceMonitor()
    await monitor.monitor_commarker_network()

if __name__ == "__main__":
    asyncio.run(main())