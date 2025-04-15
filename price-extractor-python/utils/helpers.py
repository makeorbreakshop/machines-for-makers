import re
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Union
from loguru import logger

def format_price(price: Optional[float], include_currency: bool = True) -> str:
    """
    Format a price value as a string with currency symbol.
    
    Args:
        price (float, optional): The price to format.
        include_currency (bool): Whether to include the currency symbol.
        
    Returns:
        str: The formatted price string or "N/A" if price is None.
    """
    if price is None:
        return "N/A"
    
    # Format with two decimal places
    formatted = f"${price:.2f}" if include_currency else f"{price:.2f}"
    return formatted

def calculate_price_difference(old_price: Optional[float], new_price: Optional[float]) -> Dict[str, Any]:
    """
    Calculate the difference between two prices.
    
    Args:
        old_price (float, optional): The old price.
        new_price (float, optional): The new price.
        
    Returns:
        dict: Dictionary containing the price difference metrics.
    """
    if old_price is None or new_price is None:
        return {
            "absolute_change": None,
            "percentage_change": None,
            "formatted_change": "N/A",
        }
    
    absolute_change = new_price - old_price
    
    # Calculate percentage change, handle division by zero
    if old_price == 0:
        percentage_change = None
    else:
        percentage_change = (absolute_change / old_price) * 100
    
    # Format the change with sign and currency symbol
    if absolute_change > 0:
        formatted_change = f"+{format_price(absolute_change)}"
    elif absolute_change < 0:
        # Use format_price with abs value and add minus sign manually
        formatted_change = f"-{format_price(abs(absolute_change))}"
    else:
        formatted_change = "$0.00"
    
    return {
        "absolute_change": absolute_change,
        "percentage_change": percentage_change,
        "formatted_change": formatted_change,
    }

def format_datetime(dt: Optional[Union[str, datetime]]) -> str:
    """
    Format a datetime object or ISO string to a user-friendly format.
    
    Args:
        dt (datetime or str, optional): The datetime to format.
        
    Returns:
        str: The formatted datetime string or "Never" if None.
    """
    if dt is None:
        return "Never"
    
    # Convert ISO string to datetime if needed
    if isinstance(dt, str):
        try:
            # Handle both with and without timezone info
            if dt.endswith('Z'):
                dt = dt.replace('Z', '+00:00')
            dt = datetime.fromisoformat(dt)
        except ValueError:
            logger.warning(f"Invalid datetime format: {dt}")
            return "Invalid date"
    
    # Ensure datetime is timezone-aware
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    
    # Format as: "August 23, 2023 at 14:30 UTC"
    return dt.strftime("%B %d, %Y at %H:%M UTC")

def truncate_html(html: str, max_length: int = 1000) -> str:
    """
    Truncate HTML content to a maximum length.
    
    Args:
        html (str): The HTML content to truncate.
        max_length (int): The maximum length to keep.
        
    Returns:
        str: The truncated HTML content.
    """
    if html is None:
        return ""
    
    if len(html) <= max_length:
        return html
    
    # Try to cut at a reasonable point
    truncated = html[:max_length]
    
    # Try to find a closing tag
    last_closing_tag = truncated.rfind('>')
    if last_closing_tag > max_length - 100:  # If reasonably close to the end
        truncated = truncated[:last_closing_tag + 1]
    
    return f"{truncated}... (truncated)"

def sanitize_url(url: str) -> str:
    """
    Sanitize a URL for logging and display.
    
    Args:
        url (str): The URL to sanitize.
        
    Returns:
        str: The sanitized URL.
    """
    if not url:
        return ""
    
    # Remove any credentials in the URL
    sanitized = re.sub(r'(https?://)([^:]+:[^@]+@)', r'\1', url)
    
    # Remove query parameters that might contain sensitive information
    sanitized = re.sub(r'\?(.*)', '?[...]', sanitized)
    
    return sanitized 