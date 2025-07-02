#!/usr/bin/env python3
"""
Daily Learning Cron Job

This script should be run daily to:
1. Generate learning reports
2. Apply automatic improvements  
3. Send reports to admin

Usage:
    python daily_learning_cron.py
    
Or add to crontab:
    0 6 * * * cd /path/to/price-extractor-python && python daily_learning_cron.py
"""

import asyncio
import sys
import os
import json
from datetime import datetime
from loguru import logger

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.learning_service import DailyLearningService


async def main():
    """Run daily learning analysis and improvements."""
    
    logger.info("=== DAILY LEARNING CRON JOB STARTED ===")
    
    try:
        learning_service = DailyLearningService()
        
        # 1. Generate learning report for last 7 days
        logger.info("Step 1: Generating learning report...")
        report = await learning_service.generate_daily_learning_report(days_back=7)
        
        if "error" in report:
            logger.error(f"Failed to generate learning report: {report['error']}")
            return 1
        
        # 2. Log key metrics
        success_rate = report.get("success_rate", 0)
        total_extractions = report.get("total_extractions", 0)
        recommendations = report.get("recommendations", [])
        auto_improvements = report.get("auto_improvements", [])
        
        logger.info(f"Learning Report Summary:")
        logger.info(f"  - Success Rate: {success_rate:.1%}")
        logger.info(f"  - Total Extractions: {total_extractions}")
        logger.info(f"  - Recommendations: {len(recommendations)}")
        logger.info(f"  - Auto Improvements: {len(auto_improvements)}")
        
        # 3. Log high priority recommendations
        high_priority = [r for r in recommendations if r.get("priority") == "high"]
        if high_priority:
            logger.warning(f"HIGH PRIORITY ISSUES DETECTED:")
            for rec in high_priority:
                logger.warning(f"  - {rec.get('title')}")
        
        # 4. Log site changes detected
        site_changes = report.get("site_changes_detected", [])
        if site_changes:
            logger.warning(f"SITE CHANGES DETECTED:")
            for change in site_changes:
                logger.warning(f"  - {change.get('domain')}: {change.get('current_success_rate'):.1%} success")
        
        # 5. Save full report to file
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        report_file = f"logs/learning_report_{timestamp}.json"
        
        os.makedirs("logs", exist_ok=True)
        with open(report_file, "w") as f:
            json.dump(report, f, indent=2, default=str)
        
        logger.info(f"Full report saved to: {report_file}")
        
        # 6. Print summary for email/notification
        print("=== DAILY LEARNING REPORT SUMMARY ===")
        print(f"Date: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC")
        print(f"Success Rate: {success_rate:.1%}")
        print(f"Total Extractions: {total_extractions}")
        print(f"Recommendations: {len(recommendations)}")
        print(f"Auto Improvements Applied: {len(auto_improvements)}")
        
        if high_priority:
            print(f"\n🚨 HIGH PRIORITY ISSUES ({len(high_priority)}):")
            for rec in high_priority[:3]:  # Show top 3
                print(f"  - {rec.get('title')}")
        
        if site_changes:
            print(f"\n🔄 SITE CHANGES DETECTED ({len(site_changes)}):")
            for change in site_changes[:3]:  # Show top 3
                print(f"  - {change.get('domain')}: {change.get('current_success_rate'):.1%}")
        
        if auto_improvements:
            print(f"\n✅ AUTO-IMPROVEMENTS APPLIED ({len(auto_improvements)}):")
            for improvement in auto_improvements:
                print(f"  - {improvement.get('description')}")
        
        print(f"\nFull report: {report_file}")
        print("=" * 50)
        
        logger.info("=== DAILY LEARNING CRON JOB COMPLETED SUCCESSFULLY ===")
        return 0
        
    except Exception as e:
        logger.exception(f"Error in daily learning cron job: {str(e)}")
        print(f"ERROR: Daily learning cron job failed: {str(e)}")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)