import requests
from bs4 import BeautifulSoup
import json
import re
from typing import Dict, Any, Optional, Tuple
from langchain.tools import tool, BaseTool
from supabase import create_client
import os
from playwright.async_api import async_playwright
import asyncio
from anthropic import Anthropic
from ..config import (
    SUPABASE_URL, 
    SUPABASE_SERVICE_KEY,
    USER_AGENT, 
    REQUEST_TIMEOUT,
    ANTHROPIC_API_KEY,
    CLAUDE_MODEL,
    STORE_HTML
)
from ..services.database import store_html_content
import logging

# Initialize Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Initialize Anthropic client for Claude
anthropic = Anthropic(api_key=ANTHROPIC_API_KEY)

class WebScraperTool:
    """Tool for web scraping product pages."""
    
    @tool("web_scraper")
    def scrape_webpage(self, url: str) -> Dict[str, Any]:
        """
        Scrapes a product page and returns the HTML content.
        
        Args:
            url: The URL of the product page to scrape
            
        Returns:
            A dictionary containing:
                html: The page HTML
                url: The final URL after redirects
                success: Whether the scrape was successful
                error: Any error message if unsuccessful
        """
        # Handle special cases like affiliate links first
        if "geni.us" in url or "amzn.to" in url:
            return self._handle_special_link(url)
        
        try:
            # First try with simple requests
            response = requests.get(
                url, 
                headers={"User-Agent": USER_AGENT},
                timeout=REQUEST_TIMEOUT
            )
            
            response.raise_for_status()
            html = response.text
            final_url = response.url
            
            # Check if we need a more sophisticated approach
            if "cloudflare" in html.lower() or len(html) < 5000:
                # If the page is too small or protected, use browser-based scraping
                browser_result = asyncio.run(self._scrape_with_browser(url))
                if browser_result["success"]:
                    html = browser_result["html"]
                    final_url = browser_result["url"]
            
            # Store HTML in database if enabled
            if STORE_HTML:
                self._store_html(url, html, final_url, True)
            
            return {
                "html": html,
                "url": final_url,
                "success": True,
                "error": None
            }
            
        except Exception as e:
            error_msg = f"Error scraping {url}: {str(e)}"
            
            # Try browser-based approach as fallback
            try:
                browser_result = asyncio.run(self._scrape_with_browser(url))
                if browser_result["success"]:
                    # Store HTML in database if enabled
                    if STORE_HTML:
                        self._store_html(
                            url, 
                            browser_result["html"], 
                            browser_result["url"], 
                            True
                        )
                    return browser_result
            except Exception as browser_error:
                error_msg = f"{error_msg}. Browser fallback also failed: {str(browser_error)}"
            
            # Record the failed attempt if enabled
            if STORE_HTML:
                self._store_html(url, "", "", False, error_msg)
            
            return {
                "html": "",
                "url": url,
                "success": False,
                "error": error_msg
            }
    
    def _handle_special_link(self, url: str) -> Dict[str, Any]:
        """Handle special cases like affiliate links"""
        try:
            # For affiliate links, we need to follow redirects manually
            session = requests.Session()
            response = session.get(
                url, 
                headers={"User-Agent": USER_AGENT},
                timeout=REQUEST_TIMEOUT,
                allow_redirects=True
            )
            
            final_url = response.url
            html = response.text
            
            # If we still need browser-based scraping
            if "cloudflare" in html.lower() or len(html) < 5000:
                browser_result = asyncio.run(self._scrape_with_browser(final_url))
                if browser_result["success"]:
                    html = browser_result["html"]
                    final_url = browser_result["url"]
            
            # Store HTML in database if enabled
            if STORE_HTML:
                self._store_html(url, html, final_url, True)
            
            return {
                "html": html,
                "url": final_url,
                "success": True,
                "error": None
            }
        except Exception as e:
            error_msg = f"Error handling special link {url}: {str(e)}"
            
            # Store the failure in database if enabled
            if STORE_HTML:
                self._store_html(url, "", "", False, error_msg)
            
            return {
                "html": "",
                "url": url,
                "success": False,
                "error": error_msg
            }
    
    async def _scrape_with_browser(self, url: str) -> Dict[str, Any]:
        """Use Playwright for browser-based scraping"""
        async with async_playwright() as p:
            browser = await p.chromium.launch()
            context = await browser.new_context(
                user_agent=USER_AGENT
            )
            page = await context.new_page()
            
            try:
                response = await page.goto(url, timeout=REQUEST_TIMEOUT * 1000)
                # Wait for the page to load
                await page.wait_for_load_state("networkidle")
                
                # Get the final URL after any client-side redirects
                final_url = page.url
                
                # Get the HTML content
                html = await page.content()
                
                await browser.close()
                
                return {
                    "html": html,
                    "url": final_url,
                    "success": True,
                    "error": None
                }
            except Exception as e:
                await browser.close()
                return {
                    "html": "",
                    "url": url,
                    "success": False,
                    "error": f"Browser scraping error: {str(e)}"
                }
    
    def _store_html(
        self, 
        original_url: str, 
        html: str, 
        final_url: str, 
        success: bool, 
        error: str = ""
    ) -> None:
        """Store HTML in the database for future reference"""
        try:
            # Get machine ID from URL pattern
            machine_id = None
            # Logic to find machine ID from URLs would go here
            
            supabase.table("machine_html_scrapes").insert({
                "machine_id": machine_id,
                "html_content": html,
                "scraped_url": original_url,
                "final_url": final_url,
                "scrape_success": success,
                "error": error if error else None
            }).execute()
        except Exception as e:
            print(f"Error storing HTML: {str(e)}")


