"""
DOM Analysis utility module to enhance the price extraction data collection.

This module provides utilities to analyze HTML content and extract detailed 
information about DOM structure, elements, and where price information was found.
These details are used to enhance price_history records with more complete
audit information as specified in the PRD.
"""

from bs4 import BeautifulSoup
from typing import Dict, Any, List, Optional, Tuple
import re
import json
from loguru import logger
import time


class DOMAnalyzer:
    """Analyzer for extracting detailed DOM information for price extraction auditing."""
    
    def __init__(self):
        """Initialize the DOM analyzer."""
        # Common price-related selectors
        self.price_selectors = [
            ".price", "#price", ".product-price", ".offer-price", 
            ".current-price", ".sale-price", "[data-price]",
            ".price-box", ".woocommerce-Price-amount", ".amount",
            "[itemprop='price']", ".price-sales", ".special-price"
        ]
        
        # Price-related regex patterns
        self.price_patterns = [
            r'\$\s*([\d,]+\.?\d*)',  # $1,234.56
            r'USD\s*([\d,]+\.?\d*)',  # USD 1,234.56
            r'([\d,]+\.?\d*)\s*USD',  # 1,234.56 USD
            r'€\s*([\d,]+\.?\d*)',    # €1,234.56
            r'EUR\s*([\d,]+\.?\d*)',  # EUR 1,234.56
            r'([\d,]+\.?\d*)\s*EUR',  # 1,234.56 EUR
            r'£\s*([\d,]+\.?\d*)',    # £1,234.56
            r'GBP\s*([\d,]+\.?\d*)',  # GBP 1,234.56
            r'([\d,]+\.?\d*)\s*GBP'   # 1,234.56 GBP
        ]
    
    def analyze_html(self, html_content: str) -> Dict[str, Any]:
        """
        Analyze HTML content to extract detailed DOM information.
        
        Args:
            html_content: The HTML content to analyze
            
        Returns:
            Dict containing detailed DOM analysis information
        """
        start_time = time.time()
        metadata = {
            "dom_elements_analyzed": 0,
            "price_elements_found": 0,
            "structured_data_count": 0,
            "price_location_in_dom": None,
            "structured_data_type": None,
            "selectors_tried": self.price_selectors.copy(),
            "dom_analysis_duration_seconds": 0
        }
        
        try:
            # Parse HTML content
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Count total elements
            all_elements = list(soup.find_all())
            metadata["dom_elements_analyzed"] = len(all_elements)
            
            # Find structured data
            json_ld_scripts = soup.find_all('script', type='application/ld+json')
            metadata["structured_data_count"] = len(json_ld_scripts)
            
            if len(json_ld_scripts) > 0:
                metadata["structured_data_type"] = "JSON-LD"
            
            # Check for microdata
            microdata_elements = soup.find_all(attrs={"itemprop": True})
            if len(microdata_elements) > 0:
                metadata["structured_data_type"] = metadata.get("structured_data_type", "") + "|Microdata"
            
            # Find potential price elements
            price_elements = []
            for selector in self.price_selectors:
                elements = soup.select(selector)
                if elements:
                    price_elements.extend(elements)
                    
                    # Get parent chain for the first price element found
                    if metadata["price_location_in_dom"] is None and len(elements) > 0:
                        metadata["price_location_in_dom"] = self._get_element_path(elements[0])
            
            metadata["price_elements_found"] = len(price_elements)
            
            # Look for price patterns in text nodes
            if not metadata["price_location_in_dom"]:
                for pattern in self.price_patterns:
                    matches = re.findall(pattern, html_content)
                    if matches:
                        # Try to find the element containing this price text
                        price_text = matches[0]
                        containing_element = self._find_element_with_text(soup, price_text)
                        if containing_element:
                            metadata["price_location_in_dom"] = self._get_element_path(containing_element)
                            break
        except Exception as e:
            logger.error(f"Error during DOM analysis: {str(e)}")
        
        # Calculate duration
        metadata["dom_analysis_duration_seconds"] = time.time() - start_time
        
        return metadata
    
    def analyze_extraction_method(self, method: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Enhance metadata based on the extraction method used.
        
        Args:
            method: The extraction method string
            metadata: Existing metadata to enhance
            
        Returns:
            Enhanced metadata dictionary
        """
        enhanced = metadata.copy()
        
        # Parse the method to get more details
        if method.startswith("STATIC_STRUCTURED_DATA"):
            enhanced["structured_data_type"] = enhanced.get("structured_data_type", "Unknown")
            
            # Parse out the specific path used if available
            path_match = re.search(r'STATIC_STRUCTURED_DATA:([^:]+)(:(.+))?', method)
            if path_match and path_match.group(3):
                enhanced["structured_data_path"] = path_match.group(3)
        
        elif method.startswith("STATIC_CUSTOM_SELECTOR"):
            selector_match = re.search(r'STATIC_CUSTOM_SELECTOR:(.+)', method)
            if selector_match:
                enhanced["custom_selector_used"] = selector_match.group(1)
                enhanced["price_location_in_dom"] = enhanced.get("price_location_in_dom", selector_match.group(1))
        
        elif method.startswith("JS_"):
            enhanced["js_interaction_required"] = True
            
            if "META_TAG" in method:
                enhanced["js_extraction_type"] = "Meta Tag"
            elif "DOM_" in method:
                enhanced["js_extraction_type"] = "DOM Element"
            elif "API_" in method:
                enhanced["js_extraction_type"] = "API Request"
        
        elif method.startswith("SLICE_"):
            enhanced["slice_extraction"] = True
            
            if "FAST" in method:
                enhanced["slice_model"] = "Claude Haiku"
            elif "BALANCED" in method:
                enhanced["slice_model"] = "Claude Sonnet"
        
        elif method.startswith("FULL_HTML"):
            enhanced["full_html_extraction"] = True
            enhanced["html_model"] = "GPT-4o"
        
        return enhanced
    
    def _get_element_path(self, element) -> str:
        """
        Generate a CSS-like path to the given BeautifulSoup element.
        
        Args:
            element: BeautifulSoup element
            
        Returns:
            String representation of the element's path
        """
        path_parts = []
        current = element
        
        max_depth = 5  # Limit path depth to avoid excessive length
        depth = 0
        
        while current and current.name and depth < max_depth:
            # Get element name
            selector = current.name
            
            # Add id if present
            if current.get('id'):
                selector += f"#{current['id']}"
            # Add first class if present
            elif current.get('class') and current['class']:
                selector += f".{current['class'][0]}"
            
            path_parts.append(selector)
            current = current.parent
            depth += 1
        
        # Reverse to get path from top to bottom
        path_parts.reverse()
        return " > ".join(path_parts)
    
    def _find_element_with_text(self, soup, text):
        """
        Find an element containing the specified text.
        
        Args:
            soup: BeautifulSoup object
            text: Text to find
            
        Returns:
            BeautifulSoup element or None
        """
        # Try exact match first
        for element in soup.find_all(string=lambda s: text in str(s)):
            return element.parent
        
        # Try approximate match (substring) if not found
        for element in soup.find_all(string=lambda s: text.replace(",", "") in str(s).replace(",", "")):
            return element.parent
        
        return None 