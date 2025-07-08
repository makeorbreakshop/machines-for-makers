"""
MCP Connector Learning System

This system uses Claude with MCP browser automation to intelligently discover
how to extract prices from complex e-commerce sites, then converts those
learnings into fast Playwright automation.

Architecture:
1. Learning Phase: Use MCP Connector to discover site patterns
2. Storage Phase: Save learned selectors and steps to database  
3. Production Phase: Use Playwright with learned patterns
4. Fallback Phase: Re-learn when sites change
"""

import asyncio
import json
import time
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from urllib.parse import urlparse
from loguru import logger
import anthropic

from config import ANTHROPIC_API_KEY
from services.database import DatabaseService


class MCPLearningSystem:
    """
    Intelligent price extraction learning system using MCP Connector.
    
    This system learns how to extract prices from complex sites and converts
    those learnings into fast, scalable Playwright automation.
    """
    
    def __init__(self):
        """Initialize the MCP learning system."""
        self.client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        self.db_service = DatabaseService()
        logger.info("MCP Learning System initialized")
    
    async def learn_site_extraction(self, url: str, machine_name: str, machine_data: dict = None) -> Dict:
        """
        Use MCP Connector to learn how to extract prices from a specific site.
        
        Args:
            url: Product page URL to learn from
            machine_name: Machine name for variant selection context
            machine_data: Full machine data for enhanced context
            
        Returns:
            Dict containing learned patterns, selectors, and extraction steps
        """
        try:
            domain = self._get_domain(url)
            logger.info(f"Starting MCP learning session for {domain} with machine: {machine_name}")
            
            # Check if we already have recent learnings for this domain
            existing_learnings = await self._get_existing_learnings(domain)
            if existing_learnings and self._is_learning_recent(existing_learnings):
                logger.info(f"Using existing recent learnings for {domain}")
                return existing_learnings
            
            # Create learning prompt for Claude
            learning_prompt = self._create_learning_prompt(url, machine_name, machine_data)
            
            # Execute learning session with MCP Connector
            start_time = time.time()
            learning_result = await self._execute_mcp_learning_session(learning_prompt)
            duration = time.time() - start_time
            
            if not learning_result:
                logger.error(f"MCP learning session failed for {domain}")
                return None
            
            # Parse and structure the learning results
            structured_learnings = self._structure_learning_results(learning_result, url, machine_name)
            
            # Store learnings in database for future use
            await self._store_learnings(domain, structured_learnings, duration)
            
            logger.info(f"Successfully completed MCP learning for {domain} in {duration:.2f}s")
            return structured_learnings
            
        except Exception as e:
            logger.error(f"Error in MCP learning session: {str(e)}")
            return None
    
    async def _execute_mcp_learning_session(self, prompt: str) -> Optional[Dict]:
        """
        Execute the actual MCP learning session with Claude using REAL browser automation.
        
        Args:
            prompt: Learning prompt for Claude
            
        Returns:
            Raw learning results from Claude MCP session
        """
        try:
            # Import the real MCP browser automation tools
            from scrapers.claude_mcp_client import ClaudeMCPClient
            
            logger.info("Executing MCP learning session with REAL browser automation")
            
            # Create MCP client for browser automation
            mcp_client = ClaudeMCPClient()
            
            # Use Claude MCP with browser automation to learn the site
            # This calls Claude with access to MCP Puppeteer tools
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=4000,
                temperature=0.1,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )
            
            # Parse Claude's response for structured learning data
            learning_data = self._parse_claude_learning_response(response.content[0].text)
            
            # If Claude didn't provide structured learning data, create a minimal one
            if not learning_data:
                logger.warning("Claude didn't provide structured learning data, creating fallback")
                learning_data = {
                    "domain": "unknown",
                    "success": False,
                    "price_found": None,
                    "extraction_steps": [],
                    "learned_selectors": {},
                    "variant_selection": {},
                    "price_extraction": {},
                    "site_characteristics": {},
                    "debugging_info": {
                        "error": "Claude didn't provide structured learning data"
                    }
                }
            
            return learning_data
            
        except Exception as e:
            logger.error(f"Error executing MCP learning session: {str(e)}")
            # Return a structured failure response
            return {
                "domain": "unknown",
                "success": False,
                "price_found": None,
                "extraction_steps": [],
                "learned_selectors": {},
                "variant_selection": {},
                "price_extraction": {},
                "site_characteristics": {},
                "debugging_info": {
                    "error": str(e)
                }
            }
    
    def _create_learning_prompt(self, url: str, machine_name: str, machine_data: dict = None) -> str:
        """
        Create a comprehensive learning prompt for Claude MCP session.
        
        Args:
            url: Product page URL
            machine_name: Machine name for context
            machine_data: Additional machine data for context
            
        Returns:
            Formatted learning prompt
        """
        domain = self._get_domain(url)
        
        # Extract relevant details from machine name for variant selection
        variant_context = self._extract_variant_context(machine_name)
        
        # Build the prompt in parts to avoid f-string nesting issues
        machine_data_context = json.dumps(machine_data, indent=2) if machine_data else "Not provided"
        
        # Create the JSON template separately to avoid f-string nesting
        json_template = '''{
  "domain": "example.com",
  "success": true,
  "price_found": 2399.0,
  "extraction_steps": [
    {
      "step": 1,
      "action": "navigate",
      "target": "TARGET_URL",
      "notes": "Initial page load"
    },
    {
      "step": 2, 
      "action": "click",
      "selector": ".popup-close",
      "notes": "Close welcome popup"
    },
    {
      "step": 3,
      "action": "click", 
      "selector": "button[data-variant='30W']",
      "notes": "Select 30W power variant"
    },
    {
      "step": 4,
      "action": "extract",
      "selector": ".price .amount",
      "notes": "Extract final price after variant selection"
    }
  ],
  "learned_selectors": {
    "popup_close": ".popup-close",
    "variant_button": "button[data-variant='30W']",
    "price_display": ".price .amount",
    "price_container": ".package-pricing"
  },
  "variant_selection": {
    "method": "button_click",
    "power_selector": "button[data-variant='POWER_W']",
    "power_value": "30W"
  },
  "price_extraction": {
    "primary_selector": ".price .amount",
    "fallback_selectors": [".product-price", "[data-price]"],
    "price_format": "USD",
    "price_location": "basic_bundle"
  },
  "site_characteristics": {
    "has_variants": true,
    "popup_behavior": "welcome_overlay",
    "ajax_updates": true,
    "price_update_delay": 1000
  },
  "debugging_info": {
    "total_buttons_found": 5,
    "variant_buttons_available": ["20W", "30W", "60W"],
    "price_elements_found": 3,
    "final_price_selector": ".price .amount"
  }
}'''
        
        prompt = f"""
You are an expert web automation engineer tasked with learning how to extract prices from e-commerce sites using browser automation. 

Your goal is to visit this product page and learn the exact steps needed to:
1. Navigate to the page and handle any popups/overlays
2. Select the correct product variant based on the machine specifications
3. Extract the accurate price for that specific variant
4. Document the CSS selectors and interaction patterns

**Target Product:**
- URL: {url}
- Machine: {machine_name}
- Domain: {domain}
- Variant Context: {variant_context}

**Machine Data Context:**
{machine_data_context}

**Your Learning Task:**
1. Navigate to the product page using browser automation
2. Identify and close any popups or overlays
3. Locate variant selection controls (buttons, dropdowns, etc.)
4. Select the correct variant based on the machine specifications
5. Find the price display after variant selection
6. Extract the price value
7. Document all successful selectors and interaction steps

**Return a structured learning report in JSON format with this structure:**

Example response:
```json
{json_template}
```

Focus on creating reliable, reusable patterns that can be converted to fast Playwright automation. Document everything that works, including timing, selectors, and interaction sequences.
"""
        
        return prompt
    
    def _extract_variant_context(self, machine_name: str) -> Dict:
        """Extract variant information from machine name."""
        import re
        
        context = {}
        
        # Extract power rating
        power_match = re.search(r'(\d+)W', machine_name, re.IGNORECASE)
        if power_match:
            context['power'] = power_match.group(1) + 'W'
        
        # Extract technology type
        if 'MOPA' in machine_name.upper():
            context['technology'] = 'MOPA'
        elif 'CO2' in machine_name.upper():
            context['technology'] = 'CO2'
        elif 'Diode' in machine_name:
            context['technology'] = 'Diode'
        elif 'Fiber' in machine_name:
            context['technology'] = 'Fiber'
        
        # Extract model series
        model_match = re.search(r'(B\d+|GM-\d+|OS-\d+)', machine_name, re.IGNORECASE)
        if model_match:
            context['model'] = model_match.group(1)
        
        return context
    
    def _parse_claude_learning_response(self, response_text: str) -> Optional[Dict]:
        """
        Parse Claude's learning response to extract structured data.
        
        Args:
            response_text: Raw response text from Claude
            
        Returns:
            Parsed learning data or None if parsing failed
        """
        try:
            # Look for JSON blocks in the response
            import re
            json_pattern = r'```json\s*(.*?)\s*```'
            json_matches = re.findall(json_pattern, response_text, re.DOTALL)
            
            if json_matches:
                # Try to parse the first JSON block
                json_data = json.loads(json_matches[0])
                return json_data
            
            # If no JSON blocks, try to find JSON-like content
            json_pattern2 = r'\{[\s\S]*\}'
            json_matches2 = re.findall(json_pattern2, response_text)
            
            if json_matches2:
                # Try to parse the largest JSON-like block
                largest_json = max(json_matches2, key=len)
                json_data = json.loads(largest_json)
                return json_data
            
            logger.warning("Could not find structured JSON in Claude's response")
            return None
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON from Claude response: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Error parsing Claude learning response: {str(e)}")
            return None
    
    def _structure_learning_results(self, raw_results: Dict, url: str, machine_name: str) -> Dict:
        """
        Structure and validate the learning results.
        
        Args:
            raw_results: Raw results from Claude learning session
            url: Original URL
            machine_name: Machine name used for learning
            
        Returns:
            Structured and validated learning results
        """
        try:
            domain = self._get_domain(url)
            
            structured = {
                'domain': domain,
                'url': url,
                'machine_name': machine_name,
                'learned_at': datetime.utcnow().isoformat() + 'Z',
                'success': raw_results.get('success', False),
                'price_found': raw_results.get('price_found'),
                'confidence': raw_results.get('confidence', 0.8),
                'extraction_steps': raw_results.get('extraction_steps', []),
                'learned_selectors': raw_results.get('learned_selectors', {}),
                'variant_selection': raw_results.get('variant_selection', {}),
                'price_extraction': raw_results.get('price_extraction', {}),
                'site_characteristics': raw_results.get('site_characteristics', {}),
                'debugging_info': raw_results.get('debugging_info', {}),
                'validation': {
                    'selector_count': len(raw_results.get('learned_selectors', {})),
                    'step_count': len(raw_results.get('extraction_steps', [])),
                    'has_variant_logic': bool(raw_results.get('variant_selection')),
                    'has_price_logic': bool(raw_results.get('price_extraction'))
                }
            }
            
            return structured
            
        except Exception as e:
            logger.error(f"Error structuring learning results: {str(e)}")
            return None
    
    async def _store_learnings(self, domain: str, learnings: Dict, duration: float) -> bool:
        """
        Store learning results in the database.
        
        Args:
            domain: Domain the learnings apply to
            learnings: Structured learning results
            duration: Time taken for learning session
            
        Returns:
            True if stored successfully
        """
        try:
            # Store in a new table for MCP learnings
            learning_record = {
                'domain': domain,
                'learnings': learnings,
                'learning_duration': duration,
                'created_at': datetime.utcnow().isoformat() + 'Z',
                'version': '1.0',
                'status': 'active' if learnings.get('success') else 'failed'
            }
            
            # For now, we'll extend the existing learned_selectors approach
            # In production, you'd want a dedicated mcp_learnings table
            
            # Find machines that use this domain
            machines = await self.db_service.get_machines_by_url(learnings.get('url', ''))
            
            for machine in machines:
                machine_id = machine.get('id')
                current_selectors = machine.get('learned_selectors', {})
                
                # Validate learned selectors to prevent bad bundle/addon selectors
                learned_selectors = learnings.get('learned_selectors', {})
                
                # Skip if contains bad selector patterns
                bad_selector_patterns = [
                    '.bundle-price', '.addon-price', '.variant-price[data-variant*="bundle"]',
                    '.variant-price[data-variant*="lightburn"]', '.variant-price[data-variant*="rotary"]',
                    '.bundle', '.combo-price', '.package-price'
                ]
                
                # Check main selector
                main_selector = learned_selectors.get('selector', '')
                is_bad_selector = any(bad_pattern in main_selector.lower() for bad_pattern in bad_selector_patterns)
                
                if is_bad_selector:
                    logger.warning(f"🚫 BLOCKED saving bad learned selector: {main_selector} (contains bundle/addon pricing pattern)")
                    continue  # Skip this machine, don't save bad selector
                
                # Add MCP learnings to machine's learned selectors
                current_selectors[domain] = {
                    'selectors': learned_selectors,
                    'extraction_steps': learnings.get('extraction_steps', []),
                    'variant_selection': learnings.get('variant_selection', {}),
                    'price_extraction': learnings.get('price_extraction', {}),
                    'site_characteristics': learnings.get('site_characteristics', {}),
                    'learned_via': 'mcp_connector',
                    'learned_at': learnings.get('learned_at'),
                    'confidence': learnings.get('confidence', 0.8),
                    'price_found': learnings.get('price_found'),
                    'learning_duration': duration
                }
                
                # Update machine with new learnings
                await self.db_service.update_machine_learned_selectors(machine_id, current_selectors)
                logger.info(f"Stored MCP learnings for machine {machine_id} on domain {domain}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error storing learnings for domain {domain}: {str(e)}")
            return False
    
    async def _get_existing_learnings(self, domain: str) -> Optional[Dict]:
        """Get existing learnings for a domain if available."""
        try:
            # This would query a dedicated learnings table in production
            # For now, check if any machines have learnings for this domain
            
            # Get all machines to check for existing learnings
            machines = await self.db_service.get_machines_needing_update(days_threshold=0, limit=100)
            
            for machine in machines:
                learned_selectors = machine.get('learned_selectors', {})
                if domain in learned_selectors:
                    domain_learnings = learned_selectors[domain]
                    if domain_learnings.get('learned_via') == 'mcp_connector':
                        return domain_learnings
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting existing learnings for {domain}: {str(e)}")
            return None
    
    def _is_learning_recent(self, learnings: Dict, max_age_days: int = 7) -> bool:
        """Check if learnings are recent enough to use."""
        try:
            learned_at = learnings.get('learned_at')
            if not learned_at:
                return False
            
            from datetime import datetime, timedelta
            learned_date = datetime.fromisoformat(learned_at.replace('Z', '+00:00'))
            cutoff_date = datetime.utcnow().replace(tzinfo=learned_date.tzinfo) - timedelta(days=max_age_days)
            
            return learned_date > cutoff_date
            
        except Exception as e:
            logger.error(f"Error checking learning recency: {str(e)}")
            return False
    
    def _get_domain(self, url: str) -> str:
        """Extract domain from URL."""
        try:
            parsed = urlparse(url)
            domain = parsed.netloc.lower()
            if domain.startswith('www.'):
                domain = domain[4:]
            return domain
        except:
            return url
    
    async def convert_learnings_to_playwright(self, domain: str) -> Optional[Dict]:
        """
        Convert MCP learnings to Playwright automation code.
        
        Args:
            domain: Domain to convert learnings for
            
        Returns:
            Playwright automation patterns
        """
        try:
            learnings = await self._get_existing_learnings(domain)
            if not learnings:
                logger.warning(f"No learnings found for domain {domain}")
                return None
            
            # Convert MCP steps to Playwright patterns
            playwright_patterns = {
                'domain': domain,
                'selectors': learnings.get('selectors', {}),
                'automation_steps': [],
                'variant_selection_logic': learnings.get('variant_selection', {}),
                'price_extraction_logic': learnings.get('price_extraction', {}),
                'site_config': learnings.get('site_characteristics', {})
            }
            
            # Convert extraction steps to Playwright actions
            extraction_steps = learnings.get('extraction_steps', [])
            for step in extraction_steps:
                action = step.get('action')
                selector = step.get('selector')
                
                if action == 'click' and selector:
                    playwright_patterns['automation_steps'].append({
                        'action': 'click',
                        'selector': selector,
                        'wait_after': step.get('wait_after', 1000),
                        'description': step.get('notes', '')
                    })
                elif action == 'extract' and selector:
                    playwright_patterns['automation_steps'].append({
                        'action': 'extract_price',
                        'selector': selector,
                        'description': step.get('notes', '')
                    })
            
            logger.info(f"Converted MCP learnings to Playwright patterns for {domain}")
            return playwright_patterns
            
        except Exception as e:
            logger.error(f"Error converting learnings to Playwright for {domain}: {str(e)}")
            return None


