#!/usr/bin/env python3
"""
Simple Batch Analysis - Focus on actual failures from batch logs
"""

import re
from pathlib import Path

def analyze_batch_log(log_path: str):
    """Analyze the batch log and categorize real failures."""
    
    failures = {
        "http_errors": [],
        "validation_failures": [],
        "extraction_failures": [],
        "machine_errors": []
    }
    
    try:
        with open(log_path, 'r') as f:
            content = f.read()
            
        # Find HTTP errors (404, connection issues, etc.)
        http_errors = re.findall(r'ERROR.*HTTP error.*?url: (https?://[^\s\)]+)', content)
        failures["http_errors"] = list(set(http_errors))
        
        # Find validation failures
        validation_fails = re.findall(r'❌ METHOD \d+ VALIDATION FAILED.*?price \$?([\d,\.]+)', content)
        failures["validation_failures"] = validation_fails
        
        # Find machines that failed to fetch content
        fetch_failures = re.findall(r'Failed to fetch content from (https?://[^\s\)]+)', content)
        failures["machine_errors"] = list(set(fetch_failures))
        
        # Look for complete extraction failures (no price found by any method)
        lines = content.split('\n')
        current_machine = None
        extraction_started = False
        found_success = False
        
        for line in lines:
            if "Machine:" in line:
                if extraction_started and not found_success and current_machine:
                    failures["extraction_failures"].append(current_machine)
                
                match = re.search(r'Machine: (.+)', line)
                current_machine = match.group(1).strip() if match else None
                extraction_started = False
                found_success = False
                
            elif "=== PRICE EXTRACTION START ===" in line:
                extraction_started = True
                found_success = False
                
            elif "✅.*SUCCESS" in line or "=== PRICE EXTRACTION COMPLETE ===" in line:
                found_success = True
                
        # Check final machine
        if extraction_started and not found_success and current_machine:
            failures["extraction_failures"].append(current_machine)
            
    except Exception as e:
        print(f"Error analyzing log: {e}")
        return None
        
    return failures

def print_analysis(failures):
    """Print analysis results."""
    
    total_failures = (len(failures["http_errors"]) + 
                     len(failures["validation_failures"]) + 
                     len(failures["extraction_failures"]) + 
                     len(failures["machine_errors"]))
    
    print(f"=== BATCH FAILURE ANALYSIS ===")
    print(f"Total failure indicators: {total_failures}")
    print()
    
    if failures["http_errors"]:
        print(f"🌐 HTTP/URL ERRORS ({len(failures['http_errors'])}):")
        for i, url in enumerate(failures["http_errors"][:10], 1):
            print(f"  {i}. {url}")
        print()
        
    if failures["machine_errors"]:
        print(f"🔗 CONTENT FETCH FAILURES ({len(failures['machine_errors'])}):")
        for i, url in enumerate(failures["machine_errors"][:10], 1):
            print(f"  {i}. {url}")
        print()
    
    if failures["validation_failures"]:
        print(f"⚖️ VALIDATION FAILURES ({len(failures['validation_failures'])}):")
        for i, price in enumerate(failures["validation_failures"][:10], 1):
            print(f"  {i}. Price: ${price} (failed validation thresholds)")
        print()
    
    if failures["extraction_failures"]:
        print(f"❌ COMPLETE EXTRACTION FAILURES ({len(failures['extraction_failures'])}):")
        for i, machine in enumerate(failures["extraction_failures"][:10], 1):
            print(f"  {i}. {machine}")
        print()
    
    # Recommendations
    print("=== RECOMMENDATIONS ===")
    
    if failures["http_errors"] or failures["machine_errors"]:
        print("🔗 URL Issues: Check for dead links, redirects, or changed URLs")
        
    if failures["validation_failures"]:
        print("⚖️ Validation: Review validation thresholds - some prices may be legitimate")
        
    if failures["extraction_failures"]:
        print("🤖 Extraction: Use MCP browser tools to investigate these sites")
        
    # Generate MCP investigation for most problematic URLs
    problem_urls = failures["machine_errors"] + failures["http_errors"]
    if problem_urls:
        print(f"\n=== TOP URLS FOR MCP INVESTIGATION ===")
        for i, url in enumerate(problem_urls[:5], 1):
            print(f"{i}. {url}")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        log_file = sys.argv[1]
    else:
        # Find most recent log
        log_dir = Path("logs")
        if log_dir.exists():
            log_files = list(log_dir.glob("price_extractor_*.log"))
            if log_files:
                log_file = str(max(log_files, key=lambda f: f.stat().st_mtime))
                print(f"Using most recent log: {log_file}")
            else:
                print("No log files found")
                exit(1)
        else:
            print("No logs directory found")
            exit(1)
    
    failures = analyze_batch_log(log_file)
    if failures:
        print_analysis(failures)