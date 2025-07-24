#!/usr/bin/env python3
"""
Estimate discovery costs for different approaches
"""

def main():
    print("=" * 60)
    print("Scrapfly Discovery Cost Estimator")
    print("=" * 60)
    
    print("\n📊 CREDIT COSTS BY EXTRACTION LEVEL:")
    print("-" * 40)
    
    levels = [
        ("Level 1: Basic HTML", 2, "Simple sites, static content"),
        ("Level 2: JavaScript", 10, "React/Vue sites, dynamic content"),
        ("Level 3: Anti-bot", 25, "Protected sites, Cloudflare"),
        ("Level 4: AI Extract", 60, "Complex layouts, guaranteed results")
    ]
    
    for name, credits, desc in levels:
        cost = credits * 0.00005  # $5 per 100k credits
        print(f"{name:<20} ~{credits:>3} credits (${cost:.4f})")
        print(f"  Use for: {desc}")
    
    print("\n📈 PROGRESSIVE VS TRADITIONAL APPROACH:")
    print("-" * 40)
    
    # Traditional (always use expensive options)
    traditional_credits = 60  # ASP + JS + AI
    traditional_cost = traditional_credits * 0.00005
    
    # Progressive (average based on site difficulty)
    # Assume: 40% succeed at L1, 30% at L2, 20% at L3, 10% at L4
    progressive_avg = (0.4 * 2) + (0.3 * 12) + (0.2 * 37) + (0.1 * 97)
    progressive_cost = progressive_avg * 0.00005
    
    print(f"Traditional (always max): {traditional_credits} credits/product (${traditional_cost:.4f})")
    print(f"Progressive (adaptive):   {progressive_avg:.0f} credits/product (${progressive_cost:.4f})")
    print(f"Savings: {((traditional_credits - progressive_avg) / traditional_credits * 100):.0f}% fewer credits")
    
    print("\n💰 COST PROJECTIONS:")
    print("-" * 40)
    
    products = [10, 100, 1000, 10000]
    
    print(f"{'Products':<10} {'Traditional':<15} {'Progressive':<15} {'Savings':<10}")
    print("-" * 50)
    
    for count in products:
        trad_total = count * traditional_credits
        prog_total = count * progressive_avg
        trad_cost = trad_total * 0.00005
        prog_cost = prog_total * 0.00005
        savings = trad_cost - prog_cost
        
        print(f"{count:<10} ${trad_cost:<14.2f} ${prog_cost:<14.2f} ${savings:<.2f}")
    
    print("\n🎯 WITH YOUR 200,000 CREDITS:")
    print("-" * 40)
    
    trad_products = 200000 // traditional_credits
    prog_products = 200000 // progressive_avg
    
    print(f"Traditional approach: ~{trad_products:,} products")
    print(f"Progressive approach: ~{prog_products:,} products")
    print(f"Extra products with progressive: {prog_products - trad_products:,}")
    
    print("\n💡 RECOMMENDATIONS:")
    print("-" * 40)
    print("1. Always start with Level 1 (basic HTML)")
    print("2. Only escalate if critical data is missing")
    print("3. Cache results to avoid re-scraping")
    print("4. Consider time-of-day (some sites easier at night)")
    print("5. Build site-specific extractors for frequent targets")

if __name__ == "__main__":
    main()