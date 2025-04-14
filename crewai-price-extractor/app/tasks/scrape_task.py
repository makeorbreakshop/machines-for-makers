from crewai import Task
from typing import Dict, Any, List
from ..agents.web_scraper import get_web_scraper_agent

def create_scrape_task() -> Task:
    """
    Creates a task for the Web Scraper Agent to extract HTML from product pages.
    """
    return Task(
        description="""
        Extract complete HTML from product pages.
        
        Your job is to:
        1. Visit each product URL
        2. Handle redirects and JavaScript-based pages
        3. Extract complete HTML content
        4. Deal with anti-scraping measures
        5. Store the HTML for processing
        """,
        expected_output="""
        For each machine:
        - Complete HTML content
        - Final URL after redirects
        - Status of the scraping operation
        - Any errors encountered
        """,
        agent=get_web_scraper_agent()
    ) 