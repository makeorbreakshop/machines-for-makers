"""
Dynamic web scraper with JavaScript automation for variant selection.
Integrates Playwright automation into the price extraction workflow.
"""

import asyncio
import json
import re
from urllib.parse import urlparse
from loguru import logger
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup


class DynamicScraper:
    """Enhanced scraper with JavaScript automation for complex product pages."""
    
    def __init__(self):
        self.playwright = None
        self.browser = None
        self.page = None
        
    async def __aenter__(self):
        """Async context manager entry."""
        await self.start_browser()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close_browser()
        
    async def start_browser(self):
        """Start Playwright browser."""
        try:
            self.playwright = await async_playwright().start()
            
            # Try to use any installed Chromium browser
            try:
                self.browser = await self.playwright.chromium.launch(
                    headless=True,
                    args=[
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-gpu',
                        '--no-first-run',
                        '--no-default-browser-check',
                        '--disable-default-apps'
                    ]
                )
            except Exception as e:
                logger.warning(f"Chromium launch failed, trying Firefox: {str(e)}")
                # Fall back to Firefox if Chromium isn't available
                self.browser = await self.playwright.firefox.launch(
                    headless=True,
                    args=['--no-sandbox']
                )
            self.page = await self.browser.new_page()
            
            # Set a realistic user agent
            await self.page.set_extra_http_headers({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            })
            
            logger.info("Playwright browser started successfully")
            
        except Exception as e:
            logger.error(f"Failed to start Playwright browser: {str(e)}")
            raise
            
    async def close_browser(self):
        """Close Playwright browser."""
        try:
            if self.page:
                await self.page.close()
            if self.browser:
                await self.browser.close()
            if self.playwright:
                await self.playwright.stop()
            logger.info("Playwright browser closed")
        except Exception as e:
            logger.error(f"Error closing Playwright browser: {str(e)}")
    
    async def extract_price_with_variants(self, url, machine_name, variant_rules, machine_data=None):
        """
        Extract price from a page that requires variant selection.
        
        Args:
            url: Product page URL
            machine_name: Name of the machine to find correct variant
            variant_rules: Site-specific rules for variant selection
            machine_data: Full machine data including old_price for validation
            
        Returns:
            tuple: (price, method) or (None, None)
        """
        try:
            logger.info(f"Starting dynamic extraction for {machine_name} at {url}")
            
            # Navigate to the page
            logger.info(f"Navigating to {url}")
            await self.page.goto(url, wait_until='domcontentloaded', timeout=30000)
            
            # Wait for page to fully load
            await self.page.wait_for_timeout(2000)
            
            # Remove popups and overlays
            await self._remove_popups()
            
            # Scroll down to find variant selection section
            await self.page.evaluate('window.scrollTo(0, 800)')
            await self.page.wait_for_timeout(1000)
            
            # Apply variant selection based on machine name and site
            domain = urlparse(url).netloc.lower()
            if domain.startswith('www.'):
                domain = domain[4:]
                
            logger.info(f"Applying variant selection for domain: {domain}")
            
            if 'commarker.com' in domain:
                await self._select_commarker_variant(machine_name)
            elif 'cloudraylaser.com' in domain:
                await self._select_cloudray_variant(machine_name)
            elif 'aeonlaser.us' in domain or 'aeonlaser.com' in domain:
                await self._navigate_aeon_configurator(machine_name)
            else:
                logger.warning(f"No variant selection rules for domain: {domain}")
            
            # Wait for price updates after variant selection
            await self.page.wait_for_timeout(1000)
            
            # Extract updated price
            price, method = await self._extract_price_from_page(machine_data, machine_name)
            
            if price:
                logger.info(f"Successfully extracted price ${price} using method: {method}")
                return price, f"Dynamic extraction ({method})"
            else:
                logger.warning("Failed to extract price after variant selection")
                return None, None
                
        except Exception as e:
            logger.error(f"Error in dynamic price extraction: {str(e)}")
            return None, None
    
    async def _remove_popups(self):
        """Remove common popups and overlays."""
        # Use JavaScript to aggressively remove overlays
        try:
            await self.page.evaluate('''() => {
                // Hide high z-index elements (overlays)
                const highZElements = Array.from(document.querySelectorAll('*')).filter(el => {
                    const style = window.getComputedStyle(el);
                    return parseInt(style.zIndex) > 100;
                });
                highZElements.forEach(el => el.style.display = 'none');
                
                // Hide common overlay selectors
                const overlaySelectors = [
                    '[class*="overlay"]', '[class*="modal"]', '[class*="popup"]',
                    '[id*="popup"]', '[role="dialog"]', '.fancybox-overlay'
                ];
                overlaySelectors.forEach(selector => {
                    document.querySelectorAll(selector).forEach(el => el.style.display = 'none');
                });
            }''')
            
            # Try to click close buttons
            close_selectors = [
                '[class*="close"]',
                '[aria-label*="close"]', 
                '[aria-label*="Close"]',
                'text=Close',
                'text=×'
            ]
            
            for selector in close_selectors:
                try:
                    element = await self.page.query_selector(selector)
                    if element:
                        await element.click(timeout=1000)
                        break
                except:
                    continue
                    
        except Exception as e:
            logger.debug(f"Popup removal error: {str(e)}")
        
        logger.debug("Popup removal completed")
    
    async def _select_commarker_variant(self, machine_name):
        """Select the correct variant for ComMarker machines."""
        try:
            logger.info(f"Selecting ComMarker variant for: {machine_name}")
            
            # Parse machine name for model, power and type
            model_match = re.search(r'(B\d+)', machine_name, re.IGNORECASE)
            model = model_match.group(1) if model_match else None
            
            power_match = re.search(r'(\d+)W', machine_name, re.IGNORECASE)
            power = power_match.group(1) if power_match else None
            
            is_mopa = 'MOPA' in machine_name.upper()
            
            logger.info(f"Detected model: {model}, power: {power}W, MOPA: {is_mopa}")
            
            # First try to select power/wattage using improved selectors
            if power:
                # Enhanced power selectors based on ComMarker's current structure
                power_selectors = []
                
                # Priority 1: Exact model + power combinations
                if model:
                    power_selectors.extend([
                        f'button:has-text("{model} {power}W")',  # e.g., "B6 30W"
                        f'label:has-text("{model} {power}W")',   # Label elements
                        f'span:has-text("{model} {power}W")',    # Span elements
                        f'div:has-text("{model} {power}W")',     # Div elements
                    ])
                
                # Priority 2: Power-only selectors with stricter matching
                power_selectors.extend([
                    f'button:has-text("{power}W"):not(:has-text("Bundle")):not(:has-text("Combo"))',  # Avoid bundles
                    f'label:has-text("{power}W"):not(:has-text("Bundle")):not(:has-text("Combo"))',
                    f'input[value="{power}W"]',                    # Exact value match
                    f'input[value="{power}"]',                     # Numeric value match
                    f'option[value*="{power}W"]',                  # Select options
                    f'[data-value="{power}W"]',                    # Data attribute exact
                    f'[data-value="{power}"]',                     # Data attribute numeric
                ])
                
                # Priority 3: More flexible text matching
                power_selectors.extend([
                    f'text={power}W',                              # Playwright text selector
                    f'text="{power}W"',                            # Quoted text selector
                ])
                
                selected_power = False
                for selector in power_selectors:
                    try:
                        # Try to find elements matching the selector
                        elements = await self.page.query_selector_all(selector)
                        
                        for element in elements:
                            # Verify this element actually contains our target power
                            element_text = await element.text_content()
                            if element_text and f"{power}W" in element_text:
                                # Double-check this isn't a bundle/combo option
                                if not any(word in element_text.lower() for word in ['bundle', 'combo', 'package', 'kit']):
                                    logger.info(f"Found power element: '{element_text.strip()}' with selector: {selector}")
                                    
                                    # Try to click the element
                                    await element.click(timeout=5000)
                                    logger.info(f"Successfully selected power option: {power}W")
                                    await self.page.wait_for_timeout(1500)  # Wait for price update
                                    selected_power = True
                                    break
                        
                        if selected_power:
                            break
                            
                    except Exception as e:
                        logger.debug(f"Power selector {selector} failed: {str(e)}")
                        continue
                
                if not selected_power:
                    logger.warning(f"Failed to find any power selector for {power}W on ComMarker page")
                    # Enhanced debugging - look for all interactive elements
                    
                    # Check buttons
                    buttons = await self.page.query_selector_all('button')
                    logger.info(f"Available buttons on page: {len(buttons)}")
                    for i, button in enumerate(buttons[:15]):  # Check more buttons
                        try:
                            text = await button.text_content()
                            if text and text.strip():
                                logger.info(f"Button {i}: '{text.strip()}'")
                        except:
                            pass
                    
                    # Check inputs
                    inputs = await self.page.query_selector_all('input')
                    logger.info(f"Available inputs on page: {len(inputs)}")
                    for i, input_elem in enumerate(inputs[:10]):
                        try:
                            value = await input_elem.get_attribute('value')
                            input_type = await input_elem.get_attribute('type')
                            name = await input_elem.get_attribute('name')
                            if value or input_type:
                                logger.info(f"Input {i}: type='{input_type}', name='{name}', value='{value}'")
                        except:
                            pass
                    
                    # Check for any text containing power values
                    power_texts = await self.page.query_selector_all('*:has-text("30W"), *:has-text("20W"), *:has-text("60W")')
                    logger.info(f"Elements with power text: {len(power_texts)}")
                    for i, elem in enumerate(power_texts[:5]):
                        try:
                            text = await elem.text_content()
                            tag = await elem.evaluate('el => el.tagName')
                            logger.info(f"Power element {i}: <{tag}> '{text.strip()}'")
                        except:
                            pass
            
            # Then try to select MOPA if applicable
            if is_mopa:
                mopa_selectors = [
                    '[value*="MOPA"]',
                    '[data-value*="MOPA"]',
                    'option[value*="MOPA"]',
                    'option:contains("MOPA")',
                    '.variation-option:contains("MOPA")'
                ]
                
                for selector in mopa_selectors:
                    try:
                        element = await self.page.query_selector(selector)
                        if element:
                            await element.click()
                            logger.info("Selected MOPA option")
                            await self.page.wait_for_timeout(500)
                            break
                    except Exception as e:
                        logger.debug(f"MOPA selector {selector} failed: {str(e)}")
                        continue
            
            # AVOID bundle selection for ComMarker - extract base machine price only
            # Analysis shows bundle selection leads to wrong prices:
            # - B6 MOPA 30W: $3,599 (bundle) vs $3,569 (base machine)
            # - B6 MOPA 60W: $4,799 (bundle) vs $4,589 (base machine)
            # - Omni 1 UV: $3,224 (bundle) vs $3,888 (base machine)
            logger.info("Skipping bundle selection for ComMarker to get base machine price")
            
            # Instead, wait for the page to settle after power selection
            # This allows us to extract the base machine price without bundle contamination
            
            # Wait for any AJAX updates
            await self.page.wait_for_timeout(1000)
            
        except Exception as e:
            logger.error(f"Error selecting ComMarker variant: {str(e)}")
    
    async def _select_cloudray_variant(self, machine_name):
        """Select the correct variant for Cloudray machines."""
        try:
            logger.info(f"Selecting Cloudray variant for: {machine_name}")
            
            # Parse machine name for model
            model_match = re.search(r'(GM-\d+|OS-\d+)', machine_name, re.IGNORECASE)
            model = model_match.group(1) if model_match else None
            
            logger.info(f"Detected model: {model}")
            
            if model:
                model_selectors = [
                    f'[value*="{model}"]',
                    f'[data-value*="{model}"]',
                    f'option[value*="{model}"]',
                    f'option:contains("{model}")',
                    f'.variation-option:contains("{model}")'
                ]
                
                for selector in model_selectors:
                    try:
                        element = await self.page.query_selector(selector)
                        if element:
                            await element.click()
                            logger.info(f"Selected model option: {model}")
                            await self.page.wait_for_timeout(500)
                            break
                    except Exception as e:
                        logger.debug(f"Model selector {selector} failed: {str(e)}")
                        continue
            
            # Wait for any AJAX updates
            await self.page.wait_for_timeout(1000)
            
        except Exception as e:
            logger.error(f"Error selecting Cloudray variant: {str(e)}")
    
    async def _navigate_aeon_configurator(self, machine_name):
        """Navigate Aeon's multi-step configurator to get accurate pricing."""
        try:
            logger.info(f"🔧 Starting Aeon configurator navigation for: {machine_name}")
            
            # Parse machine name for model details
            model_match = re.search(r'(MIRA\s*\d+\s*[A-Z]*)', machine_name, re.IGNORECASE)
            model = model_match.group(1).strip() if model_match else None
            
            logger.info(f"Detected Aeon model: {model}")
            
            # Step 1: Wait for configurator to load
            await self.page.wait_for_timeout(3000)
            
            # Step 2: Look for model selection (e.g., "Mira S" vs other models)
            if model:
                # Try to find and click the specific model
                model_selectors = [
                    f'text={model}',
                    f'button:has-text("{model}")',
                    f'li:has-text("{model}")',
                    f'[data-model*="{model}"]',
                    f'[value*="{model}"]'
                ]
                
                model_selected = False
                for selector in model_selectors:
                    try:
                        element = await self.page.query_selector(selector)
                        if element:
                            await element.click()
                            logger.info(f"✅ Selected model: {model}")
                            await self.page.wait_for_timeout(2000)
                            model_selected = True
                            break
                    except Exception as e:
                        logger.debug(f"Model selector {selector} failed: {str(e)}")
                        continue
                
                if not model_selected:
                    # Look for more generic patterns
                    logger.warning(f"Specific model not found, looking for options containing: {model}")
                    all_clickable = await self.page.query_selector_all('button, li.js-option, .option')
                    for element in all_clickable:
                        try:
                            text = await element.text_content()
                            if text and model.lower() in text.lower():
                                await element.click()
                                logger.info(f"✅ Selected model option: {text.strip()}")
                                await self.page.wait_for_timeout(2000)
                                model_selected = True
                                break
                        except:
                            continue
            
            # Step 3: Navigate through configurator steps
            # Aeon typically has multiple steps, look for "Next" or step progression
            configurator_steps = [
                'Next',
                'Continue',
                'Proceed',
                'Step 2',
                'Step 3'
            ]
            
            for step_text in configurator_steps:
                try:
                    # Look for next button
                    next_button = await self.page.query_selector(f'button:has-text("{step_text}"), input[value*="{step_text}"], .btn:has-text("{step_text}")')
                    if next_button:
                        # Check if button is enabled and visible
                        is_enabled = await next_button.is_enabled()
                        is_visible = await next_button.is_visible()
                        
                        if is_enabled and is_visible:
                            await next_button.click()
                            logger.info(f"✅ Clicked configurator step: {step_text}")
                            await self.page.wait_for_timeout(2000)
                            break
                except Exception as e:
                    logger.debug(f"Configurator step {step_text} failed: {str(e)}")
                    continue
            
            # Step 4: Look for variant selection within configurator
            # For MIRA 5 S, we need to find the specific variant option
            if 'MIRA' in machine_name.upper():
                variant_selectors = [
                    'li.js-option.js-radio',  # Aeon's specific selector
                    '.option-label',
                    'text=Mira5 S',
                    'text=MIRA 5 S',
                    '[data-option*="mira5"]',
                    '[data-option*="MIRA5"]'
                ]
                
                for selector in variant_selectors:
                    try:
                        elements = await self.page.query_selector_all(selector)
                        for element in elements:
                            text = await element.text_content()
                            if text and ('mira5' in text.lower() or 'mira 5' in text.lower()):
                                await element.click()
                                logger.info(f"✅ Selected MIRA variant: {text.strip()}")
                                await self.page.wait_for_timeout(2000)
                                break
                        else:
                            continue
                        break
                    except Exception as e:
                        logger.debug(f"MIRA variant selector {selector} failed: {str(e)}")
                        continue
            
            # Step 5: Complete configurator by clicking through remaining steps
            # Look for "Add to Cart", "Get Quote", or final pricing
            final_selectors = [
                'button:has-text("Add to Cart")',
                'button:has-text("Get Quote")',
                'button:has-text("Configure")',
                'button:has-text("Complete")',
                '.total b',  # Final total display
                '.tot-price .total'
            ]
            
            for selector in final_selectors:
                try:
                    element = await self.page.query_selector(selector)
                    if element:
                        # If it's a button, click it
                        if 'button' in selector:
                            await element.click()
                            logger.info(f"✅ Clicked final configurator step")
                            await self.page.wait_for_timeout(3000)
                        else:
                            # If it's a price display, we're done
                            logger.info(f"✅ Found final pricing display")
                        break
                except Exception as e:
                    logger.debug(f"Final selector {selector} failed: {str(e)}")
                    continue
            
            # Step 6: Final wait for all price updates
            await self.page.wait_for_timeout(2000)
            
            logger.info("🎯 Aeon configurator navigation completed")
            
        except Exception as e:
            logger.error(f"❌ Error navigating Aeon configurator: {str(e)}")
    
    async def _extract_price_from_page(self, machine_data=None, machine_name=None):
        """Extract price from the current page after variant selection."""
        try:
            # Get the updated page content
            content = await self.page.content()
            soup = BeautifulSoup(content, 'lxml')
            
            # Get current URL domain
            current_url = self.page.url
            domain = urlparse(current_url).netloc.lower()
            if domain.startswith('www.'):
                domain = domain[4:]
            
            # Use site-specific selectors for ComMarker
            if 'commarker.com' in domain:
                price_selectors = [
                    # Target the specific price that appears when B6 Basic Bundle is selected
                    # Looking for $2,399 which is the 30W Basic Bundle price
                    'td:contains("B6 Basic Bundle") ~ td .price ins .amount',  # Bundle row price
                    'td:contains("B6 Basic Bundle") ~ td .price .amount:last-child',
                    '.selected-package-row .price ins .amount',
                    '.selected-package-row .price .amount:last-child',
                    
                    # Package/bundle selection area
                    '.package-selection .price ins .amount',  # Selected package sale price
                    '.package-selection .price .amount:last-child',  # Selected package current price
                    '.selected-package .price ins .amount',   # Selected bundle sale price
                    '.selected-package .price .amount:last-child',  # Selected bundle current price
                    
                    # After variant selection, the main price should update
                    '.woocommerce-variation-price .price ins .amount',  # Variation sale price
                    '.woocommerce-variation-price .price .amount:last-child',  # Variation current price
                    
                    # Bundle area selectors - but be specific about selected state
                    '.bundle-price.selected .amount:last-child',  # Selected bundle final price
                    '.package-option.selected .price .amount',   # Selected package price
                    
                    # Main product area after dynamic updates
                    '.product-summary .price ins .amount',
                    '.entry-summary .price ins .amount', 
                    '.single-product-content .price ins .amount',
                    'form.cart .price ins .amount',
                    
                    # Look for the prominent display price (like $2,399 shown in screenshot)
                    '.product-summary .price .amount:last-child',
                    '.entry-summary .price .amount:last-child',
                    
                    # Data attributes as final fallback
                    '.product-summary [data-price]',
                    '.entry-summary [data-price]'
                ]
            else:
                # Default selectors for other sites
                price_selectors = [
                    # WooCommerce selectors
                    '.price .amount:last-child',
                    '.price-current .amount',
                    '.woocommerce-Price-amount:last-child',
                    
                    # Shopify selectors
                    '.product__price .price__current',
                    '.price__current',
                    '[data-price]',
                    
                    # General selectors
                    '.price',
                    '.product-price',
                    '.sale-price',
                    
                    # Aeon configurator specific selectors
                    '.total b',  # Final configurator total
                    '.tot-price .total',  # Alternative total selector
                    '.configurator-total',
                    '.final-price'
                ]
            
            # Calculate expected price range from machine data
            min_price = 10  # Default minimum
            max_price = 100000  # Default maximum
            
            if machine_data and machine_data.get('old_price'):
                old_price = float(machine_data['old_price'])
                # Allow 50% variance from old price
                min_price = old_price * 0.5
                max_price = old_price * 1.5
                logger.info(f"Using price range ${min_price:.2f} - ${max_price:.2f} based on old price ${old_price:.2f}")
            
            # Collect all valid price candidates instead of returning the first one
            valid_prices = []
            
            for selector in price_selectors:
                try:
                    elements = soup.select(selector)
                    for element in elements:
                        price_text = element.get_text(strip=True)
                        if price_text:
                            price = self._parse_price_string(price_text)
                            if price:
                                logger.debug(f"Parsed price ${price} from text '{price_text}' - checking range ${min_price:.2f} - ${max_price:.2f}")
                                if min_price <= price <= max_price:
                                    # Additional machine-specific validation for ComMarker
                                    if self._validate_commarker_price(price, current_url, machine_name):
                                        logger.info(f"Found valid price candidate ${price} using selector: {selector}")
                                        valid_prices.append({
                                            'price': price,
                                            'selector': selector,
                                            'text': price_text
                                        })
                                    else:
                                        logger.warning(f"Price ${price} failed machine-specific validation, skipping")
                                else:
                                    logger.debug(f"Price ${price} outside range ${min_price:.2f} - ${max_price:.2f}, skipping")
                except Exception as e:
                    logger.debug(f"Price selector {selector} failed: {str(e)}")
                    continue
            
            # If we have valid prices, select the best one
            if valid_prices:
                # If we have old price data, prefer the price closest to the old price
                if machine_data and machine_data.get('old_price'):
                    old_price = float(machine_data['old_price'])
                    logger.info(f"Found {len(valid_prices)} valid price candidates. Selecting closest to old price ${old_price}")
                    
                    # Calculate distance from old price for each candidate
                    for candidate in valid_prices:
                        candidate['distance'] = abs(candidate['price'] - old_price)
                        logger.info(f"  Candidate: ${candidate['price']} (distance: ${candidate['distance']:.2f}) via {candidate['selector']}")
                    
                    # Sort by distance from old price and take the closest
                    best_price = min(valid_prices, key=lambda x: x['distance'])
                    logger.info(f"Selected best price: ${best_price['price']} (closest to old price ${old_price})")
                    return best_price['price'], f"CSS selector: {best_price['selector']}"
                else:
                    # No old price available, take the first valid one
                    logger.info(f"Found {len(valid_prices)} valid price candidates. No old price available, taking first valid.")
                    best_price = valid_prices[0]
                    return best_price['price'], f"CSS selector: {best_price['selector']}"
            
            # Try data attributes - but only in main product area
            main_product_area = soup.select_one('.product-summary, .entry-summary, .single-product-content, .product-main')
            if main_product_area:
                for element in main_product_area.find_all(attrs={'data-price': True}):
                    try:
                        price_value = element.get('data-price')
                        if price_value:
                            price = self._parse_price_string(price_value)
                            if price and min_price <= price <= max_price:
                                logger.info(f"Found price ${price} within expected range using data-price attribute")
                                return price, "data-price attribute"
                    except:
                        continue
            
            # Skip JavaScript evaluation - we'll use Python-based extraction instead
            # JavaScript evaluation removed to eliminate hardcoded price patterns
            
            return None, None
            
        except Exception as e:
            logger.error(f"Error extracting price from page: {str(e)}")
            return None, None
    
    def _validate_commarker_price(self, price, url, machine_name):
        """Validate ComMarker price using machine-specific rules."""
        try:
            # Only validate ComMarker machines
            if 'commarker.com' not in url.lower():
                return True
                
            if not machine_name:
                logger.warning("No machine name available for ComMarker validation")
                return True
                
            # Skip this extra validation - we'll use percentage-based validation in the main flow
            # The fixed ranges are too restrictive and causing valid prices to be rejected
            logger.debug(f"ComMarker price ${price} for {machine_name} - relying on percentage-based validation")
            return True
            
        except Exception as e:
            logger.error(f"Error in ComMarker price validation: {str(e)}")
            return True  # Default to allowing price if validation fails

    def _parse_price_string(self, price_text):
        """Parse price from string with enhanced logic."""
        if not price_text:
            return None
            
        # Handle numeric values in cents (common in data attributes)
        if isinstance(price_text, str) and price_text.isdigit() and len(price_text) >= 5:
            cents_value = int(price_text)
            # Convert cents to dollars - no hardcoded limits
            dollars = cents_value / 100
            return dollars
        
        # Standard price parsing
        price_str = str(price_text).strip()
        
        # Remove currency symbols and extra whitespace
        price_str = re.sub(r'[$€£¥]', '', price_str)
        price_str = re.sub(r'\s+', '', price_str)
        
        # Extract first price pattern
        matches = re.findall(r'\d+(?:[,\.]\d+)*(?:\.\d{1,2})?|\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?', price_str)
        if not matches:
            match = re.search(r'\d+', price_str)
            if not match:
                return None
            price_clean = match.group(0)
        else:
            price_clean = matches[0]
        
        # Handle thousand separators and decimal points
        if ',' in price_clean and '.' in price_clean:
            last_comma = price_clean.rfind(',')
            last_dot = price_clean.rfind('.')
            
            if last_comma > last_dot:
                # Comma is decimal (European style)
                price_clean = price_clean.replace('.', '').replace(',', '.')
            else:
                # Dot is decimal (US style)
                price_clean = price_clean.replace(',', '')
        elif ',' in price_clean:
            # Only comma - check if it's decimal or thousands
            comma_parts = price_clean.split(',')
            if len(comma_parts) == 2 and len(comma_parts[1]) <= 2:
                # Likely decimal separator
                price_clean = price_clean.replace(',', '.')
            else:
                # Likely thousands separator
                price_clean = price_clean.replace(',', '')
        
        try:
            return float(price_clean)
        except ValueError:
            return None
    
    async def get_html_after_variant_selection(self, url, machine_name):
        """
        Get HTML content after selecting the appropriate variant.
        This is used by Claude fallback to analyze the post-interaction page.
        
        Args:
            url (str): Product page URL
            machine_name (str): Machine name for variant selection
            
        Returns:
            str: HTML content after variant selection
        """
        try:
            logger.info(f"Getting post-interaction HTML for Claude analysis: {url}")
            
            # Navigate to the page
            await self.page.goto(url, wait_until="networkidle", timeout=30000)
            
            # Apply variant selection
            domain = urlparse(url).netloc.lower()
            if 'commarker.com' in domain:
                await self._select_commarker_variant(machine_name)
            elif 'cloudraylaser.com' in domain:
                await self._select_cloudray_variant(machine_name)
            elif 'aeonlaser.us' in domain or 'aeonlaser.com' in domain:
                await self._navigate_aeon_configurator(machine_name)
            
            # Wait for any price updates
            await self.page.wait_for_timeout(2000)
            
            # Get the updated HTML content
            html_content = await self.page.content()
            logger.info("Successfully captured post-interaction HTML for Claude")
            
            return html_content
            
        except Exception as e:
            logger.error(f"Error getting post-interaction HTML: {str(e)}")
            # Return empty string to trigger fallback to original HTML
            return ""


# Example usage and integration
async def main():
    """Example usage of DynamicScraper."""
    async with DynamicScraper() as scraper:
        # Test ComMarker extraction
        url = "https://www.commarker.com/products/commarker-b6-mopa-60w-fiber-laser-engraver"
        machine_name = "ComMarker B6 MOPA 60W"
        
        price, method = await scraper.extract_price_with_variants(url, machine_name, {})
        
        if price:
            print(f"Successfully extracted price: ${price} using {method}")
        else:
            print("Failed to extract price")


if __name__ == "__main__":
    asyncio.run(main())