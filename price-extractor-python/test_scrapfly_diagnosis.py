#!/usr/bin/env python3
"""
80/20 Scrapfly Diagnosis Tests
Quick tests to figure out what's wrong with Scrapfly response handling
"""
import pytest
import asyncio
from scrapers.scrapfly_web_scraper import ScrapflyWebScraper
from services.database import DatabaseService
from scrapfly import ScrapeConfig


class TestScrapflyDiagnosis:
    """Simple tests to diagnose the NoneType response issue"""
    
    def setup_method(self):
        """Setup test environment"""
        self.db_service = DatabaseService()
        self.scraper = ScrapflyWebScraper(database_service=self.db_service)
        
        # Use URLs that worked on Aug 5th but fail now
        self.working_url = "https://www.1laser.com/products/onelaser-hydra-7-cabinet-dual-laser-system-with-80-glass-tube-and-38w-rf-metal-tube"
        self.failing_url = "https://commarker.com/product/b4-30w-laser-engraver-machine/"

    def test_basic_scrapfly_client(self):
        """Test if basic Scrapfly client works"""
        config = ScrapeConfig(url=self.working_url, asp=False, render_js=False)
        
        try:
            response = self.scraper.client.scrape(config)
            print(f"✅ Basic client works: {type(response)}")
            print(f"✅ Response attributes: {dir(response)}")
            print(f"✅ Has scrape_result: {hasattr(response, 'scrape_result')}")
            print(f"✅ scrape_result type: {type(response.scrape_result) if hasattr(response, 'scrape_result') else 'N/A'}")
            assert response is not None
        except Exception as e:
            print(f"❌ Basic client failed: {e}")
            pytest.fail(f"Basic Scrapfly client failed: {e}")

    def test_response_object_structure(self):
        """Test what's actually in the response object"""
        config = ScrapeConfig(url=self.working_url, asp=False, render_js=False)
        
        response = self.scraper.client.scrape(config)
        
        print(f"\n=== RESPONSE OBJECT ANALYSIS ===")
        print(f"Response type: {type(response)}")
        print(f"Response dir: {[attr for attr in dir(response) if not attr.startswith('_')]}")
        
        if hasattr(response, 'scrape_result'):
            scrape_result = response.scrape_result
            print(f"scrape_result type: {type(scrape_result)}")
            print(f"scrape_result is None: {scrape_result is None}")
            
            if scrape_result:
                print(f"scrape_result keys: {scrape_result.keys() if hasattr(scrape_result, 'keys') else 'No keys method'}")
                if hasattr(scrape_result, 'get'):
                    content = scrape_result.get('content', 'NO CONTENT')
                    print(f"Content length: {len(content) if content else 0}")
                else:
                    print("❌ scrape_result has no 'get' method!")
        else:
            print("❌ Response has no scrape_result attribute!")

    @pytest.mark.asyncio
    async def test_scraper_get_page_content(self):
        """Test the actual method that's failing"""
        print(f"\n=== TESTING get_page_content ===")
        
        try:
            html_content, soup = await self.scraper.get_page_content(self.working_url)
            print(f"✅ get_page_content succeeded")
            print(f"✅ HTML length: {len(html_content) if html_content else 0}")
            print(f"✅ Soup type: {type(soup)}")
        except Exception as e:
            print(f"❌ get_page_content failed: {e}")
            print(f"❌ Exception type: {type(e)}")
            import traceback
            print(f"❌ Traceback: {traceback.format_exc()}")

    def test_different_tier_configs(self):
        """Test if different tier configurations work"""
        configs = [
            ("Tier 1", self.scraper._get_tier_config(self.working_url, 1)),
            ("Tier 2", self.scraper._get_tier_config(self.working_url, 2)),
            ("Tier 3", self.scraper._get_tier_config(self.working_url, 3)),
        ]
        
        for tier_name, config in configs:
            print(f"\n=== TESTING {tier_name} ===")
            try:
                response = self.scraper.client.scrape(config)
                scrape_result = response.scrape_result if hasattr(response, 'scrape_result') else None
                
                print(f"✅ {tier_name} response: {type(response)}")
                print(f"✅ {tier_name} scrape_result: {type(scrape_result)}")
                print(f"✅ {tier_name} scrape_result is None: {scrape_result is None}")
                
                if scrape_result and hasattr(scrape_result, 'get'):
                    content = scrape_result.get('content', '')
                    print(f"✅ {tier_name} content length: {len(content)}")
                else:
                    print(f"❌ {tier_name} scrape_result unusable")
                    
            except Exception as e:
                print(f"❌ {tier_name} failed: {e}")


if __name__ == "__main__":
    # Run the key tests directly
    test = TestScrapflyDiagnosis()
    test.setup_method()
    
    print("=== RUNNING SCRAPFLY DIAGNOSIS ===")
    
    # Test 1: Basic client
    test.test_basic_scrapfly_client()
    
    # Test 2: Response structure
    test.test_response_object_structure() 
    
    # Test 3: Different tiers
    test.test_different_tier_configs()
    
    # Test 4: Async method (need to run in event loop)
    async def run_async_test():
        await test.test_scraper_get_page_content()
    
    asyncio.run(run_async_test())
    
    print("=== DIAGNOSIS COMPLETE ===")