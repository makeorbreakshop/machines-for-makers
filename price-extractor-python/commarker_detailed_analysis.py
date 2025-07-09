#!/usr/bin/env python3
"""
ComMarker Detailed Price Analysis - Updated with MOPA Power Variations

This script provides a comprehensive analysis of ComMarker pricing
including the power variations found in the structured data.
"""

import json

# Database prices (from query results)
DATABASE_PRICES = {
    "ComMarker B4 20W": {
        "database_price": 1499.0,
        "product_url": "https://commarker.com/product/b4-laser-engraver/",
        "affiliate_link": "https://geni.us/commarker-b4"
    },
    "ComMarker B4 30W": {
        "database_price": 1799,
        "product_url": "https://commarker.com/product/b4-30w-laser-engraver-machine/",
        "affiliate_link": "https://geni.us/commarker-b40-30w"
    },
    "ComMarker B4 50W": {
        "database_price": 2399,
        "product_url": "https://commarker.com/product/b4-50w-fiber-laser-engraver/",
        "affiliate_link": "https://geni.us/commarker-b4-50w"
    },
    "ComMarker B6 20W": {
        "database_price": 1839,
        "product_url": "https://commarker.com/product/commarker-b6/",
        "affiliate_link": "https://geni.us/commarker-b6"
    },
    "ComMarker B6 30W": {
        "database_price": 2399,
        "product_url": "https://commarker.com/product/commarker-b6",
        "affiliate_link": "https://geni.us/commarker-b6"
    },
    "ComMarker B6 MOPA 30W": {
        "database_price": 3569,
        "product_url": "https://commarker.com/product/commarker-b6-jpt-mopa/",
        "affiliate_link": "https://geni.us/commarker-b6-mopa"
    },
    "ComMarker B6 MOPA 60W": {
        "database_price": 4589.0,
        "product_url": "https://commarker.com/product/commarker-b6-jpt-mopa/",
        "affiliate_link": "https://geni.us/commarker-b6-mopa"
    }
}

# Updated scraped prices with power variations
SCRAPED_PRICES = {
    "ComMarker B4 20W": {
        "original_price": 1999,
        "sale_price": 1499,
        "savings": 500,
        "status": "ON SALE - ACCURATE"
    },
    "ComMarker B4 30W": {
        "original_price": 2399,
        "sale_price": 1799,
        "savings": 600,
        "status": "ON SALE - ACCURATE"
    },
    "ComMarker B4 50W": {
        "original_price": 3199,
        "sale_price": 2399,
        "savings": 800,
        "status": "ON SALE - ACCURATE"
    },
    "ComMarker B6 20W": {
        "original_price": 2299,
        "sale_price": 1839,
        "savings": 460,
        "status": "ON SALE - ACCURATE"
    },
    "ComMarker B6 30W": {
        "original_price": 2299,  # Same as 20W - no price difference
        "sale_price": 1839,      # Same as 20W - no price difference
        "savings": 460,
        "status": "ON SALE - DATABASE ISSUE (shows $2399 but should be $1839)"
    },
    "ComMarker B6 MOPA 30W": {
        "original_price": 4199,  # From structured data
        "sale_price": 3059,      # From web scraping 
        "savings": 1140,
        "status": "ON SALE - DATABASE ISSUE (shows $3569 but should be $3059)"
    },
    "ComMarker B6 MOPA 60W": {
        "original_price": 5399,  # From structured data
        "sale_price": 4319,      # Estimated based on similar discount pattern
        "savings": 1080,
        "status": "ON SALE - DATABASE ISSUE (shows $4589 but needs verification)"
    }
}

# MOPA structured data pricing from JSON-LD
MOPA_STRUCTURED_DATA = {
    "20W MOPA": {
        "base_price": 3599,
        "bundles": {
            "basic": 3599,
            "rotary": 3859,
            "safety": 3979,
            "ultimate": 4619
        }
    },
    "30W MOPA": {
        "base_price": 4199,
        "bundles": {
            "basic": 4199,
            "rotary": 4459,
            "safety": 4579,
            "ultimate": 5219
        }
    },
    "60W MOPA": {
        "base_price": 5399,
        "bundles": {
            "basic": 5399,
            "rotary": 5659,
            "safety": 5779,
            "ultimate": 6419
        }
    }
}

