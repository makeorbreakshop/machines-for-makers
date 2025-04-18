#!/usr/bin/env python3
import logging
from bs4 import BeautifulSoup
import re
import json

# Configure basic logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("price_extractor")

class PriceVerifier:
    def __init__(self):
        pass
        
    def verify_price(self, extracted_price, previous_price, machine_name):
        """
        Robust verification system to catch and correct suspicious price changes.
        Returns: (corrected_price, verification_status, confidence_score)
        """
        if not extracted_price:
            return None, "Failed", 0.0
            
        if not previous_price:
            return extracted_price, "No previous price to verify against", 0.5
        
        # Calculate price change percentage
        price_change_pct = abs((extracted_price - previous_price) / previous_price) * 100
        
        # Set initial confidence score based on price change
        confidence_score = 1.0
        status = "Verified"
        corrected_price = extracted_price
        
        logger.info(f"Price change for {machine_name}: {price_change_pct:.2f}% (Previous: ${previous_price:.2f}, Current: ${extracted_price:.2f})")
        
        # Detect suspiciously large changes - implement thresholds from TROUBLESHOOTING.md
        if price_change_pct > 90:
            logger.error(f"❌ CRITICAL: Price change >90% detected for {machine_name}. Flagging for manual review!")
            confidence_score = 0.0
            status = "Manual review required - Critical price change"
            
            # Attempt corrections for known error patterns
            if extracted_price < previous_price * 0.2:
                # Try adding leading digit(s) - for case like $600 instead of $6,000
                corrected = extracted_price * 10
                while corrected < previous_price * 0.5:
                    corrected *= 10
                    
                if abs((corrected - previous_price) / previous_price) * 100 < 20:
                    logger.info(f"✅ Corrected missing leading digit(s): ${extracted_price:.2f} -> ${corrected:.2f}")
                    corrected_price = corrected
                    confidence_score = 0.6
                    status = "Auto-corrected missing leading digit(s)"
                    
            # Check for missing trailing digit - for case like $184 instead of $1,849
            elif extracted_price * 10 < previous_price * 1.2 and extracted_price * 10 > previous_price * 0.8:
                corrected = extracted_price * 10
                logger.info(f"✅ Corrected missing trailing digit: ${extracted_price:.2f} -> ${corrected:.2f}")
                corrected_price = corrected
                confidence_score = 0.7
                status = "Auto-corrected missing trailing digit"
                
        elif price_change_pct > 50:
            # Large but not critical change - lower confidence but still auto-correctable
            logger.warning(f"⚠️ Large price change (>50%) detected for {machine_name}.")
            confidence_score = 0.3
            status = "Suspicious price change"
            
            # Apply same correction logic as above
            if extracted_price < previous_price * 0.3:
                corrected = extracted_price * 10
                while corrected < previous_price * 0.7:
                    corrected *= 10
                    
                if abs((corrected - previous_price) / previous_price) * 100 < 25:
                    logger.info(f"✅ Corrected missing digit(s): ${extracted_price:.2f} -> ${corrected:.2f}")
                    corrected_price = corrected
                    confidence_score = 0.6
                    status = "Auto-corrected missing digit(s)"
                    
        elif price_change_pct > 25:
            # Moderate change - reduced confidence
            logger.warning(f"⚠️ Notable price change (>25%) detected for {machine_name}.")
            confidence_score = 0.7
            status = "Price change requires attention"
            
        else:
            # Small change - high confidence
            logger.info(f"✅ Acceptable price change ({price_change_pct:.2f}%) for {machine_name}")
            confidence_score = 0.9
            status = "Verified - within normal range"
            
        return corrected_price, status, confidence_score

    def _parse_price(self, price_text):
        """Parse price from text, handling currency symbols and formatting"""
        if not price_text:
            return None
            
        # Remove currency symbols, commas, and whitespace
        price_text = re.sub(r'[^\d.\,]', '', price_text)
        
        # Handle comma as decimal separator or thousand separator
        if ',' in price_text and '.' in price_text:
            # Both comma and period present - assume standard format (comma for thousands)
            price_text = price_text.replace(',', '')
        elif ',' in price_text:
            # Only comma present - check position
            parts = price_text.split(',')
            if len(parts) == 2 and len(parts[1]) <= 2:
                # Likely decimal separator
                price_text = price_text.replace(',', '.')
            else:
                # Likely thousands separator
                price_text = price_text.replace(',', '')
        
        try:
            price = float(price_text)
            return price
        except ValueError:
            logger.error(f"Failed to parse price from: {price_text}")
            return None

