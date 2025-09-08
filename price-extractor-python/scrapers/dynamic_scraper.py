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
    
    async def extract_full_product_data(self, url, variant_rules=None, machine_data=None):
        """
        Extract full product data from a page (beyond just price).
        
        Args:
            url: Product page URL
            variant_rules: Site-specific rules for variant selection
            machine_data: Existing machine data for validation
            
        Returns:
            dict: Complete product data or None
        """
        try:
            logger.info(f"Starting full product extraction for {url}")
            
            # Navigate to the page
            await self.page.goto(url, wait_until='domcontentloaded', timeout=30000)
            await self.page.wait_for_timeout(2000)
            
            # Remove popups
            await self._remove_popups()
            
            # Get the HTML content
            content = await self.page.content()
            
            # Extract product data using selectors and AI
            product_data = await self._extract_product_data_from_html(content, url)
            
            if product_data:
                logger.info(f"Successfully extracted product data: {product_data.get('name', 'No name')}")
                return product_data
            else:
                logger.warning("Failed to extract product data")
                return None
                
        except Exception as e:
            logger.error(f"Error in full product extraction: {str(e)}")
            return None
    
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
            logger.info("🚀 CODE VERSION: F1 Lite Fix v2 - This message confirms new code is running!")
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
            logger.info(f"DEBUG: variant_rules = {variant_rules}")
            logger.info(f"DEBUG: machine_name = {repr(machine_name)}")
            
            if 'commarker.com' in domain:
                logger.info("DEBUG: Calling _select_commarker_variant")
                await self._select_commarker_variant(machine_name)
            elif 'cloudraylaser.com' in domain:
                logger.info("DEBUG: CloudRay detected - checking for variant parameter")
                # For CloudRay, if URL has variant parameter, remove it to get base price
                if '?variant=' in url:
                    base_url = url.split('?variant=')[0]
                    logger.info(f"CloudRay URL has variant parameter - navigating to base URL for base price: {base_url}")
                    await self.page.goto(base_url, wait_until='domcontentloaded', timeout=30000)
                    await self.page.wait_for_timeout(2000)
                else:
                    logger.info("DEBUG: Calling _select_cloudray_variant")
                    await self._select_cloudray_variant(machine_name)
            elif 'aeonlaser.us' in domain or 'aeonlaser.com' in domain:
                logger.info("DEBUG: Calling _navigate_aeon_configurator")
                await self._navigate_aeon_configurator(machine_name)
            elif 'xtool.com' in domain:
                # Check if we have Shopify variant selection rules
                logger.info(f"DEBUG: xtool.com domain detected")
                logger.info(f"DEBUG: shopify_variant_selection = {variant_rules and variant_rules.get('shopify_variant_selection')}")
                if variant_rules and variant_rules.get('shopify_variant_selection'):
                    logger.info("DEBUG: Calling _select_shopify_variant (THIS IS THE PROBLEM!)")
                    await self._select_shopify_variant(machine_name, variant_rules)
                else:
                    logger.info("DEBUG: Calling _select_xtool_variant (GOOD!)")
                    await self._select_xtool_variant(machine_name)
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
            
            # ComMarker has BOTH dropdown selects AND button swatches - try both!
            if power:
                selected_power = False
                
                # METHOD 1: Try button/swatch selectors first (they're visible)
                logger.info("METHOD 1: Trying button/swatch selectors...")
                
                # ComMarker uses wd-swatch button structure
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
                    f'div.wd-swatch[data-title*="{power}W"]',
                    f'.wd-swatch[data-title*="{power}W"]',
                    f'div.wd-swatch:has(.wd-swatch-text:text("{power}W"))',
                    f'.wd-swatch:has(.wd-swatch-text:text("{power}W"))',
                ])
                
                # Try each selector
                for selector in power_selectors:
                    try:
                        element = await self.page.query_selector(selector)
                        if element and await element.is_visible():
                            logger.info(f"Found power button with selector: {selector}")
                            await element.click()
                            selected_power = True
                            logger.info(f"✅ Successfully clicked {power}W button")
                            await self.page.wait_for_timeout(2000)  # Wait for price update
                            break
                    except Exception as e:
                        logger.debug(f"Failed with selector {selector}: {str(e)}")
                
                # METHOD 2: If buttons fail, try dropdown select (might be hidden but still work)
                if not selected_power:
                    logger.info("METHOD 2: Buttons failed, trying dropdown select...")
                    dropdown_selector = 'select[name="attribute_pa_effect-power"], select#pa_effect-power'
                    try:
                        select_element = await self.page.query_selector(dropdown_selector)
                        if select_element:
                            # Build the option value
                            if model and is_mopa:
                                option_value = f"{model.lower()}-mopa-{power}w"
                            else:
                                option_value = f"{model.lower()}-{power}w"
                            
                            logger.info(f"Found dropdown, selecting option value: {option_value}")
                            await select_element.select_option(option_value)
                            selected_power = True
                            logger.info(f"✅ Successfully selected {power}W via dropdown")
                            await self.page.wait_for_timeout(2000)  # Wait for price update
                    except Exception as e:
                        logger.debug(f"Dropdown selection failed: {str(e)}")
                
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
            
            # Bundle selection logic - ALL ComMarker B6 MOPA machines need Basic Bundle selection
            should_select_bundle = False
            
            # All B6 MOPA machines need "B6 Mopa Basic Bundle" selection for correct pricing
            if model == "B6" and is_mopa:
                should_select_bundle = True
                logger.info(f"🎯 {machine_name} detected - will select Basic Bundle for correct pricing")
            else:
                # For other machines, avoid bundle selection for base machine price
                logger.info("✅ Skipping bundle selection for ComMarker to get base machine price")
            
            # Select bundle if needed
            if should_select_bundle:
                try:
                    bundle_selected = False
                    
                    # METHOD 1: Try button/swatch selectors first (they're visible)
                    logger.info("METHOD 1: Trying button/swatch selectors for bundle...")
                    
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
                    ]
                    
                    for selector in bundle_selectors:
                        try:
                            element = await self.page.query_selector(selector)
                            if element and await element.is_visible():
                                logger.info(f"Found bundle button with selector: {selector}")
                                await element.click(timeout=5000)
                                logger.info(f"✅ Successfully clicked Basic Bundle button")
                                bundle_selected = True
                                await self.page.wait_for_timeout(3000)
                                break
                        except Exception as e:
                            logger.debug(f"Bundle button selector '{selector}' failed: {str(e)}")
                            continue
                    
                    # METHOD 2: If buttons fail, try dropdown select (might be hidden but still work)
                    if not bundle_selected:
                        logger.info("METHOD 2: Buttons failed, trying dropdown select for bundle...")
                        dropdown_selector = 'select[name="attribute_pa_package"], select#pa_package'
                        try:
                            select_element = await self.page.query_selector(dropdown_selector)
                            if select_element:
                                # For B6 MOPA Basic Bundle
                                option_value = "b6-mopa-basic-bundle"
                                
                                logger.info(f"Found package dropdown, selecting option value: {option_value}")
                                await select_element.select_option(option_value)
                                bundle_selected = True
                                logger.info(f"✅ Successfully selected Basic Bundle via dropdown")
                                await self.page.wait_for_timeout(3000)  # Wait for price update
                        except Exception as e:
                            logger.debug(f"Package dropdown selection failed: {str(e)}")
                    
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
    
    async def _select_xtool_variant(self, machine_name):
        """Select the correct variant for xTool machines, specifically F1 Lite."""
        try:
            logger.info(f"Selecting xTool variant for: {machine_name}")
            logger.info(f"DEBUG: machine_name type: {type(machine_name)}, repr: {repr(machine_name)}")
            logger.info(f"DEBUG: 'F1 Lite' in machine_name = {'F1 Lite' in machine_name}")
            
            # Special handling for F1 Lite which shares URL with F1
            if 'F1 Lite' in machine_name:
                logger.info("Detected F1 Lite - looking for Lite variant selector")
                
                # xTool F1 Lite requires clicking the F1 Lite option in the Version section
                logger.info("Looking for F1 Lite button to click...")
                
                # Wait for page to fully load and version options to appear
                await self.page.wait_for_timeout(3000)
                
                # Debug: Take a screenshot before clicking
                try:
                    await self.page.screenshot(path="before_f1_lite_click.png")
                    logger.info("DEBUG: Saved screenshot before clicking to before_f1_lite_click.png")
                except:
                    pass
                
                # Simple approach: Just click the text "F1 Lite" directly
                try:
                    # First, let's see what F1 Lite elements exist
                    f1_lite_elements = await self.page.query_selector_all('text="F1 Lite"')
                    logger.info(f"DEBUG: Found {len(f1_lite_elements)} elements with exact text 'F1 Lite'")
                    
                    # Method 1: Click using Playwright's text selector
                    await self.page.click('text="F1 Lite"', timeout=5000)
                    logger.info("✅ Successfully clicked F1 Lite using text selector")
                    variant_selected = True
                    
                    # Wait for price to update
                    await self.page.wait_for_timeout(2000)
                    
                    # Debug: Take a screenshot after clicking F1 Lite
                    try:
                        await self.page.screenshot(path="after_f1_lite_click.png")
                        logger.info("DEBUG: Saved screenshot after F1 Lite click to after_f1_lite_click.png")
                    except:
                        pass
                    
                    # Now click F1 Lite Standalone package option
                    try:
                        # Check what package options are available
                        package_elements = await self.page.query_selector_all('text="F1 Lite Standalone"')
                        logger.info(f"DEBUG: Found {len(package_elements)} elements with text 'F1 Lite Standalone'")
                        
                        await self.page.click('text="F1 Lite Standalone"', timeout=3000)
                        logger.info("✅ Successfully clicked F1 Lite Standalone package")
                        await self.page.wait_for_timeout(2000)
                        
                        # Debug: Take final screenshot
                        try:
                            await self.page.screenshot(path="after_standalone_click.png")
                            logger.info("DEBUG: Saved screenshot after Standalone click to after_standalone_click.png")
                        except:
                            pass
                    except Exception as e:
                        logger.info(f"Could not find F1 Lite Standalone package option: {str(e)}")
                        
                except Exception as e:
                    logger.warning(f"Failed to click F1 Lite with text selector: {str(e)}")
                    variant_selected = False
                
                # Skip all the complex JavaScript and fallback code for now
                if variant_selected:
                    return  # Exit early if we succeeded
                    
                # Only continue with complex selectors if simple approach failed
                logger.warning("Simple text click failed, trying other methods...")
                
                # Wait a bit for page to fully load
                await self.page.wait_for_timeout(2000)
                
                # Debug: Let's see what's on the page
                page_text = await self.page.evaluate('() => document.body.innerText')
                if 'F1 Lite' in page_text:
                    logger.info("✅ Page contains 'F1 Lite' text")
                    # Count occurrences
                    count = page_text.count('F1 Lite')
                    logger.info(f"Found 'F1 Lite' {count} times in page text")
                else:
                    logger.warning("❌ Page does NOT contain 'F1 Lite' text!")
                
                # Check for version section
                version_section = await self.page.query_selector('.product-options__section--version, [class*="version"], [class*="Version"]')
                if version_section:
                    version_html = await version_section.inner_html()
                    logger.info(f"Version section HTML (first 500 chars): {version_html[:500]}")
                
                # Try to click F1 Lite using JavaScript directly
                clicked = await self.page.evaluate('''
                    () => {
                        // Find all elements containing "F1 Lite" text
                        const allElements = Array.from(document.querySelectorAll('*'));
                        
                        for (const element of allElements) {
                            // Check if element directly contains "F1 Lite" text (not in children)
                            const hasDirectText = Array.from(element.childNodes)
                                .some(node => node.nodeType === 3 && node.textContent.includes('F1 Lite'));
                            
                            // Also check if it's the only text content
                            const elementText = element.textContent.trim();
                            
                            if ((hasDirectText || elementText === 'F1 Lite') && 
                                element.offsetParent !== null && // Is visible
                                !element.querySelector('*')) { // Has no child elements (leaf node)
                                
                                console.log('Found F1 Lite element:', element);
                                element.click();
                                
                                // Also try dispatching click event
                                const event = new MouseEvent('click', {
                                    view: window,
                                    bubbles: true,
                                    cancelable: true
                                });
                                element.dispatchEvent(event);
                                
                                return true;
                            }
                        }
                        
                        // If direct approach failed, try finding in Version section
                        const versionSections = document.querySelectorAll('.product-options__section--version, [class*="version"]');
                        for (const section of versionSections) {
                            const liteOptions = section.querySelectorAll('*');
                            for (const option of liteOptions) {
                                if (option.textContent.includes('F1 Lite') && 
                                    !option.querySelector('*') && // Leaf node
                                    option.offsetParent !== null) { // Is visible
                                    
                                    console.log('Found F1 Lite in version section:', option);
                                    option.click();
                                    return true;
                                }
                            }
                        }
                        
                        return false;
                    }
                ''')
                
                if clicked:
                    logger.info("✅ Successfully clicked F1 Lite using JavaScript")
                    variant_selected = True
                    await self.page.wait_for_timeout(3000)  # Wait for price to load
                else:
                    logger.warning("⚠️ Could not click F1 Lite button with JavaScript")
                    
                    # Fallback: Try Playwright's text selector with exact match
                    try:
                        # First, let's see what elements contain "F1 Lite"
                        f1_lite_elements = await self.page.locator('text="F1 Lite"').all()
                        logger.info(f"Found {len(f1_lite_elements)} elements with exact text 'F1 Lite'")
                        
                        # Try to click the first visible one
                        for element in f1_lite_elements:
                            try:
                                is_visible = await element.is_visible()
                                if is_visible:
                                    # Get parent to see context
                                    parent_html = await element.evaluate('el => el.parentElement ? el.parentElement.outerHTML : "no parent"')
                                    logger.info(f"Clicking F1 Lite element with parent: {parent_html[:200]}...")
                                    
                                    await element.click(force=True)  # Force click even if covered
                                    logger.info("✅ Successfully clicked F1 Lite element")
                                    variant_selected = True
                                    await self.page.wait_for_timeout(3000)
                                    break
                            except Exception as e:
                                logger.debug(f"Failed to click element: {str(e)}")
                                continue
                                
                    except Exception as e:
                        logger.error(f"Error with text selector: {str(e)}")
                    
                    # If still not selected, try more selectors
                    if not variant_selected:
                        lite_selectors = [
                            'text=/.*F1\s+Lite.*/',  # Regex for F1 Lite with any spacing
                            '.product-options >> text="F1 Lite"',
                            '.product-options__section--version >> text="F1 Lite"',
                            'div:has-text("F1 Lite"):not(:has(*))',  # Div with text but no children
                            '[data-value="F1 Lite"]',
                            '[data-option-value="F1 Lite"]'
                        ]
                
                variant_selected = False
                
                # Scroll to variant selection area to ensure it's in view
                try:
                    version_section = await self.page.query_selector('.product-options__section--version, .product-options, [class*="version"]')
                    if version_section:
                        await version_section.scroll_into_view_if_needed()
                        await self.page.wait_for_timeout(500)
                except:
                    pass
                
                for selector in lite_selectors:
                    try:
                        # Try multiple methods to find and click the element
                        elements = await self.page.query_selector_all(selector)
                        
                        for element in elements:
                            try:
                                # Get element info for debugging
                                element_text = await element.text_content()
                                is_visible = await element.is_visible()
                                
                                # Only proceed if element contains "F1 Lite" and is visible
                                if element_text and "F1 Lite" in element_text and is_visible:
                                    logger.info(f"Found F1 Lite element: '{element_text.strip()}' with selector: {selector}")
                                    
                                    # Try different click methods
                                    try:
                                        # Method 1: Regular click
                                        await element.click(timeout=5000)
                                        logger.info("✅ Successfully clicked F1 Lite variant (regular click)")
                                        variant_selected = True
                                    except:
                                        # Method 2: Force click with JavaScript
                                        await self.page.evaluate('(element) => element.click()', element)
                                        logger.info("✅ Successfully clicked F1 Lite variant (JS click)")
                                        variant_selected = True
                                    
                                    # Wait for price to load after clicking
                                    await self.page.wait_for_timeout(3000)
                                    
                                    # Verify the click worked by checking for price updates
                                    price_elements = await self.page.query_selector_all('.price .money, [data-product-price], .product-price')
                                    for price_elem in price_elements:
                                        price_text = await price_elem.text_content()
                                        if price_text and price_text.strip() and price_text != "$":
                                            logger.info(f"Price appeared after variant selection: {price_text}")
                                            break
                                    
                                    if variant_selected:
                                        break
                                        
                            except Exception as e:
                                logger.debug(f"Failed to interact with element: {str(e)}")
                                continue
                        
                        if variant_selected:
                            break
                            
                    except Exception as e:
                        logger.debug(f"Variant selector {selector} failed: {str(e)}")
                        continue
                
                if variant_selected:
                    # After selecting F1 Lite version, also need to select the package
                    logger.info("Now selecting F1 Lite Standalone package...")
                    
                    package_selectors = [
                        # Priority 1: Package section selectors (from screenshot)
                        '.product-options__section--package [data-value="F1 Lite Standalone"]',
                        '.product-options__section [data-value="F1 Lite Standalone"]',
                        '[data-option-name="Package"] [data-value="F1 Lite Standalone"]',
                        'div[data-value="F1 Lite Standalone"]',
                        
                        # Priority 2: Text-based selectors
                        'div:text("F1 Lite Standalone")',
                        '.product-options div:has-text("F1 Lite Standalone")',
                        
                        # Priority 3: Button/option patterns
                        'button:has-text("F1 Lite Standalone")',
                        'option:has-text("F1 Lite Standalone")',
                        '[data-value*="lite-standalone"]',
                        '[data-value*="f1-lite-standalone"]'
                    ]
                    
                    for selector in package_selectors:
                        try:
                            element = await self.page.query_selector(selector)
                            if element and await element.is_visible():
                                await element.click(timeout=5000)
                                logger.info("✅ Successfully selected F1 Lite Standalone package")
                                await self.page.wait_for_timeout(2000)
                                break
                        except Exception as e:
                            logger.debug(f"Package selector {selector} failed: {str(e)}")
                            continue
                
                if not variant_selected:
                    logger.warning("⚠️ Could not find F1 Lite variant selector, trying alternative approaches")
                    
                    # Look for any variant selection area to debug
                    variant_areas = await self.page.query_selector_all('[class*="variant"], [class*="option"], [class*="swatch"], [data-variant], [data-option], button, input, select')
                    logger.info(f"Found {len(variant_areas)} potential variant selection areas")
                    
                    # Try to find elements that contain "lite" or "f1 lite" in their text or attributes
                    for i, area in enumerate(variant_areas):
                        try:
                            text = await area.text_content()
                            classes = await area.get_attribute('class') or ""
                            data_variant = await area.get_attribute('data-variant') or ""
                            data_option = await area.get_attribute('data-option') or ""
                            value = await area.get_attribute('value') or ""
                            
                            # Check if any of these contain "lite" (case insensitive)
                            all_text = f"{text} {classes} {data_variant} {data_option} {value}".lower()
                            if "lite" in all_text and i < 20:  # Only check first 20 to avoid spam
                                logger.info(f"🔍 Potential F1 Lite element {i}: text='{text}', classes='{classes}', data-variant='{data_variant}', value='{value}'")
                                
                                # Try to click this element
                                try:
                                    if await area.is_visible():
                                        await area.click(timeout=3000)
                                        logger.info(f"✅ Successfully clicked potential F1 Lite element {i}")
                                        variant_selected = True
                                        await self.page.wait_for_timeout(2000)
                                        break
                                except Exception as click_error:
                                    logger.debug(f"Failed to click element {i}: {str(click_error)}")
                                    continue
                        except:
                            pass
            
            # Handle other xTool variants if needed
            elif 'S1' in machine_name:
                # S1 requires 40W variant selection - S1 is a 40W machine
                logger.info("Detected xTool S1 - selecting 40W variant")
                
                # Wait for page to fully load and variant options to appear
                await self.page.wait_for_timeout(3000)
                
                # S1 40W specific handling with comprehensive selectors
                power_selectors = [
                    'text="40W"',  # Direct text selector
                    'button:has-text("40W")',  # Button with 40W text
                    '[data-option*="40W"]',  # Data attribute containing 40W
                    '[data-value*="40W"]',  # Data value containing 40W
                    'input[value*="40W"]',  # Input value containing 40W
                    'option[value*="40W"]',  # Option value containing 40W
                    '.variant-option:has-text("40W")',  # Variant option with 40W text
                    '.product-option:has-text("40W")',  # Product option with 40W text
                    '.power-option:has-text("40W")',  # Power option with 40W text
                    'label:has-text("40W")',  # Label with 40W text
                    'span:has-text("40W")',  # Span with 40W text
                ]
                
                variant_selected = False
                for selector in power_selectors:
                    try:
                        logger.info(f"Trying S1 40W selector: {selector}")
                        element = await self.page.query_selector(selector)
                        if element and await element.is_visible():
                            await element.click(timeout=5000)
                            logger.info(f"✅ Successfully selected 40W variant for S1 using: {selector}")
                            variant_selected = True
                            await self.page.wait_for_timeout(2000)  # Wait for price to update
                            break
                    except Exception as e:
                        logger.debug(f"Failed to click S1 40W selector {selector}: {str(e)}")
                        continue
                
                if not variant_selected:
                    logger.warning("⚠️ Could not select 40W variant for S1 - may not be required")
                    logger.info("S1 might show 40W price by default, continuing with extraction")
                
                # Additional wait for price to stabilize
                await self.page.wait_for_timeout(1000)
                
                # Debug: Check what price elements are available on xTool S1 page
                logger.info("🔍 Debugging xTool S1 page structure...")
                
                # Check for various price element patterns
                price_patterns = [
                    '.money',
                    '.price',
                    '[data-price]',
                    '.price__current',
                    '.price__sale',
                    '.product-price',
                    '.price-item',
                    '*[class*="price"]',
                    '*[class*="money"]'
                ]
                
                for pattern in price_patterns:
                    try:
                        elements = await self.page.query_selector_all(pattern)
                        if elements:
                            logger.info(f"Found {len(elements)} elements matching '{pattern}'")
                            for i, elem in enumerate(elements[:3]):  # Show first 3
                                try:
                                    text = await elem.text_content()
                                    classes = await elem.get_attribute('class')
                                    logger.info(f"  Element {i}: text='{text}', classes='{classes}'")
                                except:
                                    pass
                    except:
                        pass
            
            # Final wait for any price updates
            await self.page.wait_for_timeout(1000)
            
        except Exception as e:
            logger.error(f"Error selecting xTool variant: {str(e)}")
    
    async def _select_shopify_variant(self, machine_name, variant_rules):
        """Select Shopify variant using variant ID or option-based selection."""
        try:
            logger.info(f"🛍️ Selecting Shopify variant for: {machine_name}")
            
            # Try to select by variant ID first (most reliable)
            if variant_rules.get('target_variant_id'):
                variant_id = variant_rules['target_variant_id']
                logger.info(f"Attempting to select variant ID: {variant_id}")
                
                # Look for variant selection dropdown
                variant_selectors = [
                    f'select[name="id"] option[value="{variant_id}"]',
                    f'input[name="id"][value="{variant_id}"]',
                    f'button[data-variant-id="{variant_id}"]'
                ]
                
                for selector in variant_selectors:
                    try:
                        element = await self.page.query_selector(selector)
                        if element:
                            if 'option' in selector:
                                # Select the option
                                await self.page.select_option('select[name="id"]', variant_id)
                                logger.info(f"✅ Selected variant option: {variant_id}")
                            else:
                                # Click the element
                                await element.click()
                                logger.info(f"✅ Clicked variant element: {variant_id}")
                            
                            # Wait for price update
                            await self.page.wait_for_timeout(2000)
                            return True
                    except Exception as e:
                        logger.debug(f"Variant selector {selector} failed: {str(e)}")
                        continue
            
            # Fall back to option-based selection
            option1 = variant_rules.get('option1')  # e.g., "F1 Lite"
            option2 = variant_rules.get('option2')  # e.g., "F1 Lite Standalone"
            
            if option1:
                logger.info(f"Attempting option-based selection: {option1}")
                
                # Look for option elements
                option_selectors = [
                    f'.product-options__section--version .option:has-text("{option1}")',
                    f'.product-options__section--version [data-value="{option1}"]',
                    f'button:has-text("{option1}")',
                    f'input[value="{option1}"]',
                    f'option[value="{option1}"]'
                ]
                
                for selector in option_selectors:
                    try:
                        element = await self.page.query_selector(selector)
                        if element and await element.is_visible():
                            await element.click()
                            logger.info(f"✅ Selected option: {option1}")
                            await self.page.wait_for_timeout(1500)
                            
                            # Select second option if needed
                            if option2:
                                option2_selectors = [
                                    f'.product-options__section--package .option:has-text("{option2}")',
                                    f'.product-options__section--package [data-value="{option2}"]',
                                    f'button:has-text("{option2}")',
                                    f'input[value="{option2}"]',
                                    f'option[value="{option2}"]'
                                ]
                                
                                for selector2 in option2_selectors:
                                    try:
                                        element2 = await self.page.query_selector(selector2)
                                        if element2 and await element2.is_visible():
                                            await element2.click()
                                            logger.info(f"✅ Selected second option: {option2}")
                                            await self.page.wait_for_timeout(1500)
                                            return True
                                    except Exception as e:
                                        logger.debug(f"Option2 selector {selector2} failed: {str(e)}")
                                        continue
                            else:
                                return True
                    except Exception as e:
                        logger.debug(f"Option selector {selector} failed: {str(e)}")
                        continue
            
            logger.warning("⚠️ Could not select Shopify variant using any method")
            return False
            
        except Exception as e:
            logger.error(f"Error selecting Shopify variant: {str(e)}")
            return False
    
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
            
            # DEBUG: Log what prices we can find in the HTML
            logger.info("DEBUG: Starting price extraction from page")
            all_money_elements = soup.find_all(class_="money")
            logger.info(f"DEBUG: Found {len(all_money_elements)} elements with class='money'")
            
            # Show first 10 money elements for debugging
            for i, elem in enumerate(all_money_elements[:10]):
                text = elem.get_text(strip=True)
                parent_text = elem.parent.get_text(strip=True)[:100] if elem.parent else "No parent"
                logger.info(f"DEBUG: Money element {i}: '{text}' (parent: '{parent_text}...')")
            
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
            elif 'cloudraylaser.com' in domain:
                # CloudRay specific price selectors - need to find the INDIVIDUAL machine price (NOT bundle)
                logger.info("🎯 CloudRay detected - using special selectors for individual machine price")
                price_selectors = [
                    # Primary price display areas - individual machine price
                    '.price__container .price__regular .price-item--regular',
                    '.price__container .price-item--sale',
                    '.product__price .price-item--regular',
                    '.product__price .price-item--sale',
                    
                    # Individual product price (NOT bundle) - first data-price is usually the machine
                    '[data-price]:first-of-type',
                    '.product-single__price [data-price]',
                    
                    # Fallback to generic price selectors
                    '.product-price .price',
                    '.price-current',
                    '.product__price',
                    '.price'
                    
                    # NOTE: Avoiding '[data-price]:last-of-type' as it's often the bundle total
                ]
            elif 'xtool.com' in domain:
                # xTool Shopify-specific selectors
                logger.info("🎯 xTool.com detected - using Shopify price selectors")
                price_selectors = [
                    # xTool's specific Shopify theme price structure
                    '.product-page-info-price-container .price--sale .price__current',  # Sale price current
                    '.product-page-info-price-container .price__current',  # Current price
                    '.product-page-info__price .price__current',  # Alternative current price
                    '.price--sale .price__current',  # Sale price current (simplified)
                    '.price .price__current',  # Generic current price
                    '.price__current',  # Direct current price
                    
                    # Alternative sale price selectors
                    '.product-page-info-price-container .price--sale .price__sale',
                    '.product-page-info__price .price__sale',
                    '.price--sale .price__sale',
                    '.price .price__sale',
                    '.price__sale',
                    
                    # Money selectors in xTool's format
                    '.product-page-info-price-container .money',
                    '.product-page-info__price .money',
                    '.price--sale .money',
                    '.price .money',
                    '.money',
                    
                    # Badge price selectors
                    '.product-badge-price',
                    '.footer-price-bold.product-badge-price',
                    '.footer-price-bold',
                    
                    # Data attributes
                    '[data-price]',
                    '[data-product-price]',
                    
                    # Fallback generic selectors
                    '.price',
                    '.product-price'
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
                            
                            # CloudRay-specific price validation
                            if 'cloudraylaser.com' in domain:
                                # Skip prices that are clearly variant selectors (wattage values)
                                if price and (price == 30 or price == 50 or price == 60 or price == 100 or price == 200):
                                    logger.debug(f"Skipping CloudRay variant price: ${price} (likely wattage)")
                                    continue
                                # Skip 1064 which is the wavelength (1064nm)
                                if price and (price == 1064 or price == 1064.0):
                                    logger.debug(f"Skipping CloudRay wavelength value: ${price} (1064nm)")
                                    continue
                                # Skip bundle totals - usually > $10,000 and contain "total" in text
                                if price and price > 10000 and 'total' in price_text.lower():
                                    logger.debug(f"Skipping CloudRay bundle total: ${price} (text contains 'total')")
                                    continue
                                # Skip prices under $2000 for CloudRay machines (base prices start around $2599)
                                if price and price < 2000:
                                    logger.debug(f"Skipping CloudRay price under $2000: ${price}")
                                    continue
                                # Valid CloudRay price should be over $2000
                                if price and price >= 2000:
                                    logger.info(f"Found valid CloudRay price ${price} from text '{price_text}' via selector: {selector}")
                                    valid_prices.append({
                                        'price': price,
                                        'selector': selector,
                                        'text': price_text
                                    })
                            else:
                                # For other sites, basic sanity check
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
                # Special handling for CloudRay - take the LOWEST valid price (base price)
                if 'cloudraylaser.com' in domain:
                    logger.info(f"Found {len(valid_prices)} valid CloudRay price candidates.")
                    for candidate in valid_prices:
                        logger.info(f"  Candidate: ${candidate['price']:,.2f} via {candidate['selector']}")
                    
                    # Take the LOWEST price (base price without accessories)
                    best_price = min(valid_prices, key=lambda x: x['price'])
                    logger.info(f"Selected lowest CloudRay price (base price): ${best_price['price']:,.2f}")
                    return best_price['price'], f"CloudRay base price: {best_price['selector']}"
                
                # Special handling for ComMarker B6 MOPA 60W - use old price as anchor
                if machine_name and "B6 MOPA 60W" in machine_name and 'commarker.com' in domain:
                    logger.info(f"Found {len(valid_prices)} valid price candidates for B6 MOPA 60W.")
                    
                    # Log all candidates
                    for candidate in valid_prices:
                        logger.info(f"  Candidate: ${candidate['price']} via {candidate['selector']}")
                    
                    # ALWAYS use old price as anchor if available
                    if machine_data and machine_data.get('old_price'):
                        old_price = float(machine_data['old_price'])
                        logger.info(f"Using old price ${old_price} as anchor for B6 MOPA 60W")
                        
                        # Calculate distance from old price for each candidate
                        for candidate in valid_prices:
                            candidate['distance'] = abs(candidate['price'] - old_price)
                            logger.info(f"  Candidate: ${candidate['price']} (distance: ${candidate['distance']:.2f}) via {candidate['selector']}")
                        
                        # Select the price closest to old price
                        best_price = min(valid_prices, key=lambda x: x['distance'])
                        logger.info(f"Selected best price: ${best_price['price']} (closest to old price ${old_price})")
                        return best_price['price'], f"B6 MOPA 60W closest to baseline: {best_price['selector']}"
                    else:
                        # No old price available, take the first valid one
                        logger.warning("No old price available for B6 MOPA 60W")
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


    async def _extract_product_data_from_html(self, html_content, url):
        """
        Extract comprehensive product data from HTML content.
        
        Args:
            html_content: Raw HTML content
            url: Product page URL
            
        Returns:
            dict: Extracted product data
        """
        try:
            soup = BeautifulSoup(html_content, 'lxml')
            domain = urlparse(url).netloc.lower()
            
            # Initialize product data structure
            product_data = {
                'url': url,
                'domain': domain,
                'name': None,
                'price': None,
                'description': None,
                'specifications': {},
                'images': [],
                'brand': None,
                'category': None,
                'availability': None,
                'sku': None,
                'rating': None,
                'reviews_count': None
            }
            
            # Extract basic product information
            product_data['name'] = self._extract_product_name(soup, domain)
            product_data['price'] = self._extract_product_price(soup, domain)
            product_data['description'] = self._extract_product_description(soup, domain)
            product_data['brand'] = self._extract_product_brand(soup, domain)
            product_data['category'] = self._extract_product_category(soup, domain)
            product_data['sku'] = self._extract_product_sku(soup, domain)
            product_data['images'] = self._extract_product_images(soup, domain, url)
            product_data['availability'] = self._extract_product_availability(soup, domain)
            product_data['rating'] = self._extract_product_rating(soup, domain)
            product_data['reviews_count'] = self._extract_reviews_count(soup, domain)
            
            # Extract specifications
            product_data['specifications'] = self._extract_specifications(soup, domain)
            
            return product_data
            
        except Exception as e:
            logger.error(f"Error extracting product data from HTML: {str(e)}")
            return None
    
    def _extract_product_name(self, soup, domain):
        """Extract product name using various selectors."""
        name_selectors = [
            'h1.product-title',
            'h1.product-name',
            'h1.entry-title',
            'h1[class*="product"]',
            'h1[class*="title"]',
            '.product-title h1',
            '.product-name h1',
            'h1',  # Fallback
            '[data-product-title]',
            '[data-product-name]'
        ]
        
        for selector in name_selectors:
            try:
                element = soup.select_one(selector)
                if element:
                    name = element.get_text(strip=True)
                    if name and len(name) > 5:  # Basic validation
                        return name
            except:
                continue
        
        return None
    
    def _extract_product_price(self, soup, domain):
        """Extract product price using domain-specific selectors."""
        price_selectors = []
        
        if 'commarker.com' in domain:
            price_selectors = [
                '.price .amount:last-child',
                '.woocommerce-Price-amount:last-child',
                '.price ins .amount'
            ]
        elif 'xtool.com' in domain:
            price_selectors = [
                '.price__current',
                '.money',
                '[data-price]'
            ]
        else:
            price_selectors = [
                '.price',
                '.product-price',
                '[data-price]',
                '.amount',
                '.money'
            ]
        
        for selector in price_selectors:
            try:
                element = soup.select_one(selector)
                if element:
                    price_text = element.get_text(strip=True)
                    price = self._parse_price_string(price_text)
                    if price and price > 0:
                        return price
            except:
                continue
        
        return None
    
    def _extract_product_description(self, soup, domain):
        """Extract product description."""
        desc_selectors = [
            '.product-description',
            '.product-content',
            '.entry-content',
            '.description',
            '[data-product-description]',
            '.product-details .content',
            '.tab-content .description'
        ]
        
        for selector in desc_selectors:
            try:
                element = soup.select_one(selector)
                if element:
                    # Get text content but limit length
                    desc = element.get_text(strip=True)
                    if desc and len(desc) > 20:
                        return desc[:2000]  # Limit to 2000 chars
            except:
                continue
        
        return None
    
    def _extract_product_brand(self, soup, domain):
        """Extract brand information."""
        brand_selectors = [
            '[data-brand]',
            '.brand',
            '.product-brand',
            '.manufacturer',
            '[itemprop="brand"]',
            '.breadcrumb a:nth-child(2)'  # Often brand is second in breadcrumb
        ]
        
        # Domain-specific brand extraction
        if 'commarker.com' in domain:
            return 'ComMarker'
        elif 'xtool.com' in domain:
            return 'xTool'
        elif 'aeonlaser' in domain:
            return 'Aeon'
        
        for selector in brand_selectors:
            try:
                element = soup.select_one(selector)
                if element:
                    brand = element.get_text(strip=True)
                    if brand and len(brand) < 50:  # Reasonable brand name length
                        return brand
            except:
                continue
        
        return None
    
    def _extract_product_category(self, soup, domain):
        """Extract product category."""
        category_selectors = [
            '.breadcrumb a:last-child',
            '.product-category',
            '.category',
            '[data-category]',
            '.nav-breadcrumb a:last-child'
        ]
        
        for selector in category_selectors:
            try:
                element = soup.select_one(selector)
                if element:
                    category = element.get_text(strip=True)
                    if category and len(category) < 100:
                        return category
            except:
                continue
        
        return None
    
    def _extract_product_sku(self, soup, domain):
        """Extract product SKU/model number."""
        sku_selectors = [
            '[data-sku]',
            '.sku',
            '.product-sku',
            '.model-number',
            '[itemprop="sku"]',
            '[itemprop="model"]'
        ]
        
        for selector in sku_selectors:
            try:
                element = soup.select_one(selector)
                if element:
                    sku = element.get_text(strip=True)
                    if sku and len(sku) < 50:
                        return sku
            except:
                continue
        
        return None
    
    def _extract_product_images(self, soup, domain, base_url):
        """Extract product images."""
        images = []
        image_selectors = [
            '.product-images img',
            '.product-gallery img',
            '.gallery img',
            '[data-product-image]'
        ]
        
        for selector in image_selectors:
            try:
                elements = soup.select(selector)
                for img in elements[:5]:  # Limit to first 5 images
                    src = img.get('src') or img.get('data-src')
                    if src:
                        # Convert relative URLs to absolute
                        if src.startswith('//'):
                            src = 'https:' + src
                        elif src.startswith('/'):
                            from urllib.parse import urljoin
                            src = urljoin(base_url, src)
                        
                        if src not in images:
                            images.append(src)
            except:
                continue
        
        return images[:5]  # Return max 5 images
    
    def _extract_product_availability(self, soup, domain):
        """Extract product availability status."""
        availability_selectors = [
            '.stock-status',
            '.availability',
            '[data-availability]',
            '.in-stock',
            '.out-of-stock'
        ]
        
        for selector in availability_selectors:
            try:
                element = soup.select_one(selector)
                if element:
                    availability = element.get_text(strip=True).lower()
                    if 'in stock' in availability or 'available' in availability:
                        return 'in_stock'
                    elif 'out of stock' in availability or 'unavailable' in availability:
                        return 'out_of_stock'
                    else:
                        return availability
            except:
                continue
        
        return 'unknown'
    
    def _extract_product_rating(self, soup, domain):
        """Extract product rating."""
        rating_selectors = [
            '[data-rating]',
            '.rating',
            '.stars',
            '[itemprop="ratingValue"]',
            '.review-score'
        ]
        
        for selector in rating_selectors:
            try:
                element = soup.select_one(selector)
                if element:
                    rating_text = element.get_text(strip=True)
                    rating_match = re.search(r'([0-4]\.\d|5\.0|[0-5])', rating_text)
                    if rating_match:
                        return float(rating_match.group(1))
            except:
                continue
        
        return None
    
    def _extract_reviews_count(self, soup, domain):
        """Extract number of reviews."""
        review_selectors = [
            '[data-review-count]',
            '.review-count',
            '.reviews-count',
            '[itemprop="reviewCount"]'
        ]
        
        for selector in review_selectors:
            try:
                element = soup.select_one(selector)
                if element:
                    count_text = element.get_text(strip=True)
                    count_match = re.search(r'(\d+)', count_text)
                    if count_match:
                        return int(count_match.group(1))
            except:
                continue
        
        return None
    
    def _extract_specifications(self, soup, domain):
        """Extract technical specifications."""
        specs = {}
        
        # Common specification selectors
        spec_selectors = [
            '.specifications table tr',
            '.specs table tr',
            '.product-specs tr',
            '.tech-specs tr',
            '.attributes tr',
            '.product-attributes tr',
            '.woocommerce-product-attributes tr'
        ]
        
        for selector in spec_selectors:
            try:
                rows = soup.select(selector)
                for row in rows:
                    # Try to extract key-value pairs
                    cells = row.find_all(['td', 'th'])
                    if len(cells) >= 2:
                        key = cells[0].get_text(strip=True)
                        value = cells[1].get_text(strip=True)
                        if key and value and len(key) < 100 and len(value) < 500:
                            specs[key] = value
            except:
                continue
        
        # Look for specification lists
        list_selectors = [
            '.specifications li',
            '.specs li',
            '.features li',
            '.product-features li'
        ]
        
        features = []
        for selector in list_selectors:
            try:
                items = soup.select(selector)
                for item in items:
                    feature = item.get_text(strip=True)
                    if feature and len(feature) < 200:
                        features.append(feature)
            except:
                continue
        
        if features:
            specs['features'] = features[:10]  # Limit to 10 features
        
        return specs

if __name__ == "__main__":
    asyncio.run(main())