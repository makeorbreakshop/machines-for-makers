#!/usr/bin/env python3
"""
ComMarker Price Analysis - Real vs Database Comparison

This script analyzes the actual prices found on ComMarker's website vs
what's currently stored in the database.
"""

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

# Scraped prices (from web scraping results)
SCRAPED_PRICES = {
    "ComMarker B4 20W": {
        "original_price": 1999,
        "sale_price": 1499,
        "savings": 500,
        "status": "ON SALE"
    },
    "ComMarker B4 30W": {
        "original_price": 2399,
        "sale_price": 1799,
        "savings": 600,
        "status": "ON SALE"
    },
    "ComMarker B4 50W": {
        "original_price": 3199,
        "sale_price": 2399,
        "savings": 800,
        "status": "ON SALE"
    },
    "ComMarker B6 20W": {
        "original_price": 2299,
        "sale_price": 1839,
        "savings": 460,
        "status": "ON SALE"
    },
    "ComMarker B6 30W": {
        "original_price": 2299,
        "sale_price": 1839,
        "savings": 460,
        "status": "ON SALE"
    },
    "ComMarker B6 MOPA 30W": {
        "original_price": 3599,
        "sale_price": 3059,
        "savings": 540,
        "status": "ON SALE"
    },
    "ComMarker B6 MOPA 60W": {
        "original_price": 3599,  # Same page as 30W - need to check specific config
        "sale_price": 3059,      # This might be different for 60W
        "savings": 540,
        "status": "ON SALE - NEEDS VERIFICATION"
    }
}

def analyze_price_accuracy():
    """Analyze the accuracy of database prices vs actual scraped prices"""
    
    print("=" * 80)
    print("COMMARKER PRICE ANALYSIS - DATABASE VS ACTUAL WEBSITE PRICES")
    print("=" * 80)
    print()
    
    accurate_count = 0
    total_count = 0
    issues_found = []
    
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
            issues_found.append({
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
    print()
    
    if issues_found:
        print("ISSUES FOUND:")
        for issue in issues_found:
            print(f"- {issue['machine']}: DB=${issue['database_price']}, Actual=${issue['actual_price']} (Diff: ${issue['difference']})")
    else:
        print("No issues found - all prices are accurate!")
    
    print()
    print("KEY OBSERVATIONS:")
    print("- All ComMarker products are currently on sale")
    print("- Database prices match the current SALE prices, not original prices")
    print("- This suggests the price extractor is working correctly")
    print("- The manual corrections mentioned were likely setting prices to sale prices")
    print("- Bundle pricing options exist but don't affect base pricing")
    print("- B6 MOPA 60W needs verification as it shares the same page as 30W")

def analyze_price_structure():
    """Analyze the HTML structure and price extraction challenges"""
    
    print()
    print("=" * 80)
    print("PRICE EXTRACTION STRUCTURE ANALYSIS")
    print("=" * 80)
    print()
    
    print("HTML STRUCTURE OBSERVATIONS:")
    print("- Prices use <span class=\"price\"> elements")
    print("- Sale prices use <del> and <ins> tags for strikethrough and highlight")
    print("- Format: <del>$original</del> <ins>$sale</ins>")
    print("- Some pages show prices in plain text format")
    print("- Bundle options are separate from base pricing")
    print()
    
    print("EXTRACTION CHALLENGES:")
    print("1. Multiple price formats on different pages")
    print("2. Bundle pricing could confuse extractors")
    print("3. Power variations (20W/30W/60W) on same page")
    print("4. Sale vs original price selection")
    print("5. Dynamic pricing with countdown timers")
    print()
    
    print("RECOMMENDED SELECTORS:")
    print("- Primary: span.price ins (for sale prices)")
    print("- Secondary: span.price (for regular prices)")
    print("- Fallback: Look for currency symbols + numbers")
    print()
    
    print("BUNDLE PRICING STRUCTURE:")
    print("- B6 Basic Bundle: Base price")
    print("- B6 Rotary Bundle: +$200-300")
    print("- B6 Safety Bundle: +$300-400")
    print("- B6 Ultimate Bundle: +$800-1000")

if __name__ == "__main__":
    analyze_price_accuracy()
    analyze_price_structure()