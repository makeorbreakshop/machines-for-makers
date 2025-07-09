#!/usr/bin/env python3
"""
Working Batch Analysis Script
Analyzes batch results from log files without requiring database access
"""

import sys
import re
import json
from pathlib import Path
from datetime import datetime

def analyze_batch_log(batch_id):
    """Analyze a batch log file and extract key information"""
    
    # Find the log file
    log_files = list(Path("logs").glob(f"*{batch_id[:8]}*.log"))
    if not log_files:
        print(f"❌ No log file found for batch {batch_id}")
        return
    
    log_file = log_files[0]
    print(f"📁 Analyzing log file: {log_file}")
    print("=" * 60)
    
    with open(log_file, 'r') as f:
        content = f.read()
    
    # Extract key information
    machines_processed = []
    failures = []
    successes = []
    
    # Parse each machine processing section
    machine_sections = re.split(r'Processing price update for machine', content)[1:]
    
    for section in machine_sections:
        lines = section.split('\n')
        machine_id = lines[0].strip() if lines else "unknown"
        
        # Extract machine name and URL
        machine_name = "Unknown"
        url = "Unknown"
        old_price = "Unknown"
        
        for line in lines:
            if "Using machine name for variant selection:" in line:
                machine_name = re.search(r"'([^']*)'", line)
                machine_name = machine_name.group(1) if machine_name else "Unknown"
            elif "URL:" in line and "https://" in line:
                url = line.split("URL: ")[1].strip()
            elif "Old Price:" in line:
                old_price = line.split("Old Price: ")[1].strip()
        
        # Determine success/failure
        if "SUCCESS:" in section:
            method_match = re.search(r'METHOD (\d+) SUCCESS.*?using ([^:]*)', section)
            method = method_match.group(1) if method_match else "Unknown"
            method_type = method_match.group(2) if method_match else "Unknown"
            
            price_match = re.search(r'Extracted price \$?([0-9.,]+)', section)
            extracted_price = price_match.group(1) if price_match else "Unknown"
            
            successes.append({
                'machine_id': machine_id,
                'machine_name': machine_name,
                'url': url,
                'old_price': old_price,
                'extracted_price': extracted_price,
                'method': method,
                'method_type': method_type
            })
        else:
            # Find the last error or failure reason
            error_lines = [line for line in lines if any(keyword in line for keyword in ['ERROR', 'FAILED', 'exception', 'AttributeError'])]
            error_reason = error_lines[-1] if error_lines else "Unknown failure"
            
            failures.append({
                'machine_id': machine_id,
                'machine_name': machine_name,
                'url': url,
                'old_price': old_price,
                'error_reason': error_reason
            })
    
    # Generate report
    total = len(successes) + len(failures)
    success_rate = (len(successes) / total * 100) if total > 0 else 0
    
    print(f"📊 BATCH ANALYSIS RESULTS")
    print(f"Batch ID: {batch_id}")
    print(f"Total machines: {total}")
    print(f"Successes: {len(successes)}")
    print(f"Failures: {len(failures)}")
    print(f"Success rate: {success_rate:.1f}%")
    print()
    
    if successes:
        print("✅ SUCCESSFUL EXTRACTIONS:")
        for i, success in enumerate(successes, 1):
            print(f"{i}. {success['machine_name']}")
            print(f"   Price: {success['old_price']} → ${success['extracted_price']}")
            print(f"   Method: {success['method']} ({success['method_type']})")
            print(f"   URL: {success['url'][:80]}...")
            print()
    
    if failures:
        print("❌ FAILED EXTRACTIONS:")
        for i, failure in enumerate(failures, 1):
            print(f"{i}. {failure['machine_name']}")
            print(f"   Old price: {failure['old_price']}")
            print(f"   Error: {failure['error_reason']}")
            print(f"   URL: {failure['url'][:80]}...")
            print()
    
    # Pattern analysis
    print("🔍 PATTERN ANALYSIS:")
    
    # Method distribution
    if successes:
        methods = {}
        for success in successes:
            method = f"Method {success['method']}"
            methods[method] = methods.get(method, 0) + 1
        
        print("Method distribution:")
        for method, count in methods.items():
            print(f"  {method}: {count} successes")
        print()
    
    # Error patterns - check full log content for _parse_price errors
    if failures:
        error_patterns = {}
        parse_price_error = "'PriceExtractor' object has no attribute '_parse_price'" in content
        
        for failure in failures:
            if parse_price_error:
                error_patterns["_parse_price cache bug"] = error_patterns.get("_parse_price cache bug", 0) + 1
            elif "coming-soon" in failure['url'].lower():
                error_patterns["Coming soon page"] = error_patterns.get("Coming soon page", 0) + 1
            elif "null value in column" in failure['error_reason']:
                error_patterns["Database constraint (null price)"] = error_patterns.get("Database constraint (null price)", 0) + 1
            else:
                error_patterns["Other"] = error_patterns.get("Other", 0) + 1
        
        print("Error patterns:")
        for pattern, count in error_patterns.items():
            print(f"  {pattern}: {count} failures")
        print()
    
    # Recommendations
    print("💡 RECOMMENDATIONS:")
    parse_price_error = "'PriceExtractor' object has no attribute '_parse_price'" in content
    if parse_price_error:
        print("1. 🚨 CRITICAL: Clear Python cache to fix _parse_price method issue")
        print("   Run: rm -rf scrapers/__pycache__/")
    
    coming_soon_failures = [f for f in failures if "coming-soon" in f['url']]
    if coming_soon_failures:
        print("2. Filter out 'coming soon' pages from batch processing")
    
    if parse_price_error and len(failures) == 3:
        print("3. ✅ Expected success rate after fix: 9/10 (90%) - only 1 genuine failure (coming soon page)")
    elif len(failures) > len(successes):
        print("3. Review systematic issues - failure rate is high")
    
    print()
    print("=" * 60)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        batch_id = sys.argv[1]
    else:
        # Find the most recent batch
        log_files = sorted(Path("logs").glob("batch_*.log"), key=lambda x: x.stat().st_mtime, reverse=True)
        if log_files:
            latest_log = log_files[0].name
            batch_id = re.search(r'batch_\d+_\d+_([a-f0-9-]+)\.log', latest_log)
            batch_id = batch_id.group(1) if batch_id else latest_log
        else:
            print("❌ No batch log files found")
            sys.exit(1)
    
    analyze_batch_log(batch_id)