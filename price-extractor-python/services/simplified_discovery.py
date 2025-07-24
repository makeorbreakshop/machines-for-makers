"""
Simplified Discovery Service using Scrapfly's AI Product Extraction
"""
import logging
import re
from typing import List, Dict, Optional, Tuple
from urllib.parse import urljoin, urlparse
import json

from services.scrapfly_service import get_scrapfly_service
from services.database import DatabaseService
from services.openai_mapper import create_openai_mapper
from scrapfly import ScrapeConfig

logger = logging.getLogger(__name__)


class SimplifiedDiscoveryService:
    """Simplified discovery using Scrapfly's AI extraction"""
    
    def __init__(self):
        self.scrapfly = get_scrapfly_service()
        self.db = DatabaseService()
        self.openai_mapper = create_openai_mapper()
        logger.info("Simplified discovery service initialized with OpenAI GPT-4o mini mapper")
    
    async def discover_from_category(
        self, 
        category_url: str, 
        site_id: str,
        scan_id: str,
        max_products: int = 10
    ) -> Dict:
        """
        Discover products from a category/collection page
        
        Args:
            category_url: URL of category page (e.g., /collections/laser-cutters)
            site_id: Database site ID
            scan_id: Database scan ID
            max_products: Maximum products to discover
            
        Returns:
            Discovery results
        """
        results = {
            'discovered_products': 0,
            'product_urls': [],
            'errors': [],
            'total_credits_used': 0,
            'total_cost_usd': 0.0
        }
        
        try:
            # Step 1: Scrape category page to find product URLs
            logger.info(f"Discovering products from: {category_url}")
            
            config = ScrapeConfig(
                url=category_url,
                asp=True,
                render_js=True,
                auto_scroll=True,  # Important for lazy-loaded products
                country='US'
            )
            
            result = await self.scrapfly.client.async_scrape(config)
            html = result.content
            
            category_credits = result.context.get('cost', {}).get('total', 0)
            results['total_credits_used'] += category_credits
            
            logger.info(f"Category page scraped, credits used: {category_credits}")
            
            # Step 2: Extract product URLs (simple regex approach)
            product_urls = self._extract_product_urls(html, category_url)
            results['product_urls'] = product_urls[:max_products]
            
            logger.info(f"Found {len(product_urls)} product URLs, processing {len(results['product_urls'])}")
            
            # Step 3: Extract each product using AI
            for i, product_url in enumerate(results['product_urls']):
                try:
                    logger.info(f"Extracting product {i+1}/{len(results['product_urls'])}: {product_url}")
                    
                    product_data = await self.extract_product(product_url)
                    
                    if product_data:
                        logger.info(f"Extracted data for {product_url}: name={product_data.get('name', 'MISSING')}")
                        
                        # Track credits used for this product
                        if '_credits_used' in product_data:
                            results['total_credits_used'] += product_data['_credits_used']
                        
                        # Store in database
                        stored = await self._store_product(
                            site_id=site_id,
                            scan_id=scan_id,
                            product_data=product_data,
                            source_url=product_url
                        )
                        
                        if stored:
                            results['discovered_products'] += 1
                            logger.info(f"✅ Stored product: {product_data.get('name', 'Unknown')}")
                    
                except Exception as e:
                    error_msg = f"Error extracting {product_url}: {str(e)}"
                    logger.error(error_msg)
                    results['errors'].append(error_msg)
            
            # Calculate total cost
            results['total_cost_usd'] = results['total_credits_used'] * 0.001
            
            # Update scan record with AI cost tracking
            scan_metadata = {
                "total_credits_used": results['total_credits_used'],
                "total_cost_usd": results['total_cost_usd'],
                "errors": results['errors'][:10] if results['errors'] else []  # Limit errors stored
            }
            
            await self.db.update_scan_record(
                scan_id=scan_id,
                status="completed",
                products_found=results['discovered_products'],
                products_processed=len(results['product_urls']),
                ai_cost_usd=results['total_cost_usd'],
                scan_metadata=scan_metadata
            )
            
            logger.info(f"✅ Discovery completed: {results['discovered_products']} products, ${results['total_cost_usd']:.4f} cost")
            
        except Exception as e:
            error_msg = f"Discovery failed: {str(e)}"
            logger.error(error_msg)
            results['errors'].append(error_msg)
            
            # Calculate cost even on failure
            results['total_cost_usd'] = results['total_credits_used'] * 0.001
            
            await self.db.update_scan_record(
                scan_id=scan_id,
                status="failed",
                error_message=error_msg,
                ai_cost_usd=results['total_cost_usd'] if results['total_credits_used'] > 0 else None
            )
        
        return results
    
    async def extract_product(self, product_url: str) -> Optional[Dict]:
        """
        Extract product data using Scrapfly's AI
        
        Args:
            product_url: URL of product page
            
        Returns:
            Extracted product data or None
        """
        try:
            config = ScrapeConfig(
                url=product_url,
                asp=True,
                render_js=True,
                extraction_model='product'  # 🎯 AI extraction!
            )
            
            result = await self.scrapfly.client.async_scrape(config)
            
            # Log the entire result structure
            logger.info("="*60)
            logger.info(f"Scrapfly result for {product_url}")
            logger.info(f"Result type: {type(result)}")
            logger.info(f"Result attributes: {dir(result)}")
            
            # Check scrape_result
            if hasattr(result, 'scrape_result'):
                logger.info(f"scrape_result type: {type(result.scrape_result)}")
                logger.info(f"scrape_result keys: {list(result.scrape_result.keys()) if isinstance(result.scrape_result, dict) else 'Not a dict'}")
            
            # Get extracted data - check if scrape_result exists and is not None
            if hasattr(result, 'scrape_result') and result.scrape_result and 'extracted_data' in result.scrape_result:
                extracted = result.scrape_result['extracted_data']
                logger.info(f"Raw extracted data type: {type(extracted)}")
                logger.info(f"Raw extracted data keys: {list(extracted.keys()) if isinstance(extracted, dict) else 'Not a dict'}")
                logger.info(f"Raw extracted data content: {json.dumps(extracted, indent=2, default=str)[:500]}...")
                
                # The data is nested under 'data' key
                if 'data' in extracted:
                    product_data = extracted['data']
                    logger.info(f"Product data type: {type(product_data)}")
                    
                    # Handle different data structures
                    if isinstance(product_data, list) and len(product_data) > 0:
                        # If it's a list, take the first item
                        logger.info(f"Product data is a list with {len(product_data)} items, taking first item")
                        product_data = product_data[0]
                    
                    if isinstance(product_data, dict):
                        logger.info(f"Product data keys: {list(product_data.keys())}")
                        logger.info(f"Product data sample: {json.dumps(product_data, indent=2, default=str)[:500]}...")
                    else:
                        logger.warning(f"Product data is not a dict: {type(product_data)}")
                    
                    # Add metadata
                    if isinstance(product_data, dict):
                        product_data['_extraction_quality'] = extracted.get('data_quality', {})
                        product_data['_credits_used'] = result.context.get('cost', {}).get('total', 0)
                    
                    return product_data
                else:
                    logger.warning(f"No 'data' key in extracted data for {product_url}")
                    logger.warning(f"Available keys: {list(extracted.keys()) if isinstance(extracted, dict) else 'N/A'}")
                    
            logger.warning(f"No extracted data found for {product_url}")
            logger.warning(f"scrape_result keys: {list(result.scrape_result.keys()) if hasattr(result, 'scrape_result') and isinstance(result.scrape_result, dict) else 'N/A'}")
            return None
            
        except Exception as e:
            logger.error(f"Failed to extract product from {product_url}: {str(e)}")
            return None
    
    def _extract_product_urls(self, html: str, base_url: str) -> List[str]:
        """Extract product URLs from category page HTML"""
        urls = []
        
        # Common patterns for product URLs
        patterns = [
            r'href="(/products/[^"]+)"',
            r'href="(/collections/[^/]+/products/[^"]+)"',
            r'href="(/p/[^"]+)"',
            r'href="(/item/[^"]+)"'
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, html, re.IGNORECASE)
            for match in matches:
                full_url = urljoin(base_url, match)
                if full_url not in urls:
                    urls.append(full_url)
        
        # Also look for full URLs
        domain = urlparse(base_url).netloc
        full_pattern = rf'href="(https?://{re.escape(domain)}/products/[^"]+)"'
        full_matches = re.findall(full_pattern, html, re.IGNORECASE)
        urls.extend([url for url in full_matches if url not in urls])
        
        return urls
    
    async def _store_product(
        self, 
        site_id: str, 
        scan_id: str, 
        product_data: Dict,
        source_url: str
    ) -> bool:
        """Store extracted product in database"""
        try:
            # Add comprehensive logging to understand the data structure
            logger.info("="*60)
            logger.info("_store_product: Starting Claude AI data transformation")
            logger.info(f"Source URL: {source_url}")
            logger.info(f"Product data type: {type(product_data)}")
            logger.info(f"Product data keys: {list(product_data.keys()) if isinstance(product_data, dict) else 'Not a dict!'}")
            
            # Log the raw product_data
            logger.info("Raw product_data from Scrapfly:")
            logger.info(json.dumps(product_data, indent=2, default=str)[:1000] + "..." if len(str(product_data)) > 1000 else json.dumps(product_data, indent=2, default=str))
            
            # Add source URL to the data for Claude to use
            enhanced_data = {
                **product_data,
                'source_url': source_url
            }
            
            # Use OpenAI to intelligently map the data
            logger.info("Sending data to OpenAI GPT-4o mini for intelligent mapping...")
            normalized_data, warnings = self.openai_mapper.map_to_database_schema(enhanced_data)
            
            logger.info(f"OpenAI mapped {len(normalized_data)} fields")
            if warnings:
                logger.warning(f"OpenAI mapping warnings: {warnings}")
            
            # Ensure we have at least a product name
            if not normalized_data.get('name'):
                # Fallback: try to extract from URL
                from urllib.parse import urlparse
                parsed_url = urlparse(source_url)
                path_parts = parsed_url.path.strip('/').split('/')
                if 'products' in path_parts and len(path_parts) > path_parts.index('products') + 1:
                    url_name = path_parts[path_parts.index('products') + 1]
                    normalized_data['name'] = url_name.replace('-', ' ').replace('_', ' ').title()
                    logger.info(f"Using URL-derived name: '{normalized_data['name']}'")
                else:
                    normalized_data['name'] = "Unknown Product"
                    logger.warning("Could not extract product name from any source")
            
            # Add machine type based on normalized category
            machine_type = self._determine_machine_type(normalized_data)
            
            # Prepare data for storage
            machine_data = {
                'source_url': source_url,
                'scan_log_id': scan_id,
                'status': 'pending',
                'raw_data': product_data,  # Store complete Scrapfly data
                'normalized_data': normalized_data,  # This is the Claude-mapped data
                'validation_errors': warnings + (product_data.get('_extraction_quality', {}).get('errors', [])),
                'validation_warnings': [],
                'machine_type': machine_type
            }
            
            # Debug logging to trace the data flow
            logger.info("=== MACHINE DATA STRUCTURE ===")
            logger.info(f"normalized_data type: {type(normalized_data)}")
            logger.info(f"normalized_data keys: {list(normalized_data.keys()) if isinstance(normalized_data, dict) else 'Not a dict'}")
            logger.info(f"name in normalized_data: {normalized_data.get('name', 'NOT FOUND')}")
            logger.info(f"brand in normalized_data: {normalized_data.get('brand', 'NOT FOUND')}")
            logger.info("===============================")
            
            logger.info(f"Storing machine: {normalized_data.get('name')} from {normalized_data.get('brand', 'Unknown')}")
            
            return await self.db.store_discovered_machine(
                site_id=site_id,
                scan_id=scan_id,
                data=machine_data
            )
            
        except Exception as e:
            logger.error(f"Failed to store product: {str(e)}")
            return False
    
    
    def _determine_machine_type(self, normalized_data: Dict) -> str:
        """Determine machine type from normalized data"""
        # Check normalized machine category first
        category = normalized_data.get('machine_category', '').lower()
        
        if 'laser' in category:
            return 'laser_cutter'
        elif '3d' in category or 'printer' in category:
            return '3d_printer'
        elif 'cnc' in category:
            return 'cnc_machine'
        elif 'vinyl' in category:
            return 'vinyl_cutter'
        
        # Fallback to name analysis
        name = normalized_data.get('name', '').lower()
        
        if 'laser' in name or 'engraver' in name:
            return 'laser_cutter'
        elif '3d' in name or 'printer' in name:
            return '3d_printer'
        elif 'cnc' in name or 'mill' in name:
            return 'cnc_machine'
        elif 'vinyl' in name or 'cutter' in name:
            return 'vinyl_cutter'
        else:
            return 'other'