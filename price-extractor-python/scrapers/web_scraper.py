import requests
from bs4 import BeautifulSoup
from loguru import logger
import time
from urllib.parse import urlparse

from config import REQUEST_TIMEOUT, USER_AGENT

class WebScraper:
    """Class for scraping web pages."""
    
    def __init__(self):
        """Initialize the web scraper with default headers."""
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': USER_AGENT,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0',
        })
    
    def get_page_content(self, url):
        """
        Fetch the HTML content of a web page.
        
        Args:
            url (str): The URL to scrape.
            
        Returns:
            tuple: (BeautifulSoup object, raw HTML content) or (None, None) if failed.
        """
        try:
            logger.info(f"Fetching content from {url}")
            start_time = time.time()
            
            response = self.session.get(url, timeout=REQUEST_TIMEOUT)
            response.raise_for_status()  # Raise exception for 4XX/5XX responses
            
            duration = time.time() - start_time
            logger.info(f"Fetched {url} in {duration:.2f} seconds")
            
            # Create BeautifulSoup object
            soup = BeautifulSoup(response.text, 'lxml')
            return soup, response.text
        except requests.exceptions.Timeout:
            logger.error(f"Timeout error when fetching {url}")
            return None, None
        except requests.exceptions.TooManyRedirects:
            logger.error(f"Too many redirects when fetching {url}")
            return None, None
        except requests.exceptions.HTTPError as e:
            logger.error(f"HTTP error when fetching {url}: {str(e)}")
            return None, None
        except Exception as e:
            logger.error(f"Error fetching {url}: {str(e)}")
            return None, None
    
    def is_valid_url(self, url):
        """
        Check if a URL is valid.
        
        Args:
            url (str): The URL to check.
            
        Returns:
            bool: True if valid, False otherwise.
        """
        try:
            result = urlparse(url)
            return all([result.scheme, result.netloc])
        except Exception:
            return False 