class PriceExtractionTool:
    """Tool for extracting price information from HTML."""
    
    @tool("extract_price")
    def extract_price(
        self, 
        html: str, 
        url: str,
        machine_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Extracts price information from product page HTML.
        
        Args:
            html: The HTML content of the page
            url: The URL of the product page
            machine_data: Optional machine data for context
            
        Returns:
            A dictionary containing:
                price: The extracted price
                currency: The currency code (default: USD)
                method: The method used to extract the price
                selector: The selector used to extract the price
                confidence: Confidence score (0.0-1.0)
        """
        # Try multiple methods in sequence, from most to least reliable
        result = self._try_saved_selector(html, machine_data)
        
        if not result or not result.get("price"):
            result = self._try_structured_data(html)
        
        if not result or not result.get("price"):
            result = self._try_common_selectors(html)
        
        if not result or not result.get("price"):
            result = self._try_claude_extraction(html, url, machine_data)
        
        # If all methods failed, return failure
        if not result or not result.get("price"):
            return {
                "price": None,
                "currency": "USD",
                "method": "failed",
                "selector": None,
                "confidence": 0.0,
                "error": "Could not extract price from the product page"
            }
        
        # If we have a machine ID and selector data, save the successful selector
        if machine_data and machine_data.get("id") and result.get("selector"):
            self._save_selector(machine_data["id"], result["selector"], url)
        
        return result
    
    def _try_saved_selector(
        self, 
        html: str, 
        machine_data: Optional[Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        """Try extracting price using a saved selector for this machine"""
        if not machine_data or not machine_data.get("id"):
            return None
        
        try:
            # Get saved selector from database
            response = supabase.table("machines").select(
                "price_selector_data"
            ).eq("id", machine_data["id"]).execute()
            
            if not response.data or not response.data[0].get("price_selector_data"):
                return None
            
            selector_data = response.data[0]["price_selector_data"]
            
            # Try to use the selector
            soup = BeautifulSoup(html, 'html.parser')
            
            # Handle different selector types
            if selector_data.get("selector"):
                elements = soup.select(selector_data["selector"])
                if not elements:
                    return None
                
                element = elements[0]
                
                # Get text based on data location type
                text = ""
                if selector_data.get("data_location_type") == "attribute":
                    text = element.get(selector_data.get("attribute_name", ""))
                elif selector_data.get("data_location_type") == "innerText":
                    text = element.decode_contents()
                else:
                    text = element.text
                
                # Extract price from text
                price = self._extract_price_from_text(text)
                
                if price:
                    return {
                        "price": price,
                        "currency": "USD",  # Default
                        "method": "saved_selector",
                        "selector": selector_data,
                        "confidence": 0.9
                    }
            
            return None
            
        except Exception as e:
            print(f"Error using saved selector: {str(e)}")
            return None
    
    def _try_structured_data(self, html: str) -> Optional[Dict[str, Any]]:
        """Try extracting price from structured data in the page"""
        try:
            soup = BeautifulSoup(html, 'html.parser')
            
            # Try JSON-LD
            json_ld_scripts = soup.find_all('script', type='application/ld+json')
            for script in json_ld_scripts:
                try:
                    data = json.loads(script.string)
                    # Handle different schema structures
                    if isinstance(data, list):
                        for item in data:
                            price = self._extract_price_from_schema(item)
                            if price:
                                return {
                                    "price": price,
                                    "currency": "USD",  # Default
                                    "method": "json_ld",
                                    "selector": {"type": "json_ld"},
                                    "confidence": 0.8
                                }
                    else:
                        price = self._extract_price_from_schema(data)
                        if price:
                            return {
                                "price": price,
                                "currency": "USD",  # Default
                                "method": "json_ld",
                                "selector": {"type": "json_ld"},
                                "confidence": 0.8
                            }
                except:
                    continue
            
            # Try meta tags
            meta_tags = soup.find_all('meta')
            for tag in meta_tags:
                if tag.get('property') in ['og:price:amount', 'product:price:amount']:
                    price = self._extract_price_from_text(tag.get('content', ''))
                    if price:
                        return {
                            "price": price,
                            "currency": "USD",  # Default
                            "method": "meta_tag",
                            "selector": {"type": "meta", "property": tag.get('property')},
                            "confidence": 0.7
                        }
            
            return None
            
        except Exception as e:
            print(f"Error extracting structured data: {str(e)}")
            return None
    
    def _extract_price_from_schema(self, data: Dict[str, Any]) -> Optional[float]:
        """Extract price from schema.org structured data"""
        # Check if it's a product
        if data.get('@type') in ['Product', 'product']:
            # Check offers
            if 'offers' in data:
                offers = data['offers']
                if isinstance(offers, list):
                    # Get the first offer
                    if offers and 'price' in offers[0]:
                        return float(offers[0]['price'])
                elif isinstance(offers, dict) and 'price' in offers:
                    return float(offers['price'])
            
            # Check direct price
            if 'price' in data:
                return float(data['price'])
        
        return None
    
    def _try_common_selectors(self, html: str) -> Optional[Dict[str, Any]]:
        """Try common CSS selectors for prices"""
        soup = BeautifulSoup(html, 'html.parser')
        
        # List of common selectors for prices
        common_selectors = [
            '.product-price .current-price',
            '.product-price',
            '.price',
            '.current-price',
            '#product-price',
            '.product_price',
            '.offer-price',
            '.sales-price',
            '.special-price',
            '[data-price]',
            '[itemprop="price"]',
            '.price-sales',
            '.now-price',
            '.current'
        ]
        
        for selector in common_selectors:
            try:
                elements = soup.select(selector)
                if elements:
                    for element in elements:
                        # Try the element text
                        price = self._extract_price_from_text(element.text)
                        if price:
                            return {
                                "price": price,
                                "currency": "USD",  # Default
                                "method": "common_selector",
                                "selector": {"selector": selector, "data_location_type": "text"},
                                "confidence": 0.6
                            }
                        
                        # Try data-price attribute
                        if element.has_attr('data-price'):
                            price = self._extract_price_from_text(element['data-price'])
                            if price:
                                return {
                                    "price": price,
                                    "currency": "USD",  # Default
                                    "method": "common_selector",
                                    "selector": {
                                        "selector": selector,
                                        "data_location_type": "attribute",
                                        "attribute_name": "data-price"
                                    },
                                    "confidence": 0.65
                                }
            except:
                continue
        
        return None
    
    def _try_claude_extraction(
        self, 
        html: str, 
        url: str,
        machine_data: Optional[Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        """Use Claude to extract price information"""
        try:
            # Simplify HTML to reduce token usage
            simplified_html = self._simplify_html(html)
            
            # Create prompt for Claude
            config_id = machine_data.get("price_configuration_identifier") if machine_data else None
            system_prompt = self._create_price_extraction_prompt(config_id)
            
            # Call Claude API
            response = anthropic.messages.create(
                model=CLAUDE_MODEL,
                max_tokens=1000,
                system=system_prompt,
                messages=[
                    {"role": "user", "content": f"HTML:\n{simplified_html}"}
                ]
            )
            
            # Parse the response
            if not response.content or not response.content[0].text:
                return None
            
            extracted_data = self._parse_claude_response(response.content[0].text)
            
            if not extracted_data or not extracted_data.get("price"):
                return None
            
            # Convert price to number if it's a string
            price = extracted_data["price"]
            if isinstance(price, str):
                price = self._extract_price_from_text(price)
            
            selector_data = {
                "selector": extracted_data.get("selector"),
                "xpath": extracted_data.get("xpath"),
                "data_location_type": extracted_data.get("data_location_type", "text"),
                "attribute_name": extracted_data.get("attribute_name")
            }
            
            return {
                "price": price,
                "currency": extracted_data.get("currency", "USD"),
                "method": "claude",
                "selector": selector_data,
                "confidence": 0.75
            }
            
        except Exception as e:
            print(f"Error using Claude for extraction: {str(e)}")
            return None
    
    def _create_price_extraction_prompt(self, config_id: Optional[str] = None) -> str:
        """Create the system prompt for Claude price extraction"""
        prompt = """
        You are a price extraction specialist. Your task is to accurately extract the current price of a product from HTML.
        
        Given an HTML snippet from a product page, please:
        1. Extract the current price of the product (NOT crossed-out, regular, or comparison prices)
        2. Identify the exact CSS selector or XPath that would target this price element directly
        3. Note the currency (default to USD if not specified)
        4. Determine how the price is stored (text content, attribute, etc.)
        
        Return ONLY a JSON object with these keys:
        - price: The numerical price (can include decimal point)
        - selector: CSS selector to target the element
        - xpath: XPath to target the element (optional)
        - currency: Three-letter currency code (default: USD)
        - data_location_type: Where in the element the price is found ('text', 'attribute', or 'innerText')
        - attribute_name: If data_location_type is 'attribute', the name of the attribute
        
        Example response:
        {"price": 299.99, "selector": ".product-price .current", "currency": "USD", "data_location_type": "text"}
        """
        
        if config_id:
            prompt += f"\n\nThis product has multiple configurations. Focus on the price for: {config_id}"
        
        return prompt
    
    def _simplify_html(self, html: str) -> str:
        """Simplify HTML to reduce token usage"""
        try:
            soup = BeautifulSoup(html, 'html.parser')
            
            # Remove script and style elements
            for script in soup(["script", "style", "iframe", "noscript"]):
                script.decompose()
            
            # Remove comments
            for comment in soup.find_all(text=lambda text: isinstance(text, Comment)):
                comment.extract()
            
            # Focus on main content areas likely to contain prices
            price_containers = soup.select(
                '.product-info, .product-details, .pricing, .price-container, ' + 
                '.product-price, #product-price, .offer-price, .price-wrapper'
            )
            
            if price_containers:
                combined_html = ""
                for container in price_containers:
                    combined_html += str(container)
                
                if len(combined_html) > 100:  # Only use if we found substantial content
                    return combined_html
            
            # If we didn't find specific containers, return a simplified version of the whole document
            return str(soup)
            
        except Exception as e:
            print(f"Error simplifying HTML: {str(e)}")
            return html
    
    def _parse_claude_response(self, response_text: str) -> Optional[Dict[str, Any]]:
        """Parse Claude's response to extract structured data"""
        try:
            # Find JSON in the response
            json_match = re.search(r'(\{.*\})', response_text, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
                data = json.loads(json_str)
                return data
            return None
        except Exception as e:
            print(f"Error parsing Claude response: {str(e)}")
            return None
    
    def _extract_price_from_text(self, text: str) -> Optional[float]:
        """Extract a price value from text"""
        if not text:
            return None
        
        # Remove any HTML tags
        text = re.sub(r'<[^>]+>', '', text).strip()
        
        # Find price patterns
        price_pattern = r'[$€£¥]?\s*[0-9,]+(?:\.[0-9]{2})?|\[0-9,]+(?:\.[0-9]{2})?\s*[$€£¥]'
        match = re.search(price_pattern, text)
        
        if match:
            # Extract the matched price
            price_str = match.group(0)
            
            # Remove currency symbols and commas
            price_str = re.sub(r'[$€£¥,\s]', '', price_str)
            
            try:
                price = float(price_str)
                
                # Sanity check - prices under $10 are likely errors unless it's a small accessory
                if price < 10:
                    # This might be a partial price, try multiplying by 100
                    if price < 1:
                        price *= 100
                    else:
                        # Check if this still seems too low - context dependent
                        pass
                
                return price
            except:
                return None
        
        return None
    
    def _save_selector(
        self, 
        machine_id: str, 
        selector_data: Dict[str, Any], 
        url: str
    ) -> None:
        """Save a successful selector for future use"""
        try:
            supabase.table("machines").update({
                "price_selector_data": selector_data,
                "price_selector_last_used": "now()",
                "price_selector_url_pattern": url
            }).eq("id", machine_id).execute()
        except Exception as e:
            print(f"Error saving selector: {str(e)}")


class WebScrapingTool(BaseTool):
    """Tool for scraping web pages with HTML storage"""
    
    name = "web_scraper"
    description = "Scrapes a URL and returns the HTML content. Use this to retrieve web pages."
    
    def _run(self, url: str, timeout: int = 30) -> str:
        """
        Scrapes a URL and stores the HTML content in the database
        
        Args:
            url: The URL to scrape
            timeout: Timeout in seconds
            
        Returns:
            A string containing the HTML content
        """
        try:
            logging.info(f"Scraping URL: {url}")
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
            
            # Make request with redirects
            response = requests.get(url, headers=headers, timeout=timeout, allow_redirects=True)
            
            # Check for successful response
            if response.status_code != 200:
                logging.error(f"Failed to scrape {url}, status code: {response.status_code}")
                return f"Failed to scrape {url}, status code: {response.status_code}"
            
            # Get final URL after redirects
            final_url = response.url
            html_content = response.text
            
            # Extract machine_id from context if available
            machine_id = None
            if hasattr(self, 'machine_id'):
                machine_id = self.machine_id
            elif isinstance(self.context, dict) and 'machine_id' in self.context:
                machine_id = self.context['machine_id']
            
            # Store HTML content if machine_id is available
            if machine_id:
                asyncio.create_task(store_html_content(
                    machine_id=machine_id,
                    html_content=html_content,
                    scraped_url=url,
                    final_url=final_url,
                    scrape_success=True
                ))
            
            logging.info(f"Successfully scraped URL: {url}, final URL: {final_url}")
            return html_content
        except Exception as e:
            error_message = f"Error scraping {url}: {str(e)}"
            logging.error(error_message)
            
            # Store failure information if machine_id is available
            if machine_id:
                asyncio.create_task(store_html_content(
                    machine_id=machine_id,
                    html_content=str(e),
                    scraped_url=url,
                    final_url="",
                    scrape_success=False
                ))
            
            return error_message 