"""
Smart URL Classification Service

Automatically classifies discovered URLs to reduce manual review time:
- AUTO_SKIP: Obviously not products (images, PDFs, collections, etc.)
- HIGH_CONFIDENCE: Very likely to be individual product pages
- NEEDS_REVIEW: Uncertain URLs that require manual approval
- DUPLICATE_LIKELY: Similar to existing URLs (pre-duplicate detection)
"""

import re
from typing import Dict, List, Tuple, Set, Optional
from urllib.parse import urlparse, parse_qs
from dataclasses import dataclass
from loguru import logger

@dataclass
class URLClassification:
    """Result of URL classification"""
    status: str  # AUTO_SKIP, HIGH_CONFIDENCE, NEEDS_REVIEW, DUPLICATE_LIKELY
    confidence: float  # 0.0 to 1.0
    reason: str
    category_hint: str  # laser_cutters, 3d_printers, cnc_machines, etc.
    details: Dict

class SmartURLClassifier:
    """Intelligent URL classification to reduce manual review"""
    
    def __init__(self):
        # File extensions that are definitely not products
        self.skip_extensions = {
            # Images
            '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff',
            # Documents
            '.pdf', '.doc', '.docx', '.txt', '.rtf',
            # Archives
            '.zip', '.rar', '.tar', '.gz', '.7z',
            # Videos
            '.mp4', '.avi', '.mov', '.wmv', '.flv',
            # Other
            '.css', '.js', '.xml', '.json', '.ico'
        }
        
        # URL patterns that are definitely not individual products
        self.skip_patterns = [
            # Collection/category pages
            r'/collections?/?$',
            r'/categories?/?$', 
            r'/shop/?$',
            r'/products/?$',
            r'/laser-cutters/?$',
            r'/3d-printers/?$',
            r'/cnc-machines/?$',
            
            # Informational pages
            r'/blog/',
            r'/news/',
            r'/support/',
            r'/help/',
            r'/about/',
            r'/contact/',
            r'/faq/',
            r'/warranty/',
            r'/shipping/',
            r'/returns/',
            r'/privacy/',
            r'/terms/',
            
            # Account/cart pages
            r'/account/',
            r'/cart/',
            r'/checkout/',
            r'/login/',
            r'/register/',
            
            # Technical pages
            r'/search/',
            r'/sitemap',
            r'/robots\.txt',
            r'\.xml$',
            
            # Pagination and filters
            r'\?page=',
            r'\?sort=',
            r'\?filter=',
            r'#',
        ]
        
        # Strong indicators this is a product page
        self.product_indicators = [
            # Product URL patterns
            r'/products?/[\w-]+/?$',
            r'/items?/[\w-]+/?$',
            r'/shop/[\w-]+/?$',
            
            # Machine-specific patterns
            r'/[\w-]*(?:laser|cutter|engraver|printer|cnc|mill|router)[\w-]*/?$',
            r'/[\w-]*(?:\d+w|\d+watt)[\w-]*/?$',  # Power ratings
            r'/[\w-]*(?:co2|fiber|diode)[\w-]*/?$',  # Laser types
            r'/[\w-]*(?:desktop|portable|professional|pro)[\w-]*/?$',
        ]
        
        # Category detection patterns
        self.category_patterns = {
            'laser_cutters': [
                r'laser.*cut', r'cut.*laser', r'co2.*laser', r'fiber.*laser',
                r'diode.*laser', r'engraver.*cutter', r'cutter.*engraver'
            ],
            'laser_engravers': [
                r'laser.*engrav', r'engrav.*laser', r'marking.*laser',
                r'etching.*laser', r'desktop.*laser'
            ],
            '3d_printers': [
                r'3d.*print', r'print.*3d', r'fdm', r'sla', r'resin.*print',
                r'filament.*print', r'additive.*manufactur'
            ],
            'cnc_machines': [
                r'cnc', r'mill', r'router', r'machining', r'spindle',
                r'cutting.*machine', r'milling.*machine'
            ]
        }
        
        # Words that suggest this is likely a specific product
        self.product_words = {
            # Model indicators
            'model', 'series', 'version', 'mk', 'pro', 'plus', 'ultra', 'max',
            'mini', 'compact', 'desktop', 'professional', 'premium',
            
            # Power/size indicators  
            'watt', 'w', 'mm', 'cm', 'inch', 'area', 'bed', 'working',
            
            # Machine types
            'laser', 'cutter', 'engraver', 'printer', 'cnc', 'mill', 'router'
        }
        
        # Patterns that suggest duplicate/variant URLs
        self.variant_patterns = [
            r'-v\d+$',  # -v1, -v2, etc.
            r'-\d+w$',  # Different wattages
            r'-upgraded?$',
            r'-enhanced?$',
            r'-improved?$',
            r'-new$',
            r'-latest$',
            r'-\d{4}$',  # Year variants
        ]

    def classify_url(self, url: str, existing_urls: Set[str] = None) -> URLClassification:
        """
        Classify a URL for automatic processing
        
        Args:
            url: The URL to classify
            existing_urls: Set of existing URLs to check for duplicates
            
        Returns:
            URLClassification with status and reasoning
        """
        if existing_urls is None:
            existing_urls = set()
            
        parsed = urlparse(url)
        path = parsed.path.lower()
        
        # Check for obvious skips first
        skip_result = self._check_auto_skip(url, path, parsed)
        if skip_result:
            return skip_result
            
        # Check for likely duplicates
        duplicate_result = self._check_duplicates(url, existing_urls)
        if duplicate_result:
            return duplicate_result
            
        # Analyze if this looks like a product
        product_score = self._calculate_product_score(url, path)
        category_hint = self._detect_category(url, path)
        
        if product_score >= 0.8:
            return URLClassification(
                status='HIGH_CONFIDENCE',
                confidence=product_score,
                reason=f'Strong product indicators (score: {product_score:.2f})',
                category_hint=category_hint,
                details={'product_score': product_score}
            )
        elif product_score >= 0.4:
            return URLClassification(
                status='NEEDS_REVIEW',
                confidence=product_score,
                reason=f'Possible product, needs review (score: {product_score:.2f})',
                category_hint=category_hint,
                details={'product_score': product_score}
            )
        else:
            return URLClassification(
                status='AUTO_SKIP',
                confidence=1.0 - product_score,
                reason=f'Low product probability (score: {product_score:.2f})',
                category_hint='unknown',
                details={'product_score': product_score}
            )

    def _check_auto_skip(self, url: str, path: str, parsed) -> Optional[URLClassification]:
        """Check if URL should be automatically skipped"""
        
        # Check file extensions
        for ext in self.skip_extensions:
            if path.endswith(ext):
                return URLClassification(
                    status='AUTO_SKIP',
                    confidence=1.0,
                    reason=f'File extension: {ext}',
                    category_hint='unknown',
                    details={'skip_reason': 'file_extension'}
                )
        
        # Check skip patterns
        for pattern in self.skip_patterns:
            if re.search(pattern, path):
                return URLClassification(
                    status='AUTO_SKIP',
                    confidence=0.95,
                    reason=f'Matches skip pattern: {pattern}',
                    category_hint='unknown',
                    details={'skip_reason': 'url_pattern', 'pattern': pattern}
                )
        
        # Check for query parameters that suggest non-product pages
        if parsed.query:
            skip_params = ['page=', 'sort=', 'filter=', 'search=', 'category=']
            for param in skip_params:
                if param in parsed.query:
                    return URLClassification(
                        status='AUTO_SKIP',
                        confidence=0.9,
                        reason=f'Query parameter suggests non-product: {param}',
                        category_hint='unknown',
                        details={'skip_reason': 'query_params'}
                    )
        
        return None

    def _check_duplicates(self, url: str, existing_urls: Set[str]) -> Optional[URLClassification]:
        """Check if this URL is likely a duplicate of existing ones"""
        
        parsed = urlparse(url)
        base_path = parsed.path
        
        # Remove common variant suffixes to find base product
        for pattern in self.variant_patterns:
            base_path = re.sub(pattern, '', base_path)
        
        # Look for similar URLs in existing set
        for existing_url in existing_urls:
            existing_parsed = urlparse(existing_url)
            existing_base = existing_parsed.path
            
            # Remove variants from existing URL too
            for pattern in self.variant_patterns:
                existing_base = re.sub(pattern, '', existing_base)
            
            # Check similarity
            if base_path == existing_base and parsed.netloc == existing_parsed.netloc:
                return URLClassification(
                    status='DUPLICATE_LIKELY',
                    confidence=0.95,
                    reason=f'Similar to existing URL: {existing_url}',
                    category_hint='unknown',
                    details={
                        'similar_to': existing_url,
                        'base_path': base_path,
                        'reason': 'path_similarity'
                    }
                )
        
        return None

    def _calculate_product_score(self, url: str, path: str) -> float:
        """Calculate how likely this URL is to be a product page"""
        score = 0.0
        
        # Check product URL patterns (strong positive indicators)
        for pattern in self.product_indicators:
            if re.search(pattern, path):
                score += 0.4
                break
        
        # Count product-related words in URL
        words = re.findall(r'\b\w+\b', url.lower())
        product_word_count = sum(1 for word in words if word in self.product_words)
        
        if product_word_count >= 3:
            score += 0.3
        elif product_word_count >= 2:
            score += 0.2
        elif product_word_count >= 1:
            score += 0.1
        
        # Check URL depth (products often have specific depth)
        path_parts = [p for p in path.split('/') if p]
        if len(path_parts) == 2:  # /products/item-name
            score += 0.2
        elif len(path_parts) == 3:  # /collections/category/item
            score += 0.15
        elif len(path_parts) == 1:  # /item-name
            score += 0.1
        
        # Look for model numbers or specific identifiers
        if re.search(r'\b[A-Z]+\d+[A-Z]*\b', url):  # Model numbers like K40, CO2-100W
            score += 0.2
        
        if re.search(r'\d+w\b', url.lower()):  # Power ratings
            score += 0.15
        
        # Penalty for very long URLs (often filters/searches)
        if len(url) > 150:
            score -= 0.1
        
        # Penalty for too many query parameters
        if url.count('&') > 2:
            score -= 0.1
        
        return min(1.0, max(0.0, score))

    def _detect_category(self, url: str, path: str) -> str:
        """Detect the likely product category from URL"""
        
        url_lower = url.lower()
        
        for category, patterns in self.category_patterns.items():
            for pattern in patterns:
                if re.search(pattern, url_lower):
                    return category
        
        return 'unknown'

    def classify_batch(self, urls: List[str]) -> Dict[str, URLClassification]:
        """Classify a batch of URLs efficiently"""
        results = {}
        existing_urls = set()
        
        # Sort URLs to process high-confidence ones first
        sorted_urls = sorted(urls, key=lambda u: (
            len(u),  # Shorter URLs often more specific
            -u.count('/'),  # Fewer path segments often better
            u
        ))
        
        for url in sorted_urls:
            classification = self.classify_url(url, existing_urls)
            results[url] = classification
            
            # Add high-confidence URLs to existing set for duplicate detection
            if classification.status in ['HIGH_CONFIDENCE', 'NEEDS_REVIEW']:
                existing_urls.add(url)
        
        return results

    def get_classification_summary(self, classifications: Dict[str, URLClassification]) -> Dict:
        """Get summary statistics of classifications"""
        summary = {
            'total': len(classifications),
            'auto_skip': 0,
            'high_confidence': 0,
            'needs_review': 0,
            'duplicate_likely': 0,
            'categories': {},
            'skip_reasons': {}
        }
        
        for url, classification in classifications.items():
            status = classification.status.lower()
            summary[status] += 1
            
            # Track categories
            if classification.category_hint != 'unknown':
                category = classification.category_hint
                summary['categories'][category] = summary['categories'].get(category, 0) + 1
            
            # Track skip reasons
            if classification.status == 'AUTO_SKIP':
                reason = classification.details.get('skip_reason', 'other')
                summary['skip_reasons'][reason] = summary['skip_reasons'].get(reason, 0) + 1
        
        return summary