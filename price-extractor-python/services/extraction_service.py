"""
Main extraction service that orchestrates the entire price extraction pipeline.
"""
from loguru import logger
from typing import Dict, Any, Optional, Tuple, List
from decimal import Decimal
import asyncio
from urllib.parse import urlparse
import time

from services.database_service import DatabaseService
from services.static_parser import StaticParser
from services.slice_parser import SliceParser
from services.js_parser import JSParser
from services.full_html_parser import FullHtmlParser
from services.price_validator import PriceValidator
from scrapers.web_scraper import WebScraper
from services.config import Config

from config import (
    TIER_STATIC,
    TIER_SLICE_FAST,
    TIER_SLICE_BALANCED,
    TIER_JS_INTERACTION,
    TIER_FULL_HTML,
    DEFAULT_EXTRACTION_CONFIDENCE,
    DEFAULT_VALIDATION_CONFIDENCE,
    DEFAULT_SANITY_THRESHOLD
)

class ExtractionService:
    """
    Service to coordinate the multi-tier price extraction pipeline.
    
    Pipeline steps:
    1. STATIC - Extract from structured data and basic HTML parsing
    2. SLICE_FAST - Use Claude Haiku for targeted extraction of price snippets
    3. SLICE_BALANCED - Use Claude Sonnet for more thorough extraction
    4. JS_INTERACTION - Use API endpoints or Playwright for JS-driven sites
    5. FULL_HTML - Use GPT-4o for complex extraction from full HTML
    """
    
    def __init__(self):
        """Initialize the extraction service and all parsers."""
        # Initialize dependencies
        self.db_service = DatabaseService()
        self.web_scraper = WebScraper()
        
        # Create config for parsers
        parser_config = Config({
            'extraction': {
                'min_confidence': 0.8,
                'price_change_threshold': 0.5,
                'retry_attempts': 3
            }
        })
        
        # Initialize parsers with config
        self.static_parser = StaticParser(parser_config)
        self.slice_parser = SliceParser()
        self.js_parser = JSParser()
        self.full_html_parser = FullHtmlParser()
        self.price_validator = PriceValidator(parser_config)
        
        # Extraction attempts for the current machine
        self.extraction_attempts = []
        
        logger.info("Extraction service initialized with all parsers")
    
    async def extract_price(self, machine_id: str, variant_attribute: str = "DEFAULT", 
                     url: str = None, dry_run: bool = False) -> Dict[str, Any]:
        """
        Extract price using the multi-tier pipeline.
        
        Args:
            machine_id: ID of the machine
            variant_attribute: Variant attribute identifier
            url: Optional URL override
            dry_run: Whether to run in dry-run mode (no database updates)
            
        Returns:
            Dict with extraction results and details
        """
        start_time = time.time()
        logger.info(f"Starting price extraction for {machine_id}/{variant_attribute}")
        
        # Reset extraction attempts
        self.extraction_attempts = []
        
        try:
            # Get machine data
            machine = await self.db_service.get_machine_by_id(machine_id)
            if not machine:
                error_msg = f"Machine {machine_id} not found in database"
                logger.error(error_msg)
                return {
                    "success": False,
                    "error": error_msg,
                    "machine_id": machine_id,
                    "variant_attribute": variant_attribute
                }
            
            # Use provided URL or get from database
            product_url = url or machine.get("product_link")
            if not product_url:
                error_msg = "No product URL available"
                logger.error(f"{error_msg} for machine {machine_id}")
                return {
                    "success": False,
                    "error": error_msg,
                    "machine_id": machine_id,
                    "variant_attribute": variant_attribute
                }
            
            # Extract domain for configuration lookup
            domain = self._extract_domain(product_url)
            
            # Get variant configuration
            variant_config = await self.db_service.get_variant_config(
                machine_id=machine_id,
                variant_attribute=variant_attribute,
                domain=domain
            )
            
            # Get the current price from machines_latest or machines table
            previous_price = None
            
            # First try to get from machines_latest
            latest_response = await self._get_latest_price(machine_id, variant_attribute)
            if latest_response:
                previous_price = latest_response.get("machines_latest_price")
            
            # Fall back to machines table if no variant-specific price
            if previous_price is None and variant_attribute == "DEFAULT":
                previous_price = machine.get("Price")
            
            # Get product category for validation
            product_category = machine.get("Machine Category") or machine.get("Laser Category")
            
            # Get thresholds from config or defaults
            extraction_confidence_threshold = (
                variant_config.get("min_extraction_confidence") 
                if variant_config and variant_config.get("min_extraction_confidence") is not None
                else DEFAULT_EXTRACTION_CONFIDENCE
            )
            
            validation_confidence_threshold = (
                variant_config.get("min_validation_confidence")
                if variant_config and variant_config.get("min_validation_confidence") is not None
                else DEFAULT_VALIDATION_CONFIDENCE
            )
            
            sanity_check_threshold = (
                variant_config.get("sanity_check_threshold")
                if variant_config and variant_config.get("sanity_check_threshold") is not None
                else DEFAULT_SANITY_THRESHOLD
            )
            
            # Determine if the site requires JavaScript
            requires_js = variant_config.get("requires_js_interaction", False) if variant_config else False
            
            # Fetch the product page
            html_content, soup = await self.web_scraper.get_page_content(product_url)
            if not html_content or not soup:
                error_msg = "Failed to fetch product page"
                logger.error(f"{error_msg} for {product_url}")
                return {
                    "success": False,
                    "error": error_msg,
                    "machine_id": machine_id,
                    "variant_attribute": variant_attribute,
                    "url": product_url
                }
            
            # Start the extraction pipeline
            extracted_price = None
            extraction_method = None
            extraction_confidence = 0.0
            validation_confidence = 0.0
            llm_usage_data = []
            
            # Skip to JS tier if site is known to require JavaScript
            if not requires_js:
                # 1. Try STATIC tier
                extracted_price, extraction_method, extraction_confidence = await self._extract_static(
                    html_content, 
                    product_url, 
                    variant_config
                )
                
                # Log the attempt
                self.extraction_attempts.append({
                    "tier": TIER_STATIC,
                    "success": extracted_price is not None,
                    "price": float(extracted_price) if extracted_price else None,
                    "method": extraction_method,
                    "confidence": extraction_confidence
                })
                
                # Continue to next tier if not successful or low confidence
                if not extracted_price or extraction_confidence < extraction_confidence_threshold:
                    # 2. Try SLICE_FAST tier
                    extracted_price, extraction_method, extraction_confidence, usage_info = await self._extract_slice_fast(
                        html_content,
                        product_url,
                        previous_price
                    )
                    
                    # Log the attempt and usage
                    self.extraction_attempts.append({
                        "tier": TIER_SLICE_FAST,
                        "success": extracted_price is not None,
                        "price": float(extracted_price) if extracted_price else None,
                        "method": extraction_method,
                        "confidence": extraction_confidence
                    })
                    
                    if usage_info and usage_info.get("estimated_cost") > 0:
                        llm_usage_data.append(usage_info)
                    
                    # Continue to next tier if not successful or low confidence
                    if not extracted_price or extraction_confidence < extraction_confidence_threshold:
                        # 3. Try SLICE_BALANCED tier
                        extracted_price, extraction_method, extraction_confidence, usage_info = await self._extract_slice_balanced(
                            html_content,
                            product_url, 
                            previous_price
                        )
                        
                        # Log the attempt and usage
                        self.extraction_attempts.append({
                            "tier": TIER_SLICE_BALANCED,
                            "success": extracted_price is not None,
                            "price": float(extracted_price) if extracted_price else None,
                            "method": extraction_method,
                            "confidence": extraction_confidence
                        })
                        
                        if usage_info and usage_info.get("estimated_cost") > 0:
                            llm_usage_data.append(usage_info)
            
            # 4. Try JS_INTERACTION tier if:
            # - Site is known to require JavaScript, OR
            # - Previous attempts failed or had low confidence
            if requires_js or not extracted_price or extraction_confidence < extraction_confidence_threshold:
                js_endpoint_template = variant_config.get("api_endpoint_template") if variant_config else None
                js_click_sequence = variant_config.get("js_click_sequence") if variant_config else None
                
                extracted_price, extraction_method, extraction_confidence, discovered_endpoint = await self._extract_js(
                    product_url,
                    variant_attribute,
                    js_endpoint_template,
                    js_click_sequence
                )
                
                # Save discovered endpoint if found
                if discovered_endpoint:
                    if not dry_run:
                        await self.db_service.save_api_endpoint(
                            machine_id=machine_id,
                            variant_attribute=variant_attribute,
                            domain=domain,
                            api_endpoint_template=discovered_endpoint
                        )
                    logger.info(f"Discovered API endpoint for {machine_id}/{variant_attribute}: {discovered_endpoint}")
                
                # Log the attempt
                self.extraction_attempts.append({
                    "tier": TIER_JS_INTERACTION,
                    "success": extracted_price is not None,
                    "price": float(extracted_price) if extracted_price else None,
                    "method": extraction_method,
                    "confidence": extraction_confidence,
                    "endpoint_discovered": discovered_endpoint is not None
                })
            
            # 5. Try FULL_HTML tier as last resort
            if not extracted_price or extraction_confidence < extraction_confidence_threshold:
                extracted_price, extraction_method, extraction_confidence, usage_info = await self._extract_full_html(
                    html_content,
                    product_url,
                    previous_price
                )
                
                # Log the attempt and usage
                self.extraction_attempts.append({
                    "tier": TIER_FULL_HTML,
                    "success": extracted_price is not None,
                    "price": float(extracted_price) if extracted_price else None,
                    "method": extraction_method,
                    "confidence": extraction_confidence
                })
                
                if usage_info and usage_info.get("estimated_cost") > 0:
                    llm_usage_data.append(usage_info)
            
            # If no price was found with any method
            if not extracted_price:
                error_msg = "Failed to extract price with any method"
                logger.error(f"{error_msg} for {machine_id}/{variant_attribute}")
                
                # Add failed attempt to price history if not dry run
                if not dry_run:
                    await self.db_service.add_price_history(
                        machine_id=machine_id,
                        new_price=None,
                        old_price=previous_price,
                        variant_attribute=variant_attribute,
                        tier="EXTRACTION_FAILED",
                        extracted_confidence=0.0,
                        validation_confidence=0.0,
                        success=False,
                        error_message=error_msg,
                        url=product_url
                    )
                
                return {
                    "success": False,
                    "error": error_msg,
                    "machine_id": machine_id,
                    "variant_attribute": variant_attribute,
                    "url": product_url,
                    "extraction_attempts": self.extraction_attempts,
                    "duration_seconds": time.time() - start_time
                }
            
            # Validate the extracted price
            validation_result = await self._perform_validation(
                extracted_price,
                previous_price,
                extraction_method,
                extraction_confidence,
                validation_confidence_threshold,
                product_category,
                machine.get("Machine Name"),
                sanity_check_threshold
            )
            
            # Log validation results
            logger.info(f"Price validation results: {validation_result}")
            
            # If validation fails or confidence is too low, don't update the price
            if not validation_result["is_valid"] or validation_result["validation_confidence"] < validation_confidence_threshold:
                error_msg = f"Price validation failed: {validation_result['validation_reason']}"
                logger.warning(f"{error_msg} for {machine_id}/{variant_attribute}")
                
                # Add failed validation to price history if not dry run
                if not dry_run:
                    await self.db_service.add_price_history(
                        machine_id=machine_id,
                        new_price=extracted_price,
                        old_price=previous_price,
                        variant_attribute=variant_attribute,
                        tier=extraction_method,
                        extracted_confidence=extraction_confidence,
                        validation_confidence=validation_result["validation_confidence"],
                        success=False,
                        error_message=error_msg,
                        url=product_url
                    )
                
                return {
                    "success": False,
                    "error": error_msg,
                    "machine_id": machine_id,
                    "variant_attribute": variant_attribute,
                    "url": product_url,
                    "extracted_price": float(extracted_price),
                    "previous_price": float(previous_price) if previous_price else None,
                    "extraction_method": extraction_method,
                    "extraction_confidence": extraction_confidence,
                    "validation_confidence": validation_result["validation_confidence"],
                    "extraction_attempts": self.extraction_attempts,
                    "duration_seconds": time.time() - start_time,
                    "dry_run": dry_run
                }
            
            # If not in dry-run mode, update the database
            if not dry_run:
                # Use the new combined save method
                save_success = await self.db_service.save_price_extraction_results(
                    machine_id=machine_id,
                    variant_attribute=variant_attribute,
                    price=extracted_price,
                    extraction_method=extraction_method,
                    extraction_confidence=extraction_confidence,
                    validation_confidence=validation_result["validation_confidence"],
                    currency="USD",  # TODO: Support other currencies
                    manual_review_flag=validation_result["needs_manual_review"],
                    llm_usage_data=llm_usage_data
                )
                
                if save_success:
                    logger.info(f"Successfully saved price {extracted_price} for {machine_id}/{variant_attribute}")
                    
                    # If API endpoint was discovered, save it
                    if discovered_endpoint:
                        await self.db_service.update_api_endpoint(
                            machine_id=machine_id,
                            variant_attribute=variant_attribute,
                            domain=domain,
                            api_endpoint_template=discovered_endpoint
                        )
                else:
                    logger.error(f"Failed to save price for {machine_id}/{variant_attribute}")
                
                # Set manual review flag if needed
                if validation_result["needs_manual_review"]:
                    await self.db_service.set_manual_review_flag(
                        machine_id=machine_id,
                        variant_attribute=variant_attribute,
                        flag=True
                    )
            
            # Calculate price change metrics
            price_change = None
            percentage_change = None
            
            if previous_price is not None and previous_price > 0:
                price_change = float(extracted_price) - float(previous_price)
                percentage_change = (price_change / float(previous_price)) * 100
            
            # Return success result
            result = {
                "success": True,
                "machine_id": machine_id,
                "variant_attribute": variant_attribute,
                "url": product_url,
                "new_price": float(extracted_price),
                "old_price": float(previous_price) if previous_price else None,
                "price_change": price_change,
                "percentage_change": percentage_change,
                "extraction_method": extraction_method,
                "extraction_confidence": extraction_confidence,
                "validation_confidence": validation_result["validation_confidence"],
                "price_unchanged": validation_result["price_unchanged"],
                "needs_review": validation_result["needs_manual_review"],
                "review_reason": validation_result["validation_reason"] if validation_result["needs_manual_review"] else None,
                "extraction_attempts": self.extraction_attempts,
                "duration_seconds": time.time() - start_time,
                "dry_run": dry_run
            }
            
            return result
            
        except Exception as e:
            logger.exception(f"Error in price extraction pipeline for {machine_id}/{variant_attribute}: {str(e)}")
            return {
                "success": False,
                "error": f"Price extraction pipeline error: {str(e)}",
                "machine_id": machine_id,
                "variant_attribute": variant_attribute,
                "extraction_attempts": self.extraction_attempts,
                "duration_seconds": time.time() - start_time
            }
    
    async def _extract_static(self, html_content: str, url: str, variant_config: Optional[Dict[str, Any]] = None) -> Tuple[Optional[Decimal], str, float]:
        """Extract price using static parsing methods."""
        logger.info(f"Attempting STATIC tier extraction for {url}")
        
        # Get custom CSS selectors if available
        custom_selectors = None
        if variant_config and variant_config.get("css_price_selector"):
            selectors = variant_config.get("css_price_selector")
            if isinstance(selectors, str):
                custom_selectors = [selectors]
            elif isinstance(selectors, list):
                custom_selectors = selectors
        
        try:
            price, method, confidence = self.static_parser.extract(html_content, url, custom_selectors)
            
            if price:
                logger.info(f"STATIC tier extracted price: {price} using {method} with confidence {confidence}")
                return price, method, confidence
            else:
                logger.info("STATIC tier extraction failed")
                return None, "STATIC_FAILED", 0.0
        except Exception as e:
            logger.error(f"Error in STATIC tier extraction: {str(e)}")
            return None, "STATIC_ERROR", 0.0
    
    async def _extract_slice_fast(self, html_content: str, url: str, previous_price: Optional[Decimal] = None) -> Tuple[Optional[Decimal], str, float, Dict[str, Any]]:
        """Extract price using Claude Haiku for fast extraction."""
        logger.info(f"Attempting SLICE_FAST tier extraction for {url}")
        
        try:
            price, method, confidence, usage_info = self.slice_parser.extract_fast(html_content, url, previous_price)
            
            if price:
                logger.info(f"SLICE_FAST tier extracted price: {price} using {method} with confidence {confidence}")
                return price, method, confidence, usage_info
            else:
                logger.info("SLICE_FAST tier extraction failed")
                return None, "SLICE_FAST_FAILED", 0.0, usage_info
        except Exception as e:
            logger.error(f"Error in SLICE_FAST tier extraction: {str(e)}")
            return None, "SLICE_FAST_ERROR", 0.0, {}
    
    async def _extract_slice_balanced(self, html_content: str, url: str, previous_price: Optional[Decimal] = None) -> Tuple[Optional[Decimal], str, float, Dict[str, Any]]:
        """Extract price using Claude Sonnet for more thorough extraction."""
        logger.info(f"Attempting SLICE_BALANCED tier extraction for {url}")
        
        try:
            price, method, confidence, usage_info = self.slice_parser.extract_balanced(html_content, url, previous_price)
            
            if price:
                logger.info(f"SLICE_BALANCED tier extracted price: {price} using {method} with confidence {confidence}")
                return price, method, confidence, usage_info
            else:
                logger.info("SLICE_BALANCED tier extraction failed")
                return None, "SLICE_BALANCED_FAILED", 0.0, usage_info
        except Exception as e:
            logger.error(f"Error in SLICE_BALANCED tier extraction: {str(e)}")
            return None, "SLICE_BALANCED_ERROR", 0.0, {}
    
    async def _extract_js(self, url: str, variant_attribute: str = "DEFAULT", 
                   api_endpoint_template: Optional[str] = None,
                   js_click_sequence: Optional[List[Dict[str, Any]]] = None) -> Tuple[Optional[Decimal], str, float, Optional[str]]:
        """Extract price using JavaScript interactions."""
        logger.info(f"Attempting JS_INTERACTION tier extraction for {url}")
        
        try:
            price, method, confidence, discovered_endpoint = await self.js_parser.extract(
                url=url,
                variant_attribute=variant_attribute,
                api_endpoint_template=api_endpoint_template,
                js_click_sequence=js_click_sequence
            )
            
            if price:
                logger.info(f"JS_INTERACTION tier extracted price: {price} using {method} with confidence {confidence}")
                return price, method, confidence, discovered_endpoint
            else:
                logger.info("JS_INTERACTION tier extraction failed")
                return None, "JS_INTERACTION_FAILED", 0.0, discovered_endpoint
        except Exception as e:
            logger.error(f"Error in JS_INTERACTION tier extraction: {str(e)}")
            return None, "JS_INTERACTION_ERROR", 0.0, None
    
    async def _extract_full_html(self, html_content: str, url: str, previous_price: Optional[Decimal] = None) -> Tuple[Optional[Decimal], str, float, Dict[str, Any]]:
        """Extract price using GPT-4o for complex extraction from full HTML."""
        logger.info(f"Attempting FULL_HTML tier extraction for {url}")
        
        try:
            price, method, confidence, usage_info = self.full_html_parser.extract(html_content, url, previous_price)
            
            if price:
                logger.info(f"FULL_HTML tier extracted price: {price} using {method} with confidence {confidence}")
                return price, method, confidence, usage_info
            else:
                logger.info("FULL_HTML tier extraction failed")
                return None, "FULL_HTML_FAILED", 0.0, usage_info
        except Exception as e:
            logger.error(f"Error in FULL_HTML tier extraction: {str(e)}")
            return None, "FULL_HTML_ERROR", 0.0, {}
    
    async def _get_latest_price(self, machine_id: str, variant_attribute: str = "DEFAULT") -> Optional[Dict[str, Any]]:
        """Get the latest price from machines_latest table."""
        try:
            # Use direct SQL query instead of RPC function
            query = f"""
                SELECT * 
                FROM machines_latest 
                WHERE machine_id = '{machine_id}' 
                AND variant_attribute = '{variant_attribute}'
            """
            
            # Execute the query using the raw SQL method
            response = self.db_service.supabase.table("machines_latest").select("*").eq("machine_id", machine_id).eq("variant_attribute", variant_attribute).execute()
            
            if response.data and len(response.data) > 0:
                return response.data[0]
                
            logger.info(f"No latest price found for {machine_id}/{variant_attribute}")
            return None
        except Exception as e:
            logger.error(f"Error getting latest price: {str(e)}")
            return None
    
    def _extract_domain(self, url: str) -> str:
        """Extract the domain from a URL."""
        try:
            parsed_url = urlparse(url)
            domain = parsed_url.netloc
            if domain.startswith('www.'):
                domain = domain[4:]  # Strip www.
            return domain
        except:
            return ""
    
    async def _perform_validation(
        self,
        extracted_price: Decimal, 
        previous_price: Optional[Decimal],
        extraction_method: str,
        extraction_confidence: float,
        validation_confidence_threshold: float,
        product_category: Optional[str] = None,
        machine_name: Optional[str] = None,
        sanity_check_threshold: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Perform final validation on an extracted price.
        
        Args:
            extracted_price: Extracted price
            previous_price: Previous known price
            extraction_method: Method used for extraction
            extraction_confidence: Confidence in the extraction
            validation_confidence_threshold: Threshold for validation confidence
            product_category: Category of the product
            machine_name: Name of the machine
            sanity_check_threshold: Threshold for price change percentage
            
        Returns:
            Dictionary with validation results
        """
        # Format the parameters for the validator
        extraction_result = {
            "price": float(extracted_price) if extracted_price else None,
            "method": extraction_method,
            "confidence": extraction_confidence,
            "currency": "USD"  # Default currency
        }
        
        machine_data = {
            "last_price": float(previous_price) if previous_price else None,
            "currency": "USD",  # Default currency
            "category": product_category,
            "machine_name": machine_name
        }
        
        # Log what we're sending to the validator
        logger.debug(f"Calling price_validator.validate_price with extraction_result={extraction_result}, machine_data={machine_data}")
        
        # Validate the extracted price
        validation_result = await self.price_validator.validate_price(
            extraction_result,
            machine_data
        )
        
        # Log the validation result
        logger.debug(f"Received validation result: {validation_result}")
        
        # Extract values from validation result
        is_valid = validation_result.get("is_valid", False)
        validation_confidence = validation_result.get("confidence", 0.0)
        needs_manual_review = validation_result.get("requires_review", False)
        validation_reason = validation_result.get("failure_reason")
        
        # Log validation results
        logger.info(f"Price validation results: valid={is_valid}, confidence={validation_confidence}, needs_review={needs_manual_review}")
        if validation_reason:
            logger.info(f"Validation reason: {validation_reason}")
        
        # Price is unchanged from previous
        price_unchanged = (
            previous_price is not None and 
            extracted_price is not None and 
            previous_price == extracted_price
        )
        
        # Check if validation passes the threshold
        validation_passed = is_valid and validation_confidence >= validation_confidence_threshold
        
        # Prepare validation result
        result = {
            "is_valid": is_valid,
            "validation_confidence": validation_confidence,
            "needs_manual_review": needs_manual_review,
            "validation_reason": validation_reason,
            "price_unchanged": price_unchanged,
            "validation_passed": validation_passed
        }
        
        return result 