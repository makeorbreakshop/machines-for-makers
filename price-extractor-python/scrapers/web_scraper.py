import requests
from bs4 import BeautifulSoup
from loguru import logger
import time
from urllib.parse import urlparse
import asyncio
import random

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
    
    async def get_page_content(self, url, max_retries=3):
        """
        Fetch the HTML content of a web page with retry logic for transient failures.
        
        Args:
            url (str): The URL to scrape.
            max_retries (int): Maximum number of retry attempts for transient failures.
            
        Returns:
            tuple: (raw HTML content, BeautifulSoup object) or (None, None) if failed.
        """
        last_error = None
        
        for attempt in range(max_retries + 1):
            try:
                if attempt > 0:
                    # Exponential backoff with jitter: 1s, 2s, 4s + random component
                    wait_time = (2 ** (attempt - 1)) + random.uniform(0.1, 0.5)
                    logger.info(f"Retrying {url} (attempt {attempt + 1}/{max_retries + 1}) after {wait_time:.1f}s")
                    await asyncio.sleep(wait_time)
                else:
                    logger.info(f"Fetching content from {url}")
                
                start_time = time.time()
                
                # Run the HTTP request in a thread pool to avoid blocking the event loop
                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(
                    None, 
                    lambda: self.session.get(url, timeout=REQUEST_TIMEOUT)
                )
                response.raise_for_status()  # Raise exception for 4XX/5XX responses
                
                duration = time.time() - start_time
                if attempt > 0:
                    logger.info(f"✅ Retry successful! Fetched {url} in {duration:.2f} seconds (attempt {attempt + 1})")
                else:
                    logger.info(f"Fetched {url} in {duration:.2f} seconds")
                
                # Create BeautifulSoup object
                html_content = response.text
                soup = BeautifulSoup(html_content, 'lxml')
                return html_content, soup
                
            except requests.exceptions.Timeout as e:
                last_error = e
                if self._is_retryable_error(e):
                    logger.warning(f"⏱️ Timeout on attempt {attempt + 1} for {url} (retryable)")
                    continue
                else:
                    logger.error(f"❌ Non-retryable timeout error when fetching {url}")
                    break
                    
            except requests.exceptions.TooManyRedirects as e:
                logger.error(f"❌ Too many redirects when fetching {url} (permanent error)")
                return None, None
                
            except requests.exceptions.HTTPError as e:
                last_error = e
                status_code = e.response.status_code if e.response else None
                
                if self._is_retryable_http_error(status_code):
                    logger.warning(f"🔄 HTTP {status_code} on attempt {attempt + 1} for {url} (retryable)")
                    continue
                else:
                    logger.error(f"❌ HTTP {status_code} error when fetching {url} (permanent)")
                    return None, None
                    
            except requests.exceptions.ConnectionError as e:
                last_error = e
                if self._is_retryable_error(e):
                    logger.warning(f"🌐 Connection error on attempt {attempt + 1} for {url} (retryable)")
                    continue
                else:
                    logger.error(f"❌ Connection error when fetching {url}: {str(e)}")
                    break
                    
            except Exception as e:
                last_error = e
                logger.error(f"❌ Unexpected error when fetching {url}: {str(e)}")
                break
        
        # All retry attempts exhausted
        logger.error(f"💥 Failed to fetch {url} after {max_retries + 1} attempts. Last error: {str(last_error)}")
        return None, None
    
    def _is_retryable_error(self, error):
        """
        Determine if an error is retryable (transient) or permanent.
        
        Args:
            error: The exception object
            
        Returns:
            bool: True if error is likely transient and worth retrying
        """
        error_str = str(error).lower()
        
        # Retryable network conditions
        retryable_conditions = [
            'timeout',
            'connection reset',
            'connection aborted', 
            'connection broken',
            'read timeout',
            'connect timeout',
            'temporary failure',
            'name resolution failed',
            'network is unreachable',
            'host is unreachable'
        ]
        
        return any(condition in error_str for condition in retryable_conditions)
    
    def _is_retryable_http_error(self, status_code):
        """
        Determine if an HTTP status code indicates a retryable error.
        
        Args:
            status_code (int): HTTP status code
            
        Returns:
            bool: True if status code indicates transient failure
        """
        if status_code is None:
            return True  # Unknown error, worth retrying
        
        # Retryable HTTP status codes (server errors and some client errors)
        retryable_codes = {
            429,  # Too Many Requests (rate limiting)
            500,  # Internal Server Error
            502,  # Bad Gateway
            503,  # Service Unavailable
            504,  # Gateway Timeout
            520,  # Unknown Error (Cloudflare)
            521,  # Web Server Is Down (Cloudflare)
            522,  # Connection Timed Out (Cloudflare)
            523,  # Origin Is Unreachable (Cloudflare)
            524,  # A Timeout Occurred (Cloudflare)
        }
        
        return status_code in retryable_codes
    
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
    
    async def validate_url_health(self, url):
        """
        Validate URL health and detect common issues like redirects, 404s, etc.
        
        Args:
            url (str): The URL to validate
            
        Returns:
            dict: Health check results with status, final_url, issues, etc.
        """
        health_info = {
            'url': url,
            'is_healthy': False,
            'status_code': None,
            'final_url': url,
            'redirects': [],
            'issues': [],
            'response_time': None,
            'content_length': None
        }
        
        try:
            if not self.is_valid_url(url):
                health_info['issues'].append('Invalid URL format')
                return health_info
            
            logger.info(f"🔍 Validating URL health: {url}")
            start_time = time.time()
            
            # Use HEAD request first for lightweight check
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.session.head(url, timeout=REQUEST_TIMEOUT, allow_redirects=True)
            )
            
            health_info['response_time'] = time.time() - start_time
            health_info['status_code'] = response.status_code
            health_info['final_url'] = response.url
            health_info['content_length'] = response.headers.get('content-length', 'unknown')
            
            # Track redirects
            if response.history:
                health_info['redirects'] = [resp.url for resp in response.history]
                if len(response.history) > 3:
                    health_info['issues'].append(f'Excessive redirects ({len(response.history)})')
            
            # Check for domain changes
            original_domain = urlparse(url).netloc.lower()
            final_domain = urlparse(str(response.url)).netloc.lower()
            if original_domain != final_domain:
                health_info['issues'].append(f'Domain changed: {original_domain} → {final_domain}')
            
            # Evaluate status code
            if 200 <= response.status_code < 300:
                health_info['is_healthy'] = True
                logger.info(f"✅ URL healthy: {url} → {response.status_code}")
            elif 300 <= response.status_code < 400:
                health_info['issues'].append(f'Redirect status: {response.status_code}')
                logger.warning(f"🔄 URL redirects: {url} → {response.status_code}")
            elif response.status_code == 404:
                health_info['issues'].append('Page not found (404)')
                logger.error(f"❌ URL not found: {url} → 404")
            elif response.status_code == 403:
                health_info['issues'].append('Access forbidden (403)')
                logger.error(f"🚫 URL forbidden: {url} → 403")
            elif 400 <= response.status_code < 500:
                health_info['issues'].append(f'Client error: {response.status_code}')
                logger.error(f"❌ Client error: {url} → {response.status_code}")
            else:
                health_info['issues'].append(f'Server error: {response.status_code}')
                logger.error(f"🔥 Server error: {url} → {response.status_code}")
            
        except requests.exceptions.Timeout:
            health_info['issues'].append('Request timeout')
            logger.error(f"⏱️ URL timeout: {url}")
        except requests.exceptions.ConnectionError as e:
            health_info['issues'].append(f'Connection error: {str(e)}')
            logger.error(f"🌐 Connection error: {url} - {str(e)}")
        except Exception as e:
            health_info['issues'].append(f'Unexpected error: {str(e)}')
            logger.error(f"💥 Unexpected error validating {url}: {str(e)}")
        
        return health_info
    
    def suggest_url_fixes(self, health_info):
        """
        Suggest potential URL fixes based on health check results.
        
        Args:
            health_info (dict): Results from validate_url_health
            
        Returns:
            list: Suggested URL alternatives to try
        """
        suggestions = []
        url = health_info['url']
        issues = health_info['issues']
        
        # If domain changed, suggest using the final URL
        if health_info['final_url'] != url:
            suggestions.append({
                'url': health_info['final_url'],
                'reason': 'Follow redirects to final destination'
            })
        
        # Common domain migration patterns
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        
        # AtomStack domain migration (.com → .net)
        if 'atomstack.com' in domain:
            new_url = url.replace('atomstack.com', 'atomstack.net')
            suggestions.append({
                'url': new_url,
                'reason': 'Try .net domain (AtomStack migration)'
            })
        
        # HTTPS upgrade
        if parsed.scheme == 'http':
            https_url = url.replace('http://', 'https://')
            suggestions.append({
                'url': https_url,
                'reason': 'Try HTTPS version'
            })
        
        # Remove www or add www
        if domain.startswith('www.'):
            no_www_url = url.replace(f'{parsed.scheme}://www.', f'{parsed.scheme}://')
            suggestions.append({
                'url': no_www_url,
                'reason': 'Try without www prefix'
            })
        else:
            www_url = url.replace(f'{parsed.scheme}://', f'{parsed.scheme}://www.')
            suggestions.append({
                'url': www_url,
                'reason': 'Try with www prefix'
            })
        
        return suggestions 