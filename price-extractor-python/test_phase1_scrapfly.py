"""
Phase 1 Testing: Scrapfly vs Standard Pipeline on Problem Sites

This script tests the Scrapfly pipeline against the standard pipeline
on 5 machines from known problem sites:
- Thunder Laser (aurora-8)
- ComMarker (b4-100w)  
- xTool (f1)
- Monport (effi10s)
- Gweike (cloud-50w-pro)

These sites have historically had extraction issues, making them ideal
for testing Scrapfly's anti-bot capabilities.
"""

import asyncio
import json
import time
from datetime import datetime
from typing import Dict, List, Any

from services.price_service import PriceService
from services.database import DatabaseService
from loguru import logger


class Phase1Tester:
    """Test Scrapfly pipeline on problem sites"""
    
    def __init__(self):
        self.price_service = PriceService()
        self.db_service = DatabaseService()
        
        # Phase 1 test machines (one from each problem site)
        self.test_machines = [
            {
                "id": "1f4a6f8d-5f34-4190-a1f3-2c33c42e7e93",
                "name": "ComMarker B4 100W MOPA",
                "company": "commarker",
                "url": "https://commarker.com/product/b4-100w-jpt-mopa"
            },
            {
                "id": "24eecfc8-e606-497f-a948-7f2815e67820", 
                "name": "Gweike Cloud 50W Pro",
                "company": "gweike",
                "url": "https://www.gweikecloud.com/products/nox?ref=NMV3sU0i"
            },
            {
                "id": "c33dad86-6722-49df-b28a-ea8d9ff1242c",
                "name": "Monport Effi10S 100W Laser", 
                "company": "monport",
                "url": "https://monportlaser.com/products/monport-effi10s-upgraded-100w-co2-laser-engraver-cutter-with-autofocus-and-built-in-water-chiller?sca_ref=4770620.meSplPc0Pq"
            },
            {
                "id": "bc4031f6-2442-48eb-b06a-c40829e5ef41",
                "name": "Thunder Aurora 8",
                "company": "thunder", 
                "url": "https://www.thunderlaserusa.com/aurora-8"
            },
            {
                "id": "1868ea18-4e44-4955-891f-acf1499e0381",
                "name": "xTool F1",
                "company": "xtool",
                "url": "https://www.xtool.com/products/xtool-f1?variant=46187536187631"
            }
        ]
    
    async def test_machine_both_pipelines(self, machine: Dict[str, str]) -> Dict[str, Any]:
        """
        Test a single machine with both standard and Scrapfly pipelines
        
        Args:
            machine: Machine dictionary with id, name, company, url
            
        Returns:
            Dict with comparison results
        """
        machine_id = machine["id"]
        machine_name = machine["name"]
        company = machine["company"]
        
        logger.info(f"🧪 Testing {machine_name} ({company})")
        
        results = {
            "machine_id": machine_id,
            "machine_name": machine_name,
            "company": company,
            "url": machine["url"],
            "standard_pipeline": {},
            "scrapfly_pipeline": {},
            "comparison": {}
        }
        
        # Test 1: Standard Pipeline
        logger.info(f"📊 Testing standard pipeline for {machine_name}")
        start_time = time.time()
        
        try:
            standard_result = await self.price_service.update_machine_price(
                machine_id=machine_id,
                use_scrapfly=False
            )
            
            results["standard_pipeline"] = {
                "success": standard_result.get("success", False),
                "price": standard_result.get("new_price"),
                "method": standard_result.get("method"),
                "error": standard_result.get("error"),
                "duration": time.time() - start_time,
                "requires_approval": standard_result.get("requires_approval", False)
            }
            
            if standard_result.get("success"):
                logger.info(f"✅ Standard: ${standard_result.get('new_price')} via {standard_result.get('method')}")
            else:
                logger.warning(f"❌ Standard: {standard_result.get('error')}")
                
        except Exception as e:
            logger.error(f"❌ Standard pipeline error for {machine_name}: {str(e)}")
            results["standard_pipeline"] = {
                "success": False,
                "error": f"Exception: {str(e)}",
                "duration": time.time() - start_time
            }
        
        # Wait 2 seconds between tests to be respectful
        await asyncio.sleep(2)
        
        # Test 2: Scrapfly Pipeline  
        logger.info(f"🚀 Testing Scrapfly pipeline for {machine_name}")
        start_time = time.time()
        
        try:
            scrapfly_result = await self.price_service.update_machine_price(
                machine_id=machine_id,
                use_scrapfly=True
            )
            
            results["scrapfly_pipeline"] = {
                "success": scrapfly_result.get("success", False),
                "price": scrapfly_result.get("new_price"),
                "method": scrapfly_result.get("method"),
                "error": scrapfly_result.get("error"),
                "duration": time.time() - start_time,
                "requires_approval": scrapfly_result.get("requires_approval", False)
            }
            
            if scrapfly_result.get("success"):
                logger.info(f"✅ Scrapfly: ${scrapfly_result.get('new_price')} via {scrapfly_result.get('method')}")
            else:
                logger.warning(f"❌ Scrapfly: {scrapfly_result.get('error')}")
                
        except Exception as e:
            logger.error(f"❌ Scrapfly pipeline error for {machine_name}: {str(e)}")
            results["scrapfly_pipeline"] = {
                "success": False,
                "error": f"Exception: {str(e)}",
                "duration": time.time() - start_time
            }
        
        # Compare results
        standard_success = results["standard_pipeline"].get("success", False)
        scrapfly_success = results["scrapfly_pipeline"].get("success", False)
        
        if standard_success and scrapfly_success:
            std_price = results["standard_pipeline"].get("price")
            sf_price = results["scrapfly_pipeline"].get("price")
            
            if std_price and sf_price:
                price_diff = abs(std_price - sf_price)
                price_diff_pct = (price_diff / std_price) * 100 if std_price > 0 else 0
                
                results["comparison"] = {
                    "both_successful": True,
                    "price_difference": price_diff,
                    "price_difference_pct": price_diff_pct,
                    "prices_match": price_diff < 1.0,  # Within $1
                    "scrapfly_improvement": "both_worked"
                }
            else:
                results["comparison"] = {
                    "both_successful": True,
                    "scrapfly_improvement": "both_worked_but_missing_prices"
                }
        elif scrapfly_success and not standard_success:
            results["comparison"] = {
                "both_successful": False,
                "scrapfly_improvement": "scrapfly_fixed_failure"
            }
        elif standard_success and not scrapfly_success:
            results["comparison"] = {
                "both_successful": False,
                "scrapfly_improvement": "scrapfly_broke_working"
            }
        else:
            results["comparison"] = {
                "both_successful": False,
                "scrapfly_improvement": "both_failed"
            }
        
        return results
    
    async def run_phase1_test(self) -> Dict[str, Any]:
        """
        Run Phase 1 test on all 5 problem site machines
        
        Returns:
            Dict with complete test results
        """
        logger.info("🚀 Starting Phase 1 Scrapfly Testing")
        logger.info(f"Testing {len(self.test_machines)} machines from problem sites")
        
        test_results = {
            "phase": 1,
            "description": "Scrapfly vs Standard on 5 Problem Sites",
            "start_time": datetime.now().isoformat(),
            "machines": [],
            "summary": {}
        }
        
        # Test each machine
        for machine in self.test_machines:
            logger.info(f"\n{'='*60}")
            logger.info(f"Testing: {machine['name']} ({machine['company']})")
            logger.info(f"{'='*60}")
            
            try:
                machine_results = await self.test_machine_both_pipelines(machine)
                test_results["machines"].append(machine_results)
                
                # Wait between machines to be respectful
                await asyncio.sleep(3)
                
            except Exception as e:
                logger.exception(f"Failed to test machine {machine['name']}: {str(e)}")
                error_result = {
                    "machine_id": machine["id"],
                    "machine_name": machine["name"],
                    "company": machine["company"],
                    "url": machine["url"],
                    "error": f"Test framework error: {str(e)}"
                }
                test_results["machines"].append(error_result)
        
        # Generate summary
        test_results["end_time"] = datetime.now().isoformat()
        test_results["summary"] = self._generate_summary(test_results["machines"])
        
        return test_results
    
    def _generate_summary(self, machine_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate summary statistics from machine results"""
        
        summary = {
            "total_machines": len(machine_results),
            "standard_successes": 0,
            "scrapfly_successes": 0,
            "both_successful": 0,
            "scrapfly_fixed_failures": 0,
            "scrapfly_broke_working": 0,
            "both_failed": 0,
            "improvements": []
        }
        
        for result in machine_results:
            if "error" in result:
                continue
                
            std_success = result.get("standard_pipeline", {}).get("success", False)
            sf_success = result.get("scrapfly_pipeline", {}).get("success", False)
            
            if std_success:
                summary["standard_successes"] += 1
            if sf_success:
                summary["scrapfly_successes"] += 1
                
            comparison = result.get("comparison", {})
            improvement = comparison.get("scrapfly_improvement", "unknown")
            
            if improvement == "both_worked":
                summary["both_successful"] += 1
            elif improvement == "scrapfly_fixed_failure":
                summary["scrapfly_fixed_failures"] += 1
                summary["improvements"].append({
                    "machine": result["machine_name"],
                    "company": result["company"],
                    "improvement": "Fixed extraction failure"
                })
            elif improvement == "scrapfly_broke_working":
                summary["scrapfly_broke_working"] += 1
            elif improvement == "both_failed":
                summary["both_failed"] += 1
        
        # Calculate success rates
        total = summary["total_machines"]
        if total > 0:
            summary["standard_success_rate"] = (summary["standard_successes"] / total) * 100
            summary["scrapfly_success_rate"] = (summary["scrapfly_successes"] / total) * 100
            summary["improvement_rate"] = (summary["scrapfly_fixed_failures"] / total) * 100
        
        return summary
    
    def save_results(self, results: Dict[str, Any], filename: str = None):
        """Save test results to JSON file"""
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"phase1_scrapfly_test_results_{timestamp}.json"
        
        filepath = f"/Users/brandoncullum/machines-for-makers/price-extractor-python/{filename}"
        
        with open(filepath, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        logger.info(f"📁 Results saved to: {filepath}")
        return filepath


async def main():
    """Run Phase 1 testing"""
    
    tester = Phase1Tester()
    
    try:
        # Run the test
        results = await tester.run_phase1_test()
        
        # Save results
        results_file = tester.save_results(results)
        
        # Print summary
        summary = results["summary"]
        print(f"\n{'='*60}")
        print("PHASE 1 TEST SUMMARY")
        print(f"{'='*60}")
        print(f"Total Machines Tested: {summary['total_machines']}")
        print(f"Standard Pipeline Success Rate: {summary.get('standard_success_rate', 0):.1f}%")
        print(f"Scrapfly Pipeline Success Rate: {summary.get('scrapfly_success_rate', 0):.1f}%") 
        print(f"Scrapfly Fixed Failures: {summary['scrapfly_fixed_failures']}")
        print(f"Both Pipelines Worked: {summary['both_successful']}")
        print(f"Both Pipelines Failed: {summary['both_failed']}")
        
        if summary["improvements"]:
            print(f"\n🎉 SCRAPFLY IMPROVEMENTS:")
            for improvement in summary["improvements"]:
                print(f"  • {improvement['machine']} ({improvement['company']}): {improvement['improvement']}")
        
        print(f"\n📁 Full results: {results_file}")
        
    except Exception as e:
        logger.exception(f"Phase 1 test failed: {str(e)}")
        raise


if __name__ == "__main__":
    asyncio.run(main())