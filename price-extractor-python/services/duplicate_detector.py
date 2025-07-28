"""
Duplicate Detection Service for Discovered URLs

This service compares discovered URLs against existing machines in the database
to identify potential duplicates using multiple matching strategies.
"""

import logging
import re
from typing import List, Dict, Optional, Tuple
from urllib.parse import urlparse, parse_qs
from difflib import SequenceMatcher
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class DuplicateMatch:
    """Represents a potential duplicate match"""
    machine_id: str
    machine_name: str
    similarity_score: float
    reason: str
    details: Dict

class DuplicateDetector:
    """
    Multi-layer duplicate detection system for discovered URLs
    """
    
    def __init__(self, db_service):
        self.db_service = db_service
        
        # Common words to ignore in product name matching
        self.ignore_words = {
            'laser', 'cutter', 'engraver', 'machine', 'system', 'kit', 
            '3d', 'printer', 'cnc', 'router', 'mill', 'desktop', 'portable',
            'professional', 'pro', 'plus', 'ultra', 'max', 'mini', 'compact'
        }
        
        # URL normalization patterns
        self.url_cleanup_patterns = [
            (r'\?.*$', ''),  # Remove query parameters
            (r'/$', ''),     # Remove trailing slash
            (r'#.*$', ''),   # Remove fragments
        ]
    
    async def detect_duplicates_for_urls(self, discovered_urls: List[Dict]) -> Dict[str, DuplicateMatch]:
        """
        Detect duplicates for a list of discovered URLs
        
        Args:
            discovered_urls: List of discovered URL dictionaries
            
        Returns:
            Dict mapping URL IDs to their best duplicate match (if any)
        """
        logger.info(f"Starting duplicate detection for {len(discovered_urls)} URLs")
        if discovered_urls:
            logger.info(f"Sample URLs being checked: {[url['url'] for url in discovered_urls[:3]]}")
        
        # Get all existing machines for comparison
        existing_machines = await self._get_existing_machines()
        logger.info(f"Comparing against {len(existing_machines)} existing machines")
        
        if existing_machines:
            # Log a few examples for debugging
            for i, machine in enumerate(existing_machines[:3]):
                logger.info(f"Sample machine {i+1}: {machine.get('name')} - URL: {machine.get('url')}")
        else:
            logger.warning("No existing machines found for comparison")
        
        duplicates = {}
        
        for url_data in discovered_urls:
            match = await self._find_best_match(url_data, existing_machines)
            logger.debug(f"Checking URL: {url_data['url']} - Best match score: {match.similarity_score if match else 0.0}")
            if match and match.similarity_score >= 0.6:  # Lowered threshold to catch more variants
                duplicates[url_data['id']] = match
                logger.info(f"Found duplicate: {url_data['url']} -> {match.machine_name} (score: {match.similarity_score:.2f})")
            elif match:
                logger.info(f"Low confidence match: {url_data['url']} -> {match.machine_name} (score: {match.similarity_score:.2f}) - below threshold")
        
        return duplicates
    
    async def _get_existing_machines(self) -> List[Dict]:
        """Get all existing machines from the database"""
        try:
            # Try a simpler query first 
            response = self.db_service.supabase.table("machines").select("*").execute()
            
            if response.data:
                # Normalize column names to match expected format and filter out empty names
                machines = []
                for machine in response.data:
                    machine_name = machine.get('Machine Name')
                    # Skip machines without names
                    if not machine_name or machine_name.strip() == '':
                        continue
                        
                    normalized = {
                        'id': machine.get('id'),
                        'name': machine_name,
                        'url': machine.get('product_link'),
                        'brand': machine.get('Company'),
                        'power': machine.get('Power'),
                        'bed_size': machine.get('Bed Size'),
                        'slug': machine.get('slug')
                    }
                    machines.append(normalized)
                return machines
            return []
        except Exception as e:
            logger.error(f"Error fetching existing machines: {e}")
            return []
    
    async def _find_best_match(self, discovered_url: Dict, existing_machines: List[Dict]) -> Optional[DuplicateMatch]:
        """
        Find the best duplicate match for a discovered URL
        
        Uses multiple matching strategies:
        1. Direct URL matching
        2. Normalized URL matching  
        3. Product name similarity
        4. Combined scoring
        """
        best_match = None
        best_score = 0.0
        
        discovered_url_clean = self._normalize_url(discovered_url['url'])
        
        for machine in existing_machines:
            matches = []
            
            # Strategy 1: Direct URL matching
            if machine.get('url'):
                url_score = self._compare_urls(discovered_url['url'], machine['url'])
                if url_score > 0:
                    matches.append(('url_match', url_score, f"URL similarity: {url_score:.2f}"))
            
            # Strategy 2: Product name similarity (if we have it from previous scraping)
            if discovered_url.get('extracted_name') and machine.get('name'):
                name_score = self._compare_product_names(
                    discovered_url.get('extracted_name'), 
                    machine['name']
                )
                if name_score > 0:
                    matches.append(('name_similarity', name_score, f"Name similarity: {name_score:.2f}"))
            
            # Strategy 3: URL pattern matching (for same brand/model different variants)
            url_pattern_score = self._compare_url_patterns(discovered_url['url'], machine.get('url', ''))
            if url_pattern_score > 0:
                matches.append(('url_pattern', url_pattern_score, f"URL pattern similarity: {url_pattern_score:.2f}"))
            
            # Calculate combined score
            if matches:
                # Weight different match types
                weights = {'url_match': 1.0, 'name_similarity': 0.8, 'url_pattern': 0.6}
                combined_score = max(score * weights.get(match_type, 0.5) for match_type, score, _ in matches)
                
                if combined_score > best_score:
                    best_score = combined_score
                    primary_match = max(matches, key=lambda x: x[1])
                    
                    best_match = DuplicateMatch(
                        machine_id=machine['id'],
                        machine_name=machine['name'],
                        similarity_score=combined_score,
                        reason=primary_match[0],
                        details={
                            'all_matches': matches,
                            'machine_url': machine.get('url'),
                            'machine_brand': machine.get('brand')
                        }
                    )
        
        return best_match
    
    def _normalize_url(self, url: str) -> str:
        """Normalize URL for comparison"""
        if not url:
            return ""
        
        # Apply cleanup patterns
        normalized = url.lower()
        for pattern, replacement in self.url_cleanup_patterns:
            normalized = re.sub(pattern, replacement, normalized)
        
        return normalized
    
    def _compare_urls(self, url1: str, url2: str) -> float:
        """Compare two URLs for similarity"""
        if not url1 or not url2:
            return 0.0
        
        # Exact match
        if url1 == url2:
            return 1.0
        
        # Normalized match
        norm1 = self._normalize_url(url1)
        norm2 = self._normalize_url(url2)
        
        if norm1 == norm2:
            return 0.95
        
        # Path similarity (same product, different parameters)
        path1 = urlparse(url1).path
        path2 = urlparse(url2).path
        
        if path1 and path2:
            path_similarity = SequenceMatcher(None, path1, path2).ratio()
            if path_similarity >= 0.75:  # Lowered from 0.9 to catch variants
                return path_similarity * 0.9
        
        return 0.0
    
    def _compare_url_patterns(self, url1: str, url2: str) -> float:
        """Compare URL patterns for similar products"""
        if not url1 or not url2:
            return 0.0
        
        # Extract meaningful parts from URLs
        def extract_product_info(url):
            parsed = urlparse(url)
            path_parts = [p for p in parsed.path.split('/') if p]
            
            # Look for product identifiers
            product_parts = []
            for part in path_parts:
                # Skip common parts
                if part.lower() in ['products', 'collections', 'shop', 'catalog']:
                    continue
                # Keep parts that look like product identifiers
                if re.search(r'[a-z].*[0-9]|[0-9].*[a-z]', part.lower()):
                    product_parts.append(part.lower())
            
            return product_parts
        
        parts1 = extract_product_info(url1)
        parts2 = extract_product_info(url2)
        
        if not parts1 or not parts2:
            return 0.0
        
        # Find best matching part
        best_similarity = 0.0
        for p1 in parts1:
            for p2 in parts2:
                similarity = SequenceMatcher(None, p1, p2).ratio()
                best_similarity = max(best_similarity, similarity)
        
        return best_similarity if best_similarity >= 0.7 else 0.0  # Lowered from 0.8
    
    def _compare_product_names(self, name1: str, name2: str) -> float:
        """Compare product names with smart normalization"""
        if not name1 or not name2:
            return 0.0
        
        # Normalize names
        norm1 = self._normalize_product_name(name1)
        norm2 = self._normalize_product_name(name2)
        
        if not norm1 or not norm2:
            return 0.0
        
        # Exact match after normalization
        if norm1 == norm2:
            return 1.0
        
        # Token-based similarity
        tokens1 = set(norm1.split())
        tokens2 = set(norm2.split())
        
        # Remove common words
        tokens1 = tokens1 - self.ignore_words
        tokens2 = tokens2 - self.ignore_words
        
        if not tokens1 or not tokens2:
            return 0.0
        
        # Jaccard similarity
        intersection = tokens1 & tokens2
        union = tokens1 | tokens2
        jaccard = len(intersection) / len(union) if union else 0.0
        
        # Sequence similarity for remaining tokens
        remaining1 = ' '.join(sorted(tokens1))
        remaining2 = ' '.join(sorted(tokens2))
        sequence_sim = SequenceMatcher(None, remaining1, remaining2).ratio()
        
        # Combined score
        return max(jaccard, sequence_sim * 0.9)
    
    def _normalize_product_name(self, name: str) -> str:
        """Normalize product name for comparison"""
        if not name:
            return ""
        
        # Convert to lowercase
        normalized = name.lower().strip()
        
        # Remove common punctuation and extra spaces
        normalized = re.sub(r'[^\w\s]', ' ', normalized)
        normalized = re.sub(r'\s+', ' ', normalized)
        
        # Handle common variations
        variations = {
            r'\bw\b': 'watt',
            r'\bmm\b': 'millimeter',
            r'\bcm\b': 'centimeter',
            r'\bin\b': 'inch',
        }
        
        for pattern, replacement in variations.items():
            normalized = re.sub(pattern, replacement, normalized)
        
        return normalized.strip()
    
    async def update_duplicate_status(self, url_id: str, match: Optional[DuplicateMatch]) -> bool:
        """Update the duplicate status in the database"""
        try:
            from datetime import datetime
            
            if match:
                # Mark as duplicate
                update_data = {
                    'duplicate_status': 'duplicate',
                    'existing_machine_id': match.machine_id,
                    'similarity_score': match.similarity_score,
                    'duplicate_reason': match.reason,
                    'checked_at': datetime.utcnow().isoformat() + 'Z'
                }
            else:
                # Mark as unique
                update_data = {
                    'duplicate_status': 'unique',
                    'existing_machine_id': None,
                    'similarity_score': None,
                    'duplicate_reason': None,
                    'checked_at': datetime.utcnow().isoformat() + 'Z'
                }
            
            response = self.db_service.supabase.table("discovered_urls") \
                .update(update_data) \
                .eq("id", url_id) \
                .execute()
            
            return True
        except Exception as e:
            logger.error(f"Error updating duplicate status for {url_id}: {e}")
            return False
    
    async def reset_duplicate_status(self, manufacturer_id: str = None) -> Dict:
        """Reset duplicate status for URLs to allow re-checking"""
        try:
            # Supabase requires a WHERE clause for updates, so we need to filter first
            if manufacturer_id:
                # Reset for specific manufacturer
                response = self.db_service.supabase.table("discovered_urls") \
                    .update({
                        'duplicate_status': 'pending',
                        'existing_machine_id': None,
                        'similarity_score': None,
                        'duplicate_reason': None,
                        'checked_at': None
                    }) \
                    .eq("manufacturer_id", manufacturer_id) \
                    .execute()
            else:
                # Reset all URLs that have been checked (not pending)
                response = self.db_service.supabase.table("discovered_urls") \
                    .update({
                        'duplicate_status': 'pending',
                        'existing_machine_id': None,
                        'similarity_score': None,
                        'duplicate_reason': None,
                        'checked_at': None
                    }) \
                    .neq("duplicate_status", "pending") \
                    .execute()
            
            return {
                "message": "Duplicate status reset",
                "reset_count": len(response.data) if response.data else 0
            }
        except Exception as e:
            logger.error(f"Error resetting duplicate status: {e}")
            raise

    async def run_duplicate_detection(self, manufacturer_id: str = None, force_recheck: bool = False) -> Dict:
        """
        Run duplicate detection for discovered URLs
        
        Args:
            manufacturer_id: Optional manufacturer to limit detection to
            force_recheck: If True, reset status and recheck all URLs
            
        Returns:
            Summary of detection results
        """
        try:
            # If force_recheck is True, reset all URLs first
            if force_recheck:
                await self.reset_duplicate_status(manufacturer_id)
            
            # Get URLs that need duplicate checking using table operations
            query_builder = self.db_service.supabase.table("discovered_urls") \
                .select("id, url, manufacturer_id, category, discovered_at") \
                .eq("duplicate_status", "pending") \
                .order("discovered_at", desc=True)
            
            if manufacturer_id:
                query_builder = query_builder.eq("manufacturer_id", manufacturer_id)
            
            response = query_builder.execute()
            urls_to_check = response.data or []
            
            if not urls_to_check:
                return {"message": "No URLs to check", "checked": 0, "duplicates_found": 0}
            
            logger.info(f"Checking {len(urls_to_check)} URLs for duplicates")
            
            # Run duplicate detection
            duplicates = await self.detect_duplicates_for_urls(urls_to_check)
            
            # Update database with results
            updated_count = 0
            for url_data in urls_to_check:
                match = duplicates.get(url_data['id'])
                if await self.update_duplicate_status(url_data['id'], match):
                    updated_count += 1
            
            return {
                "message": f"Duplicate detection complete",
                "checked": len(urls_to_check),
                "duplicates_found": len(duplicates),
                "updated": updated_count
            }
            
        except Exception as e:
            logger.error(f"Error in duplicate detection: {e}")
            raise