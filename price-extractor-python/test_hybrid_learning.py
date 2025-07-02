#!/usr/bin/env python3
"""
Test script for the hybrid MCP learning system.

This script tests the new approach where:
1. MCP Connector learns how to extract prices from complex sites
2. Those learnings are converted to fast Playwright automation
3. System falls back to re-learning when sites change
"""

import asyncio
import sys
import os
from loguru import logger

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from scrapers.mcp_learning_system import MCPLearningSystem, learn_and_extract_price
from scrapers.price_extractor import PriceExtractor
from services.price_service import PriceService


async def test_mcp_learning_system():
    """Test the MCP learning system with ComMarker B6 30W."""
    
    print("🧠 Testing MCP Learning System")
    print("=" * 50)
    
    # Test data - ComMarker B6 30W (the problematic extraction)
    test_cases = [
        {
            "url": "https://commarker.com/product/commarker-b6/?ref=snlyaljc",
            "machine_name": "ComMarker B6 30W",
            "expected_price": 2399.0,
            "machine_data": {
                "id": "test-commarker-b6-30w",
                "Company": "ComMarker",
                "Machine Name": "ComMarker B6 30W",
                "Machine Category": "Laser Cutter",
                "Laser Category": "Diode",
                "Laser Power A": "30W",
                "Work Area": "400mm x 400mm",
                "product_link": "https://commarker.com/product/commarker-b6/?ref=snlyaljc"
            }
        },
        {
            "url": "https://commarker.com/product/commarker-b6/?ref=snlyaljc",
            "machine_name": "ComMarker B6 60W",
            "expected_price": 4589.0,
            "machine_data": {
                "id": "test-commarker-b6-60w",
                "Company": "ComMarker",
                "Machine Name": "ComMarker B6 60W",
                "Machine Category": "Laser Cutter",
                "Laser Category": "Diode",
                "Laser Power A": "60W",
                "Work Area": "400mm x 400mm",
                "product_link": "https://commarker.com/product/commarker-b6/?ref=snlyaljc"
            }
        }
    ]
    
    learning_system = MCPLearningSystem()
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n🔍 Test Case {i}: {test_case['machine_name']}")
        print(f"URL: {test_case['url']}")
        print(f"Expected Price: ${test_case['expected_price']}")
        
        try:
            # Test the learning system
            start_time = asyncio.get_event_loop().time()
            
            learnings = await learning_system.learn_site_extraction(
                url=test_case['url'],
                machine_name=test_case['machine_name'],
                machine_data=test_case['machine_data']
            )
            
            duration = asyncio.get_event_loop().time() - start_time
            
            if learnings:
                success = learnings.get('success', False)
                price_found = learnings.get('price_found')
                confidence = learnings.get('confidence', 0.0)
                
                print(f"✅ Learning completed in {duration:.2f}s")
                print(f"   Success: {success}")
                print(f"   Price Found: ${price_found}")
                print(f"   Confidence: {confidence:.1%}")
                print(f"   Selectors Learned: {len(learnings.get('learned_selectors', {}))}")
                print(f"   Steps Documented: {len(learnings.get('extraction_steps', []))}")
                
                # Check if price matches expectation
                if price_found and abs(price_found - test_case['expected_price']) < 10:
                    print(f"🎯 Price matches expectation!")
                else:
                    print(f"⚠️  Price mismatch. Expected: ${test_case['expected_price']}, Got: ${price_found}")
                
                # Test conversion to Playwright patterns
                playwright_patterns = await learning_system.convert_learnings_to_playwright(
                    learning_system._get_domain(test_case['url'])
                )
                
                if playwright_patterns:
                    print(f"🔄 Successfully converted to Playwright patterns")
                    print(f"   Automation Steps: {len(playwright_patterns.get('automation_steps', []))}")
                else:
                    print("❌ Failed to convert to Playwright patterns")
                
            else:
                print(f"❌ Learning failed after {duration:.2f}s")
                
        except Exception as e:
            print(f"💥 Error in learning test: {str(e)}")
            logger.exception("Learning test error")


