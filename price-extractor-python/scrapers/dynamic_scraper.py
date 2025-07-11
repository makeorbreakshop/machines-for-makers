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
            
            # First try to select power/wattage using improved selectors for ComMarker's button structure
            if power:
                # ComMarker uses wd-swatch button structure, not dropdowns
                power_selectors = []
                
                # Priority 1: ComMarker's specific wd-swatch button structure with data-value attributes
                if model and is_mopa:
                    # For MOPA variants: "b6-mopa-60w" format
                    power_selectors.extend([
                        f'div.wd-swatch[data-value="{model.lower()}-mopa-{power}w"]',
                        f'.wd-swatch[data-value="{model.lower()}-mopa-{power}w"]',
                        f'[data-value="{model.lower()}-mopa-{power}w"]',
                    ])
                elif model:
                    # For non-MOPA variants: "b6-30w" format  
                    power_selectors.extend([
                        f'div.wd-swatch[data-value="{model.lower()}-{power}w"]',
                        f'.wd-swatch[data-value="{model.lower()}-{power}w"]',
                        f'[data-value="{model.lower()}-{power}w"]',
                    ])
                
                # Priority 2: Generic power selectors for wd-swatch structure
                power_selectors.extend([
                    f'div.wd-swatch[data-title*="{power}W"]',      # Data title attribute
                    f'.wd-swatch[data-title*="{power}W"]',
                    f'div.wd-swatch:has(.wd-swatch-text:text("{power}W"))',  # Text within swatch
                    f'.wd-swatch:has(.wd-swatch-text:text("{power}W"))',
                ])
                
                # Priority 3: Fallback to data-value patterns
                power_selectors.extend([
                    f'[data-value*="{power}w"]',                    # Data attribute contains power
                    f'[data-value*="{power}W"]',                    # Data attribute contains power (uppercase)
                    f'[data-title*="{power}W"]',                    # Data title contains power
                ])
                
                # Priority 4: Text-based selectors as final fallback
                power_selectors.extend([
                    f'text={power}W >> visible=true',              # Playwright text selector (visible only)
                    f'text="{power}W" >> visible=true',            # Quoted text selector (visible only)
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
                                # Enhanced bundle/combo detection
                                bundle_keywords = ['bundle', 'combo', 'package', 'kit', 'set', 'plus', 'pro', 'deluxe', 'premium']
                                if not any(word in element_text.lower() for word in bundle_keywords):
                                    # Additional check - ensure this is in the base machine selection area
                                    parent_text = ""
                                    try:
                                        parent = await element.locator('..').text_content()
                                        parent_text = parent.lower() if parent else ""
                                    except:
                                        pass
                                    
                                    # Skip if parent context suggests bundle/package area
                                    if not any(word in parent_text for word in bundle_keywords):
                                        logger.info(f"Found power element: '{element_text.strip()}' with selector: {selector}")
                                        
                                        # Try to click the element
                                        await element.click(timeout=5000)
                                        logger.info(f"Successfully selected power option: {power}W (base machine)")
                                        await self.page.wait_for_timeout(1500)  # Wait for price update
                                        selected_power = True
                                        break
                                    else:
                                        logger.debug(f"Skipping power element in bundle context: '{element_text.strip()}'")
                                else:
                                    logger.debug(f"Skipping bundle/combo power element: '{element_text.strip()}'")
                        
                        if selected_power:
                            break
                            
                    except Exception as e:
                        logger.debug(f"Power selector '{selector}' failed: {str(e)}")
                        continue
                
                if not selected_power:
                    logger.warning(f"⚠️ Failed to find any power selector for {power}W on ComMarker page")
                    # Enhanced debugging - look for all interactive elements
                    
                    # Check buttons (focus on power-related ones)
                    buttons = await self.page.query_selector_all('button')
                    logger.info(f"Available buttons on page: {len(buttons)}")
                    power_buttons = []
                    for i, button in enumerate(buttons[:20]):  # Check more buttons
                        try:
                            text = await button.text_content()
                            if text and text.strip():
                                # Highlight power-related buttons
                                if any(term in text.lower() for term in ['w', 'watt', 'power', '20', '30', '60']):
                                    power_buttons.append(f"Button {i}: '{text.strip()}' (POWER-RELATED)")
                                    logger.info(f"🔍 Button {i}: '{text.strip()}' (POWER-RELATED)")
                                else:
                                    logger.debug(f"Button {i}: '{text.strip()}'")
                        except:
                            pass
                    
                    if power_buttons:
                        logger.info(f"Found {len(power_buttons)} power-related buttons but couldn't click {power}W")
                    
                    # Check inputs with focus on power/variant selection
                    inputs = await self.page.query_selector_all('input')
                    logger.info(f"Available inputs on page: {len(inputs)}")
                    power_inputs = []
                    for i, input_elem in enumerate(inputs[:15]):
                        try:
                            value = await input_elem.get_attribute('value')
                            input_type = await input_elem.get_attribute('type')
                            name = await input_elem.get_attribute('name')
                            if value or input_type:
                                # Highlight power/variant inputs
                                if any(term in str(value).lower() for term in ['w', 'watt', 'power', '20', '30', '60']) or \
                                   any(term in str(name).lower() for term in ['power', 'variant', 'option']):
                                    power_inputs.append(f"Input {i}: type='{input_type}', name='{name}', value='{value}' (POWER-RELATED)")
                                    logger.info(f"🔍 Input {i}: type='{input_type}', name='{name}', value='{value}' (POWER-RELATED)")
                                else:
                                    logger.debug(f"Input {i}: type='{input_type}', name='{name}', value='{value}'")
                        except:
                            pass
                    
                    if power_inputs:
                        logger.info(f"Found {len(power_inputs)} power-related inputs but couldn't select {power}W")
                    
                    # Check for any text containing power values
                    power_texts = await self.page.query_selector_all('*:has-text("30W"), *:has-text("20W"), *:has-text("60W")')
                    logger.info(f"Elements with power text: {len(power_texts)}")
                    for i, elem in enumerate(power_texts[:5]):
                        try:
                            text = await elem.text_content()
                            tag = await elem.evaluate('el => el.tagName')
                            logger.info(f"🔍 Power element {i}: <{tag}> '{text.strip()}'")
                        except:
                            pass
                    
                    # Try a more aggressive approach - look for Effect Power section
                    try:
                        effect_power_section = await self.page.query_selector('.effect-power, [id*="effect"], [class*="effect"]')
                        if effect_power_section:
                            logger.info("📍 Found Effect Power section, attempting targeted selection")
                            # Try to find and click the power option within this section
                            power_option = await effect_power_section.query_selector(f'*:has-text("{power}W")')
                            if power_option:
                                await power_option.click()
                                logger.info(f"✅ Successfully selected {power}W from Effect Power section")
                                selected_power = True
                                await self.page.wait_for_timeout(1500)
                    except Exception as e:
                        logger.debug(f"Effect Power section fallback failed: {str(e)}")
            
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
            
            # Bundle selection logic - most ComMarker machines need base price, but some need bundle price
            should_select_bundle = False
            
            # Special case: B6 MOPA 60W specifically needs "B6 Mopa Basic Bundle" selection
            if "B6 MOPA 60W" in machine_name:
                should_select_bundle = True
                logger.info("🎯 B6 MOPA 60W detected - will select Basic Bundle for correct pricing")
            else:
                # For other machines, avoid bundle selection for base machine price
                logger.info("✅ Skipping bundle selection for ComMarker to get base machine price")
            
            # Select bundle if needed
            if should_select_bundle:
                try:
                    # Look for "B6 Mopa Basic Bundle" using ComMarker's wd-swatch button structure
                    bundle_selectors = [
                        # Priority 1: ComMarker's wd-swatch button structure for packages
                        'div.wd-swatch[data-value="b6-mopa-basic-bundle"]',
                        '.wd-swatch[data-value="b6-mopa-basic-bundle"]',
                        '[data-value="b6-mopa-basic-bundle"]',
                        
                        # Priority 2: Alternative data-value patterns
                        'div.wd-swatch[data-value*="basic-bundle"]',
                        '.wd-swatch[data-value*="basic-bundle"]',
                        '[data-value*="basic-bundle"]',
                        
                        # Priority 3: Data-title attribute patterns
                        'div.wd-swatch[data-title*="Basic Bundle"]',
                        '.wd-swatch[data-title*="Basic Bundle"]',
                        '[data-title*="Basic Bundle"]',
                        
                        # Priority 4: Text-based selectors within wd-swatch structure
                        'div.wd-swatch:has(.wd-swatch-text:text("B6 Mopa Basic Bundle"))',
                        '.wd-swatch:has(.wd-swatch-text:text("B6 Mopa Basic Bundle"))',
                        'div.wd-swatch:has(.wd-swatch-text:text("Basic Bundle"))',
                        '.wd-swatch:has(.wd-swatch-text:text("Basic Bundle"))',
                        
                        # Fallback: Legacy selectors for other potential structures
                        'select[name*="package"] option:has-text("B6 Mopa Basic Bundle")',
                        'select[name*="package"] option:has-text("Basic Bundle")',
                        'option[value*="basic-bundle"]',
                        'button:has-text("B6 Mopa Basic Bundle")',
                        'button:has-text("Basic Bundle")'
                    ]
                    
                    bundle_selected = False
                    
                    # First try to find and use select dropdown (most common for WooCommerce)
                    select_elements = await self.page.query_selector_all('select')
                    for select_elem in select_elements:
                        try:
                            # Check if this is the package/bundle selection dropdown
                            select_name = await select_elem.get_attribute('name') or ""
                            if 'package' in select_name.lower() or 'bundle' in select_name.lower():
                                logger.info(f"Found package dropdown: {select_name}")
                                
                                # Look for Basic Bundle option
                                options = await select_elem.query_selector_all('option')
                                for option in options:
                                    option_text = await option.text_content()
                                    option_value = await option.get_attribute('value') or ""
                                    
                                    if option_text and ('basic bundle' in option_text.lower() or 
                                                       'b6 mopa basic' in option_text.lower()):
                                        logger.info(f"Found Basic Bundle option: '{option_text.strip()}' (value: {option_value})")
                                        await select_elem.select_option(value=option_value)
                                        logger.info("✅ Successfully selected B6 Mopa Basic Bundle from dropdown")
                                        await self.page.wait_for_timeout(5000)  # Wait longer for price update
                                        bundle_selected = True
                                        break
                                
                                if bundle_selected:
                                    break
                        except Exception as e:
                            logger.debug(f"Dropdown selection failed: {str(e)}")
                    
                    # Fallback to clicking elements if dropdown selection failed
                    if not bundle_selected:
                        for selector in bundle_selectors:
                            try:
                                element = await self.page.query_selector(selector)
                                if element:
                                    element_text = await element.text_content()
                                    logger.info(f"Found bundle element: '{element_text.strip()}' with selector: {selector}")
                                    await element.click(timeout=5000)
                                    logger.info("✅ Successfully clicked B6 Mopa Basic Bundle")
                                    await self.page.wait_for_timeout(2000)  # Wait for price update
                                    bundle_selected = True
                                    break
                            except Exception as e:
                                logger.debug(f"Bundle selector '{selector}' failed: {str(e)}")
                    
                    if not bundle_selected:
                        logger.warning("⚠️ Failed to select Basic Bundle - may get base machine price instead")
                    else:
                        # After bundle selection, wait and check what price is shown
                        logger.info("🔍 Bundle selected, waiting for price to update...")
                        await self.page.wait_for_timeout(5000)  # Extra wait for price update
                        
                        # Try to find the specific bundle price
                        bundle_price_selectors = [
                            '.woocommerce-variation .woocommerce-variation-price .amount',
                            '.single_variation_wrap .woocommerce-variation-price .amount',
                            '.single_variation .price .amount',
                            '.woocommerce-variation-price .price',
                            '.single_variation .price',
                            '.variation-price .price',
                            'p.price .amount',
                            'p.price'
                        ]
                        
                        for selector in bundle_price_selectors:
                            try:
                                elem = await self.page.query_selector(selector)
                                if elem:
                                    text = await elem.text_content()
                                    logger.info(f"🎯 Found price element after bundle selection: '{text}' via {selector}")
                                    # Also try to get just the amount
                                    amount_elem = await elem.query_selector('.amount')
                                    if amount_elem:
                                        amount_text = await amount_elem.text_content()
                                        logger.info(f"  💰 Amount only: '{amount_text}'")
                            except:
                                pass
                        
                except Exception as e:
                    logger.error(f"Error selecting bundle: {str(e)}")
            
            # Verify power selection was successful by checking for price updates
            # Wait for JavaScript to update the main product price
            await self.page.wait_for_timeout(2000)
            
            # Additional verification: check if price area shows loading or updates
            try:
                # Look for common price update indicators
                price_area = await self.page.query_selector('.product-summary .price, .entry-summary .price')
                if price_area:
                    logger.info("✅ Found price area, power selection likely successful")
                else:
                    logger.warning("⚠️ Price area not found, power selection may have failed")
            except Exception as e:
                logger.debug(f"Price area verification failed: {str(e)}")
            
            # Final wait for any remaining AJAX updates
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
            # Handle both MIRA and EMP models
            model_match = re.search(r'(MIRA\s*\d+\s*[A-Z]*|EMP\s*[A-Z]*\d+[A-Z]*)', machine_name, re.IGNORECASE)
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
            
            # Handle EMP models specifically
            elif 'EMP' in machine_name.upper():
                logger.info(f"🎯 Looking for EMP variant: {machine_name}")
                
                # Extract the specific model (e.g., ST60J from EMP ST60J)
                emp_model_match = re.search(r'(ST\d+[A-Z])', machine_name, re.IGNORECASE)
                emp_model = emp_model_match.group(1) if emp_model_match else None
                
                if emp_model:
                    # Try various selectors for EMP models
                    variant_selectors = [
                        f'li.js-option.js-radio:contains("{emp_model}")',  # Aeon's specific selector with model
                        f'li.js-option:contains("{emp_model}")',
                        f'.option-label:contains("{emp_model}")',
                        f'text={emp_model}',
                        f'[data-option*="{emp_model}"]',
                        # Also try with spaces
                        f'li.js-option.js-radio:contains("{emp_model[:2]} {emp_model[2:]}")',  # e.g., "ST 60J"
                        'li.js-option.js-radio'  # Fallback to all radio options
                    ]
                    
                    variant_found = False
                    for selector in variant_selectors:
                        try:
                            if selector == 'li.js-option.js-radio':  # Fallback selector
                                # Get all radio options and look for matching text
                                elements = await self.page.query_selector_all(selector)
                                logger.info(f"Found {len(elements)} radio options to check")
                                
                                for element in elements:
                                    text = await element.text_content()
                                    if text:
                                        logger.debug(f"Checking option: {text.strip()}")
                                        # Check if this option contains our model
                                        if emp_model.upper() in text.upper() or emp_model.upper().replace('J', ' J') in text.upper():
                                            await element.click()
                                            logger.info(f"✅ Selected EMP variant: {text.strip()}")
                                            # Wait longer for price update after variant selection
                                            await self.page.wait_for_timeout(4000)
                                            
                                            # Check if the price has updated
                                            price_elements = await self.page.query_selector_all('.price, .total, .tot-price')
                                            logger.info(f"Found {len(price_elements)} price elements after EMP variant selection")
                                            for price_el in price_elements[:3]:  # Log first 3 prices
                                                try:
                                                    price_text = await price_el.text_content()
                                                    logger.info(f"Price element text: {price_text}")
                                                except:
                                                    pass
                                            
                                            variant_found = True
                                            break
                            else:
                                # Try direct selector
                                element = await self.page.query_selector(selector)
                                if element:
                                    await element.click()
                                    logger.info(f"✅ Selected EMP variant using selector: {selector}")
                                    # Wait longer for price update after variant selection
                                    await self.page.wait_for_timeout(4000)
                                    
                                    # Check if the price has updated
                                    price_elements = await self.page.query_selector_all('.price, .total, .tot-price')
                                    logger.info(f"Found {len(price_elements)} price elements after variant selection")
                                    for price_el in price_elements[:3]:  # Log first 3 prices
                                        try:
                                            price_text = await price_el.text_content()
                                            logger.info(f"Price element text: {price_text}")
                                        except:
                                            pass
                                    
                                    variant_found = True
                                    break
                        except Exception as e:
                            logger.debug(f"EMP variant selector {selector} failed: {str(e)}")
                            continue
                    
                    if not variant_found:
                        logger.warning(f"Could not find specific EMP variant for {emp_model}")
                else:
                    logger.warning(f"Could not parse EMP model from {machine_name}")
            
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
                # Special case: B6 MOPA 60W needs bundle price selectors
                if machine_name and "B6 MOPA 60W" in machine_name:
                    logger.info("🎯 B6 MOPA 60W detected - using WooCommerce variation price selectors")
                    price_selectors = [
                        # HIGHEST PRIORITY: WooCommerce price structure found in HTML analysis
                        # Structure: <ins><span class="woocommerce-Price-amount amount"><bdi>PRICE</bdi></span></ins>
                        'ins .woocommerce-Price-amount.amount bdi',  # Exact structure from HTML analysis
                        'ins .woocommerce-Price-amount.amount',      # Fallback without bdi wrapper
                        'ins .amount bdi',                           # More general ins structure
                        'ins .amount',                               # General ins amount tags
                        
                        # WooCommerce variation price areas (active after bundle selection)
                        '.woocommerce-variation-price .amount bdi',
                        '.woocommerce-variation-price .amount',
                        '.single_variation_wrap .woocommerce-variation-price .amount',
                        '.single_variation .price .amount',
                        
                        # Main price area ins tags (updated prices)
                        '.entry-summary .price ins .amount bdi',
                        '.entry-summary .price ins .amount',
                        '.product-summary .price ins .amount bdi', 
                        '.product-summary .price ins .amount',
                        '.summary .price ins .amount bdi',
                        '.summary .price ins .amount',
                        
                        # Variation form updated prices (after bundle selection)
                        'form.variations_form .price ins .amount bdi',
                        'form.variations_form .price ins .amount',
                        '.variations_form .price ins .amount bdi',
                        '.variations_form .price ins .amount',
                        
                        # Generic WooCommerce price amount selectors
                        '.woocommerce-Price-amount.amount bdi',
                        '.woocommerce-Price-amount.amount',
                        'span.amount bdi',
                        'span.amount',
                        
                        # Fallback to broader selectors if variation-specific fails
                        '.summary .woocommerce-Price-amount.amount',
                        '.entry-summary .price:not(.bundle-price) .amount',
                        '.product-summary .price:not(.bundle-price) .amount'
                    ]
                else:
                    # For other ComMarker machines: Target BASE MACHINE prices only, NOT bundle prices
                    price_selectors = [
                        # Main product price area after power variant selection
                        '.product-summary .price ins .amount',      # Base machine sale price
                        '.entry-summary .price ins .amount',        # Base machine sale price (alt)
                        '.single-product-content .price ins .amount', # Base machine in product content
                        
                        # After variant selection, the main price should update
                        '.woocommerce-variation-price .price ins .amount',  # Variation sale price
                        '.woocommerce-variation-price .price .amount:last-child',  # Variation current price
                        
                        # Main product area regular prices (if no sale)
                        '.product-summary .price .amount:last-child',  # Base machine current price
                        '.entry-summary .price .amount:last-child',    # Base machine current price (alt)
                        
                        # Form area prices (cart/purchase area)
                        'form.cart .price ins .amount',             # Cart form sale price
                        'form.cart .price .amount:last-child',      # Cart form current price
                        
                        # Data attributes as final fallback (base machine area only)
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
            
            # Get old price for comparison
            old_price = None
            if machine_data and machine_data.get('old_price'):
                old_price = float(machine_data['old_price'])
                logger.info(f"Using old price ${old_price:.2f} to find closest match")
            
            # Collect all valid price candidates instead of returning the first one
            valid_prices = []
            
            for selector in price_selectors:
                try:
                    elements = soup.select(selector)
                    for element in elements:
                        price_text = element.get_text(strip=True)
                        if price_text:
                            price = self._parse_price_string(price_text)
                            if price and price > 10:  # Basic sanity check - price should be more than $10
                                logger.info(f"Found price ${price} from text '{price_text}' via selector: {selector}")
                                valid_prices.append({
                                    'price': price,
                                    'selector': selector,
                                    'text': price_text
                                })
                except Exception as e:
                    logger.debug(f"Price selector {selector} failed: {str(e)}")
                    continue
            
            # If we have valid prices, select the best one
            if valid_prices:
                # Special handling for ComMarker B6 MOPA 60W - prioritize variation prices over distance
                if machine_name and "B6 MOPA 60W" in machine_name and 'commarker.com' in domain:
                    logger.info(f"Found {len(valid_prices)} valid price candidates for B6 MOPA 60W. Prioritizing variation prices.")
                    
                    # Log all candidates
                    for candidate in valid_prices:
                        logger.info(f"  Candidate: ${candidate['price']} via {candidate['selector']}")
                    
                    # Prioritize WooCommerce variation prices (these should be the correct Basic Bundle prices)
                    variation_priority_keywords = [
                        'variation', 'single_variation', 'woocommerce-variation',
                        'ins', 'sale'  # Also prioritize sale prices
                    ]
                    
                    # First try to find variation or sale prices
                    priority_candidates = []
                    for candidate in valid_prices:
                        if any(keyword in candidate['selector'].lower() for keyword in variation_priority_keywords):
                            priority_candidates.append(candidate)
                            logger.info(f"  🎯 PRIORITY candidate: ${candidate['price']} (variation/sale price)")
                    
                    if priority_candidates:
                        # Among priority candidates, choose the first one (highest priority selector)
                        best_price = priority_candidates[0]
                        logger.info(f"Selected variation/sale price: ${best_price['price']} via {best_price['selector']}")
                        return best_price['price'], f"B6 MOPA 60W variation price: {best_price['selector']}"
                    else:
                        # Fallback to expected price range for B6 MOPA 60W Basic Bundle ($4,000 - $5,000)
                        expected_range_candidates = [c for c in valid_prices if 4000 <= c['price'] <= 5000]
                        if expected_range_candidates:
                            best_price = expected_range_candidates[0]
                            logger.info(f"Selected price in expected range: ${best_price['price']} via {best_price['selector']}")
                            return best_price['price'], f"B6 MOPA 60W expected range: {best_price['selector']}"
                        else:
                            logger.warning("No prices found in expected range for B6 MOPA 60W Basic Bundle")
                            best_price = valid_prices[0]
                            logger.info(f"Fallback to first price: ${best_price['price']} via {best_price['selector']}")
                            return best_price['price'], f"B6 MOPA 60W fallback: {best_price['selector']}"
                
                # For other machines, use distance-based selection
                elif machine_data and machine_data.get('old_price'):
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
                            if price and price > 10:  # Basic sanity check
                                logger.info(f"Found price ${price} from data-price attribute")
                                valid_prices.append({
                                    'price': price,
                                    'selector': 'data-price attribute',
                                    'text': price_value
                                })
                    except:
                        continue
            
            # If we found any prices after checking data attributes, select the best one
            if valid_prices:
                if old_price:
                    logger.info(f"Found {len(valid_prices)} total price candidates. Selecting closest to old price ${old_price}")
                    
                    # Calculate distance from old price for each candidate
                    for candidate in valid_prices:
                        candidate['distance'] = abs(candidate['price'] - old_price)
                        logger.info(f"  Candidate: ${candidate['price']} (distance: ${candidate['distance']:.2f}) via {candidate['selector']}")
                    
                    # Sort by distance from old price and take the closest
                    best_price = min(valid_prices, key=lambda x: x['distance'])
                    logger.info(f"Selected best price: ${best_price['price']} (closest to old price ${old_price})")
                    return best_price['price'], f"{best_price['selector']}"
                else:
                    # No old price available, take the first valid one
                    logger.info(f"Found {len(valid_prices)} price candidates. No old price available, taking first.")
                    best_price = valid_prices[0]
                    return best_price['price'], f"{best_price['selector']}"
            
            logger.warning("No valid prices found on page")
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
            
            # Enhanced validation to catch obvious bundle prices
            # Bundle prices are typically much higher than base machine prices
            
            # Parse machine details for more specific validation
            model_match = re.search(r'(B\d+)', machine_name, re.IGNORECASE)
            model = model_match.group(1) if model_match else None
            
            power_match = re.search(r'(\d+)W', machine_name, re.IGNORECASE)
            power = int(power_match.group(1)) if power_match else None
            
            is_mopa = 'MOPA' in machine_name.upper()
            
            # General validation ranges based on ComMarker's actual pricing
            # These are loose ranges to catch obvious errors, not strict validation
            if model == 'B4' and is_mopa:
                # B4 MOPA models: typically $4,500-$7,000 (B4 100W MOPA is $6,666)
                if price < 4000 or price > 7500:
                    logger.warning(f"ComMarker B4 MOPA price ${price} outside reasonable range $4,000-$7,500")
                    return False
            elif model == 'B4' and not is_mopa:
                # B4 standard models: typically $1,400-$3,500
                if price < 1000 or price > 3500:
                    logger.warning(f"ComMarker B4 price ${price} outside reasonable range $1,000-$3,500")
                    return False
            elif model == 'B6' and not is_mopa:
                # B6 standard models: typically $1,800-$2,500
                if price < 1500 or price > 3000:
                    logger.warning(f"ComMarker B6 price ${price} outside reasonable range $1,500-$3,000")
                    return False
            elif model == 'B6' and is_mopa:
                # B6 MOPA models: typically $3,000-$5,000 for base, up to $5,500 with Basic Bundle
                # B6 MOPA 60W with Basic Bundle is specifically $4,589
                if price < 2500 or price > 5500:
                    logger.warning(f"ComMarker B6 MOPA price ${price} outside reasonable range $2,500-$5,500")
                    return False
            
            # Catch obvious bundle contamination - bundles are typically 50%+ higher
            # If we find a price significantly higher than expected, it's likely a bundle
            if price > 8000:  # No ComMarker base machine should exceed $8,000
                logger.warning(f"ComMarker price ${price} too high, likely bundle contamination")
                return False
                
            logger.debug(f"ComMarker price ${price} for {machine_name} passed validation")
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