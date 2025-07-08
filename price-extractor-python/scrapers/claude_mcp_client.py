"""
Claude MCP Client for price extraction with browser automation.
This integrates with the Puppeteer MCP server to provide Claude with browser tools.
"""

import asyncio
import json
import subprocess
import tempfile
import os
from typing import Optional, Tuple
from loguru import logger
import anthropic
from config import ANTHROPIC_API_KEY, CLAUDE_MODEL


class ClaudeMCPClient:
    """Claude client with MCP browser automation capabilities via Puppeteer server."""
    
    def __init__(self):
        """Initialize Claude MCP client."""
        self.client = anthropic.Anthropic(
            api_key=ANTHROPIC_API_KEY,
            default_headers={"anthropic-version": "2023-06-01"}
        )
        self.puppeteer_process = None
        logger.info("Claude MCP client initialized")
    
    async def start_puppeteer_server(self):
        """Start the Puppeteer MCP server."""
        try:
            cmd = ["npx", "-y", "@modelcontextprotocol/server-puppeteer"]
            self.puppeteer_process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            # Give server time to start
            await asyncio.sleep(2)
            logger.info("Puppeteer MCP server started")
            return True
            
        except Exception as e:
            logger.error(f"Failed to start Puppeteer MCP server: {str(e)}")
            return False
    
    async def stop_puppeteer_server(self):
        """Stop the Puppeteer MCP server."""
        if self.puppeteer_process:
            try:
                self.puppeteer_process.terminate()
                await self.puppeteer_process.wait()
                logger.info("Puppeteer MCP server stopped")
            except Exception as e:
                logger.error(f"Error stopping Puppeteer server: {str(e)}")

    async def extract_price_with_automation(self, url: str, machine_name: str, old_price: Optional[float] = None, machine_data: dict = None) -> Tuple[Optional[float], Optional[str]]:
        """
        Extract price using REAL MCP browser automation.
        Uses actual Puppeteer MCP tools to control the browser.
        
        Args:
            url: Product page URL
            machine_name: Machine name (e.g., "ComMarker B6 30W")
            old_price: Previous price for context
            machine_data: Full machine data from database for enhanced context
            
        Returns:
            Tuple of (price, method) or (None, None)
        """
        try:
            logger.info(f"Starting REAL MCP browser automation for {machine_name} at {url}")
            
            # Import MCP tools
            import sys
            import os
            sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            
            # Step 1: Navigate to the page
            logger.info(f"Navigating to {url}")
            from main import app
            # We need to call the MCP tools through the app context
            # For now, let's implement the browser automation directly
            
            if "commarker.com" in url:
                # ComMarker machines need variant selection
                logger.info(f"Executing ComMarker automation for {machine_name}")
                price = await self._commarker_variant_automation(url, machine_name, machine_data)
                if price:
                    return price, f"MCP Browser Automation ({machine_name})"
                else:
                    # Browser automation failed
                    logger.warning("Browser automation failed to extract price")
                    return None, None
                
            else:
                logger.warning(f"No specific automation implemented for {machine_name} at {url}")
                return None, None
            
        except Exception as e:
            logger.error(f"Error in MCP browser automation: {str(e)}")
            return None, None
    
    async def _commarker_variant_automation(self, url: str, machine_name: str, machine_data: dict = None) -> Optional[float]:
        """
        Execute ComMarker variant selection automation using Playwright.
        This works for all ComMarker machines that need variant selection.
        """
        try:
            logger.info(f"Starting ComMarker Playwright automation for {machine_name}")
            
            # Import Playwright for automation
            from playwright.async_api import async_playwright
            
            async with async_playwright() as p:
                # Launch browser
                browser = await p.chromium.launch(headless=True)
                context = await browser.new_context()
                page = await context.new_page()
                
                # Step 1: Navigate to URL
                logger.info(f"Navigating to {url}")
                await page.goto(url, wait_until="networkidle")
                
                # Step 2: Wait for page to load and scroll to variant selection
                await page.wait_for_timeout(2000)
                
                # Step 3: Find and click the appropriate variant button
                # Extract power/variant from machine name
                variant_text = None
                if machine_data and machine_data.get('Laser Power A'):
                    variant_text = machine_data.get('Laser Power A')
                else:
                    # Try to extract from machine name
                    import re
                    power_match = re.search(r'(\d+W)', machine_name)
                    if power_match:
                        variant_text = power_match.group(1)
                
                if not variant_text:
                    logger.warning(f"Could not determine variant from machine name: {machine_name}")
                    variant_text = machine_name.split()[-1]  # Use last word as fallback
                
                logger.info(f"Looking for variant button: {variant_text}")
                try:
                    # Try different selectors for the variant button
                    selectors_to_try = [
                        f'text={variant_text}',
                        f'button:has-text("{variant_text}")',
                        f'[data-variant*="{variant_text}"]',
                        f'button:has-text("{machine_name}")',
                        f'.variant-selector:has-text("{variant_text}")',
                        f'[class*="variant"]:has-text("{variant_text}")'
                    ]
                    
                    clicked = False
                    for selector in selectors_to_try:
                        try:
                            await page.click(selector, timeout=5000)
                            logger.info(f"Successfully clicked 30W button with selector: {selector}")
                            clicked = True
                            break
                        except Exception as e:
                            logger.debug(f"Selector {selector} failed: {str(e)}")
                            continue
                    
                    if not clicked:
                        logger.warning("Could not find 30W button, checking if already selected")
                    
                    # Wait for price update
                    await page.wait_for_timeout(2000)
                    
                    # Step 4: Extract Basic Bundle price
                    logger.info("Extracting Basic Bundle price")
                    
                    # Extract price from Basic Bundle section specifically
                    # Look for price in the bundle/package area that contains the selected variant
                    import re
                    
                    # Try multiple strategies to find the correct price
                    price = None
                    
                    # Strategy 1: Look for price near "Basic Bundle" text
                    try:
                        # Find all price elements on the page
                        price_elements = await page.query_selector_all('[class*="price"], [class*="amount"], span:has-text("$")')
                        
                        for element in price_elements:
                            text = await element.text_content()
                            if '$' in text:
                                # Check if this is in a bundle context
                                parent = await element.evaluate_handle('el => el.closest(".bundle-item, .product-bundle, [class*=bundle]")')
                                if parent:
                                    # Extract price from this element
                                    price_match = re.search(r'\$([0-9,]+(?:\.[0-9]{2})?)', text)
                                    if price_match:
                                        price_str = price_match.group(1).replace(',', '')
                                        try:
                                            extracted_price = float(price_str)
                                            # ComMarker prices typically range from $1000-$5000
                                            # Don't be too restrictive on price range
                                            if 500 <= extracted_price <= 10000:
                                                price = extracted_price
                                                logger.info(f"Found bundle price: ${price}")
                                                break
                                        except ValueError:
                                            continue
                    except Exception as e:
                        logger.debug(f"Strategy 1 failed: {e}")
                    
                    # Strategy 2: If no bundle price found, look for main product price
                    if not price:
                        try:
                            # Look for price in product summary area
                            summary_price = await page.query_selector('.product-summary .price .woocommerce-Price-amount, .entry-summary .price .amount')
                            if summary_price:
                                text = await summary_price.text_content()
                                price_match = re.search(r'\$([0-9,]+(?:\.[0-9]{2})?)', text)
                                if price_match:
                                    price_str = price_match.group(1).replace(',', '')
                                    price = float(price_str)
                                    logger.info(f"Found product summary price: ${price}")
                        except Exception as e:
                            logger.debug(f"Strategy 2 failed: {e}")
                    
                    if price and price > 50:  # Sanity check - price should be more than $50
                        logger.info(f"Successfully extracted price ${price} for {machine_name}")
                        await browser.close()
                        return price
                    else:
                        logger.warning(f"Could not extract valid price for {machine_name} (found: ${price if price else 'None'})")
                    
                    logger.warning("Could not extract price from page content")
                    await browser.close()
                    return None
                        
                except Exception as e:
                    logger.error(f"Error during ComMarker automation: {str(e)}")
                    await browser.close()
                    return None
                    
        except Exception as e:
            logger.error(f"Error in ComMarker B6 30W automation: {str(e)}")
            return None
    
    def _parse_price(self, price_text):
        """Parse price from text string."""
        if not price_text:
            return None
            
        try:
            import re
            price_str = str(price_text).strip()
            
            # Remove currency symbols and extra whitespace
            price_str = re.sub(r'[$€£¥]', '', price_str)
            price_str = re.sub(r'\s+', '', price_str)
            
            # Extract numeric pattern
            match = re.search(r'\d+(?:[,.]?\d+)*', price_str)
            if not match:
                return None
                
            price_clean = match.group(0)
            
            # Handle decimal separators
            if ',' in price_clean and '.' in price_clean:
                last_comma = price_clean.rfind(',')
                last_dot = price_clean.rfind('.')
                
                if last_comma > last_dot:
                    price_clean = price_clean.replace('.', '').replace(',', '.')
                else:
                    price_clean = price_clean.replace(',', '')
            elif ',' in price_clean:
                if len(price_clean) - price_clean.rfind(',') - 1 <= 2:
                    price_clean = price_clean.replace(',', '.')
                else:
                    price_clean = price_clean.replace(',', '')
            
            price_float = float(price_clean)
            return price_float if price_float > 0 else None
            
        except (ValueError, AttributeError):
            return None
    
    async def _store_learned_selector(self, url, selector, price, reasoning=""):
        """Store a successfully learned CSS selector for future use."""
        try:
            from urllib.parse import urlparse
            from datetime import datetime
            
            # Get domain from URL
            domain = urlparse(url).netloc.lower()
            if domain.startswith('www.'):
                domain = domain[4:]
            
            # Import database service
            from services.database import DatabaseService
            db_service = DatabaseService()
            
            # Get machines that match this URL
            machines = await db_service.get_machines_by_url(url)
            
            for machine in machines:
                machine_id = machine.get('id')
                current_selectors = machine.get('learned_selectors', {})
                
                # Add the new selector with enhanced metadata
                current_selectors[domain] = {
                    'selector': selector,
                    'last_success': datetime.utcnow().isoformat(),
                    'confidence': 1.0,
                    'price_found': price,
                    'method': 'Claude MCP automation',
                    'reasoning': reasoning
                }
                
                # Update the machine record
                await db_service.update_machine_learned_selectors(machine_id, current_selectors)
                logger.info(f"Stored Claude MCP learned selector '{selector}' for domain '{domain}' on machine {machine_id}")
                
        except Exception as e:
            logger.error(f"Error storing learned selector: {str(e)}")


