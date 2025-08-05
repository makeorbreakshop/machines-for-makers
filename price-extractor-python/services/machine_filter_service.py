"""
Machine Filter Service using GPT-4o mini

Filters discovered URLs to identify actual machines vs materials/packages/accessories
Runs before duplicate detection to reduce unnecessary processing
"""
import json
import logging
from typing import Dict, List, Tuple, Optional
from openai import OpenAI
from config import OPENAI_API_KEY
from loguru import logger

class MachineFilterService:
    """Uses GPT-4o mini to classify URLs as machines vs non-machines"""
    
    def __init__(self):
        if not OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY not set in environment")
        self.client = OpenAI(api_key=OPENAI_API_KEY)
        self.model = "gpt-4o-mini"
        logger.info(f"Machine filter service initialized with model: {self.model}")
    
    def classify_urls_batch(self, urls: List[str], manufacturer_name: str = "") -> Dict[str, Dict]:
        """
        Classify a batch of URLs as machines vs non-machines
        
        Args:
            urls: List of product URLs to classify
            manufacturer_name: Name of the manufacturer for context
            
        Returns:
            Dict mapping URL to classification result
        """
        if not urls:
            return {}
        
        # Process in batches of 20 URLs for efficiency
        batch_size = 20
        all_results = {}
        
        for i in range(0, len(urls), batch_size):
            batch = urls[i:i+batch_size]
            results = self._classify_batch(batch, manufacturer_name)
            all_results.update(results)
        
        return all_results
    
    def _classify_batch(self, urls: List[str], manufacturer_name: str) -> Dict[str, Dict]:
        """Classify a single batch of URLs"""
        
        # Create a numbered list for the prompt
        url_list = "\n".join([f"{i+1}. {url}" for i, url in enumerate(urls)])
        
        system_prompt = """You are an expert at identifying manufacturing equipment (laser cutters, 3D printers, CNC machines) from product URLs.

Your task is to classify each URL as either:
- MACHINE: Actual manufacturing equipment (laser cutters, engravers, 3D printers, CNC machines, routers, etc.)
- MATERIAL: Materials, supplies, filaments, sheets, resins, etc.
- ACCESSORY: Accessories, parts, upgrades, tools, attachments, rotary modules, air filters, etc.
- PACKAGE: Bundles, packages, or kits that include a machine plus accessories
- SERVICE: Services, software, courses, warranties, support plans
- UNKNOWN: Cannot determine from URL alone

Focus on the URL path and product name indicators. Common patterns:
- Machines often have model numbers, power ratings (W/watt), or size specs
- Materials often mention "sheet", "filament", "resin", "material", "supplies"
- Accessories often mention "accessory", "attachment", "module", "filter", "upgrade"
- Packages often mention "bundle", "kit", "package", "combo"
"""

        user_prompt = f"""Classify these URLs from {manufacturer_name or 'this manufacturer'}:

{url_list}

For each URL, determine if it's a MACHINE, MATERIAL, ACCESSORY, PACKAGE, SERVICE, or UNKNOWN."""

        try:
            # Use function calling for structured output
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                tools=[{
                    "type": "function",
                    "function": {
                        "name": "classify_urls",
                        "description": "Classify URLs as machines or non-machines",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "classifications": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "url_number": {
                                                "type": "integer",
                                                "description": "The number of the URL from the list (1-based)"
                                            },
                                            "classification": {
                                                "type": "string",
                                                "enum": ["MACHINE", "MATERIAL", "ACCESSORY", "PACKAGE", "SERVICE", "UNKNOWN"],
                                                "description": "Classification of the URL"
                                            },
                                            "confidence": {
                                                "type": "number",
                                                "description": "Confidence score 0-1"
                                            },
                                            "reason": {
                                                "type": "string",
                                                "description": "Brief reason for classification"
                                            },
                                            "machine_type": {
                                                "type": "string",
                                                "enum": ["laser_cutter", "3d_printer", "cnc_machine", "other", "not_machine"],
                                                "description": "Type of machine if classified as MACHINE"
                                            }
                                        },
                                        "required": ["url_number", "classification", "confidence", "reason", "machine_type"]
                                    }
                                }
                            },
                            "required": ["classifications"]
                        }
                    }
                }],
                tool_choice="required"
            )
            
            # Extract the function call result
            tool_call = response.choices[0].message.tool_calls[0]
            classifications = json.loads(tool_call.function.arguments)["classifications"]
            
            # Map back to URLs
            results = {}
            for item in classifications:
                idx = item["url_number"] - 1  # Convert to 0-based
                if 0 <= idx < len(urls):
                    url = urls[idx]
                    results[url] = {
                        "classification": item["classification"],
                        "confidence": item["confidence"],
                        "reason": item["reason"],
                        "machine_type": item["machine_type"],
                        "should_skip": item["classification"] in ["MATERIAL", "ACCESSORY", "SERVICE"],
                        "needs_review": item["classification"] in ["PACKAGE", "UNKNOWN"]
                    }
            
            logger.info(f"Classified {len(results)} URLs: "
                       f"{sum(1 for r in results.values() if r['classification'] == 'MACHINE')} machines, "
                       f"{sum(1 for r in results.values() if r['should_skip'])} to skip")
            
            return results
            
        except Exception as e:
            logger.error(f"Error classifying URLs: {str(e)}")
            # Return empty classifications on error
            return {url: {
                "classification": "UNKNOWN",
                "confidence": 0,
                "reason": f"Classification error: {str(e)}",
                "machine_type": "not_machine",
                "should_skip": False,
                "needs_review": True
            } for url in urls}
    
    def get_machine_urls_only(self, url_classifications: Dict[str, Dict]) -> List[str]:
        """
        Get only URLs classified as actual machines
        
        Args:
            url_classifications: Result from classify_urls_batch
            
        Returns:
            List of URLs that are actual machines
        """
        return [
            url for url, info in url_classifications.items()
            if info["classification"] == "MACHINE" and info["confidence"] >= 0.7
        ]
    
    def get_skip_urls(self, url_classifications: Dict[str, Dict]) -> List[str]:
        """
        Get URLs that should be auto-skipped
        
        Args:
            url_classifications: Result from classify_urls_batch
            
        Returns:
            List of URLs to skip
        """
        return [
            url for url, info in url_classifications.items()
            if info["should_skip"]
        ]
    
    def get_review_urls(self, url_classifications: Dict[str, Dict]) -> List[str]:
        """
        Get URLs that need manual review (packages, unknown)
        
        Args:
            url_classifications: Result from classify_urls_batch
            
        Returns:
            List of URLs needing review
        """
        return [
            url for url, info in url_classifications.items()
            if info["needs_review"]
        ]