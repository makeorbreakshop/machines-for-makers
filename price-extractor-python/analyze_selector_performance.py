"""
Analyze CSS selector performance from the database to identify problematic patterns
"""

import os
import sys
import json
from collections import defaultdict, Counter
from datetime import datetime, timedelta
from dotenv import load_dotenv
from supabase import create_client, Client
from loguru import logger

# Load environment variables
load_dotenv()

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

def analyze_selector_performance():
    """Analyze CSS selector performance and patterns"""
    logger.info("=== CSS SELECTOR PERFORMANCE ANALYSIS ===")
    
    # Get all machines with learned selectors
    try:
        result = supabase.table("machines").select(
            'id, "Machine Name", product_link, learned_selectors, current_price'
        ).not_.is_("learned_selectors", "null").execute()
        
        machines = result.data
        logger.info(f"Found {len(machines)} machines with learned selectors")
        
        # Analyze selector patterns
        selector_stats = defaultdict(lambda: {"count": 0, "machines": []})
        domain_stats = defaultdict(lambda: {"total": 0, "with_selectors": 0})
        problematic_selectors = []
        
        for machine in machines:
            if machine.get('learned_selectors'):
                try:
                    selectors = json.loads(machine['learned_selectors']) if isinstance(machine['learned_selectors'], str) else machine['learned_selectors']
                    
                    # Extract domain from URL
                    if machine.get('product_link'):
                        from urllib.parse import urlparse
                        domain = urlparse(machine['product_link']).netloc.lower().replace('www.', '')
                        domain_stats[domain]["with_selectors"] += 1
                        
                        for selector, data in selectors.items():
                            selector_stats[selector]["count"] += 1
                            selector_stats[selector]["machines"].append({
                                "name": machine['Machine Name'],
                                "domain": domain,
                                "price": data.get('price') if isinstance(data, dict) else None
                            })
                            
                            # Check for problematic patterns
                            if any(bad in selector.lower() for bad in ['bundle', 'package', 'kit', 'combo', 'addon']):
                                problematic_selectors.append({
                                    "selector": selector,
                                    "machine": machine['Machine Name'],
                                    "domain": domain,
                                    "reason": "Contains bundle/package keywords"
                                })
                except Exception as e:
                    logger.error(f"Error parsing selectors for {machine['Machine Name']}: {e}")
        
        # Get recent price history to check success rates
        logger.info("\n=== RECENT EXTRACTION PERFORMANCE ===")
        
        # Get price history from last 7 days
        seven_days_ago = (datetime.now() - timedelta(days=7)).isoformat()
        history_result = supabase.table("price_history").select(
            'machine_id, status, extraction_method, notes, created_at'
        ).gte('created_at', seven_days_ago).execute()
        
        history = history_result.data
        
        # Analyze extraction methods
        method_stats = Counter()
        failure_reasons = Counter()
        
        for record in history:
            if record.get('extraction_method'):
                method_stats[record['extraction_method']] += 1
            
            if record.get('status') in ['FAILED', 'ERROR'] and record.get('notes'):
                # Extract failure reason
                notes = record['notes'].lower()
                if 'captcha' in notes or 'bot' in notes:
                    failure_reasons['Bot Detection'] += 1
                elif '404' in notes or 'not found' in notes:
                    failure_reasons['Page Not Found'] += 1
                elif 'timeout' in notes:
                    failure_reasons['Timeout'] += 1
                elif 'no price' in notes or 'price not found' in notes:
                    failure_reasons['Price Not Found'] += 1
                else:
                    failure_reasons['Other'] += 1
        
        # Print analysis results
        logger.info("\n=== SELECTOR ANALYSIS RESULTS ===")
        logger.info(f"Total unique selectors: {len(selector_stats)}")
        logger.info(f"Problematic selectors found: {len(problematic_selectors)}")
        
        # Top 10 most used selectors
        logger.info("\n📊 TOP 10 MOST USED SELECTORS:")
        sorted_selectors = sorted(selector_stats.items(), key=lambda x: x[1]["count"], reverse=True)[:10]
        for selector, stats in sorted_selectors:
            logger.info(f"  {selector}: {stats['count']} machines")
        
        # Problematic selectors
        if problematic_selectors:
            logger.info("\n⚠️  PROBLEMATIC SELECTORS TO BLACKLIST:")
            for prob in problematic_selectors[:20]:  # Show first 20
                logger.info(f"  - {prob['selector']} ({prob['machine']}) - {prob['reason']}")
        
        # Domain statistics
        logger.info("\n🌐 DOMAIN STATISTICS:")
        sorted_domains = sorted(domain_stats.items(), key=lambda x: x[1]["with_selectors"], reverse=True)[:10]
        for domain, stats in sorted_domains:
            logger.info(f"  {domain}: {stats['with_selectors']} machines with selectors")
        
        # Extraction method performance
        logger.info("\n📈 EXTRACTION METHOD USAGE (Last 7 days):")
        for method, count in method_stats.most_common():
            logger.info(f"  {method}: {count} times")
        
        # Failure reasons
        logger.info("\n❌ FAILURE REASONS:")
        total_failures = sum(failure_reasons.values())
        for reason, count in failure_reasons.most_common():
            percentage = (count / total_failures * 100) if total_failures > 0 else 0
            logger.info(f"  {reason}: {count} ({percentage:.1f}%)")
        
        # Generate blacklist recommendations
        logger.info("\n=== BLACKLIST RECOMMENDATIONS ===")
        blacklist_candidates = set()
        
        for prob in problematic_selectors:
            blacklist_candidates.add(prob['selector'])
        
        # Add common problematic patterns
        common_bad_patterns = [
            '.bundle-price',
            '.package-price',
            '.kit-price',
            '.combo-price',
            '.addon-price',
            '.bundle-price *',
            '.package-price *',
            '[class*="bundle"]',
            '[class*="package"]',
            '[class*="combo"]'
        ]
        
        blacklist_candidates.update(common_bad_patterns)
        
        logger.info("Selectors to add to blacklist:")
        for selector in sorted(blacklist_candidates)[:30]:  # Show first 30
            logger.info(f"  - {selector}")
        
        # Check for selector drift
        logger.info("\n=== SELECTOR DRIFT ANALYSIS ===")
        
        # Get machines that had successful extractions but now failing
        # This would require comparing historical success with recent failures
        # For now, identify selectors used by multiple machines (potential generic selectors)
        
        generic_selectors = []
        for selector, stats in selector_stats.items():
            if stats["count"] > 5:  # Used by more than 5 machines
                domains = set(m["domain"] for m in stats["machines"])
                if len(domains) > 1:  # Used across multiple domains
                    generic_selectors.append({
                        "selector": selector,
                        "count": stats["count"],
                        "domains": len(domains)
                    })
        
        if generic_selectors:
            logger.info("\n🔍 GENERIC SELECTORS (potential drift issues):")
            for gs in sorted(generic_selectors, key=lambda x: x["count"], reverse=True)[:10]:
                logger.info(f"  {gs['selector']}: used by {gs['count']} machines across {gs['domains']} domains")
        
        # Save analysis to file
        analysis_report = {
            "timestamp": datetime.now().isoformat(),
            "total_machines_with_selectors": len(machines),
            "unique_selectors": len(selector_stats),
            "problematic_selectors": len(problematic_selectors),
            "blacklist_recommendations": list(blacklist_candidates)[:30],
            "extraction_method_stats": dict(method_stats),
            "failure_reasons": dict(failure_reasons),
            "top_selectors": [
                {"selector": s, "count": stats["count"]} 
                for s, stats in sorted_selectors
            ],
            "generic_selectors": generic_selectors[:10]
        }
        
        with open("selector_analysis_report.json", "w") as f:
            json.dump(analysis_report, f, indent=2)
        
        logger.info("\n✅ Analysis complete! Report saved to selector_analysis_report.json")
        
        return analysis_report
        
    except Exception as e:
        logger.error(f"Error analyzing selectors: {e}")
        return None


