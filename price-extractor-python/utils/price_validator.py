"""
Price validator module for validating extracted prices.

This module provides validation rules for extracted prices based on:
1. Product category price ranges
2. Position-based validation (proximity to "Add to Cart" buttons)
3. Historical price change thresholds
4. Suspicious price detection (unusually low/high prices)
"""

import re
from bs4 import BeautifulSoup
from loguru import logger
from decimal import Decimal

class PriceValidator:
    """
    Validates extracted prices using multiple validation rules.
    """
    
    def __init__(self):
        """Initialize price validator with default validation rules."""
        # Price range validation by category (in USD)
        self.category_price_ranges = {
            "3d_printer": {"min": 100, "max": 50000},
            "cnc_machine": {"min": 300, "max": 100000},
            "laser_cutter": {"min": 300, "max": 80000},
            "embroidery_machine": {"min": 150, "max": 20000},
            "sewing_machine": {"min": 50, "max": 15000},
            "vinyl_cutter": {"min": 80, "max": 10000},
            "woodworking": {"min": 100, "max": 30000},
            "other": {"min": 10, "max": 100000}  # Default fallback
        }
        
        # Price change thresholds that would trigger suspicion
        self.price_change_thresholds = {
            "absolute": 500,  # $500 absolute change is suspicious
            "percentage": 40,  # 40% change is suspicious
            "doubt_threshold": 40  # % change that triggers Claude verification
        }
        
        # Words indicating proximity to price
        self.proximity_indicators = [
            "add to cart",
            "buy now",
            "purchase",
            "checkout",
            "add to bag",
            "shop now",
            "order now"
        ]
        
        logger.info("Price validator initialized with default validation rules")
    
    def validate_price(self, price, product_category=None, previous_price=None, soup=None):
        """
        Validate an extracted price using multiple validation rules.
        
        Args:
            price (float): The extracted price to validate.
            product_category (str, optional): Category of the product for range validation.
            previous_price (float, optional): Previously known price for change validation.
            soup (BeautifulSoup, optional): Parsed HTML for position validation.
            
        Returns:
            dict: Validation result containing validity and confidence scores.
        """
        validation_results = {
            "is_valid": True,
            "confidence": 1.0,
            "issues": [],
            "needs_verification": False
        }
        
        # Validate price is a positive number
        if price is None or price <= 0:
            validation_results["is_valid"] = False
            validation_results["confidence"] = 0
            validation_results["issues"].append("Price is None or negative")
            return validation_results
        
        # Apply category-based range validation
        if product_category:
            range_result = self.validate_price_range(price, product_category)
            validation_results["confidence"] *= range_result["confidence"]
            if not range_result["is_valid"]:
                validation_results["is_valid"] = False
                validation_results["issues"].append(range_result["issue"])
        
        # Apply price change validation if previous price is available
        if previous_price is not None and previous_price > 0:
            change_result = self.validate_price_change(price, previous_price)
            validation_results["confidence"] *= change_result["confidence"]
            if change_result["needs_verification"]:
                validation_results["needs_verification"] = True
                validation_results["issues"].append(change_result["issue"])
        
        # Apply position-based validation if soup is provided
        if soup is not None:
            position_result = self.validate_price_position(price, soup)
            validation_results["confidence"] *= position_result["confidence"]
            if not position_result["is_valid"]:
                # Don't invalidate the price, just reduce confidence
                validation_results["issues"].append(position_result["issue"])
        
        return validation_results
    
    def validate_price_range(self, price, product_category):
        """
        Validate price based on typical ranges for product category.
        
        Args:
            price (float): The extracted price to validate.
            product_category (str): Category of the product.
            
        Returns:
            dict: Validation result for price range.
        """
        result = {
            "is_valid": True,
            "confidence": 1.0,
            "issue": None
        }
        
        # Get price range for the category, default to "other" if not found
        category = product_category.lower()
        if category not in self.category_price_ranges:
            category = "other"
            
        price_range = self.category_price_ranges[category]
        
        # Check if price is within the expected range
        if price < price_range["min"]:
            result["is_valid"] = False
            result["confidence"] = 0.3
            result["issue"] = f"Price ${price} is below minimum expected (${price_range['min']}) for {category}"
        elif price > price_range["max"]:
            result["is_valid"] = False
            result["confidence"] = 0.3
            result["issue"] = f"Price ${price} is above maximum expected (${price_range['max']}) for {category}"
        
        return result
    
    def validate_price_change(self, price, previous_price):
        """
        Validate price based on the change from previous known price.
        
        Args:
            price (float): The extracted price to validate.
            previous_price (float): Previously known price.
            
        Returns:
            dict: Validation result for price change.
        """
        result = {
            "is_valid": True,
            "confidence": 1.0,
            "needs_verification": False,
            "issue": None
        }
        
        # Calculate absolute and percentage changes
        abs_change = abs(price - previous_price)
        pct_change = (abs_change / previous_price) * 100 if previous_price > 0 else 0
        
        # Check for suspicious price changes
        if abs_change > self.price_change_thresholds["absolute"] and pct_change > self.price_change_thresholds["percentage"]:
            result["confidence"] = 0.5
            result["issue"] = f"Large price change detected: ${previous_price} → ${price} (${abs_change}, {pct_change:.1f}%)"
            
            # Check if change exceeds doubt threshold (needs Claude verification)
            if pct_change > self.price_change_thresholds["doubt_threshold"]:
                result["needs_verification"] = True
        
        return result
    
    def validate_price_position(self, price, soup):
        """
        Validate price based on its position in the HTML relative to "Add to Cart" buttons.
        
        Args:
            price (float): The extracted price to validate.
            soup (BeautifulSoup): Parsed HTML content.
            
        Returns:
            dict: Validation result for price position.
        """
        result = {
            "is_valid": True,
            "confidence": 1.0,
            "issue": None
        }
        
        try:
            # Convert price to string for search
            price_str = str(price)
            
            # Remove decimal point and trailing zeros to find potential price matches
            # (e.g., 299.00 might appear as 299 in the HTML)
            price_no_decimal = price_str.split('.')[0]
            
            # Look for price near common "add to cart" type buttons
            found_proximity = False
            
            for indicator in self.proximity_indicators:
                # Find all instances of add to cart buttons (case insensitive)
                indicators = soup.find_all(string=re.compile(indicator, re.IGNORECASE))
                
                for element in indicators:
                    # Check if price is near this element (within parent or siblings)
                    parent = element.parent
                    
                    # Check parent and its children
                    parent_text = parent.get_text()
                    if price_str in parent_text or price_no_decimal in parent_text:
                        found_proximity = True
                        break
                    
                    # Check siblings
                    for sibling in parent.next_siblings:
                        if hasattr(sibling, 'get_text'):
                            sibling_text = sibling.get_text()
                            if price_str in sibling_text or price_no_decimal in sibling_text:
                                found_proximity = True
                                break
                    
                    for sibling in parent.previous_siblings:
                        if hasattr(sibling, 'get_text'):
                            sibling_text = sibling.get_text()
                            if price_str in sibling_text or price_no_decimal in sibling_text:
                                found_proximity = True
                                break
                
                if found_proximity:
                    break
            
            if not found_proximity:
                result["confidence"] = 0.7
                result["issue"] = "Price not found near 'Add to Cart' or similar buttons"
        
        except Exception as e:
            logger.error(f"Error in position validation: {str(e)}")
            result["confidence"] = 0.8  # Small confidence reduction on error
            result["issue"] = f"Error during position validation: {str(e)}"
        
        return result
    
    def update_category_price_range(self, category, min_price, max_price):
        """
        Update price range validation rules for a category.
        
        Args:
            category (str): Product category to update.
            min_price (float): Minimum expected price.
            max_price (float): Maximum expected price.
        """
        self.category_price_ranges[category.lower()] = {
            "min": min_price,
            "max": max_price
        }
        
    def update_price_change_thresholds(self, absolute=None, percentage=None, doubt_threshold=None):
        """
        Update price change threshold values.
        
        Args:
            absolute (float, optional): Absolute change threshold.
            percentage (float, optional): Percentage change threshold.
            doubt_threshold (float, optional): Threshold for triggering verification.
        """
        if absolute is not None:
            self.price_change_thresholds["absolute"] = absolute
            
        if percentage is not None:
            self.price_change_thresholds["percentage"] = percentage
            
        if doubt_threshold is not None:
            self.price_change_thresholds["doubt_threshold"] = doubt_threshold 