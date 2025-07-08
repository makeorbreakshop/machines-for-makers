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
            price, method = await self._extract_price_from_page(machine_data)
            
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
            
            # First try to select power/wattage  
            if power:
                # Updated selectors based on current ComMarker page structure
                power_selectors = []
                
                # Add model-specific selectors if we have a model
                if model:
                    power_selectors.extend([
                        f'text={model} {power}W',  # e.g., "B4 30W"
                        f'text={model} MOPA {power}W',  # e.g., "B6 MOPA 60W"
                    ])
                
                # Add generic power selectors
                power_selectors.extend([
                    f'text={power}W',
                    f'[data-value*="{power}"]',  # Data attribute approach
                    f'button:has-text("{power}W")',  # Playwright has-text approach
                    f'input[value*="{power}"]',  # Input elements
                    f'option[value*="{power}"]'  # Select options
                ])
                
                selected_power = False
                for selector in power_selectors:
                    try:
                        element = await self.page.query_selector(selector)
                        if element:
                            logger.info(f"Found power element with selector: {selector}")
                            await element.click(timeout=5000)  # Shorter timeout
                            logger.info(f"Successfully selected power option: {power}W")
                            await self.page.wait_for_timeout(1000)  # Wait for price update
                            selected_power = True
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
    
    async def _extract_price_from_page(self, machine_data=None):
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
                    # Prioritize sale price in <ins> tags
                    '.product-summary .price ins .amount',
                    '.entry-summary .price ins .amount',
                    '.single-product-content .price ins .amount',
                    'form.cart .price ins .amount',
                    '.product_title ~ .price ins .amount',
                    # Fallback to last-child
                    '.product-summary .price .amount:last-child',
                    '.entry-summary .price .amount:last-child',
                    # Fallback to data attributes in main area only
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
                                    logger.info(f"Found price ${price} within expected range using selector: {selector}")
                                    return price, f"CSS selector: {selector}"
                                else:
                                    logger.debug(f"Price ${price} outside range ${min_price:.2f} - ${max_price:.2f}, skipping")
                except Exception as e:
                    logger.debug(f"Price selector {selector} failed: {str(e)}")
                    continue
            
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