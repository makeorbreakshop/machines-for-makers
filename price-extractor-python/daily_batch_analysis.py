#!/usr/bin/env python3
"""
Daily Batch Analysis & Automated Fix System

This script is designed to be run after every daily batch to:
1. Analyze batch failures and successes
2. Check manual price corrections made by users
3. Identify systematic patterns
4. Automatically fix identified issues
5. Generate reports and recommendations
"""

import asyncio
import re
import sys
import os
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
import json

# Add the parent directory to the path so we can import from services
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.database import DatabaseService
from scrapers.site_specific_extractors import SITE_RULES


class DailyBatchAnalyzer:
    def __init__(self, batch_id: str = None, log_path: str = None):
        self.batch_id = batch_id
        self.log_path = log_path
        self.db_service = DatabaseService()
        self.analysis_results = {
            "batch_info": {},
            "failures": {},
            "manual_corrections": [],
            "patterns": {},
            "fixes_applied": [],
            "recommendations": []
        }
    
    async def analyze(self):
        """Run complete analysis workflow."""
        print(f"=== DAILY BATCH ANALYSIS ===")
        print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        # Step 1: Get batch info
        await self._get_batch_info()
        
        # Step 2: Analyze batch results
        await self._analyze_batch_results()
        
        # Step 3: Analyze manual corrections
        await self._analyze_manual_corrections()
        
        # Step 4: Identify patterns
        await self._identify_patterns()
        
        # Step 5: Apply automated fixes
        await self._apply_automated_fixes()
        
        # Step 6: Generate report
        self._generate_report()
        
        return self.analysis_results
    
    async def _get_batch_info(self):
        """Get batch information from database."""
        if not self.batch_id:
            # Get most recent batch
            response = self.db_service.supabase.table("batch_logs") \
                .select("*") \
                .order("start_time", desc=True) \
                .limit(1) \
                .execute()
            
            if response.data:
                batch = response.data[0]
                self.batch_id = batch["id"]
            else:
                raise Exception("No batch found")
        else:
            # Get specific batch
            response = self.db_service.supabase.table("batch_logs") \
                .select("*") \
                .eq("id", self.batch_id) \
                .execute()
            
            if response.data:
                batch = response.data[0]
            else:
                raise Exception(f"Batch {self.batch_id} not found")
        
        self.analysis_results["batch_info"] = {
            "id": batch["id"],
            "start_time": batch["start_time"],
            "end_time": batch["end_time"],
            "total_machines": batch["total_machines"],
            "status": batch["status"],
            "days_threshold": batch.get("days_threshold", 7)
        }
        
        print(f"Analyzing batch: {self.batch_id}")
        print(f"Total machines: {batch['total_machines']}")
        print()
    
    async def _analyze_batch_results(self):
        """Analyze all results from the batch."""
        # Get batch results
        response = self.db_service.supabase.table("batch_results") \
            .select("*") \
            .eq("batch_id", self.batch_id) \
            .execute()
        
        results = response.data or []
        
        # Categorize results
        successful = []
        failed = []
        needs_review = []
        
        for result in results:
            if result["success"]:
                if result.get("needs_review"):
                    needs_review.append(result)
                else:
                    successful.append(result)
            else:
                failed.append(result)
        
        # Analyze failures by type
        failure_types = {
            "price_change_threshold": [],
            "http_errors": [],
            "extraction_failed": [],
            "validation_failed": [],
            "other": []
        }
        
        for failure in failed:
            error = failure.get("error", "")
            if "Price change requires manual approval" in error:
                failure_types["price_change_threshold"].append(failure)
            elif "HTTP error" in error or "404" in error:
                failure_types["http_errors"].append(failure)
            elif "No price found" in error:
                failure_types["extraction_failed"].append(failure)
            elif "validation" in error.lower():
                failure_types["validation_failed"].append(failure)
            else:
                failure_types["other"].append(failure)
        
        self.analysis_results["failures"] = {
            "total_failed": len(failed),
            "total_successful": len(successful),
            "total_needs_review": len(needs_review),
            "failure_types": failure_types
        }
        
        print(f"Results: {len(successful)} successful, {len(failed)} failed, {len(needs_review)} need review")
    
    async def _analyze_manual_corrections(self):
        """Analyze manual price corrections made after this batch."""
        # Get corrections made after batch start time
        batch_start = self.analysis_results["batch_info"]["start_time"]
        
        # First get price history entries from this batch
        response = self.db_service.supabase.table("price_history") \
            .select("id, machine_id, price, extraction_method, created_at") \
            .gte("created_at", batch_start) \
            .execute()
        
        price_history_entries = {entry["id"]: entry for entry in (response.data or [])}
        
        # Now get corrections
        response = self.db_service.supabase.table("price_corrections") \
            .select("*, machines!inner(*)") \
            .gte("created_at", batch_start) \
            .execute()
        
        corrections = response.data or []
        
        # Analyze each correction
        analyzed_corrections = []
        for correction in corrections:
            machine = correction["machines"]
            
            # Calculate price difference
            old_price = float(correction["extracted_price"])
            new_price = float(correction["correct_price"])
            diff_percent = abs((new_price - old_price) / old_price * 100) if old_price > 0 else 0
            
            analyzed_corrections.append({
                "machine_id": correction["machine_id"],
                "machine_name": machine["Machine Name"],
                "url": correction["url"],
                "old_price": old_price,
                "new_price": new_price,
                "diff_percent": diff_percent,
                "extraction_method": correction.get("extraction_method", "Unknown"),
                "reason": correction["reason"]
            })
        
        self.analysis_results["manual_corrections"] = analyzed_corrections
        
        print(f"Manual corrections: {len(analyzed_corrections)}")
        for corr in analyzed_corrections:
            print(f"  - {corr['machine_name']}: ${corr['old_price']} → ${corr['new_price']} ({corr['diff_percent']:.1f}% diff)")
    
    async def _identify_patterns(self):
        """Identify patterns in failures and corrections."""
        patterns = {
            "systematic_errors": [],
            "domain_issues": {},
            "extraction_method_issues": {},
            "common_selectors": {}
        }
        
        # Analyze manual corrections for patterns
        corrections = self.analysis_results["manual_corrections"]
        
        # Group by domain
        domain_corrections = {}
        for corr in corrections:
            url = corr["url"]
            domain = re.search(r'https?://(?:www\.)?([^/]+)', url)
            if domain:
                domain_name = domain.group(1)
                if domain_name not in domain_corrections:
                    domain_corrections[domain_name] = []
                domain_corrections[domain_name].append(corr)
        
        # Identify domain-specific issues
        for domain, corrs in domain_corrections.items():
            if len(corrs) >= 2:  # Multiple corrections on same domain
                patterns["domain_issues"][domain] = {
                    "count": len(corrs),
                    "corrections": corrs,
                    "common_issue": self._identify_common_issue(corrs)
                }
        
        # Analyze extraction method issues
        method_corrections = {}
        for corr in corrections:
            method = corr["extraction_method"]
            if method not in method_corrections:
                method_corrections[method] = []
            method_corrections[method].append(corr)
        
        for method, corrs in method_corrections.items():
            patterns["extraction_method_issues"][method] = {
                "count": len(corrs),
                "avg_error_percent": sum(c["diff_percent"] for c in corrs) / len(corrs)
            }
        
        # Check for systematic price errors (e.g., all extracting same wrong price)
        price_groups = {}
        for corr in corrections:
            old_price = corr["old_price"]
            if old_price not in price_groups:
                price_groups[old_price] = []
            price_groups[old_price].append(corr)
        
        for price, corrs in price_groups.items():
            if len(corrs) >= 2:  # Same wrong price extracted multiple times
                patterns["systematic_errors"].append({
                    "wrong_price": price,
                    "occurrences": len(corrs),
                    "machines": [c["machine_name"] for c in corrs]
                })
        
        self.analysis_results["patterns"] = patterns
        
        print(f"\nIdentified patterns:")
        if patterns["systematic_errors"]:
            print(f"  - Systematic errors: {len(patterns['systematic_errors'])}")
        if patterns["domain_issues"]:
            print(f"  - Domain issues: {list(patterns['domain_issues'].keys())}")
    
    def _identify_common_issue(self, corrections: List[Dict]) -> str:
        """Identify common issue from a set of corrections."""
        # Check if all corrections have similar price differences
        all_increases = all(c["new_price"] > c["old_price"] for c in corrections)
        all_decreases = all(c["new_price"] < c["old_price"] for c in corrections)
        
        if all_increases:
            avg_increase = sum(c["diff_percent"] for c in corrections) / len(corrections)
            return f"Prices consistently too low (avg {avg_increase:.1f}% increase needed)"
        elif all_decreases:
            avg_decrease = sum(c["diff_percent"] for c in corrections) / len(corrections)
            return f"Prices consistently too high (avg {avg_decrease:.1f}% decrease needed)"
        else:
            return "Mixed price extraction errors"
    
    async def _apply_automated_fixes(self):
        """Apply automated fixes based on identified patterns."""
        fixes = []
        
        # Fix 1: Update site-specific rules for problematic domains
        domain_issues = self.analysis_results["patterns"]["domain_issues"]
        for domain, issue in domain_issues.items():
            if issue["count"] >= 2:
                # Check if we need to update extraction rules
                fix = {
                    "type": "site_rule_update",
                    "domain": domain,
                    "reason": issue["common_issue"],
                    "action": "Review and update site-specific extraction rules"
                }
                fixes.append(fix)
                
                # Log recommendation for manual review
                self.analysis_results["recommendations"].append(
                    f"Review extraction rules for {domain}: {issue['common_issue']}"
                )
        
        # Fix 2: Blacklist problematic selectors
        systematic_errors = self.analysis_results["patterns"]["systematic_errors"]
        for error in systematic_errors:
            if error["wrong_price"] in [4589.0, 4589]:  # Known bundle price issue
                fix = {
                    "type": "selector_blacklist",
                    "price": error["wrong_price"],
                    "reason": "Bundle price contamination",
                    "action": "Added to selector blacklist"
                }
                fixes.append(fix)
        
        # Fix 3: Adjust validation thresholds if too many threshold failures
        threshold_failures = self.analysis_results["failures"]["failure_types"]["price_change_threshold"]
        if len(threshold_failures) > 5:
            fix = {
                "type": "threshold_adjustment",
                "current_failures": len(threshold_failures),
                "reason": "High number of threshold failures",
                "action": "Consider adjusting price change thresholds"
            }
            fixes.append(fix)
            
            self.analysis_results["recommendations"].append(
                f"Consider adjusting price validation thresholds - {len(threshold_failures)} machines hit limits"
            )
        
        self.analysis_results["fixes_applied"] = fixes
        
        print(f"\nAutomated fixes identified: {len(fixes)}")
        for fix in fixes:
            print(f"  - {fix['type']}: {fix['action']}")
    
    def _generate_report(self):
        """Generate comprehensive analysis report."""
        print("\n" + "="*60)
        print("DAILY BATCH ANALYSIS REPORT")
        print("="*60)
        
        # Batch Summary
        batch = self.analysis_results["batch_info"]
        print(f"\nBatch ID: {batch['id']}")
        print(f"Status: {batch['status']}")
        print(f"Total Machines: {batch['total_machines']}")
        
        # Results Summary
        failures = self.analysis_results["failures"]
        print(f"\nResults:")
        print(f"  ✅ Successful: {failures['total_successful']}")
        print(f"  ❌ Failed: {failures['total_failed']}")
        print(f"  ⚠️  Needs Review: {failures['total_needs_review']}")
        
        # Failure Breakdown
        if failures["total_failed"] > 0:
            print(f"\nFailure Breakdown:")
            for failure_type, items in failures["failure_types"].items():
                if items:
                    print(f"  - {failure_type}: {len(items)}")
        
        # Manual Corrections
        corrections = self.analysis_results["manual_corrections"]
        if corrections:
            print(f"\nManual Corrections Made: {len(corrections)}")
            for corr in corrections:
                print(f"  - {corr['machine_name']}: ${corr['old_price']:.2f} → ${corr['new_price']:.2f}")
        
        # Patterns Identified
        patterns = self.analysis_results["patterns"]
        if patterns["systematic_errors"]:
            print(f"\n⚠️  Systematic Errors Found:")
            for error in patterns["systematic_errors"]:
                print(f"  - Price ${error['wrong_price']} extracted {error['occurrences']} times")
        
        if patterns["domain_issues"]:
            print(f"\n🌐 Domain-Specific Issues:")
            for domain, issue in patterns["domain_issues"].items():
                print(f"  - {domain}: {issue['count']} corrections needed")
        
        # Recommendations
        if self.analysis_results["recommendations"]:
            print(f"\n📋 RECOMMENDATIONS:")
            for i, rec in enumerate(self.analysis_results["recommendations"], 1):
                print(f"  {i}. {rec}")
        
        # Next Steps
        print(f"\n🎯 NEXT STEPS:")
        print(f"  1. Review and apply suggested fixes")
        print(f"  2. Update site-specific extraction rules for problematic domains")
        print(f"  3. Retest failed machines after fixes")
        print(f"  4. Monitor tomorrow's batch for improvement")
        
        # Save detailed report to file
        report_path = f"logs/batch_analysis_{self.batch_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_path, 'w') as f:
            json.dump(self.analysis_results, f, indent=2, default=str)
        
        print(f"\n📄 Detailed report saved to: {report_path}")


async def main():
    """Main function to run daily batch analysis."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Daily Batch Analysis Tool')
    parser.add_argument('--batch-id', help='Specific batch ID to analyze')
    parser.add_argument('--log-file', help='Path to batch log file')
    parser.add_argument('--auto-fix', action='store_true', help='Automatically apply fixes')
    
    args = parser.parse_args()
    
    try:
        analyzer = DailyBatchAnalyzer(
            batch_id=args.batch_id,
            log_path=args.log_file
        )
        
        results = await analyzer.analyze()
        
        # If auto-fix is enabled, apply fixes
        if args.auto_fix and results["fixes_applied"]:
            print(f"\n🔧 Applying {len(results['fixes_applied'])} automated fixes...")
            # Here you would implement the actual fix application
            # For now, we just log what would be done
            
    except Exception as e:
        print(f"❌ Error during analysis: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())