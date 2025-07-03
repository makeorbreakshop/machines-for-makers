#!/usr/bin/env python3
"""
Enhanced Batch Analysis - Focus on failures from batch logs + user price corrections
"""

import re
import sys
import os
from pathlib import Path
from datetime import datetime, timedelta

# Add the parent directory to the path so we can import from services
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.database import DatabaseService

async def get_batch_id_from_log(log_path: str):
    """Extract batch ID from log file."""
    try:
        with open(log_path, 'r') as f:
            content = f.read()
        
        # Look for batch ID in log
        batch_match = re.search(r'batch[_\s]+([a-f0-9-]{36})', content, re.IGNORECASE)
        if batch_match:
            return batch_match.group(1)
        
        # Fallback: try to find it in different format
        batch_match = re.search(r'Added result for machine.*to batch ([a-f0-9-]{36})', content)
        if batch_match:
            return batch_match.group(1)
            
        return None
    except Exception as e:
        print(f"Error extracting batch ID: {e}")
        return None

async def get_price_corrections(batch_id: str = None):
    """Get price corrections from database for analysis."""
    try:
        db_service = DatabaseService()
        
        if batch_id:
            corrections = await db_service.get_price_corrections_by_batch(batch_id)
        else:
            # Get corrections from last 24 hours if no batch_id
            cutoff = datetime.utcnow() - timedelta(hours=24)
            response = db_service.supabase.table("price_corrections") \
                .select("*") \
                .gte("corrected_at", cutoff.isoformat()) \
                .order("corrected_at", desc=True) \
                .execute()
            corrections = response.data or []
        
        return corrections
    except Exception as e:
        print(f"Error fetching price corrections: {e}")
        return []

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

def analyze_price_corrections(corrections):
    """Analyze price corrections for patterns."""
    if not corrections:
        return {}
    
    analysis = {
        "total_corrections": len(corrections),
        "extraction_methods": {},
        "price_patterns": [],
        "common_issues": []
    }
    
    for correction in corrections:
        # Count extraction methods with errors
        method = correction.get("extraction_method", "Unknown")
        if method not in analysis["extraction_methods"]:
            analysis["extraction_methods"][method] = 0
        analysis["extraction_methods"][method] += 1
        
        # Analyze price differences
        extracted = correction.get("extracted_price")
        correct = correction.get("correct_price")
        if extracted and correct:
            ratio = extracted / correct if correct > 0 else 0
            analysis["price_patterns"].append({
                "extracted": extracted,
                "correct": correct,
                "ratio": ratio,
                "url": correction.get("url", ""),
                "method": method
            })
    
    return analysis

def print_analysis(failures, corrections_analysis=None, batch_id=None):
    """Print enhanced analysis results."""
    
    total_failures = (len(failures["http_errors"]) + 
                     len(failures["validation_failures"]) + 
                     len(failures["extraction_failures"]) + 
                     len(failures["machine_errors"]))
    
    corrections_count = corrections_analysis.get("total_corrections", 0) if corrections_analysis else 0
    
    print(f"=== ENHANCED BATCH ANALYSIS ===")
    print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    if batch_id:
        print(f"Batch ID: {batch_id}")
    print(f"Total failure indicators: {total_failures}")
    if corrections_count > 0:
        print(f"User price corrections: {corrections_count}")
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
    
    # Print user corrections analysis
    if corrections_analysis and corrections_count > 0:
        print(f"🔧 USER PRICE CORRECTIONS ({corrections_count}):")
        
        # Show method breakdown
        methods = corrections_analysis["extraction_methods"]
        print(f"  Methods with errors:")
        for method, count in sorted(methods.items(), key=lambda x: x[1], reverse=True):
            print(f"    - {method}: {count} corrections")
        print()
        
        # Show price pattern analysis
        patterns = corrections_analysis["price_patterns"]
        if patterns:
            print(f"  Common price extraction issues:")
            # Group by ratio patterns
            high_extractions = [p for p in patterns if p["ratio"] > 2]  # Extracted much higher
            low_extractions = [p for p in patterns if p["ratio"] < 0.5]  # Extracted much lower
            
            if high_extractions:
                print(f"    - {len(high_extractions)} cases: System extracted price much higher than actual")
                for p in high_extractions[:3]:
                    print(f"      • ${p['extracted']:.2f} → ${p['correct']:.2f} ({p['method']})")
            
            if low_extractions:
                print(f"    - {len(low_extractions)} cases: System extracted price much lower than actual")
                for p in low_extractions[:3]:
                    print(f"      • ${p['extracted']:.2f} → ${p['correct']:.2f} ({p['method']})")
        print()
    
    # Enhanced Recommendations
    print("=== RECOMMENDATIONS ===")
    
    if failures["http_errors"] or failures["machine_errors"]:
        print("🔗 URL Issues: Check for dead links, redirects, or changed URLs")
        
    if failures["validation_failures"]:
        print("⚖️ Validation: Review validation thresholds - some prices may be legitimate")
        
    if failures["extraction_failures"]:
        print("🤖 Extraction: Use MCP browser tools to investigate these sites")
    
    if corrections_analysis and corrections_count > 0:
        methods = corrections_analysis["extraction_methods"]
        if methods:
            top_method = max(methods.items(), key=lambda x: x[1])
            print(f"🎯 Priority Investigation: {top_method[0]} method has {top_method[1]} corrections")
            
        patterns = corrections_analysis["price_patterns"]
        if patterns:
            high_extractions = [p for p in patterns if p["ratio"] > 2]
            if high_extractions:
                print("💰 Common Issue: System extracting shipping/total costs instead of base price")
        
    # Generate MCP investigation for most problematic URLs
    problem_urls = failures["machine_errors"] + failures["http_errors"]
    if corrections_analysis:
        # Add URLs from corrections
        correction_urls = [p["url"] for p in corrections_analysis.get("price_patterns", []) if p["url"]]
        problem_urls.extend(correction_urls[:3])
    
    if problem_urls:
        print(f"\n=== TOP URLS FOR MCP INVESTIGATION ===")
        unique_urls = list(dict.fromkeys(problem_urls))  # Remove duplicates, preserve order
        for i, url in enumerate(unique_urls[:5], 1):
            print(f"{i}. {url}")

async def main():
    """Main async function."""
    
    if len(sys.argv) > 1:
        log_file = sys.argv[1]
    else:
        # Find most recent log (check both old and new naming patterns)
        log_dir = Path("logs")
        if log_dir.exists():
            # First try to find batch-specific logs
            batch_logs = list(log_dir.glob("batch_*.log"))
            old_logs = list(log_dir.glob("price_extractor_*.log"))
            all_logs = batch_logs + old_logs
            
            if all_logs:
                log_file = str(max(all_logs, key=lambda f: f.stat().st_mtime))
                print(f"Using most recent log: {log_file}")
            else:
                print("No log files found")
                exit(1)
        else:
            print("No logs directory found")
            exit(1)
    
    # Analyze log failures
    failures = analyze_batch_log(log_file)
    if not failures:
        print("Failed to analyze log file")
        exit(1)
    
    # Get batch ID and price corrections
    batch_id = await get_batch_id_from_log(log_file)
    corrections = await get_price_corrections(batch_id)
    corrections_analysis = analyze_price_corrections(corrections)
    
    # Print enhanced analysis
    print_analysis(failures, corrections_analysis, batch_id)

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())