#!/usr/bin/env python3
"""
Automated test script for price extraction system.
Tests all extraction methods and verifies fixes are working correctly.
"""

import asyncio
import json
import os
import sys
from datetime import datetime
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, asdict
import time
from urllib.parse import urlparse

# Add project root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from loguru import logger
from scrapers.price_extractor import PriceExtractor
from scrapers.web_scraper import WebScraper
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# Configure logging
logger.remove()  # Remove default handler
logger.add(sys.stdout, level="INFO", format="{time:HH:mm:ss} | {level} | {message}")
logger.add("test_results/test_run_{time}.log", level="DEBUG")


@dataclass
class TestCase:
    """Represents a single test case"""
    machine_id: str
    machine_name: str
    company: str
    url: str
    previous_price: float
    expected_price: float
    issue_description: str
    extraction_method: Optional[str] = None
    
    @property
    def domain(self):
        return urlparse(self.url).netloc.lower().replace('www.', '')


@dataclass 
class TestResult:
    """Result of a single test"""
    test_case: TestCase
    extracted_price: Optional[float]
    extraction_method: Optional[str]
    success: bool
    error_message: Optional[str] = None
    execution_time: float = 0.0
    methods_tried: List[Tuple[str, Optional[float]]] = None


class PriceExtractionTester:
    """Test harness for price extraction system"""
    
    def __init__(self):
        self.web_scraper = WebScraper()
        self.price_extractor = PriceExtractor()
        
        # Initialize Supabase client
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        self.supabase: Client = create_client(supabase_url, supabase_key)
        
        self.test_cases: List[TestCase] = []
        self.results: List[TestResult] = []
        
        # Create test results directory
        os.makedirs("test_results", exist_ok=True)
    
    async def load_test_cases(self):
        """Load test cases from manual corrections"""
        logger.info("Loading test cases from manual corrections...")
        
        # Get manual corrections from the batch
        try:
            result = self.supabase.table("price_history").select(
                """
                *,
                machines!inner(
                    id,
                    "Machine Name",
                    "Company",
                    product_link
                )
                """
            ).eq('status', 'MANUAL_CORRECTION').eq('batch_id', 'c1e79ac7-78a1-43ad-8907-a599867bd509').execute()
            
            corrections = result.data
        except Exception as e:
            logger.error(f"Failed to load corrections: {e}")
            corrections = []
        
        # Priority test cases - machines with known issues
        priority_machines = {
            "ComMarker B4 30W": {"expected": 1799.0, "issue": "MCP automation extracting $50"},
            "ComMarker B6 30W": {"expected": 2399.0, "issue": "MCP automation extracting $50"},
            "xTool S1": {"expected": 1899.0, "issue": "Getting contaminated $4589 price"},
            "Glowforge Aura": {"expected": 999.0, "issue": "Extracting bundle price $2495"},
            "Monport Onyx 55W Laser": {"expected": 1599.99, "issue": "Variant selection issue"},
        }
        
        # Create test cases from corrections
        for correction in corrections:
            machine = correction.get('machines', {})
            machine_name = machine.get('Machine Name', '')
            
            # Determine issue description
            issue = "Price extraction error"
            if machine_name in priority_machines:
                issue = priority_machines[machine_name]["issue"]
            elif correction.get('failure_reason', '').startswith('User corrected price from $50'):
                issue = "ComMarker $50 bug"
            
            test_case = TestCase(
                machine_id=correction['machine_id'],
                machine_name=machine_name,
                company=machine.get('Company', ''),
                url=machine.get('product_link', ''),
                previous_price=float(correction.get('previous_price', 0)),
                expected_price=float(correction.get('price', 0)),
                issue_description=issue
            )
            self.test_cases.append(test_case)
        
        logger.info(f"Loaded {len(self.test_cases)} test cases")
        
        # Save test cases for reference
        with open("test_results/test_cases.json", "w") as f:
            json.dump([asdict(tc) for tc in self.test_cases], f, indent=2)
    
    async def run_single_test(self, test_case: TestCase) -> TestResult:
        """Run a single test case"""
        start_time = time.time()
        methods_tried = []
        
        try:
            logger.info(f"\n{'='*60}")
            logger.info(f"Testing: {test_case.machine_name}")
            logger.info(f"URL: {test_case.url}")
            logger.info(f"Expected: ${test_case.expected_price}")
            logger.info(f"Issue: {test_case.issue_description}")
            
            # Get machine data from database
            try:
                result = self.supabase.table("machines").select("*").eq("id", test_case.machine_id).single().execute()
                machine_data = result.data
            except:
                machine_data = None
            
            # Fetch the page
            html_content, soup = await self.web_scraper.get_page_content(test_case.url)
            
            if not soup:
                return TestResult(
                    test_case=test_case,
                    extracted_price=None,
                    extraction_method=None,
                    success=False,
                    error_message="Failed to fetch page",
                    execution_time=time.time() - start_time
                )
            
            # Extract price using our system
            price, method = await self.price_extractor.extract_price(
                soup=soup,
                html_content=html_content,
                url=test_case.url,
                old_price=test_case.previous_price,
                machine_name=test_case.machine_name,
                machine_data=machine_data
            )
            
            # Check if extraction was successful
            success = False
            error_message = None
            
            if price is None:
                error_message = "No price extracted"
            elif abs(price - test_case.expected_price) < 0.01:
                success = True
                logger.success(f"✅ SUCCESS: Extracted ${price} (expected ${test_case.expected_price})")
            else:
                error_message = f"Wrong price: got ${price}, expected ${test_case.expected_price}"
                logger.error(f"❌ FAILED: {error_message}")
            
            return TestResult(
                test_case=test_case,
                extracted_price=price,
                extraction_method=method,
                success=success,
                error_message=error_message,
                execution_time=time.time() - start_time,
                methods_tried=methods_tried
            )
            
        except Exception as e:
            logger.error(f"Test error: {str(e)}")
            return TestResult(
                test_case=test_case,
                extracted_price=None,
                extraction_method=None,
                success=False,
                error_message=str(e),
                execution_time=time.time() - start_time
            )
    
    async def run_priority_tests(self):
        """Run tests on priority machines first"""
        priority_names = [
            "ComMarker B4 30W",
            "ComMarker B6 30W", 
            "xTool S1",
            "Glowforge Aura",
            "Monport Onyx 55W Laser"
        ]
        
        priority_cases = [tc for tc in self.test_cases if tc.machine_name in priority_names]
        
        if priority_cases:
            logger.info(f"\n{'='*60}")
            logger.info("RUNNING PRIORITY TESTS")
            logger.info(f"{'='*60}")
            
            for test_case in priority_cases:
                result = await self.run_single_test(test_case)
                self.results.append(result)
    
    async def run_all_tests(self):
        """Run all test cases"""
        logger.info(f"\n{'='*60}")
        logger.info("RUNNING ALL TESTS")
        logger.info(f"{'='*60}")
        
        # Run tests in batches to avoid overwhelming the system
        batch_size = 5
        
        for i in range(0, len(self.test_cases), batch_size):
            batch = self.test_cases[i:i+batch_size]
            tasks = [self.run_single_test(tc) for tc in batch]
            batch_results = await asyncio.gather(*tasks)
            self.results.extend(batch_results)
            
            # Brief pause between batches
            if i + batch_size < len(self.test_cases):
                await asyncio.sleep(2)
    
    def generate_report(self):
        """Generate comprehensive test report"""
        total_tests = len(self.results)
        passed = sum(1 for r in self.results if r.success)
        failed = total_tests - passed
        
        logger.info(f"\n{'='*60}")
        logger.info("TEST RESULTS SUMMARY")
        logger.info(f"{'='*60}")
        logger.info(f"Total Tests: {total_tests}")
        logger.info(f"Passed: {passed} ({passed/total_tests*100:.1f}%)")
        logger.info(f"Failed: {failed} ({failed/total_tests*100:.1f}%)")
        
        # Group by issue type
        issue_groups = {}
        for result in self.results:
            issue = result.test_case.issue_description
            if issue not in issue_groups:
                issue_groups[issue] = {"passed": 0, "failed": 0, "machines": []}
            
            if result.success:
                issue_groups[issue]["passed"] += 1
            else:
                issue_groups[issue]["failed"] += 1
                issue_groups[issue]["machines"].append({
                    "name": result.test_case.machine_name,
                    "expected": result.test_case.expected_price,
                    "got": result.extracted_price,
                    "error": result.error_message
                })
        
        logger.info(f"\n{'='*60}")
        logger.info("RESULTS BY ISSUE TYPE")
        logger.info(f"{'='*60}")
        
        for issue, stats in issue_groups.items():
            total = stats["passed"] + stats["failed"]
            logger.info(f"\n{issue}:")
            logger.info(f"  Passed: {stats['passed']}/{total}")
            if stats["failed"] > 0:
                logger.info(f"  Failed machines:")
                for machine in stats["machines"][:5]:  # Show first 5
                    logger.info(f"    - {machine['name']}: {machine['error']}")
        
        # Group by company
        company_groups = {}
        for result in self.results:
            company = result.test_case.company
            if company not in company_groups:
                company_groups[company] = {"passed": 0, "failed": 0}
            
            if result.success:
                company_groups[company]["passed"] += 1
            else:
                company_groups[company]["failed"] += 1
        
        logger.info(f"\n{'='*60}")
        logger.info("RESULTS BY COMPANY")
        logger.info(f"{'='*60}")
        
        for company, stats in sorted(company_groups.items()):
            total = stats["passed"] + stats["failed"]
            success_rate = stats["passed"] / total * 100 if total > 0 else 0
            logger.info(f"{company}: {stats['passed']}/{total} ({success_rate:.1f}%)")
        
        # Save detailed results
        detailed_results = {
            "test_run": datetime.now().isoformat(),
            "summary": {
                "total": total_tests,
                "passed": passed,
                "failed": failed,
                "success_rate": passed/total_tests*100 if total_tests > 0 else 0
            },
            "by_issue": issue_groups,
            "by_company": company_groups,
            "detailed_results": [
                {
                    "machine": r.test_case.machine_name,
                    "company": r.test_case.company,
                    "url": r.test_case.url,
                    "expected": r.test_case.expected_price,
                    "extracted": r.extracted_price,
                    "method": r.extraction_method,
                    "success": r.success,
                    "error": r.error_message,
                    "time": r.execution_time
                }
                for r in self.results
            ]
        }
        
        with open("test_results/detailed_results.json", "w") as f:
            json.dump(detailed_results, f, indent=2)
        
        logger.info(f"\nDetailed results saved to test_results/detailed_results.json")
        
        return detailed_results


async def main():
    """Main test execution"""
    tester = PriceExtractionTester()
    
    # Load test cases
    await tester.load_test_cases()
    
    # Run priority tests first
    await tester.run_priority_tests()
    
    # Generate initial report
    priority_report = tester.generate_report()
    
    # Ask if we should run all tests
    if len(tester.test_cases) > len(tester.results):
        logger.info(f"\nRun remaining {len(tester.test_cases) - len(tester.results)} tests? (y/n)")
        # For automated testing, run all
        tester.results = []  # Reset for full run
        await tester.run_all_tests()
        
        # Generate final report
        final_report = tester.generate_report()


if __name__ == "__main__":
    asyncio.run(main())