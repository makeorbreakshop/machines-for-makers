"""
Multi-tier price extraction service that handles various extraction methods.
"""
import asyncio
import time
from typing import Dict, Any, Optional, List, Tuple
from decimal import Decimal
from loguru import logger

from services.html_parser import HtmlParser
from services.simple_parser import SimpleParser
from services.js_parser import JSParser
from services.full_html_parser import FullHtmlParser

class PriceExtractor:
    """
    PriceExtractor handles extraction of prices from product pages using multiple methods.
    It tries different extraction approaches in order of complexity and cost.
    """
    
    def __init__(self):
        """Initialize the price extractor with all available extraction methods."""
        self.html_parser = HtmlParser()
        self.simple_parser = SimpleParser()
        self.js_parser = JSParser()
        self.full_html_parser = FullHtmlParser()
        
        logger.info("PriceExtractor initialized with all extraction methods")
    
    async def extract_price(self, 
                           url: str, 
                           html_content: str, 
                           include_js_check: bool = True,
                           include_full_html: bool = True,
                           variant_attribute: str = "DEFAULT") -> Dict[str, Any]:
        """
        Extract price from a product page using multiple methods in sequence.
        
        Args:
            url: URL of the product page
            html_content: HTML content of the page
            include_js_check: Whether to include JavaScript-based extraction
            include_full_html: Whether to include full HTML advanced extraction
            variant_attribute: Variant attribute to extract price for (if any)
            
        Returns:
            Dict containing extraction results and metadata
        """
        start_time = time.time()
        extraction_result = {
            "url": url,
            "price": None,
            "currency": "USD",
            "extraction_method": "NONE",
            "confidence": 0.0,
            "extraction_time": 0,
            "variant_attribute": variant_attribute,
            "extraction_details": {},
            "extraction_error": None
        }
        
        try:
            # Step 1: Try simple HTML extraction first (regex patterns)
            logger.info(f"Attempting simple HTML extraction for {url}")
            price, method, confidence = self.simple_parser.extract(html_content, url)
            
            if price is not None:
                logger.info(f"Successfully extracted price {price} using {method}")
                extraction_result["price"] = float(price)
                extraction_result["extraction_method"] = method
                extraction_result["confidence"] = confidence
                extraction_result["extraction_details"]["simple_html"] = {
                    "success": True
                }
                extraction_result["extraction_time"] = time.time() - start_time
                return extraction_result
            
            # Step 2: Try advanced HTML extraction
            logger.info(f"Attempting advanced HTML extraction for {url}")
            price, method, confidence = self.html_parser.extract(html_content, url, variant_attribute)
            
            if price is not None:
                logger.info(f"Successfully extracted price {price} using {method}")
                extraction_result["price"] = float(price)
                extraction_result["extraction_method"] = method
                extraction_result["confidence"] = confidence
                extraction_result["extraction_details"]["advanced_html"] = {
                    "success": True
                }
                extraction_result["extraction_time"] = time.time() - start_time
                return extraction_result
            
            # Step 3: JavaScript extraction if enabled
            if include_js_check:
                logger.info(f"Attempting JavaScript extraction for {url}")
                price, method, confidence, js_details = await self.js_parser.extract(url, html_content, variant_attribute)
                
                if price is not None:
                    logger.info(f"Successfully extracted price {price} using {method}")
                    extraction_result["price"] = float(price)
                    extraction_result["extraction_method"] = method
                    extraction_result["confidence"] = confidence
                    extraction_result["extraction_details"]["javascript"] = js_details
                    extraction_result["extraction_time"] = time.time() - start_time
                    return extraction_result
            
            # Step 4: Full HTML extraction with GPT-4o if enabled
            if include_full_html and self.full_html_parser.available:
                logger.info(f"Attempting full HTML extraction with GPT-4o for {url}")
                price, method, confidence, llm_usage_data = await self.full_html_parser.extract(
                    html_content, url, variant_attribute
                )
                
                if price is not None:
                    logger.info(f"Successfully extracted price {price} using {method}")
                    extraction_result["price"] = float(price)
                    extraction_result["extraction_method"] = method
                    extraction_result["confidence"] = confidence
                    extraction_result["extraction_details"]["full_html"] = llm_usage_data
                    # If currency was detected, update it
                    if "currency" in llm_usage_data:
                        extraction_result["currency"] = llm_usage_data["currency"]
                    extraction_result["extraction_time"] = time.time() - start_time
                    return extraction_result
            
            # No price found with any method
            logger.warning(f"Failed to extract price from {url} using all available methods")
            extraction_result["extraction_error"] = "NO_PRICE_FOUND"
            extraction_result["extraction_time"] = time.time() - start_time
            return extraction_result
            
        except Exception as e:
            logger.error(f"Error extracting price: {str(e)}")
            extraction_result["extraction_error"] = str(e)
            extraction_result["extraction_time"] = time.time() - start_time
            return extraction_result
    
    async def batch_extract_prices(self, 
                                  urls_with_html: List[Tuple[str, str]], 
                                  include_js_check: bool = True,
                                  include_full_html: bool = True) -> List[Dict[str, Any]]:
        """
        Extract prices from multiple product pages in parallel.
        
        Args:
            urls_with_html: List of (url, html_content) tuples
            include_js_check: Whether to include JavaScript-based extraction
            include_full_html: Whether to include full HTML advanced extraction
            
        Returns:
            List of extraction result dictionaries
        """
        tasks = []
        for url, html_content in urls_with_html:
            task = asyncio.create_task(
                self.extract_price(url, html_content, include_js_check, include_full_html)
            )
            tasks.append(task)
        
        return await asyncio.gather(*tasks)
        
    async def extract_price_with_retries(self, 
                                        url: str, 
                                        html_content: str,
                                        include_js_check: bool = True,
                                        include_full_html: bool = True,
                                        max_retries: int = 2) -> Dict[str, Any]:
        """
        Extract price with automatic retries.
        
        Args:
            url: URL of the product page
            html_content: HTML content of the page
            include_js_check: Whether to include JavaScript-based extraction
            include_full_html: Whether to include full HTML advanced extraction
            max_retries: Maximum number of retries
            
        Returns:
            Dict containing extraction results and metadata
        """
        retries = 0
        last_error = None
        
        while retries <= max_retries:
            try:
                result = await self.extract_price(
                    url, 
                    html_content,
                    include_js_check,
                    include_full_html
                )
                
                if result["price"] is not None:
                    if retries > 0:
                        result["extraction_details"]["retries"] = retries
                    return result
                
                # No price found, try again with next tier if available
                if retries < max_retries:
                    logger.info(f"Retrying price extraction for {url} (attempt {retries + 1}/{max_retries})")
                    retries += 1
                    # Add small delay between retries
                    await asyncio.sleep(1)
                else:
                    # Max retries reached
                    result["extraction_details"]["retries"] = retries
                    return result
                    
            except Exception as e:
                logger.error(f"Error during retry {retries} for {url}: {str(e)}")
                last_error = str(e)
                retries += 1
                await asyncio.sleep(1)
        
        # If we get here, all retries failed
        return {
            "url": url,
            "price": None,
            "extraction_method": "FAILED",
            "confidence": 0.0,
            "extraction_time": 0,
            "extraction_details": {"retries": retries},
            "extraction_error": last_error or "MAX_RETRIES_EXCEEDED"
        } 