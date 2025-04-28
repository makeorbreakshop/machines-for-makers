"""
Main extraction service that orchestrates the entire price extraction pipeline.
"""
from loguru import logger
from typing import Dict, Any, Optional, Tuple, List, Union
from decimal import Decimal
import asyncio
from urllib.parse import urlparse
import time
import re
import decimal
from bs4 import BeautifulSoup

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
    DEFAULT_SANITY_THRESHOLD,
    MIN_ALLOWED_PRICE,
    MAX_ALLOWED_PRICE
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
        self.slice_parser = SliceParser(parser_config)
        self.js_parser = JSParser(parser_config)
        self.full_html_parser = FullHtmlParser(parser_config)
        self.price_validator = PriceValidator(parser_config)
        
        # Price validation limits
        self.MIN_ALLOWED_PRICE = MIN_ALLOWED_PRICE
        self.MAX_ALLOWED_PRICE = MAX_ALLOWED_PRICE
        
        # Extraction attempts for the current machine
        self.extraction_attempts = []
        
        logger.info("Extraction service initialized with all parsers")
    
    async def extract_price(self, machine_id: str, variant_attribute: str = "DEFAULT", 
                     url: str = None, dry_run: bool = False, save_to_db: bool = True,
                     flags_for_review: bool = True, sanity_check_threshold: float = 25.0,
                     batch_id: str = None) -> Dict[str, Any]:
        """
        Extract price for a machine using the best available extraction method.
        
        Args:
            machine_id (str): Machine ID
            variant_attribute (str): Variant attribute (default "DEFAULT")
            url (str, optional): URL to scrape (overrides machine URL)
            dry_run (bool): If True, don't save to database
            save_to_db (bool): If True, save results to database (ignored if dry_run is True)
            flags_for_review (bool): If True, flag items for review based on validation rules
            sanity_check_threshold (float): Percentage threshold for flagging significant price changes
            batch_id (str, optional): Batch ID for price history
            
        Returns:
            Dict containing extraction results
        """
        logger.info(f"Starting price extraction for {machine_id}/{variant_attribute}")
        start_time = time.time()
        self.extraction_attempts = []
        discovered_endpoint = None
        
        http_status = None
        html_size = 0
        
        try:
            # Get machine data from database
            machine = await self.db_service.get_machine_by_id(machine_id)
            
            if not machine:
                logger.error(f"Machine {machine_id} not found in database")
                return {
                    "success": False,
                    "error": f"Machine {machine_id} not found in database",
                    "machine_id": machine_id,
                    "variant_attribute": variant_attribute,
                    "duration_seconds": time.time() - start_time
                }
            
            # Get variant config if available
            variant_config = await self.db_service.get_variant_config(machine_id, variant_attribute)
            if variant_config:
                logger.debug(f"Found variant config for {machine_id}/{variant_attribute}: {variant_config}")
            
            # Get the product URL from machine data or from argument
            product_url = url or machine.get("product_link")
            if not product_url:
                logger.error(f"No URL available for machine {machine_id}")
                return {
                    "success": False,
                    "error": "No URL available for this machine",
                    "machine_id": machine_id,
                    "variant_attribute": variant_attribute,
                    "duration_seconds": time.time() - start_time
                }
            
            # Get previous price for comparison
            previous_price = None
            price_record = await self.db_service.get_machine_latest_price(machine_id, variant_attribute)
            
            # First try machines_latest_price
            if price_record and price_record.get("machines_latest_price") is not None:
                try:
                    previous_price = Decimal(str(price_record.get("machines_latest_price")))
                except (decimal.InvalidOperation, TypeError, ValueError) as e:
                    logger.warning(f"Failed to convert machines_latest_price to Decimal: {str(e)}")
                    previous_price = None
            
            # If no price in machines_latest, try getting from machines table
            if previous_price is None:
                machine = await self.db_service.get_machine_by_id(machine_id)
                if machine and machine.get("Price") is not None:
                    try:
                        previous_price = Decimal(str(machine.get("Price")))
                        logger.info(f"Using fallback price from machines table: {previous_price}")
                    except (decimal.InvalidOperation, TypeError, ValueError) as e:
                        logger.warning(f"Failed to convert machines.Price to Decimal: {str(e)}")
                        previous_price = None
            
            # Determine validation threshold based on variant config or default
            validation_confidence_threshold = 0.85
            if variant_config and "min_validation_confidence" in variant_config:
                validation_confidence_threshold = variant_config["min_validation_confidence"]
                
            # Get HTML content for the product page
            html_content, http_status = await self.web_scraper.get_page_content(product_url)
            if html_content:
                html_size = len(html_content)
                # Parse the HTML content into soup
                soup = self.web_scraper.parse_html(html_content)
            
            if not html_content:
                error_msg = f"Failed to fetch HTML content for {product_url}"
                logger.error(error_msg)
                
                # Record failure in price history
                if not dry_run:
                    await self.db_service.add_price_history(
                        machine_id=machine_id,
                        new_price=None,
                        old_price=previous_price,
                        variant_attribute=variant_attribute,
                        tier="WEB_SCRAPER_FAILED",
                        success=False,
                        error_message=error_msg,
                        url=product_url,
                        batch_id=batch_id
                    )
                
                return {
                    "success": False,
                    "error": error_msg,
                    "machine_id": machine_id,
                    "variant_attribute": variant_attribute,
                    "url": product_url,
                    "http_status": http_status,
                    "html_size": html_size,
                    "duration_seconds": time.time() - start_time
                }
            
            # Get product category for validation
            product_category = machine.get("Machine Category") or machine.get("Laser Category")
            
            # Get thresholds from config or defaults
            extraction_confidence_threshold = (
                variant_config.get("min_extraction_confidence") 
                if variant_config and variant_config.get("min_extraction_confidence") is not None
                else DEFAULT_EXTRACTION_CONFIDENCE
            )
            
            sanity_check_threshold = (
                variant_config.get("sanity_check_threshold")
                if variant_config and variant_config.get("sanity_check_threshold") is not None
                else DEFAULT_SANITY_THRESHOLD
            )
            
            # Determine if the site requires JavaScript
            requires_js = variant_config.get("requires_js_interaction", False) if variant_config else False
            
            # Start the extraction pipeline
            extracted_price = None
            extraction_method = None
            extraction_confidence = None
            validation_confidence = 0.0
            llm_usage_data = []
            
            if not soup:
                logger.warning(f"Failed to parse HTML for {product_url}")
                soup = BeautifulSoup(html_content, 'html.parser')  # Fallback parsing if web_scraper.parse_html failed
            
            # Skip to JS tier if site is known to require JavaScript
            if not requires_js:
                # 1. Try STATIC tier
                extracted_price, extraction_method, extraction_confidence, extraction_metadata = await self._extract_static(
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
                        previous_price,
                        variant_attribute
                    )
                    
                    # Log the attempt and usage
                    self.extraction_attempts.append({
                        "tier": TIER_SLICE_FAST,
                        "success": extracted_price is not None,
                        "price": float(extracted_price) if extracted_price else None,
                        "method": extraction_method,
                        "confidence": extraction_confidence
                    })
                    
                    if usage_info and usage_info.get("estimated_cost") is not None and usage_info.get("estimated_cost") > 0:
                        llm_usage_data.append(usage_info)
                    
                    # Continue to next tier if not successful or low confidence
                    if not extracted_price or extraction_confidence < extraction_confidence_threshold:
                        # 3. Try SLICE_BALANCED tier
                        extracted_price, extraction_method, extraction_confidence, usage_info = await self._extract_slice_balanced(
                            html_content,
                            product_url, 
                            previous_price,
                            variant_attribute
                        )
                        
                        # Log the attempt and usage
                        self.extraction_attempts.append({
                            "tier": TIER_SLICE_BALANCED,
                            "success": extracted_price is not None,
                            "price": float(extracted_price) if extracted_price else None,
                            "method": extraction_method,
                            "confidence": extraction_confidence
                        })
                        
                        if usage_info and usage_info.get("estimated_cost") is not None and usage_info.get("estimated_cost") > 0:
                            llm_usage_data.append(usage_info)
            
            # 4. Try JS_INTERACTION tier if:
            # - Site is known to require JavaScript, OR
            # - Previous attempts failed or had low confidence
            if requires_js or not extracted_price or extraction_confidence < extraction_confidence_threshold:
                js_click_sequence = variant_config.get("js_click_sequence") if variant_config else None
                
                extracted_price, extraction_method, extraction_confidence, discovered_endpoint = await self._extract_js(
                    url=product_url,
                    variant_attribute=variant_attribute,
                    js_click_sequence=js_click_sequence
                )
                
                # Save discovered endpoint if found
                if discovered_endpoint:
                    if not dry_run:
                        await self.db_service.save_api_endpoint(
                            machine_id=machine_id,
                            variant_attribute=variant_attribute,
                            domain=self._extract_domain(product_url),
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
                
                if usage_info and usage_info.get("estimated_cost") is not None and usage_info.get("estimated_cost") > 0:
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
                        url=product_url,
                        batch_id=batch_id
                    )
                
                return {
                    "success": False,
                    "error": error_msg,
                    "machine_id": machine_id,
                    "variant_attribute": variant_attribute,
                    "url": product_url,
                    "http_status": http_status,
                    "html_size": html_size,
                    "extraction_attempts": self.extraction_attempts,
                    "duration_seconds": time.time() - start_time
                }
            
            # After extracting the price but before validation, normalize and perform sanity checks
            if extracted_price:
                # Try to normalize the price format
                normalized_price = self._normalize_price(extracted_price)
                
                if normalized_price is None:
                    error_msg = f"Price normalization failed: {extracted_price} (too large or invalid format)"
                    logger.warning(error_msg)
                    
                    if not dry_run:
                        await self.db_service.add_price_history(
                            machine_id=machine_id,
                            new_price=None,
                            old_price=previous_price,
                            variant_attribute=variant_attribute,
                            tier=extraction_method,
                            extracted_confidence=extraction_confidence,
                            validation_confidence=0.0,
                            success=False,
                            error_message=error_msg,
                            url=product_url,
                            batch_id=batch_id
                        )
                    
                    return {
                        "success": False,
                        "error": error_msg,
                        "machine_id": machine_id,
                        "variant_attribute": variant_attribute,
                        "url": product_url,
                        "http_status": http_status,
                        "html_size": html_size,
                        "extracted_price": float(extracted_price),
                        "normalized_price": None,
                        "extraction_method": extraction_method,
                        "extraction_attempts": self.extraction_attempts,
                        "duration_seconds": time.time() - start_time,
                        "dry_run": dry_run
                    }
                
                # Replace the original extracted price with the normalized one
                original_price = extracted_price
                extracted_price = normalized_price
                
                # Log the normalized price
                logger.info(f"Normalized price: {extracted_price} (original: {original_price})")
            
            # Validate the extracted price
            validation_result = await self._perform_validation(
                extracted_price,
                previous_price,
                extraction_method,
                extraction_confidence,
                validation_confidence_threshold,
                product_category,
                machine.get("Machine Name"),
                sanity_check_threshold,
                flags_for_review
            )
            
            # Log validation results
            logger.info(f"Price validation results: {validation_result}")
            
            # Check if validation failed and we should try next tier
            if not validation_result.get("is_valid", False) and not requires_js:
                logger.info(f"Price validation failed for {extraction_method}, trying next tier")
                
                # Try SLICE_FAST tier if we were in STATIC
                if extraction_method.startswith("STATIC"):
                    extracted_price, extraction_method, extraction_confidence, usage_info = await self._extract_slice_fast(
                        html_content,
                        product_url,
                        previous_price,
                        variant_attribute
                    )
                    
                    if usage_info and usage_info.get("estimated_cost") is not None and usage_info.get("estimated_cost") > 0:
                        llm_usage_data.append(usage_info)
                        
                    # Validate new price
                    if extracted_price:
                        validation_result = await self._perform_validation(
                            extracted_price,
                            previous_price,
                            extraction_method,
                            extraction_confidence,
                            validation_confidence_threshold,
                            product_category,
                            machine.get("Machine Name"),
                            sanity_check_threshold,
                            flags_for_review
                        )
                
                # Try SLICE_BALANCED tier if SLICE_FAST failed or validation still failed
                if (not extracted_price or not validation_result.get("is_valid", False)) and extraction_method.startswith(("STATIC", "SLICE_FAST")):
                    extracted_price, extraction_method, extraction_confidence, usage_info = await self._extract_slice_balanced(
                        html_content,
                        product_url,
                        previous_price,
                        variant_attribute
                    )
                    
                    if usage_info and usage_info.get("estimated_cost") is not None and usage_info.get("estimated_cost") > 0:
                        llm_usage_data.append(usage_info)
                        
                    # Validate new price
                    if extracted_price:
                        validation_result = await self._perform_validation(
                            extracted_price,
                            previous_price,
                            extraction_method,
                            extraction_confidence,
                            validation_confidence_threshold,
                            product_category,
                            machine.get("Machine Name"),
                            sanity_check_threshold,
                            flags_for_review
                        )

            # Check the validation status
            if validation_result["status"] == "FAILED":
                error_msg = f"Price validation failed: {validation_result['validation_reason']}"
                logger.warning(f"{error_msg} for {machine_id}/{variant_attribute}")
                
                # Add failed validation to price history if not dry run and save_to_db is true
                if not dry_run and save_to_db:
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
                        url=product_url,
                        batch_id=batch_id
                    )
                
                return {
                    "success": False,
                    "error": error_msg,
                    "machine_id": machine_id,
                    "variant_attribute": variant_attribute,
                    "url": product_url,
                    "http_status": http_status,
                    "html_size": html_size,
                    "extracted_price": float(extracted_price),
                    "old_price": float(previous_price) if previous_price else None,
                    "new_price": float(extracted_price),
                    "previous_price": float(previous_price) if previous_price else None,
                    "extraction_method": extraction_method,
                    "extraction_confidence": extraction_confidence,
                    "validation_confidence": validation_result["validation_confidence"],
                    "extraction_attempts": self.extraction_attempts,
                    "duration_seconds": time.time() - start_time,
                    "dry_run": dry_run
                }
            
            # Save the price to database if not dry run and save_to_db is true
            if not dry_run and save_to_db:
                saved = await self.save_price_extraction_results(
                    machine_id=machine_id,
                    variant_attribute=variant_attribute,
                    price=extracted_price,
                    extraction_method=extraction_method,
                    extraction_confidence=extraction_confidence,
                    validation_confidence=validation_result["validation_confidence"],
                    currency="USD",
                    manual_review_flag=validation_result["status"] == "NEEDS_REVIEW",
                    review_reason=validation_result["validation_reason"],
                    llm_usage_data=llm_usage_data,
                    batch_id=batch_id,
                    url=product_url,
                    html_size=html_size,
                    http_status=http_status,
                    extraction_duration_seconds=time.time() - start_time,
                    extraction_attempts=self.extraction_attempts,
                    raw_price_text=str(extracted_price),
                    structured_data_type=extraction_metadata.get("structured_data_type"),
                    selectors_tried=extraction_metadata.get("selectors_tried"),
                    request_headers=extraction_metadata.get("request_headers"),
                    response_headers=extraction_metadata.get("response_headers"),
                    validation_steps=extraction_metadata.get("validation_steps"),
                    dom_elements_analyzed=extraction_metadata.get("elements_analyzed"),
                    price_location_in_dom=extraction_metadata.get("price_location"),
                    retry_count=extraction_metadata.get("retry_count"),
                    cleaned_price_string=extraction_metadata.get("cleaned_price_string"),
                    parsed_currency_from_text=extraction_metadata.get("parsed_currency"),
                    previous_price=previous_price
                )
                
                if saved:
                    logger.info(f"Successfully saved price {extracted_price} for {machine_id}/{variant_attribute}")
                    
                    # If API endpoint was discovered, save it
                    if discovered_endpoint:
                        await self.db_service.update_api_endpoint(
                            machine_id=machine_id,
                            variant_attribute=variant_attribute,
                            domain=self._extract_domain(product_url),
                            api_endpoint_template=discovered_endpoint
                        )
                else:
                    logger.error(f"Failed to save price for {machine_id}/{variant_attribute}")
                
                # Set manual review flag if needed
                if validation_result["status"] == "NEEDS_REVIEW":
                    await self.db_service.set_manual_review_flag(
                        machine_id=machine_id,
                        variant_attribute=variant_attribute,
                        flag_value=True,
                        flag_reason=validation_result["validation_reason"]
                    )
            elif validation_result["status"] == "NEEDS_REVIEW":
                # Even in dry run, log that this would need a review
                logger.info(f"Dry run: Price for {machine_id}/{variant_attribute} would be flagged for review: {validation_result['validation_reason']}")
            
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
                "http_status": http_status,
                "html_size": html_size,
                "new_price": float(extracted_price),
                "old_price": float(previous_price) if previous_price else None,
                "price_change": price_change,
                "percentage_change": percentage_change,
                "extraction_method": extraction_method,
                "extraction_confidence": extraction_confidence,
                "validation_confidence": validation_result["validation_confidence"],
                "price_unchanged": validation_result["price_unchanged"],
                "needs_review": validation_result["status"] == "NEEDS_REVIEW",
                "review_reason": validation_result["validation_reason"] if validation_result["status"] == "NEEDS_REVIEW" else None,
                "status": validation_result["status"],
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
                "url": product_url if 'product_url' in locals() else None,
                "http_status": http_status,
                "html_size": html_size,
                "extraction_attempts": self.extraction_attempts,
                "duration_seconds": time.time() - start_time
            }
    
    async def _extract_static(self, html_content: str, url: str, variant_config: Optional[Dict[str, Any]] = None) -> Tuple[Optional[Decimal], str, float, Dict[str, Any]]:
        """Extract price using static parsing methods."""
        logger.info(f"Attempting STATIC tier extraction for {url}")
        
        metadata = {
            "structured_data_type": None,
            "selectors_tried": [],
            "dom_elements_analyzed": 0,
            "price_location_in_dom": None,
            "cleaned_price_string": None,
            "parsed_currency_from_text": None
        }
        
        # Get custom CSS selectors if available
        custom_selectors = None
        if variant_config and variant_config.get("css_price_selector"):
            selectors = variant_config.get("css_price_selector")
            if isinstance(selectors, str):
                custom_selectors = [selectors]
            elif isinstance(selectors, list):
                custom_selectors = selectors
            metadata["selectors_tried"] = custom_selectors
        
        try:
            # Track the start time for DOM analysis
            dom_analysis_start = time.time()
            
            # Extract price using static parser
            price, method, confidence, extraction_metadata = self.static_parser.extract(html_content, url, custom_selectors)
            
            # Update metadata with parser results
            metadata.update(extraction_metadata)
            
            # Calculate DOM analysis time and elements
            metadata["dom_elements_analyzed"] = extraction_metadata.get("elements_analyzed", 0)
            metadata["price_location_in_dom"] = extraction_metadata.get("price_location", None)
            metadata["structured_data_type"] = extraction_metadata.get("structured_data_type", None)
            metadata["cleaned_price_string"] = extraction_metadata.get("cleaned_price_string", None)
            metadata["parsed_currency_from_text"] = extraction_metadata.get("parsed_currency", None)
            
            if price:
                logger.info(f"STATIC tier extracted price: {price} using {method} with confidence {confidence}")
                return price, method, confidence, metadata
            else:
                logger.info("STATIC tier extraction failed")
                return None, None, 0.0, metadata
                
        except Exception as e:
            logger.exception(f"Error in static extraction: {str(e)}")
            return None, None, 0.0, metadata
    
    async def _extract_slice_fast(self, html_content: str, url: str, previous_price: Optional[Decimal] = None, variant_attribute: str = "DEFAULT") -> Tuple[Optional[Decimal], str, float, Dict[str, Any]]:
        """Extract price using Claude Haiku for fast extraction."""
        logger.info(f"Attempting SLICE_FAST tier extraction for {url}")
        
        try:
            price, method, confidence, usage_info = self.slice_parser.extract_fast(html_content, url, previous_price, variant_attribute)
            
            if price:
                logger.info(f"SLICE_FAST tier extracted price: {price} using {method} with confidence {confidence}")
                return price, method, confidence, usage_info
            else:
                logger.info("SLICE_FAST tier extraction failed")
                return None, "SLICE_FAST_FAILED", 0.0, usage_info
        except Exception as e:
            logger.error(f"Error in SLICE_FAST tier extraction: {str(e)}")
            return None, "SLICE_FAST_ERROR", 0.0, {}
    
    async def _extract_slice_balanced(self, html_content: str, url: str, previous_price: Optional[Decimal] = None, variant_attribute: str = "DEFAULT") -> Tuple[Optional[Decimal], str, float, Dict[str, Any]]:
        """Extract price using Claude Sonnet for more thorough extraction."""
        logger.info(f"Attempting SLICE_BALANCED tier extraction for {url}")
        
        try:
            price, method, confidence, usage_info = self.slice_parser.extract_balanced(html_content, url, previous_price, variant_attribute)
            
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
                   js_click_sequence: Optional[List[Dict[str, Any]]] = None) -> Tuple[Optional[Decimal], str, float, Optional[str]]:
        """Extract price using JavaScript interactions."""
        logger.info(f"Attempting JS_INTERACTION tier extraction for {url}")
        
        try:
            # Get HTML content for the URL
            html_content = await self.web_scraper.get_page_content(url)
            
            # Call with correct parameters
            price, method, confidence, details = await self.js_parser.extract(
                url=url,
                html_content=html_content,
                variant_attribute=variant_attribute
            )
            
            # Extract discovered_endpoint from details if available
            discovered_endpoint = None
            if isinstance(details, dict) and "api_endpoint" in details:
                discovered_endpoint = details.get("api_endpoint")
            
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
            price, method, confidence, usage_info = await self.full_html_parser.extract(html_content, url, previous_price)
            
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
        sanity_check_threshold: Optional[float] = None,
        flags_for_review: bool = True
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
            flags_for_review: If True, flag items for review based on validation rules
            
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
        
        # Additional validation for extreme price values
        # This provides a second safety check for unrealistic values that slipped through
        price_float = float(extracted_price)
        if price_float > self.MAX_ALLOWED_PRICE or price_float < self.MIN_ALLOWED_PRICE:
            logger.warning(f"Price {price_float} outside of allowed range: [{self.MIN_ALLOWED_PRICE}, {self.MAX_ALLOWED_PRICE}]")
            is_valid = False
            validation_confidence = 0.0
            needs_manual_review = True
            validation_reason = f"Price outside reasonable range: {price_float}"
            
        # Additional validation for extreme price changes
        if previous_price is not None and previous_price > 0 and price_float > 0:
            percent_change = abs(price_float - float(previous_price)) / float(previous_price)
            
            # Only apply flagging rules if flags_for_review is True
            if flags_for_review:
                # Apply additional confidence penalty for large price changes
                if percent_change > 0.8:  # 80% change
                    validation_confidence = max(0.0, validation_confidence - 0.5)
                    needs_manual_review = True
                    
                    if not validation_reason:
                        validation_reason = f"Extreme price change: {percent_change:.1%}"
                elif percent_change > 0.5:  # 50% change
                    validation_confidence = max(0.0, validation_confidence - 0.3)
                    needs_manual_review = True
                    
                    if not validation_reason:
                        validation_reason = f"Large price change: {percent_change:.1%}"
                elif percent_change > sanity_check_threshold/100.0:  # Use parameter for threshold (default: 25%)
                    validation_confidence = max(0.0, validation_confidence - 0.1)
                    needs_manual_review = True
                    
                    if not validation_reason:
                        validation_reason = f"Significant price change: {percent_change:.1%}"
            
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
        
        # Determine final status - prioritize needs_manual_review over validation_passed
        status = "NEEDS_REVIEW" if needs_manual_review else ("PASSED" if validation_passed else "FAILED")
        
        # Prepare validation result
        result = {
            "is_valid": is_valid,
            "validation_confidence": validation_confidence,
            "needs_manual_review": needs_manual_review,
            "validation_reason": validation_reason,
            "price_unchanged": price_unchanged,
            "validation_passed": validation_passed,
            "status": status
        }
        
        return result
    
    def _normalize_price(self, price_value: Any) -> Optional[Decimal]:
        """
        Normalize price values to handle common formatting issues.
        
        Args:
            price_value: The price value to normalize (string, float, Decimal, etc.)
            
        Returns:
            Normalized Decimal price or None if normalization fails
        """
        try:
            # Handle different input types
            if isinstance(price_value, Decimal):
                price_str = str(price_value)
            else:
                price_str = str(price_value)
            
            # Handle OMTech's special format where price is repeated like "$2,59999$2,599.99"
            if price_str.count('$') > 1:
                # Split by $ and take the last part which usually has correct format
                parts = price_str.split('$')
                price_str = parts[-1]
            
            # Clean the string - remove currency symbols, commas, spaces, etc.
            price_str = re.sub(r'[^\d.]', '', price_str)
            
            # Handle multiple decimal points (keep only first one)
            parts = price_str.split('.')
            if len(parts) > 2:
                price_str = parts[0] + '.' + ''.join(parts[1:])
            
            # Check for obviously incorrect formatting like "2199992199.99"
            # This is likely a concatenation error where the price appears twice
            if len(price_str) > 8 and len(price_str.replace('.', '')) > 8:
                # Look for patterns like price repeating
                digits = price_str.replace('.', '')
                half_len = len(digits) // 2
                
                if half_len > 3 and digits[:half_len] == digits[half_len:half_len*2]:
                    # Found repeating pattern, use just the first half
                    logger.warning(f"Detected repeating price pattern in {price_str}, using first half")
                    price_str = digits[:half_len]
                    # Re-add decimal point if needed
                    if '.' in price_str:
                        decimal_pos = price_str.find('.')
                        price_str = price_str[:decimal_pos] + '.' + price_str[decimal_pos+1:]
            
            # Convert to Decimal
            price_decimal = Decimal(price_str)
            
            # Sanity check for unreasonably large values
            if price_decimal > self.MAX_ALLOWED_PRICE:
                logger.warning(f"Price too high: {price_decimal} > {self.MAX_ALLOWED_PRICE}")
                
                # Try to fix common decimal point errors
                # E.g., 25.495 should be 25495 for certain European formats
                if '.' in price_str and len(price_str.split('.')[-1]) > 2:
                    corrected_str = price_str.replace('.', '')
                    corrected_price = Decimal(corrected_str)
                    
                    # Check if corrected price is reasonable
                    if self.MIN_ALLOWED_PRICE <= corrected_price <= self.MAX_ALLOWED_PRICE:
                        logger.info(f"Corrected price from {price_decimal} to {corrected_price}")
                        return corrected_price
                
                return None
                
            # Sanity check for unreasonably small values
            if price_decimal < self.MIN_ALLOWED_PRICE:
                logger.warning(f"Price too low: {price_decimal} < {self.MIN_ALLOWED_PRICE}")
                
                # Try to fix common decimal point errors
                # E.g., 1.839 might actually be 1839
                if '.' in price_str and len(price_str) < 6:
                    corrected_str = price_str.replace('.', '')
                    corrected_price = Decimal(corrected_str)
                    
                    # Check if corrected price is reasonable
                    if self.MIN_ALLOWED_PRICE <= corrected_price <= self.MAX_ALLOWED_PRICE:
                        logger.info(f"Corrected price from {price_decimal} to {corrected_price}")
                        return corrected_price
                
                return None
            
            return price_decimal
            
        except (ValueError, decimal.InvalidOperation, TypeError) as e:
            logger.error(f"Price normalization error: {str(e)} for value: {price_value}")
            return None

    async def save_price_extraction_results(
        self, 
        machine_id: str,
        variant_attribute: str,
        price: Decimal,
        extraction_method: str,
        extraction_confidence: float,
        validation_confidence: float = 0.0,
        currency: str = "USD",
        manual_review_flag: bool = False,
        review_reason: str = None,
        failure_reason: str = None,
        llm_usage_data: List[Dict[str, Any]] = None,
        batch_id: Optional[str] = None,
        url: Optional[str] = None,
        html_size: Optional[int] = None,
        http_status: Optional[int] = None,
        extraction_duration_seconds: Optional[float] = None,
        extraction_attempts: Optional[List[Dict[str, Any]]] = None,
        raw_price_text: Optional[str] = None,
        # Add new parameters
        structured_data_type: Optional[str] = None,
        selectors_tried: Optional[List[str]] = None,
        request_headers: Optional[Dict[str, str]] = None,
        response_headers: Optional[Dict[str, str]] = None,
        validation_steps: Optional[List[Dict[str, Any]]] = None,
        dom_elements_analyzed: Optional[int] = None,
        price_location_in_dom: Optional[str] = None,
        retry_count: Optional[int] = None,
        cleaned_price_string: Optional[str] = None,
        parsed_currency_from_text: Optional[str] = None,
        previous_price: Optional[Decimal] = None
    ) -> bool:
        """Save price extraction results to the database."""
        try:
            # Get machine details for company and category
            machine = await self.db_service.get_machine_by_id(machine_id)
            company = machine.get("company") if machine else None
            category = machine.get("category") if machine else None
            
            # Only query the previous_price if not provided
            if previous_price is None:
                previous_price = await self.db_service.get_previous_price(machine_id, variant_attribute)
            
            # Add price history record
            price_history_id = await self.db_service.add_price_history(
                machine_id=machine_id,
                new_price=price,
                old_price=previous_price,
                variant_attribute=variant_attribute,
                tier=extraction_method,
                extracted_confidence=extraction_confidence,
                validation_confidence=validation_confidence,
                success=True,
                error_message=failure_reason,
                url=url,
                batch_id=batch_id,
                html_size=html_size,
                http_status=http_status,
                extraction_method=extraction_method,
                raw_price_text=raw_price_text,
                extraction_duration_seconds=extraction_duration_seconds,
                extraction_attempts=extraction_attempts,
                needs_review=manual_review_flag,
                review_reason=review_reason,
                validation_basis_price=previous_price,
                # Add new fields
                structured_data_type=structured_data_type,
                selectors_tried=selectors_tried,
                request_headers=request_headers,
                response_headers=response_headers,
                validation_steps=validation_steps,
                company=company,
                category=category,
                dom_elements_analyzed=dom_elements_analyzed,
                price_location_in_dom=price_location_in_dom,
                retry_count=retry_count,
                cleaned_price_string=cleaned_price_string,
                parsed_currency_from_text=parsed_currency_from_text
            )
            
            if price_history_id:
                logger.info(f"Successfully saved price extraction results for {machine_id}")
                return True
            else:
                logger.error(f"Failed to save price extraction results for {machine_id}")
                return False
                
        except Exception as e:
            logger.exception(f"Error saving price extraction results: {str(e)}")
            return False

    async def extract_machine_price(
        self,
        machine_id: str,
        url: str,
        variant_attribute: str = "DEFAULT",
        save_to_db: bool = True,
        flags_for_review: bool = True,
        sanity_check_threshold: float = 25.0,
        batch_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Extract the latest price for a machine from its product page."""
        start_time = time.time()
        extraction_attempts = []
        
        try:
            # Get machine details
            machine = await self.db_service.get_machine_by_id(machine_id)
            if not machine:
                return {
                    "success": False,
                    "error": f"Machine {machine_id} not found"
                }

            # Validate URL
            if not url or not isinstance(url, str):
                return {
                    "success": False,
                    "error": "Invalid URL provided"
                }

            # Get the HTML content
            html_content, html_size, http_status = await self.web_scraper.get_page_content(url)
            if not html_content:
                return {
                    "success": False,
                    "error": "Failed to fetch HTML content",
                    "http_status": http_status
                }

            # Get the latest price history for comparison
            latest_price = await self.db_service.get_machine_latest_price(machine_id, variant_attribute)
            old_price = latest_price.get("machines_latest_price") if latest_price else None

            # Extract price using existing price extractor
            extraction_result = await self.price_extractor.extract_price(
                html_content,
                url,
                machine.get("name", ""),
                extraction_attempts
            )

            # Calculate duration
            extraction_duration = time.time() - start_time

            # Process extraction result
            if not extraction_result["success"]:
                error_msg = extraction_result.get("error", "Unknown error during price extraction")
                if save_to_db:
                    await self.save_price_extraction_results(
                        machine_id=machine_id,
                        variant_attribute=variant_attribute,
                        price=None,
                        extraction_method=extraction_result.get("method", "unknown"),
                        extraction_confidence=0.0,
                        validation_confidence=0.0,
                        success=False,
                        error_message=error_msg,
                        url=url,
                        html_size=html_size,
                        http_status=http_status,
                        raw_price_text=extraction_result.get("raw_price_text"),
                        extraction_duration_seconds=extraction_duration,
                        extraction_attempts=extraction_attempts,
                        needs_review=False,
                        review_reason=None,
                        batch_id=batch_id,
                        previous_price=old_price
                    )
                return {
                    "success": False,
                    "error": error_msg,
                    "method": extraction_result.get("method", "unknown"),
                    "http_status": http_status
                }

            new_price = extraction_result["price"]
            needs_review = False
            review_reason = None

            # Validate price if flags_for_review is enabled
            if flags_for_review and old_price:
                price_change_pct = abs((new_price - old_price) / old_price * 100)
                if price_change_pct > sanity_check_threshold:
                    needs_review = True
                    review_reason = f"Price change of {price_change_pct:.1f}% exceeds threshold of {sanity_check_threshold}%"

            # Save results if requested
            if save_to_db:
                price_history_id = await self.save_price_extraction_results(
                    machine_id=machine_id,
                    variant_attribute=variant_attribute,
                    price=new_price,
                    extraction_method=extraction_result["method"],
                    extraction_confidence=extraction_result.get("confidence", 0.0),
                    validation_confidence=extraction_result.get("validation_confidence", 0.0),
                    success=True,
                    error_message=None,
                    url=url,
                    html_size=html_size,
                    http_status=http_status,
                    raw_price_text=extraction_result.get("raw_price_text"),
                    extraction_duration_seconds=extraction_duration,
                    extraction_attempts=extraction_attempts,
                    needs_review=needs_review,
                    review_reason=review_reason,
                    batch_id=batch_id,
                    previous_price=old_price
                )
                if not price_history_id:
                    return {
                        "success": False,
                        "error": "Failed to save price history"
                    }

            # Calculate price change metrics
            price_change = None
            percentage_change = None
            if old_price and new_price:
                price_change = new_price - old_price
                percentage_change = (price_change / old_price) * 100

            # Return successful result
            return {
                "success": True,
                "price_history_id": price_history_id if save_to_db else None,
                "old_price": old_price,
                "new_price": new_price,
                "price_change": price_change,
                "percentage_change": percentage_change,
                "method": extraction_result["method"],
                "confidence": extraction_result.get("confidence", 0.0),
                "validation_confidence": extraction_result.get("validation_confidence", 0.0),
                "needs_review": needs_review,
                "review_reason": review_reason,
                "extraction_duration": extraction_duration,
                "http_status": http_status,
                "html_size": html_size
            }

        except Exception as e:
            logger.error(f"Error in extract_machine_price: {str(e)}")
            if save_to_db:
                await self.save_price_extraction_results(
                    machine_id=machine_id,
                    variant_attribute=variant_attribute,
                    price=None,
                    extraction_method="error",
                    extraction_confidence=0.0,
                    validation_confidence=0.0,
                    success=False,
                    error_message=str(e),
                    url=url,
                    html_size=html_size if 'html_size' in locals() else None,
                    http_status=http_status if 'http_status' in locals() else None,
                    raw_price_text=None,
                    extraction_duration_seconds=time.time() - start_time,
                    extraction_attempts=extraction_attempts,
                    needs_review=False,
                    review_reason=None,
                    batch_id=batch_id,
                    previous_price=old_price if 'old_price' in locals() else None
                )
            return {
                "success": False,
                "error": f"Unexpected error: {str(e)}"
            } 