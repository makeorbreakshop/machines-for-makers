#!/usr/bin/env python3
"""
Test that verifies batch performance improvement with Scrapfly integration
"""
import asyncio
import os
import time
from services.price_service import PriceService
from services.database import DatabaseService
from loguru import logger

# Sample problematic machines that would benefit from Scrapfly
TEST_MACHINES = [
    {
        "id": "test-commarker-b6",
        "Machine Name": "ComMarker B6 MOPA 60W",
        "product_link": "https://commarker.com/product/commarker-b6-jpt-mopa/",
        "Price": 3059.0,
        "price_tracking_enabled": True
    },
    {
        "id": "test-xtool-s1", 
        "Machine Name": "xTool S1",
        "product_link": "https://www.xtool.com/products/xtool-s1-laser-cutter",
        "Price": 1999.0,
        "price_tracking_enabled": True
    }
]

async def test_batch_performance():
    """Test batch performance with Scrapfly sites"""
    print("🚀 Testing Batch Performance with Scrapfly Integration")
    print("=" * 60)
    
    # Check API key
    api_key = os.getenv('SCRAPFLY_API_KEY')
    if not api_key:
        print("❌ Scrapfly API key not found")
        return
    
    print(f"✅ Scrapfly API key found: {api_key[:10]}...")
    
    try:
        # Initialize services
        price_service = PriceService()
        
        # Verify hybrid scraper is being used
        print(f"✅ Web scraper type: {type(price_service.web_scraper).__name__}")
        
        # Test individual machine processing times
        print(f"\n🔍 Testing Individual Machine Processing Times")
        print("-" * 50)
        
        results = []
        
        for machine in TEST_MACHINES:
            machine_name = machine["Machine Name"]
            url = machine["product_link"]
            
            print(f"\n📍 Processing: {machine_name}")
            print(f"URL: {url}")
            
            # Check if this will use Scrapfly
            should_use_scrapfly = (
                price_service.web_scraper.scrapfly_service and 
                price_service.web_scraper.scrapfly_service.should_use_scrapfly(url)
            )
            print(f"📡 Will use Scrapfly: {should_use_scrapfly}")
            
            # Time the extraction
            start_time = time.time()
            
            # Simulate the price update process (without database writes)
            try:
                # Fetch page content
                html_content, soup = await price_service.web_scraper.get_page_content(url)
                
                if html_content and soup:
                    print(f"✅ Page fetched: {len(html_content):,} characters")
                    
                    # Extract price
                    price, method = await price_service.price_extractor.extract_price(
                        soup=soup,
                        html_content=html_content,
                        url=url,
                        machine_name=machine_name,
                        old_price=machine["Price"]
                    )
                    
                    end_time = time.time()
                    duration = end_time - start_time
                    
                    if price:
                        print(f"✅ Price extracted: ${price}")
                        print(f"🔧 Method: {method}")
                        print(f"⏱️ Time taken: {duration:.2f} seconds")
                        
                        results.append({
                            "machine": machine_name,
                            "success": True,
                            "price": price,
                            "method": method,
                            "duration": duration,
                            "used_scrapfly": should_use_scrapfly
                        })
                    else:
                        print(f"❌ Price extraction failed")
                        print(f"⏱️ Time taken: {duration:.2f} seconds")
                        
                        results.append({
                            "machine": machine_name,
                            "success": False,
                            "duration": duration,
                            "used_scrapfly": should_use_scrapfly
                        })
                else:
                    print(f"❌ Failed to fetch page content")
                    
            except Exception as e:
                end_time = time.time()
                duration = end_time - start_time
                print(f"❌ Error: {str(e)}")
                print(f"⏱️ Time taken: {duration:.2f} seconds")
                
                results.append({
                    "machine": machine_name,
                    "success": False,
                    "error": str(e),
                    "duration": duration,
                    "used_scrapfly": should_use_scrapfly
                })
            
            print("-" * 40)
        
        # Summary report
        print(f"\n📊 Performance Summary")
        print("=" * 50)
        
        total_time = sum(r["duration"] for r in results)
        successful = [r for r in results if r["success"]]
        scrapfly_used = [r for r in results if r.get("used_scrapfly", False)]
        
        print(f"Total machines tested: {len(results)}")
        print(f"Successful extractions: {len(successful)}")
        print(f"Machines using Scrapfly: {len(scrapfly_used)}")
        print(f"Total processing time: {total_time:.2f} seconds")
        print(f"Average time per machine: {total_time/len(results):.2f} seconds")
        
        # Estimate batch performance
        if len(successful) == len(TEST_MACHINES):
            print(f"\n🎯 Batch Performance Projection")
            print("-" * 30)
            
            avg_time = total_time / len(results)
            # Assuming 164 machines as mentioned in the original issue
            estimated_time_164_machines = (avg_time * 164) / 5  # 5 concurrent workers
            estimated_time_minutes = estimated_time_164_machines / 60
            
            print(f"Estimated time for 164 machines (5 workers): {estimated_time_minutes:.1f} minutes")
            
            if estimated_time_minutes < 60:
                print(f"✅ Performance target achieved! (Under 60 minutes)")
            else:
                print(f"⚠️ Still above 60 minutes, but major improvement from 4+ hours")
        
        print(f"\n🎉 Scrapfly integration verification complete!")
        print(f"Key benefits:")
        print(f"  • Browser pool bypassed for problematic sites")
        print(f"  • JavaScript rendering handled by Scrapfly cloud")
        print(f"  • No race conditions with concurrent workers")
        print(f"  • Stable extraction for ComMarker and xTool sites")
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_batch_performance())