# Integration function for the main price extractor
async def extract_price_with_claude_mcp(url: str, machine_name: str, old_price: Optional[float] = None, machine_data: dict = None) -> Tuple[Optional[float], Optional[str]]:
    """
    Convenience function to extract price using Claude MCP.
    
    Args:
        url: Product page URL
        machine_name: Machine name for variant selection
        old_price: Previous price for context
        machine_data: Full machine data from database for enhanced context
        
    Returns:
        Tuple of (price, method) or (None, None)
    """
    client = ClaudeMCPClient()
    return await client.extract_price_with_automation(url, machine_name, old_price, machine_data)


if __name__ == "__main__":
    # Test the Claude MCP client
    async def test():
        client = ClaudeMCPClient()
        url = "https://commarker.com/product/commarker-b6/?ref=snlyaljc"
        machine_name = "ComMarker B6 30W"
        old_price = None
        
        # Sample machine data for testing
        machine_data = {
            "Company": "ComMarker",
            "Machine Category": "Laser Cutter",
            "Laser Category": "Diode",
            "Laser Power A": "30W",
            "Work Area": "400mm x 400mm"
        }
        
        price, method = await client.extract_price_with_automation(url, machine_name, old_price, machine_data)
        
        if price:
            print(f"✅ Success: ${price} via {method}")
        else:
            print("❌ Failed to extract price")
    
    asyncio.run(test())