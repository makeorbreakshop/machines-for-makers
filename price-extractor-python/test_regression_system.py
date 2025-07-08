"""
Regression Testing System for Price Extraction Fixes

This system ensures that when we fix one extraction issue, we don't break others
that are already working correctly.
"""

import asyncio
import json
from datetime import datetime
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, asdict
from loguru import logger
import os
from urllib.parse import urlparse

# Import our extractors
from scrapers.price_extractor import PriceExtractor
from scrapers.web_scraper import WebScraper
from scrapers.site_specific_extractors import SiteSpecificExtractor


@dataclass
class TestCase:
    """Represents a single test case for price extraction"""
    machine_id: str
    machine_name: str
    url: str
    expected_price: float
    tolerance_percent: float = 5.0  # Allow 5% price variation
    domain: str = ""
    last_successful_method: str = ""
    notes: str = ""
    
    def __post_init__(self):
        if not self.domain:
            self.domain = urlparse(self.url).netloc.lower().replace('www.', '')


@dataclass
class TestResult:
    """Result of a single test"""
    test_case: TestCase
    extracted_price: Optional[float]
    extraction_method: str
    success: bool
    error_message: str = ""
    price_difference_percent: float = 0.0
    execution_time: float = 0.0


class RegressionTestSuite:
    """Comprehensive regression testing for price extraction"""
    
    def __init__(self, test_cases_file: str = "regression_test_cases.json"):
        self.test_cases_file = test_cases_file
        self.test_cases: List[TestCase] = []
        self.web_scraper = WebScraper()
        self.price_extractor = PriceExtractor()
        self.results: List[TestResult] = []
        
    def load_test_cases(self):
        """Load test cases from JSON file"""
        if os.path.exists(self.test_cases_file):
            with open(self.test_cases_file, 'r') as f:
                data = json.load(f)
                self.test_cases = [TestCase(**case) for case in data['test_cases']]
                logger.info(f"Loaded {len(self.test_cases)} test cases")
        else:
            logger.warning(f"No test cases file found at {self.test_cases_file}")
            self._create_default_test_cases()
    
    def _create_default_test_cases(self):
        """Create default test cases based on our known working extractions"""
        self.test_cases = [
            # ComMarker machines
            TestCase(
                machine_id="commarker-b4-100w",
                machine_name="ComMarker B4 100W MOPA",
                url="https://commarker.com/product/commarker-b4-100w-mopa-fiber-laser/",
                expected_price=4589.00,
                domain="commarker.com",
                notes="Should extract base machine price, not bundle"
            ),
            TestCase(
                machine_id="commarker-b6-30w",
                machine_name="ComMarker B6 30W",
                url="https://commarker.com/product/commarker-b6-30w/",
                expected_price=2399.00,
                domain="commarker.com",
                notes="Must select 30W variant, not default 20W"
            ),
            
            # Glowforge machines
            TestCase(
                machine_id="glowforge-pro-hd",
                machine_name="Glowforge Pro HD",
                url="https://glowforge.com/b/pro",
                expected_price=6999.00,
                domain="glowforge.com",
                notes="Must detect Pro HD variant from context"
            ),
            TestCase(
                machine_id="glowforge-pro",
                machine_name="Glowforge Pro",
                url="https://glowforge.com/b/pro",
                expected_price=5999.00,
                domain="glowforge.com",
                notes="Must detect Pro (non-HD) variant"
            ),
            TestCase(
                machine_id="glowforge-plus-hd",
                machine_name="Glowforge Plus HD",
                url="https://glowforge.com/b/pro",
                expected_price=4999.00,
                domain="glowforge.com",
                notes="Must detect Plus HD variant"
            ),
            TestCase(
                machine_id="glowforge-plus",
                machine_name="Glowforge Plus",
                url="https://glowforge.com/b/pro",
                expected_price=4499.00,
                domain="glowforge.com",
                notes="Must detect Plus (non-HD) variant"
            ),
            TestCase(
                machine_id="glowforge-aura",
                machine_name="Glowforge Aura",
                url="https://glowforge.com/craft",
                expected_price=1199.00,
                domain="glowforge.com",
                notes="Separate URL, should work normally"
            ),
            
            # Monport machines
            TestCase(
                machine_id="monport-80w-co2",
                machine_name="Monport 80W CO2",
                url="https://monportlaser.com/products/80w-co2-laser",
                expected_price=2849.99,
                domain="monportlaser.com",
                notes="Must extract base machine price, not bundle with rotary"
            ),
            
            # xTool machines
            TestCase(
                machine_id="xtool-s1",
                machine_name="xTool S1",
                url="https://www.xtool.com/products/xtool-s1-laser-cutter",
                expected_price=1899.00,
                domain="xtool.com",
                notes="Should not get contaminated $4589 price"
            ),
            
            # Aeon machines
            TestCase(
                machine_id="aeon-mira-5-s",
                machine_name="Aeon MIRA 5 S",
                url="https://aeonlaser.us/products/mira-5-s",
                expected_price=6995.00,
                domain="aeonlaser.us",
                notes="Requires configurator navigation"
            ),
        ]
        
        # Save default test cases
        self.save_test_cases()
    
    def save_test_cases(self):
        """Save current test cases to JSON file"""
        data = {
            "last_updated": datetime.now().isoformat(),
            "test_cases": [asdict(case) for case in self.test_cases]
        }
        with open(self.test_cases_file, 'w') as f:
            json.dump(data, f, indent=2)
        logger.info(f"Saved {len(self.test_cases)} test cases to {self.test_cases_file}")
    
    async def run_single_test(self, test_case: TestCase) -> TestResult:
        """Run a single test case"""
        start_time = datetime.now()
        
        try:
            # Fetch the page
            logger.info(f"Testing {test_case.machine_name} at {test_case.url}")
            html_content, soup = await self.web_scraper.fetch_page(test_case.url)
            
            if not soup:
                return TestResult(
                    test_case=test_case,
                    extracted_price=None,
                    extraction_method="failed",
                    success=False,
                    error_message="Failed to fetch page",
                    execution_time=(datetime.now() - start_time).total_seconds()
                )
            
            # Create machine data for context
            machine_data = {
                'id': test_case.machine_id,
                'Machine Name': test_case.machine_name,
                'product_link': test_case.url,
                'learned_selectors': {}  # Will be populated if exists
            }
            
            # Extract price
            price, method = await self.price_extractor.extract_price(
                soup, 
                html_content, 
                test_case.url,
                test_case.expected_price,
                test_case.machine_name,
                machine_data
            )
            
            # Calculate success
            success = False
            price_diff_percent = 0.0
            
            if price is not None:
                price_diff_percent = abs(price - test_case.expected_price) / test_case.expected_price * 100
                success = price_diff_percent <= test_case.tolerance_percent
            
            return TestResult(
                test_case=test_case,
                extracted_price=price,
                extraction_method=method or "none",
                success=success,
                error_message="" if success else f"Expected ${test_case.expected_price}, got ${price}",
                price_difference_percent=price_diff_percent,
                execution_time=(datetime.now() - start_time).total_seconds()
            )
            
        except Exception as e:
            logger.error(f"Error testing {test_case.machine_name}: {str(e)}")
            return TestResult(
                test_case=test_case,
                extracted_price=None,
                extraction_method="error",
                success=False,
                error_message=str(e),
                execution_time=(datetime.now() - start_time).total_seconds()
            )
    
    async def run_all_tests(self):
        """Run all test cases"""
        logger.info(f"Starting regression test suite with {len(self.test_cases)} test cases")
        
        # Run tests concurrently but with a limit
        semaphore = asyncio.Semaphore(3)  # Max 3 concurrent tests
        
        async def run_with_semaphore(test_case):
            async with semaphore:
                return await self.run_single_test(test_case)
        
        # Run all tests
        tasks = [run_with_semaphore(test_case) for test_case in self.test_cases]
        self.results = await asyncio.gather(*tasks)
        
        # Generate report
        self._generate_report()
    
    def _generate_report(self):
        """Generate test report"""
        total_tests = len(self.results)
        passed_tests = sum(1 for r in self.results if r.success)
        failed_tests = total_tests - passed_tests
        
        logger.info(f"\n{'='*80}")
        logger.info(f"REGRESSION TEST REPORT")
        logger.info(f"{'='*80}")
        logger.info(f"Total Tests: {total_tests}")
        logger.info(f"Passed: {passed_tests} ({passed_tests/total_tests*100:.1f}%)")
        logger.info(f"Failed: {failed_tests} ({failed_tests/total_tests*100:.1f}%)")
        logger.info(f"{'='*80}")
        
        # Group by domain
        by_domain = {}
        for result in self.results:
            domain = result.test_case.domain
            if domain not in by_domain:
                by_domain[domain] = []
            by_domain[domain].append(result)
        
        # Report by domain
        for domain, domain_results in by_domain.items():
            domain_passed = sum(1 for r in domain_results if r.success)
            domain_total = len(domain_results)
            
            logger.info(f"\n{domain.upper()} ({domain_passed}/{domain_total} passed):")
            for result in domain_results:
                status = "✅ PASS" if result.success else "❌ FAIL"
                price_info = f"${result.extracted_price:.2f}" if result.extracted_price else "No price"
                diff_info = f"({result.price_difference_percent:.1f}% diff)" if result.extracted_price else ""
                
                logger.info(
                    f"  {status} {result.test_case.machine_name}: "
                    f"{price_info} {diff_info} - {result.extraction_method}"
                )
                
                if not result.success and result.error_message:
                    logger.info(f"       Error: {result.error_message}")
        
        # Save detailed results
        self._save_results()
    
    def _save_results(self):
        """Save detailed test results"""
        results_file = f"regression_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        results_data = {
            "test_run": datetime.now().isoformat(),
            "summary": {
                "total_tests": len(self.results),
                "passed": sum(1 for r in self.results if r.success),
                "failed": sum(1 for r in self.results if not r.success),
                "success_rate": sum(1 for r in self.results if r.success) / len(self.results) * 100
            },
            "results": [
                {
                    "machine_name": r.test_case.machine_name,
                    "url": r.test_case.url,
                    "expected_price": r.test_case.expected_price,
                    "extracted_price": r.extracted_price,
                    "success": r.success,
                    "method": r.extraction_method,
                    "error": r.error_message,
                    "price_diff_percent": r.price_difference_percent,
                    "execution_time": r.execution_time
                }
                for r in self.results
            ]
        }
        
        with open(results_file, 'w') as f:
            json.dump(results_data, f, indent=2)
        
        logger.info(f"\nDetailed results saved to: {results_file}")
    
    def add_test_case(self, test_case: TestCase):
        """Add a new test case to the suite"""
        self.test_cases.append(test_case)
        self.save_test_cases()
        logger.info(f"Added test case for {test_case.machine_name}")
    
    def update_test_case(self, machine_id: str, expected_price: float):
        """Update expected price for a test case"""
        for case in self.test_cases:
            if case.machine_id == machine_id:
                case.expected_price = expected_price
                self.save_test_cases()
                logger.info(f"Updated expected price for {case.machine_name} to ${expected_price}")
                return
        logger.warning(f"Test case {machine_id} not found")
    
    async def quick_test(self, domain: str = None):
        """Run quick test on specific domain or all"""
        if domain:
            filtered_cases = [c for c in self.test_cases if c.domain == domain]
            logger.info(f"Running {len(filtered_cases)} tests for domain: {domain}")
        else:
            filtered_cases = self.test_cases[:5]  # Quick test with first 5
            logger.info(f"Running quick test with {len(filtered_cases)} test cases")
        
        for test_case in filtered_cases:
            result = await self.run_single_test(test_case)
            status = "✅ PASS" if result.success else "❌ FAIL"
            logger.info(
                f"{status} {test_case.machine_name}: "
                f"Expected ${test_case.expected_price}, "
                f"Got ${result.extracted_price or 'None'} "
                f"({result.extraction_method})"
            )


async def main():
    """Main function to run regression tests"""
    # Initialize test suite
    suite = RegressionTestSuite()
    suite.load_test_cases()
    
    # Run all tests
    await suite.run_all_tests()
    
    # Or run quick test for specific domain
    # await suite.quick_test("commarker.com")


if __name__ == "__main__":
    asyncio.run(main())