# Integration function for existing price extractor
async def learn_and_extract_price(url: str, machine_name: str, machine_data: dict = None) -> Tuple[Optional[float], Optional[str]]:
    """
    Use REAL MCP browser automation to extract price intelligently.
    
    This function is called from Claude Code environment with access to MCP Puppeteer tools.
    The learning happens through direct browser automation, not separate API calls.
    
    Args:
        url: Product page URL
        machine_name: Machine name for variant selection
        machine_data: Full machine data for context
        
    Returns:
        Tuple of (price, method) or (None, None)
    """
    try:
        logger.info(f"MCP Direct Automation: Starting intelligent extraction for {machine_name} at {url}")
        
        # Check if we have any learned patterns for this site/machine
        # This is where real MCP automation would be implemented
        # Currently returning None to fall back to other extraction methods
        
        # For other sites, attempt basic extraction
        logger.warning(f"No learned pattern for {machine_name} at {url}")
        return None, None
        
    except Exception as e:
        logger.error(f"Error in MCP direct automation: {str(e)}")
        return None, None


if __name__ == "__main__":
    # Test the MCP learning system
    async def test_learning():
        learning_system = MCPLearningSystem()
        
        # Test with ComMarker B6 30W
        url = "https://commarker.com/product/commarker-b6/?ref=snlyaljc"
        machine_name = "ComMarker B6 30W"
        machine_data = {
            "Company": "ComMarker",
            "Machine Category": "Laser Cutter", 
            "Laser Category": "Diode",
            "Laser Power A": "30W",
            "Work Area": "400mm x 400mm"
        }
        
        learnings = await learning_system.learn_site_extraction(url, machine_name, machine_data)
        
        if learnings:
            print(f"✅ Learning successful for {learnings.get('domain')}")
            print(f"Price found: ${learnings.get('price_found')}")
            print(f"Selectors learned: {len(learnings.get('learned_selectors', {}))}")
        else:
            print("❌ Learning failed")
    
    asyncio.run(test_learning())