def test_scenarios():
    # Create a list of test scenarios based on TROUBLESHOOTING.md examples
    scenarios = [
        {
            "id": 1,
            "name": "ComMarker B4 100W MOPA - Leading Digit Missing",
            "previous_price": 6666.00,
            "simulated_extraction": 666.00,
            "expected_correction": 6660.00,
            "description": "Simulating missing first digit (Reported: $600 vs Actual: $6,666)"
        },
        {
            "id": 2,
            "name": "Atomstack X70 Max - Trailing Digits Missing",
            "previous_price": 1849.00,
            "simulated_extraction": 184.00,
            "expected_correction": 1840.00,
            "description": "Simulating missing trailing digit (Reported: $184 vs Actual: $1,849)"
        },
        {
            "id": 3,
            "name": "Aeon MIRA 7 Pro S - Decimal/Comma Error",
            "previous_price": 6995.00,
            "simulated_extraction": 699.50,
            "expected_correction": 6995.00,
            "description": "Simulating decimal/comma parsing error (Reported: $699 vs Actual: $6,995)"
        },
        {
            "id": 4,
            "name": "Normal Price Change - Small Increase",
            "previous_price": 2499.00,
            "simulated_extraction": 2599.00,
            "expected_correction": 2599.00,
            "description": "Testing normal price increase of 4%"
        },
        {
            "id": 5,
            "name": "Moderate Price Change - Sale",
            "previous_price": 3999.00,
            "simulated_extraction": 2999.00,
            "expected_correction": 2999.00,
            "description": "Testing moderate price decrease of 25% (sale)"
        },
        {
            "id": 6,
            "name": "Large Price Change - Not Correctable",
            "previous_price": 4999.00,
            "simulated_extraction": 1999.00,
            "expected_correction": 1999.00,
            "description": "Testing large price decrease of 60% (should flag but not auto-correct)"
        }
    ]
    
    verifier = PriceVerifier()
    results = []
    
    # Test each scenario
    for scenario in scenarios:
        logger.info(f"\n=== Testing Scenario {scenario['id']}: {scenario['name']} ===")
        logger.info(f"Description: {scenario['description']}")
        logger.info(f"Previous price: ${scenario['previous_price']:.2f}")
        logger.info(f"Simulated extracted price: ${scenario['simulated_extraction']:.2f}")
        
        # Verify the price
        corrected_price, status, confidence = verifier.verify_price(
            scenario['simulated_extraction'],
            scenario['previous_price'],
            scenario['name']
        )
        
        # Calculate error percentage between correction and expected
        error_pct = abs((corrected_price - scenario['expected_correction']) / scenario['expected_correction']) * 100 if scenario['expected_correction'] else 0
        
        # Check if the correction was successful
        if error_pct < 5:
            success = True
            logger.info(f"✅ Test passed! Corrected to ${corrected_price:.2f} as expected")
        else:
            success = False
            logger.error(f"❌ Test failed! Corrected to ${corrected_price:.2f} but expected ${scenario['expected_correction']:.2f}")
            
        # Store result
        results.append({
            "id": scenario['id'],
            "name": scenario['name'],
            "previous_price": scenario['previous_price'],
            "simulated_extraction": scenario['simulated_extraction'],
            "corrected_price": corrected_price,
            "expected_correction": scenario['expected_correction'],
            "status": status,
            "confidence": confidence,
            "success": success,
            "error_percentage": error_pct
        })
        
    # Print summary
    logger.info("\n===== TEST SCENARIOS SUMMARY =====")
    success_count = sum(1 for r in results if r['success'])
    logger.info(f"Total scenarios: {len(scenarios)}")
    logger.info(f"Successful tests: {success_count}/{len(scenarios)} ({success_count/len(scenarios)*100:.1f}%)")
    
    # Print detailed results
    logger.info("\nDetailed results:")
    for result in results:
        status_icon = "✅" if result["success"] else "❌"
        logger.info(f"{status_icon} Scenario {result['id']}: {result['name']}")
        logger.info(f"   Previous price: ${result['previous_price']:.2f}")
        logger.info(f"   Simulated extraction: ${result['simulated_extraction']:.2f}")
        logger.info(f"   Corrected price: ${result['corrected_price']:.2f}")
        logger.info(f"   Expected correction: ${result['expected_correction']:.2f}")
        logger.info(f"   Verification status: {result['status']}")
        logger.info(f"   Confidence score: {result['confidence']:.2f}")
        logger.info("")

def test_price_parser():
    price_texts = [
        "$6,666.00",
        "$6.666,00",
        "6,666.00",
        "6.666,00",
        "$1,849",
        "$1.849",
        "6,995",
        "€4.999,95",
        "4,999.95",
        "$699.5",
        "699,5",
        "$600",
        "600"
    ]
    
    verifier = PriceVerifier()
    
    logger.info("\n===== PRICE PARSER TESTS =====")
    for price_text in price_texts:
        parsed_price = verifier._parse_price(price_text)
        logger.info(f"Input: '{price_text}' => Parsed: ${parsed_price}")

if __name__ == "__main__":
    logger.info("Starting price verification tests...")
    test_price_parser()
    test_scenarios() 