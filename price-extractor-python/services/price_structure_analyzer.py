"""
Price Structure Analyzer

This module provides tools for analyzing e-commerce pages to identify price structures
including sales, discounts, and price relationships, with no hardcoded site-specific logic.
"""

import re
from bs4 import BeautifulSoup, Tag, NavigableString
from loguru import logger
from typing import Dict, Any, Optional, Tuple, List
from decimal import Decimal, InvalidOperation

class PriceStructureAnalyzer:
    """
    Analyzes e-commerce HTML to extract price structures and relationships
    regardless of the specific site structure or CSS classes.
    
    Instead of relying on CSS classes or site-specific logic, this analyzer
    uses common price patterns, visual prominence, and semantic relationships
    to identify current prices, sale prices, and discounts.
    """
    
    def __init__(self):
        """Initialize the price structure analyzer."""
        # Regular expressions for price matching
        self.price_patterns = [
            # Common price formats (with currency symbol)
            r'\$\s*[\d,]+\.?\d*',  # $1,299.99 or $1,299
            r'€\s*[\d,]+\.?\d*',  # €1,299.99 or €1,299
            r'£\s*[\d,]+\.?\d*',  # £1,299.99 or £1,299
            
            # Currency with code
            r'\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?\s+USD',  # 1,299.99 USD
            r'\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?\s+EUR',  # 1,299.99 EUR
            r'\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?\s+GBP',  # 1,299.99 GBP
            
            # Prices with labels
            r'Price:?\s*\$?\s*[\d,]+\.?\d*',  # Price: $1,299.99
            r'Sale:?\s*\$?\s*[\d,]+\.?\d*',   # Sale: $1,299.99
            r'Now:?\s*\$?\s*[\d,]+\.?\d*',    # Now: $1,299.99
        ]
        
        # Regular expressions for discount/save patterns
        self.discount_patterns = [
            r'Save\s+\$\s*[\d,]+\.?\d*',      # Save $750
            r'[\d,]+\.?\d*%\s+off',           # 25% off
            r'[\d,]+\.?\d*\s+%\s+discount',   # 25 % discount
            r'Discount:?\s*\$\s*[\d,]+\.?\d*' # Discount: $750
        ]
        
        # Patterns for identifying original/regular prices
        self.original_price_patterns = [
            r'(?:Original|Regular|Was|List|Retail)(?:\s+[Pp]rice)?:?\s*\$\s*[\d,]+\.?\d*',  # Original price: $1,299.99
            r'Compare\s+at:?\s*\$\s*[\d,]+\.?\d*',     # Compare at: $1,299.99
            r'MSRP:?\s*\$\s*[\d,]+\.?\d*',             # MSRP: $1,299.99
        ]
        
        # Structural HTML tags that might indicate price relationships
        self.structural_tags = {
            'del': 'original',     # <del>$2,599.00</del> - usually indicates old price
            's': 'original',       # <s>$2,599.00</s> - usually indicates old price 
            'strike': 'original',  # <strike>$2,599.00</strike> - usually indicates old price
            'ins': 'current',      # <ins>$1,849.00</ins> - usually indicates current/sale price
            'em': 'highlight',     # <em>$1,849.00</em> - often used to highlight price
            'strong': 'highlight', # <strong>$1,849.00</strong> - often used to highlight price
            'b': 'highlight',      # <b>$1,849.00</b> - often used to highlight price
        }
    
    def extract_price_structure(self, html_content: str) -> Dict[str, Any]:
        """
        Extract price structure from HTML content.
        
        Args:
            html_content: HTML content of the page
            
        Returns:
            Dictionary with price structure information including:
            - current_price: The current price (sale price if available)
            - original_price: The original price (before discount)
            - discount_amount: The discount amount
            - discount_percentage: The discount percentage
            - currency: The currency code
            - confidence: Confidence score in the extraction
            - extraction_method: The method used for extraction
        """
        if not html_content:
            return self._create_result(None, None, None, 0.0, "empty_html")
        
        try:
            # Parse HTML
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Get price information using various methods (in order of reliability)
            result = self._extract_price_from_structured_data(soup)
            if result and result["current_price"] and result["confidence"] > 0.85:
                return result
                
            result = self._extract_price_from_price_patterns(soup)
            if result and result["current_price"] and result["confidence"] > 0.8:
                return result
                
            result = self._extract_price_from_visual_structure(soup)
            if result and result["current_price"] and result["confidence"] > 0.7:
                return result
            
            # If all else fails, try to extract any prices with low confidence
            result = self._extract_any_prices(soup)
            if result and result["current_price"]:
                return result
                
            # No price found
            return self._create_result(None, None, None, 0.0, "no_price_found")
            
        except Exception as e:
            logger.error(f"Error extracting price structure: {str(e)}")
            return self._create_result(None, None, None, 0.0, f"error: {str(e)}")
    
    def _extract_price_from_structured_data(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """
        Extract price from structured data (JSON-LD, microdata).
        
        Args:
            soup: BeautifulSoup object
            
        Returns:
            Dictionary with price structure information
        """
        # Try to extract from JSON-LD
        for script in soup.find_all('script', {'type': 'application/ld+json'}):
            try:
                import json
                data = json.loads(script.string)
                
                # Check if this is a product
                if isinstance(data, dict) and 'offers' in data:
                    offers = data['offers']
                    if isinstance(offers, dict):
                        price = offers.get('price')
                        currency = offers.get('priceCurrency', 'USD')
                        
                        if price:
                            try:
                                price_decimal = Decimal(str(price))
                                
                                # Look for price specification for original price
                                original_price = None
                                if 'priceSpecification' in offers:
                                    price_spec = offers['priceSpecification']
                                    if isinstance(price_spec, dict) and 'price' in price_spec:
                                        original_price = Decimal(str(price_spec['price']))
                                
                                # Calculate discount if both prices are available
                                discount_amount = None
                                discount_percentage = None
                                if original_price and original_price > price_decimal:
                                    discount_amount = original_price - price_decimal
                                    discount_percentage = (discount_amount / original_price) * 100
                                
                                return self._create_result(
                                    price_decimal, 
                                    original_price, 
                                    discount_amount,
                                    0.95, 
                                    "json_ld", 
                                    currency
                                )
                            except (InvalidOperation, ValueError):
                                pass
            except:
                continue
        
        # Try to extract from microdata
        for elem in soup.find_all(attrs={"itemprop": "price"}):
            try:
                price_str = elem.get('content') or elem.text
                price = Decimal(price_str.strip().replace(',', '').replace('$', ''))
                
                # Try to find currency
                currency_elem = soup.find(attrs={"itemprop": "priceCurrency"})
                currency = currency_elem.get('content') if currency_elem else 'USD'
                
                # Look for original price in nearby elements
                original_price = self._find_original_price_near(elem)
                
                # Calculate discount if both prices are available
                discount_amount = None
                discount_percentage = None
                if original_price and original_price > price:
                    discount_amount = original_price - price
                    discount_percentage = (discount_amount / original_price) * 100
                
                return self._create_result(
                    price, 
                    original_price, 
                    discount_amount,
                    0.9, 
                    "microdata", 
                    currency
                )
            except (InvalidOperation, ValueError, AttributeError):
                continue
        
        # No structured data found
        return self._create_result(None, None, None, 0.0, "no_structured_data")
    
    def _extract_price_from_price_patterns(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """
        Extract price based on common price patterns and relationships.
        
        Args:
            soup: BeautifulSoup object
            
        Returns:
            Dictionary with price structure information
        """
        # 1. Look for elements with discount indicators - most reliable
        for element in soup.find_all(['div', 'span', 'p', 'section', 'li']):
            text = element.get_text().strip()
            
            # Check if this element has discount indication
            has_discount = any(re.search(pattern, text, re.IGNORECASE) for pattern in self.discount_patterns)
            if has_discount:
                # Extract all prices in this element
                prices = self._extract_prices_from_text(text)
                if len(prices) >= 2:
                    # In discount patterns, lower price is usually current price
                    prices.sort()
                    current_price = prices[0]
                    original_price = prices[-1]
                    
                    # Confirm the prices make sense (current < original)
                    if current_price >= original_price:
                        current_price, original_price = original_price, current_price
                    
                    discount_amount = original_price - current_price
                    discount_percentage = (discount_amount / original_price) * 100
                    
                    return self._create_result(
                        current_price, 
                        original_price, 
                        discount_amount,
                        0.9, 
                        "discount_pattern"
                    )
                elif len(prices) == 1:
                    # Try to extract discount amount from text
                    discount_amount = self._extract_discount_amount(text)
                    if discount_amount:
                        # If we have the current price and discount amount, we can calculate the original price
                        current_price = prices[0]
                        original_price = current_price + discount_amount
                        discount_percentage = (discount_amount / original_price) * 100
                        
                        return self._create_result(
                            current_price, 
                            original_price, 
                            discount_amount,
                            0.85, 
                            "discount_amount_pattern"
                        )
        
        # 2. Look for elements with both original price patterns and regular prices
        for element in soup.find_all(['div', 'span', 'p', 'section', 'li']):
            text = element.get_text().strip()
            
            # Check if this element has original price indication
            has_original_price = any(re.search(pattern, text, re.IGNORECASE) for pattern in self.original_price_patterns)
            if has_original_price:
                # Extract all prices in this element
                all_prices = self._extract_all_prices_from_element(element)
                if len(all_prices) >= 2:
                    # First, try to identify which is original and which is current
                    original_price = None
                    current_price = None
                    
                    for price_info in all_prices:
                        if price_info["type"] == "original":
                            original_price = price_info["price"]
                        elif price_info["type"] == "current":
                            current_price = price_info["price"]
                    
                    # If we couldn't identify them by type, assume the largest price is original
                    if original_price is None or current_price is None:
                        prices = [p["price"] for p in all_prices]
                        prices.sort()
                        if len(prices) >= 2:
                            current_price = prices[0]
                            original_price = prices[-1]
                    
                    if current_price and original_price:
                        discount_amount = original_price - current_price
                        discount_percentage = (discount_amount / original_price) * 100
                        
                        return self._create_result(
                            current_price, 
                            original_price, 
                            discount_amount,
                            0.85, 
                            "original_price_pattern"
                        )
        
        # 3. Look for multiple prices in price containers
        price_containers = soup.select('.price, .product-price, .price-container, .product__price, [class*="price"]')
        for container in price_containers:
            all_prices = self._extract_all_prices_from_element(container)
            if len(all_prices) >= 2:
                # Try to identify which is original and which is current
                original_price = None
                current_price = None
                
                for price_info in all_prices:
                    if price_info["type"] == "original":
                        original_price = price_info["price"]
                    elif price_info["type"] == "current":
                        current_price = price_info["price"]
                
                # If we couldn't identify them by type, use price comparison
                if original_price is None or current_price is None:
                    prices = [p["price"] for p in all_prices]
                    prices.sort()
                    if len(prices) >= 2:
                        current_price = prices[0]
                        original_price = prices[-1]
                
                if current_price and original_price:
                    discount_amount = original_price - current_price
                    discount_percentage = (discount_amount / original_price) * 100
                    
                    return self._create_result(
                        current_price, 
                        original_price, 
                        discount_amount,
                        0.8, 
                        "price_container"
                    )
            elif len(all_prices) == 1:
                # If only one price is found in a designated price container, it's likely the current price
                current_price = all_prices[0]["price"]
                return self._create_result(
                    current_price, 
                    None, 
                    None,
                    0.7, 
                    "single_price_container"
                )
        
        # No matching price patterns found
        return self._create_result(None, None, None, 0.0, "no_price_patterns")
    
    def _extract_price_from_visual_structure(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """
        Extract price from visual structure like strikethrough, highlight, etc.
        
        Args:
            soup: BeautifulSoup object
            
        Returns:
            Dictionary with price structure information
        """
        # Look for elements with strikethrough
        strikethrough_elements = soup.find_all(['del', 's', 'strike'])
        for strike_elem in strikethrough_elements:
            # Find the price in the strikethrough element
            strike_price = self._extract_price_from_element(strike_elem)
            if strike_price:
                # Strikethrough prices are usually original prices
                # Look for current price nearby (siblings, parent's children)
                current_price = self._find_current_price_near(strike_elem)
                if current_price:
                    discount_amount = strike_price - current_price
                    discount_percentage = (discount_amount / strike_price) * 100
                    
                    return self._create_result(
                        current_price, 
                        strike_price, 
                        discount_amount,
                        0.85, 
                        "strikethrough"
                    )
        
        # Look for elements with highlight tags (strong, em, b) that might contain current price
        highlight_elements = soup.find_all(['strong', 'em', 'b'])
        for highlight_elem in highlight_elements:
            # Find the price in the highlight element
            price = self._extract_price_from_element(highlight_elem)
            if price:
                # Highlighted prices are usually current prices
                # Look for original price nearby (siblings, parent's children)
                original_price = self._find_original_price_near(highlight_elem)
                if original_price:
                    discount_amount = original_price - price
                    discount_percentage = (discount_amount / original_price) * 100
                    
                    return self._create_result(
                        price, 
                        original_price, 
                        discount_amount,
                        0.8, 
                        "highlight"
                    )
                else:
                    # If no original price found, assume this is current price
                    return self._create_result(
                        price, 
                        None, 
                        None,
                        0.7, 
                        "highlight_solo"
                    )
        
        # No visual structure found
        return self._create_result(None, None, None, 0.0, "no_visual_structure")
    
    def _extract_any_prices(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """
        Extract any prices from the page as a last resort.
        
        Args:
            soup: BeautifulSoup object
            
        Returns:
            Dictionary with price structure information
        """
        # Find all text containing dollar signs
        prices = []
        for text in soup.find_all(text=re.compile(r'\$\s*[\d,]+\.?\d*')):
            try:
                price_text = text.strip()
                price_match = re.search(r'\$\s*([\d,]+\.?\d*)', price_text)
                if price_match:
                    price_str = price_match.group(1).replace(',', '')
                    price = Decimal(price_str)
                    if 10 <= price <= 10000:  # Reasonable price range
                        prices.append(price)
            except (InvalidOperation, ValueError, AttributeError):
                continue
        
        if prices:
            # If multiple prices found, use lowest as current and highest as original
            if len(prices) >= 2:
                prices.sort()
                return self._create_result(
                    prices[0], 
                    prices[-1], 
                    prices[-1] - prices[0],
                    0.6, 
                    "multiple_prices"
                )
            else:
                # Only one price found
                return self._create_result(
                    prices[0], 
                    None, 
                    None,
                    0.5, 
                    "single_price"
                )
        
        # No prices found
        return self._create_result(None, None, None, 0.0, "no_prices")
    
    def _extract_price_from_element(self, element: Tag) -> Optional[Decimal]:
        """
        Extract the price from an element.
        
        Args:
            element: BeautifulSoup element
            
        Returns:
            Decimal price or None if no price found
        """
        if not element:
            return None
            
        text = element.get_text().strip()
        for pattern in self.price_patterns:
            match = re.search(pattern, text)
            if match:
                try:
                    # Extract just the digits and decimal point
                    price_text = match.group(0)
                    price_str = re.sub(r'[^\d.]', '', price_text)
                    return Decimal(price_str)
                except (InvalidOperation, ValueError):
                    continue
        
        return None
    
    def _extract_prices_from_text(self, text: str) -> List[Decimal]:
        """
        Extract all prices from a text string.
        
        Args:
            text: Text to extract prices from
            
        Returns:
            List of Decimal prices
        """
        prices = []
        for pattern in self.price_patterns:
            matches = re.finditer(pattern, text)
            for match in matches:
                try:
                    # Extract just the digits and decimal point
                    price_text = match.group(0)
                    price_str = re.sub(r'[^\d.]', '', price_text)
                    price = Decimal(price_str)
                    prices.append(price)
                except (InvalidOperation, ValueError):
                    continue
        
        return prices
    
    def _extract_all_prices_from_element(self, element: Tag) -> List[Dict[str, Any]]:
        """
        Extract all prices from an element and its children.
        
        Args:
            element: BeautifulSoup element
            
        Returns:
            List of dictionaries with price and type
        """
        prices = []
        
        # Process this element if it has a price
        price = self._extract_price_from_element(element)
        if price:
            price_type = "unknown"
            
            # Check element type for clues
            if element.name in self.structural_tags:
                price_type = self.structural_tags[element.name]
            
            # Check classes for clues
            if element.has_attr('class'):
                classes = element.get('class', [])
                class_str = ' '.join(classes).lower()
                
                if any(term in class_str for term in ['sale', 'discount', 'current', 'now']):
                    price_type = "current"
                elif any(term in class_str for term in ['original', 'regular', 'was', 'compare']):
                    price_type = "original"
            
            prices.append({
                "price": price,
                "type": price_type,
                "element": element.name
            })
        
        # Process all children recursively
        for child in element.children:
            if isinstance(child, Tag):
                child_prices = self._extract_all_prices_from_element(child)
                prices.extend(child_prices)
        
        return prices
    
    def _extract_discount_amount(self, text: str) -> Optional[Decimal]:
        """
        Extract discount amount from text.
        
        Args:
            text: Text to extract discount from
            
        Returns:
            Decimal discount amount or None if no discount found
        """
        for pattern in self.discount_patterns:
            match = re.search(pattern, text)
            if match:
                try:
                    # Extract just the digits and decimal point
                    discount_text = match.group(0)
                    discount_str = re.sub(r'[^\d.]', '', discount_text)
                    return Decimal(discount_str)
                except (InvalidOperation, ValueError):
                    continue
        
        return None
    
    def _find_current_price_near(self, element: Tag) -> Optional[Decimal]:
        """
        Find the current price near an element.
        
        Args:
            element: BeautifulSoup element
            
        Returns:
            Decimal price or None if no price found
        """
        # Check siblings
        next_sibling = element.next_sibling
        while next_sibling:
            if isinstance(next_sibling, Tag):
                price = self._extract_price_from_element(next_sibling)
                if price:
                    return price
            next_sibling = next_sibling.next_sibling
        
        # Check parent's children
        parent = element.parent
        if parent:
            for child in parent.children:
                if child != element and isinstance(child, Tag):
                    price = self._extract_price_from_element(child)
                    if price:
                        return price
        
        # Check for "current price" indicator in nearby elements
        parent = element.parent
        if parent:
            for sibling in parent.children:
                if isinstance(sibling, Tag):
                    if sibling != element:
                        # Check if this sibling has classes that hint at current price
                        if sibling.has_attr('class'):
                            classes = sibling.get('class', [])
                            class_str = ' '.join(classes).lower()
                            if any(term in class_str for term in ['sale', 'discount', 'current', 'now']):
                                price = self._extract_price_from_element(sibling)
                                if price:
                                    return price
                        
                        # Check if this sibling has highlight tags that might contain current price
                        for highlight_tag in sibling.find_all(['strong', 'em', 'b', 'ins']):
                            price = self._extract_price_from_element(highlight_tag)
                            if price:
                                return price
        
        return None
    
    def _find_original_price_near(self, element: Tag) -> Optional[Decimal]:
        """
        Find the original price near an element.
        
        Args:
            element: BeautifulSoup element
            
        Returns:
            Decimal price or None if no price found
        """
        # Check for strikethrough elements near this element
        parent = element.parent
        if parent:
            # Look for del, s, or strike tags
            for strike_elem in parent.find_all(['del', 's', 'strike']):
                price = self._extract_price_from_element(strike_elem)
                if price:
                    return price
            
            # Look for "original price" indicator in siblings
            for sibling in parent.children:
                if isinstance(sibling, Tag) and sibling != element:
                    # Check if this sibling has classes that hint at original price
                    if sibling.has_attr('class'):
                        classes = sibling.get('class', [])
                        class_str = ' '.join(classes).lower()
                        if any(term in class_str for term in ['original', 'regular', 'was', 'compare']):
                            price = self._extract_price_from_element(sibling)
                            if price:
                                return price
        
        # Check previous siblings
        prev_sibling = element.previous_sibling
        while prev_sibling:
            if isinstance(prev_sibling, Tag):
                price = self._extract_price_from_element(prev_sibling)
                if price:
                    return price
            prev_sibling = prev_sibling.previous_sibling
        
        return None
    
    def _create_result(self, current_price: Optional[Decimal], original_price: Optional[Decimal], 
                     discount_amount: Optional[Decimal], confidence: float, 
                     extraction_method: str, currency: str = "USD") -> Dict[str, Any]:
        """
        Create result dictionary with price structure information.
        
        Args:
            current_price: Current price
            original_price: Original price
            discount_amount: Discount amount
            confidence: Confidence score
            extraction_method: Method used for extraction
            currency: Currency code
            
        Returns:
            Dictionary with price structure information
        """
        discount_percentage = None
        if original_price and discount_amount:
            discount_percentage = (discount_amount / original_price) * 100
            
        return {
            "current_price": current_price,
            "original_price": original_price,
            "discount_amount": discount_amount,
            "discount_percentage": discount_percentage,
            "currency": currency,
            "confidence": confidence,
            "extraction_method": extraction_method
        } 