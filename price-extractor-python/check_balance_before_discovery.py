#!/usr/bin/env python3
"""
SAFE pre-flight check before running discovery.
Checks Scrapfly balance and asks for confirmation before proceeding.
"""
import os
import sys
from dotenv import load_dotenv
from scrapfly import ScrapflyClient

# Load environment variables
load_dotenv()

def check_scrapfly_balance():
    """Check Scrapfly account balance and credits"""
    api_key = os.getenv('SCRAPFLY_API_KEY')
    if not api_key:
        print("❌ SCRAPFLY_API_KEY not found in .env file")
        print("Please create a .env file in the price-extractor-python directory with:")
        print("SCRAPFLY_API_KEY=your_actual_api_key")
        return False
    
    try:
        client = ScrapflyClient(key=api_key)
        account = client.account()
        
        print("\n🔍 Scrapfly Account Status:")
        
        # Handle the nested dict structure from Scrapfly
        if isinstance(account, dict):
            subscription = account.get('subscription', {})
            usage = subscription.get('usage', {}).get('scrape', {})
            used = usage.get('current', 0)
            limit = usage.get('limit', 0)
            remaining = usage.get('remaining', 0)
            period = subscription.get('period', {})
            period_end = period.get('end', 'Unknown')
            plan_name = subscription.get('plan_name', 'Unknown')
        else:
            # Fallback for different response format
            used = getattr(account, 'scrape_api_used', 0)
            limit = getattr(account, 'scrape_api_limit', 0)
            remaining = limit - used
            period_end = 'Unknown'
            plan_name = 'Unknown'
        
        print(f"Plan: {plan_name}")
        print(f"Credits Used: {used:,}")
        print(f"Credits Limit: {limit:,}")
        print(f"Credits Remaining: {remaining:,}")
        print(f"Period Ends: {period_end}")
        if remaining < 1000:
            print(f"\n⚠️  WARNING: Only {remaining:,} credits remaining!")
            print("Each discovery run can use 50-100 credits.")
        else:
            print(f"\n✅ You have {remaining:,} credits available")
        
        return True
        
    except Exception as e:
        print(f"❌ Error checking Scrapfly account: {str(e)}")
        return False

def main():
    print("=" * 60)
    print("Scrapfly Discovery Pre-Flight Check")
    print("=" * 60)
    
    if not check_scrapfly_balance():
        print("\n❌ Pre-flight check failed. Please fix the issues above.")
        sys.exit(1)
    
    print("\n" + "=" * 60)
    print("⚠️  IMPORTANT: Discovery Operations")
    print("=" * 60)
    print("1. test_discovery_simple.py - Tests single URL (~50-100 credits)")
    print("2. discovery_api.py - Full API server (uses credits per request)")
    print("3. Any script that calls SimplifiedDiscoveryService")
    print("\n📊 Cost Estimation:")
    print("- Each URL with extraction: ~50-100 credits")
    print("- 200,000 credits ≈ 2,000-4,000 product discoveries")
    
    response = input("\n❓ Do you want to proceed? (yes/no): ")
    if response.lower() != 'yes':
        print("✅ Cancelled. No credits were used.")
        sys.exit(0)
    
    print("\n✅ Pre-flight check passed! You can now run discovery scripts.")
    print("💡 Tip: Start with test_discovery_simple.py for a single product test")

if __name__ == "__main__":
    main()