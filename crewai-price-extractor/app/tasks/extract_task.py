from crewai import Task
from typing import Dict, Any, List
from ..agents.price_extractor import get_price_extractor_agent

def create_extract_task() -> Task:
    """
    Creates a task for the Price Extractor Agent to identify and extract
    price information from product page HTML.
    """
    return Task(
        description="""
        Extract price information from product page HTML.
        
        Your job is to:
        1. Analyze the HTML structure of each product page
        2. Identify elements containing the current price
        3. Extract the price value and currency
        4. Determine the CSS selector for the price element
        5. Return structured price data
        """,
        expected_output="""
        For each machine:
        - Extracted price value
        - Currency code
        - Extraction method used
        - CSS selector for the price element
        - Confidence score (0.0-1.0)
        """,
        agent=get_price_extractor_agent()
    ) 