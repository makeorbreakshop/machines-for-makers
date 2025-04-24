import random
import time
import httpx
import asyncio
import urllib.parse
from bs4 import BeautifulSoup
from loguru import logger
from typing import Tuple, Optional, Union, Dict, Any, List

class WebScraper:
    """
    A web scraper class for fetching and parsing HTML content from websites.
    
    Features:
    - Asynchronous HTTP requests with httpx
    - Retry mechanism for failed requests
    - Random delays between retries to avoid rate limiting
    - URL validation
    - Comprehensive error handling
    - Rotating user agents to avoid detection
    - Proxy support for problematic merchants
    """

    def __init__(self, user_agent: str = None, proxies: Dict[str, str] = None):
        """
        Initialize the web scraper with optional custom user agent.
        
        Args:
            user_agent (str, optional): Custom user agent string. If None, a default one is used.
            proxies (Dict[str, str], optional): Dictionary mapping domains to proxy URLs.
        """
        # Define a list of common user agents for rotation
        self.user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15", 
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36",
            "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1"
        ]
        
        # Use the provided user agent or pick the first from our list
        self.default_user_agent = user_agent or self.user_agents[0]
        
        # Initialize with the default user agent
        
        # Store proxy information
        self.proxies = proxies or {}
        
        # Map of domains that are known to require user agent rotation
        self.rotate_ua_domains = [
            "thunder-laser.com",
            "glowforge.com",
            "creality.com"
        ]
        
        # Status codes that should trigger a retry
        self.retry_status_codes = [429, 500, 502, 503, 504]
        self.max_retries = 5
    
    def is_valid_url(self, url: str) -> bool:
        """
        Validate if the provided URL is properly formatted.
        
        Args:
            url (str): URL to validate
            
        Returns:
            bool: True if URL is valid, False otherwise
        """
        try:
            result = urllib.parse.urlparse(url)
            return all([result.scheme, result.netloc]) and result.scheme in ['http', 'https']
        except Exception as e:
            logger.error(f"Invalid URL format: {url}. Error: {str(e)}")
            return False
    
    def _should_rotate_user_agent(self, url: str) -> bool:
        """
        Determine if we should use a rotating user agent for this domain.
        
        Args:
            url (str): URL to check
            
        Returns:
            bool: True if we should rotate user agents, False otherwise
        """
        try:
            domain = urllib.parse.urlparse(url).netloc
            
            # Check if the domain or any subdomain matches our list
            return any(problematic_domain in domain for problematic_domain in self.rotate_ua_domains)
        except:
            return False
    
    def _get_random_user_agent(self) -> str:
        """
        Get a random user agent from our list.
        
        Returns:
            str: A random user agent string
        """
        return random.choice(self.user_agents)
    
    def _get_proxy_for_domain(self, url: str) -> Optional[str]:
        """
        Check if we have a proxy configured for this domain.
        
        Args:
            url (str): URL to check
            
        Returns:
            Optional[str]: Proxy URL if found, None otherwise
        """
        try:
            domain = urllib.parse.urlparse(url).netloc
            
            # Check exact domain match
            if domain in self.proxies:
                return self.proxies[domain]
            
            # Check partial domain match
            for proxy_domain, proxy_url in self.proxies.items():
                if proxy_domain in domain:
                    return proxy_url
                    
            return None
        except:
            return None
    
    async def get_page_content(self, url: str, 
                              force_user_agent_rotation: bool = False,
                              custom_max_retries: Optional[int] = None) -> Tuple[Optional[str], Optional[int]]:
        """
        Fetch HTML content from a URL with retry logic and return both HTML and HTTP status code.
        
        Args:
            url (str): URL to fetch content from
            force_user_agent_rotation (bool): Force user agent rotation even if domain not in rotation list
            custom_max_retries (Optional[int]): Override the default max retries value
            
        Returns:
            Tuple[Optional[str], Optional[int]]: A tuple containing (html_content, http_status)
                                      If failed, returns (None, None)
        """
        if not self.is_valid_url(url):
            logger.error(f"Invalid URL: {url}")
            return None, None
        
        # Determine if we should rotate user agents
        should_rotate = force_user_agent_rotation or self._should_rotate_user_agent(url)
        if should_rotate:
            logger.info(f"Using rotating user agents for {url}")
        
        # Check if we need to use a proxy
        proxy = self._get_proxy_for_domain(url)
        if proxy:
            logger.info(f"Using proxy for {url}: {proxy}")
        
        # Use custom max retries if provided
        max_retries = custom_max_retries if custom_max_retries is not None else self.max_retries
        
        retry_count = 0
        while retry_count < max_retries:
            try:
                # Create a new client for this request with the appropriate settings
                headers = {"User-Agent": self._get_random_user_agent() if should_rotate else self.default_user_agent}
                
                # Add other potentially useful headers to avoid detection
                if should_rotate:
                    headers.update({
                        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                        "Accept-Language": "en-US,en;q=0.5",
                        "Accept-Encoding": "gzip, deflate, br",
                        "DNT": "1",
                        "Connection": "keep-alive",
                        "Upgrade-Insecure-Requests": "1",
                        "Cache-Control": "max-age=0"
                    })
                
                # Configure proxies if needed
                transport = None
                if proxy:
                    transport = httpx.AsyncHTTPTransport(proxy={"all://": proxy})
                
                async with httpx.AsyncClient(headers=headers, 
                                            follow_redirects=True, 
                                            timeout=30.0,
                                            transport=transport) as client:
                    
                    logger.info(f"Fetching content from {url} (Attempt {retry_count + 1}/{max_retries})")
                    response = await client.get(url)
                    
                    if response.status_code == 200:
                        logger.success(f"Successfully fetched content from {url}")
                        html_content = response.text
                        # Parse HTML using a separate method
                        soup = self.parse_html(html_content)
                        # Return HTML content and status code instead of soup
                        return html_content, response.status_code
                    
                    # Check if we should retry based on status code
                    if response.status_code in self.retry_status_codes:
                        retry_count += 1
                        if retry_count < max_retries:
                            delay = random.uniform(1, 5) * retry_count  # Increasing backoff
                            logger.warning(f"Received status code {response.status_code}. "
                                          f"Retrying in {delay:.2f} seconds...")
                            await asyncio.sleep(delay)
                            continue
                    
                    # If we get here, either we got a non-retryable status code or we've exhausted retries
                    logger.error(f"Failed to fetch content from {url}. Status code: {response.status_code}")
                    return None, response.status_code
                    
            except httpx.TimeoutException:
                retry_count += 1
                if retry_count < max_retries:
                    delay = random.uniform(2, 7) * retry_count
                    logger.warning(f"Request timed out. Retrying in {delay:.2f} seconds...")
                    await asyncio.sleep(delay)
                else:
                    logger.error(f"Request to {url} timed out after {max_retries} attempts")
                    return None, None
                    
            except httpx.RequestError as e:
                logger.error(f"Request error for {url}: {str(e)}")
                return None, None
                
            except Exception as e:
                logger.error(f"Unexpected error fetching {url}: {str(e)}")
                return None, None
        
        return None, None
    
    def parse_html(self, html_content: str) -> Optional[BeautifulSoup]:
        """
        Parse HTML content into a BeautifulSoup object.
        
        Args:
            html_content (str): HTML content to parse
            
        Returns:
            Optional[BeautifulSoup]: BeautifulSoup object if parsing successful, None otherwise
        """
        if not html_content:
            logger.error("Cannot parse empty HTML content")
            return None
            
        try:
            return BeautifulSoup(html_content, 'html.parser')
        except Exception as e:
            logger.error(f"Error parsing HTML content: {str(e)}")
            return None
    
    def extract_data(self, soup: BeautifulSoup, selector: str) -> Optional[str]:
        """
        Extract data from the HTML using CSS selectors.
        
        Args:
            soup (BeautifulSoup): Parsed HTML
            selector (str): CSS selector to find elements
            
        Returns:
            Optional[str]: Extracted text or None if not found
        """
        if not soup:
            return None
            
        try:
            element = soup.select_one(selector)
            return element.get_text(strip=True) if element else None
        except Exception as e:
            logger.error(f"Error extracting data with selector '{selector}': {str(e)}")
            return None
    