def check_specific_machines():
    """Check specific machines mentioned in the manual corrections"""
    logger.info("\n=== CHECKING SPECIFIC PROBLEM MACHINES ===")
    
    problem_machines = [
        "ComMarker B4 100W MOPA",
        "ComMarker B4 60W MOPA", 
        "ComMarker B4 30W MOPA",
        "ComMarker B6 30W",
        "ComMarker B6 60W MOPA",
        "xTool S1",
        "xTool F1",
        "xTool P2",
        "Monport 80W CO2"
    ]
    
    try:
        for machine_name in problem_machines:
            result = supabase.table("machines").select(
                'id, "Machine Name", product_link, learned_selectors, current_price'
            ).eq('"Machine Name"', machine_name).execute()
            
            if result.data:
                machine = result.data[0]
                logger.info(f"\n🔍 {machine_name}:")
                logger.info(f"  Current Price: ${machine.get('current_price', 'N/A')}")
                logger.info(f"  URL: {machine.get('product_link', 'N/A')}")
                
                if machine.get('learned_selectors'):
                    try:
                        selectors = json.loads(machine['learned_selectors']) if isinstance(machine['learned_selectors'], str) else machine['learned_selectors']
                        logger.info(f"  Learned Selectors: {list(selectors.keys())}")
                    except:
                        logger.info(f"  Learned Selectors: Error parsing")
                else:
                    logger.info(f"  Learned Selectors: None")
                    
    except Exception as e:
        logger.error(f"Error checking specific machines: {e}")


if __name__ == "__main__":
    # Run selector performance analysis
    report = analyze_selector_performance()
    
    # Check specific problem machines
    check_specific_machines()
    
    logger.info("\n=== NEXT STEPS ===")
    logger.info("1. Review selector_analysis_report.json")
    logger.info("2. Add problematic selectors to blacklist")
    logger.info("3. Update site-specific rules for domains with many failures")
    logger.info("4. Implement fixes for ComMarker MCP automation")