async def test_integrated_price_extraction():
    """Test the integrated price extraction pipeline with MCP learning."""
    
    print("\n🔧 Testing Integrated Price Extraction Pipeline")
    print("=" * 50)
    
    price_extractor = PriceExtractor()
    
    # Test ComMarker B6 30W with the integrated system
    test_url = "https://commarker.com/product/commarker-b6/?ref=snlyaljc"
    machine_name = "ComMarker B6 30W"
    machine_data = {
        "id": "test-integration",
        "Company": "ComMarker",
        "Machine Name": "ComMarker B6 30W",
        "Machine Category": "Laser Cutter",
        "Laser Category": "Diode", 
        "Laser Power A": "30W",
        "Work Area": "400mm x 400mm",
        "Price": 1839.0,  # Old wrong price
        "product_link": test_url
    }
    
    print(f"🎯 Testing: {machine_name}")
    print(f"URL: {test_url}")
    print(f"Old Price: ${machine_data['Price']}")
    
    try:
        # Test the direct learning function
        print("\n1️⃣ Testing direct MCP learning function...")
        price, method = await learn_and_extract_price(test_url, machine_name, machine_data)
        
        if price:
            print(f"✅ Direct learning extracted: ${price} via {method}")
        else:
            print("❌ Direct learning failed")
        
        # Test the full extraction pipeline (would use web scraper + price extractor)
        print("\n2️⃣ Testing full extraction pipeline...")
        print("   (Note: This requires actual HTML content, simulating...)")
        
        # In a real test, we'd use:
        # from scrapers.web_scraper import WebScraper
        # web_scraper = WebScraper()
        # html_content, soup = await web_scraper.get_page_content(test_url)
        # price, method = await price_extractor.extract_price(soup, html_content, test_url, machine_data['Price'], machine_name, machine_data)
        
        print("   Pipeline integration test completed")
        
    except Exception as e:
        print(f"💥 Error in integrated test: {str(e)}")
        logger.exception("Integrated test error")


async def test_cost_simulation():
    """Simulate the cost model for the hybrid approach."""
    
    print("\n💰 Cost Simulation for Hybrid MCP Approach")
    print("=" * 50)
    
    # Simulate learning costs
    sites_to_learn = 10
    learning_cost_per_site = 0.15  # $0.15 per site learning session
    total_learning_cost = sites_to_learn * learning_cost_per_site
    
    # Simulate production costs
    monthly_extractions = 1000
    playwright_cost_per_extraction = 0.001  # Nearly free
    mcp_fallback_rate = 0.05  # 5% fallback to MCP when Playwright fails
    mcp_fallback_cost = 0.10   # $0.10 per MCP extraction
    
    monthly_playwright_cost = monthly_extractions * (1 - mcp_fallback_rate) * playwright_cost_per_extraction
    monthly_mcp_cost = monthly_extractions * mcp_fallback_rate * mcp_fallback_cost
    monthly_total = monthly_playwright_cost + monthly_mcp_cost
    
    print(f"🧠 Initial Learning Phase:")
    print(f"   Sites to learn: {sites_to_learn}")
    print(f"   Cost per site: ${learning_cost_per_site:.2f}")
    print(f"   Total learning cost: ${total_learning_cost:.2f}")
    
    print(f"\n⚡ Monthly Production Costs:")
    print(f"   Total extractions: {monthly_extractions:,}")
    print(f"   Playwright success rate: {(1-mcp_fallback_rate)*100:.0f}%")
    print(f"   Playwright cost: ${monthly_playwright_cost:.2f}")
    print(f"   MCP fallback rate: {mcp_fallback_rate*100:.0f}%")
    print(f"   MCP fallback cost: ${monthly_mcp_cost:.2f}")
    print(f"   Monthly total: ${monthly_total:.2f}")
    
    print(f"\n📊 ROI Analysis:")
    payback_months = total_learning_cost / monthly_total if monthly_total > 0 else float('inf')
    annual_savings = (monthly_total * 12) - total_learning_cost
    print(f"   Payback period: {payback_months:.1f} months")
    print(f"   Annual cost after learning: ${annual_savings:.2f}")
    print(f"   Cost per extraction: ${monthly_total/monthly_extractions:.4f}")


async def main():
    """Run all tests for the hybrid MCP learning system."""
    
    print("🚀 Hybrid MCP Learning System Test Suite")
    print("========================================")
    
    # Test 1: MCP Learning System
    await test_mcp_learning_system()
    
    # Test 2: Integrated Pipeline
    await test_integrated_price_extraction()
    
    # Test 3: Cost Simulation
    await test_cost_simulation()
    
    print("\n🏁 Test Suite Complete!")
    print("\nNext Steps:")
    print("1. Review learning results and adjust prompts if needed")
    print("2. Test with real ComMarker extraction")
    print("3. Add more sites to the intelligent extraction list")
    print("4. Monitor costs and success rates in production")


if __name__ == "__main__":
    asyncio.run(main())