def analyze_price_accuracy():
    """Analyze the accuracy of database prices vs actual scraped prices"""
    
    print("=" * 80)
    print("COMMARKER COMPREHENSIVE PRICE ANALYSIS")
    print("=" * 80)
    print()
    
    accurate_count = 0
    total_count = 0
    critical_issues = []
    
    for machine_name in DATABASE_PRICES.keys():
        total_count += 1
        db_price = DATABASE_PRICES[machine_name]["database_price"]
        scraped_data = SCRAPED_PRICES[machine_name]
        actual_price = scraped_data["sale_price"]
        
        print(f"Machine: {machine_name}")
        print(f"Database Price: ${db_price}")
        print(f"Actual Sale Price: ${actual_price}")
        print(f"Original Price: ${scraped_data['original_price']}")
        print(f"Savings: ${scraped_data['savings']}")
        print(f"Status: {scraped_data['status']}")
        
        if db_price == actual_price:
            print("✅ ACCURATE - Database matches actual sale price")
            accurate_count += 1
        else:
            print("❌ INACCURATE - Database does not match actual price")
            difference = db_price - actual_price
            print(f"   Difference: ${difference}")
            
            if abs(difference) > 500:
                critical_issues.append({
                    "machine": machine_name,
                    "database_price": db_price,
                    "actual_price": actual_price,
                    "difference": difference
                })
        
        print(f"URL: {DATABASE_PRICES[machine_name]['product_url']}")
        print("-" * 60)
        print()
    
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"Total Machines Analyzed: {total_count}")
    print(f"Accurate Prices: {accurate_count}")
    print(f"Inaccurate Prices: {total_count - accurate_count}")
    print(f"Accuracy Rate: {(accurate_count/total_count)*100:.1f}%")
    print(f"Critical Issues (>$500 difference): {len(critical_issues)}")
    
    if critical_issues:
        print("\nCRITICAL ISSUES REQUIRING IMMEDIATE ATTENTION:")
        for issue in critical_issues:
            print(f"- {issue['machine']}: DB=${issue['database_price']}, Actual=${issue['actual_price']} (Diff: ${issue['difference']})")

def analyze_mopa_power_variations():
    """Analyze the MOPA power variations and pricing structure"""
    
    print("\n" + "=" * 80)
    print("MOPA POWER VARIATIONS ANALYSIS")
    print("=" * 80)
    print()
    
    print("STRUCTURED DATA PRICING (from JSON-LD):")
    for power, data in MOPA_STRUCTURED_DATA.items():
        print(f"\n{power}:")
        print(f"  Base Price: ${data['base_price']}")
        print(f"  Bundle Prices:")
        for bundle, price in data['bundles'].items():
            print(f"    {bundle.title()}: ${price}")
    
    print("\nKEY FINDINGS:")
    print("1. MOPA pricing varies significantly by power level:")
    print("   - 20W: $3,599 (base)")
    print("   - 30W: $4,199 (base) - $600 more than 20W")
    print("   - 60W: $5,399 (base) - $1,800 more than 20W")
    print()
    print("2. Bundle pricing adds $260-$1,020 depending on accessories")
    print("3. Sale prices appear to be ~20-25% off original prices")
    print("4. The same product page serves all power variations")

def analyze_extraction_challenges():
    """Analyze the challenges for price extraction"""
    
    print("\n" + "=" * 80)
    print("PRICE EXTRACTION CHALLENGES")
    print("=" * 80)
    print()
    
    print("IDENTIFIED CHALLENGES:")
    print("1. POWER VARIATIONS:")
    print("   - Single pages serve multiple power options")
    print("   - JavaScript changes pricing dynamically")
    print("   - Default selection may not match database entry")
    print()
    
    print("2. BUNDLE PRICING:")
    print("   - Multiple bundle options with different prices")
    print("   - Bundle prices could be mistaken for base prices")
    print("   - Default bundle selection affects displayed price")
    print()
    
    print("3. SALE PRICING:")
    print("   - Original vs sale price confusion")
    print("   - Time-limited sales with countdown timers")
    print("   - Dynamic pricing based on promotions")
    print()
    
    print("4. HTML STRUCTURE VARIATIONS:")
    print("   - Different price formats across pages")
    print("   - Mixed use of <span>, <del>, <ins> tags")
    print("   - Some prices in plain text, others in structured HTML")
    print()
    
    print("RECOMMENDED EXTRACTION STRATEGY:")
    print("1. Target sale prices (<ins> tags) as primary")
    print("2. Use JavaScript execution to handle dynamic pricing")
    print("3. Ensure correct power variation is selected")
    print("4. Ignore bundle pricing - focus on base product price")
    print("5. Use structured data (JSON-LD) as fallback/verification")

def generate_fix_recommendations():
    """Generate recommendations for fixing the price extraction issues"""
    
    print("\n" + "=" * 80)
    print("FIX RECOMMENDATIONS")
    print("=" * 80)
    print()
    
    print("IMMEDIATE FIXES NEEDED:")
    print("1. ComMarker B6 30W: Update price from $2399 to $1839")
    print("2. ComMarker B6 MOPA 30W: Update price from $3569 to $3059")
    print("3. ComMarker B6 MOPA 60W: Update price from $4589 to $4319 (estimated)")
    print()
    
    print("EXTRACTION SYSTEM IMPROVEMENTS:")
    print("1. Add power variation detection and selection")
    print("2. Implement JavaScript execution for dynamic pricing")
    print("3. Add structured data parsing as backup method")
    print("4. Create ComMarker-specific extraction logic")
    print("5. Add bundle vs base price differentiation")
    print()
    
    print("MONITORING IMPROVEMENTS:")
    print("1. Track price changes more frequently (daily)")
    print("2. Alert on price differences >$100")
    print("3. Validate against structured data when available")
    print("4. Monitor for HTML structure changes")
    print()
    
    print("TESTING RECOMMENDATIONS:")
    print("1. Test extraction on all power variations")
    print("2. Verify bundle pricing is correctly ignored")
    print("3. Test with different default selections")
    print("4. Validate during sale periods")

if __name__ == "__main__":
    analyze_price_accuracy()
    analyze_mopa_power_variations()
    analyze_extraction_challenges()
    generate_fix_recommendations()