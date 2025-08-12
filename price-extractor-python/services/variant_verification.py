"""
Variant price verification service to ensure different variants extract different prices.
"""
from loguru import logger
from collections import defaultdict
from datetime import datetime

class VariantVerificationService:
    """Service to verify that different variants of the same machine get different prices."""
    
    def __init__(self):
        self.variant_prices = defaultdict(dict)
        self.alerts = []
    
    def record_price(self, machine_name, price, batch_id=None, machine_id=None):
        """
        Record a price for a machine variant.
        
        Args:
            machine_name (str): Full machine name including variant (e.g., "ComMarker B6 MOPA 30W")
            price (float): The extracted price
            batch_id (str): Optional batch ID for tracking
            machine_id (str): Optional machine ID for tracking failed machines
        """
        # Extract base machine name and variant
        base_name, variant = self._parse_machine_variant(machine_name)
        
        if base_name and variant:
            self.variant_prices[base_name][variant] = {
                'price': price,
                'machine_name': machine_name,
                'machine_id': machine_id,
                'batch_id': batch_id,
                'timestamp': datetime.now()
            }
            
            # Check if all variants have same price
            self._check_for_same_prices(base_name)
    
    def _parse_machine_variant(self, machine_name):
        """
        Parse machine name to extract base name and variant.
        
        Returns:
            tuple: (base_name, variant) or (None, None) if not a variant machine
        """
        # ComMarker B6 MOPA variants
        if "ComMarker B6 MOPA" in machine_name:
            base_name = "ComMarker B6 MOPA"
            if "60W" in machine_name:
                variant = "60W"
            elif "30W" in machine_name:
                variant = "30W"
            elif "20W" in machine_name:
                variant = "20W"
            else:
                return None, None
            return base_name, variant
        
        # xTool variants
        if "xTool" in machine_name:
            if "F1" in machine_name and "Lite" in machine_name:
                return "xTool F1", "Lite"
            elif "F1" in machine_name:
                return "xTool F1", "Standard"
            elif "S1" in machine_name:
                if "20W" in machine_name:
                    return "xTool S1", "20W"
                elif "40W" in machine_name:
                    return "xTool S1", "40W"
        
        # Add more variant patterns as needed
        return None, None
    
    def _check_for_same_prices(self, base_name):
        """Check if all variants of a machine have the same price."""
        variants = self.variant_prices[base_name]
        
        if len(variants) < 2:
            return  # Need at least 2 variants to compare
        
        # Get all unique prices
        prices = set(v['price'] for v in variants.values())
        
        if len(prices) == 1:
            # All variants have the same price - this is a problem!
            price = list(prices)[0]
            variant_names = list(variants.keys())
            
            alert = {
                'base_name': base_name,
                'variants': variant_names,
                'same_price': price,
                'details': variants,
                'timestamp': datetime.now(),
                'severity': 'HIGH'
            }
            
            self.alerts.append(alert)
            
            logger.error(f"🚨 VARIANT PRICE ALERT: All {base_name} variants have the SAME price ${price}!")
            logger.error(f"   Affected variants: {', '.join(variant_names)}")
            logger.error(f"   This indicates variant selection is BROKEN!")
            
            # Log details for each variant
            for variant, info in variants.items():
                logger.error(f"   - {info['machine_name']}: ${info['price']}")
    
    def get_alerts(self):
        """Get all variant price alerts."""
        return self.alerts
    
    def get_variant_summary(self):
        """Get a summary of all variant prices."""
        summary = {}
        
        for base_name, variants in self.variant_prices.items():
            prices = [v['price'] for v in variants.values()]
            unique_prices = set(prices)
            
            summary[base_name] = {
                'variants': len(variants),
                'unique_prices': len(unique_prices),
                'all_same_price': len(unique_prices) == 1 and len(variants) > 1,
                'price_details': variants
            }
        
        return summary
    
    def should_block_batch(self):
        """
        Determine if batch should be blocked due to variant issues.
        
        Returns:
            bool: True if critical variant issues detected
        """
        # Block if we have any HIGH severity alerts
        high_severity_alerts = [a for a in self.alerts if a['severity'] == 'HIGH']
        
        if high_severity_alerts:
            logger.error(f"🛑 BLOCKING BATCH: {len(high_severity_alerts)} critical variant issues detected!")
            return True
        
        return False
    
    def generate_report(self):
        """Generate a detailed variant verification report."""
        report = []
        report.append("=== VARIANT PRICE VERIFICATION REPORT ===")
        report.append(f"Generated at: {datetime.now()}")
        report.append("")
        
        # Summary
        total_machines = sum(len(v) for v in self.variant_prices.values())
        problem_machines = len([1 for b, v in self.variant_prices.items() 
                               if len(set(info['price'] for info in v.values())) == 1 and len(v) > 1])
        
        report.append(f"Total variant machines checked: {total_machines}")
        report.append(f"Machines with same-price issues: {problem_machines}")
        report.append("")
        
        # Detailed issues
        if self.alerts:
            report.append("🚨 CRITICAL ISSUES:")
            for alert in self.alerts:
                report.append(f"\n{alert['base_name']}:")
                report.append(f"  All variants have price: ${alert['same_price']}")
                report.append(f"  Affected variants: {', '.join(alert['variants'])}")
        else:
            report.append("✅ No variant price issues detected")
        
        # All variant details
        report.append("\n=== ALL VARIANT PRICES ===")
        for base_name, variants in self.variant_prices.items():
            report.append(f"\n{base_name}:")
            for variant, info in variants.items():
                report.append(f"  {variant}: ${info['price']} ({info['machine_name']})")
        
        return "\n".join(report)