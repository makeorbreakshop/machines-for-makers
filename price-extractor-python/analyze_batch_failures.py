#!/usr/bin/env python3
"""
Batch Failure Analysis Tool

This script analyzes batch update logs and identifies failures that need
intelligent MCP analysis to discover correct prices.

Usage:
    python analyze_batch_failures.py [log_file] [--interactive]
"""

import re
import json
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime

def analyze_log_file(log_path: str) -> List[Dict]:
    """
    Analyze a batch log file and extract failure information.
    
    Args:
        log_path: Path to the log file
        
    Returns:
        List of failure records with machine info and failure reasons
    """
    failures = []
    current_extraction = {}
    
    try:
        with open(log_path, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                line = line.strip()
                
                # Look for extraction start markers
                if "=== PRICE EXTRACTION START ===" in line:
                    current_extraction = {"line_start": line_num}
                
                # Extract machine info
                elif "Machine:" in line and current_extraction:
                    match = re.search(r'Machine: (.+?)$', line)
                    if match:
                        current_extraction["machine_name"] = match.group(1).strip()
                
                # Extract URL
                elif "URL:" in line and current_extraction:
                    match = re.search(r'URL: (.+?)$', line)
                    if match:
                        current_extraction["url"] = match.group(1).strip()
                
                # Extract old price
                elif "Old Price:" in line and current_extraction:
                    match = re.search(r'Old Price: \$?(.+?)$', line)
                    if match:
                        current_extraction["old_price"] = match.group(1).strip()
                
                # Extract page title
                elif "Page Title:" in line and current_extraction:
                    match = re.search(r'Page Title: (.+?)$', line)
                    if match:
                        current_extraction["page_title"] = match.group(1).strip()
                
                # Extract error indicators
                elif "Error indicators found:" in line and current_extraction:
                    match = re.search(r"Error indicators found: (.+?)$", line)
                    if match:
                        current_extraction["error_indicators"] = match.group(1).strip()
                
                # Extract bot detection
                elif "Bot detection indicators:" in line and current_extraction:
                    match = re.search(r"Bot detection indicators: (.+?)$", line)
                    if match:
                        current_extraction["bot_indicators"] = match.group(1).strip()
                
                # Track method attempts and failures
                elif "METHOD" in line and ("FAILED" in line or "ERROR" in line):
                    if "failed_methods" not in current_extraction:
                        current_extraction["failed_methods"] = []
                    
                    # Extract method info
                    method_match = re.search(r'METHOD (\d+).*?:\s*(.+)', line)
                    if method_match:
                        method_num = method_match.group(1)
                        method_desc = method_match.group(2)
                        current_extraction["failed_methods"].append({
                            "method": f"Method {method_num}",
                            "description": method_desc,
                            "line": line_num
                        })
                
                # Look for extraction failure markers - if all methods failed
                elif ("❌ METHOD 4 FAILED:" in line or "❌ METHOD 5 FAILED:" in line or "❌ METHOD 6 FAILED:" in line) and current_extraction:
                    # Check if this was the last method tried (indicating complete failure)
                    current_extraction["line_end"] = line_num
                    current_extraction["status"] = "FAILED"
                    
                    # Add timestamp from log line if available
                    timestamp_match = re.search(r'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})', line)
                    if timestamp_match:
                        current_extraction["timestamp"] = timestamp_match.group(1)
                    
                    # Mark as potential failure (will confirm if no success follows)
                    current_extraction["potential_failure"] = True
                
                # Look for extraction success markers (to reset state)
                elif "=== PRICE EXTRACTION COMPLETE ===" in line and current_extraction:
                    current_extraction = {}  # Reset for successful extractions
                
                # Handle potential failures at end of file
                elif ("Machine:" in line or "=== PRICE EXTRACTION START ===" in line) and current_extraction.get("potential_failure"):
                    # Previous extraction was a failure
                    failures.append(current_extraction.copy())
                    current_extraction = {"line_start": line_num}
    
    except FileNotFoundError:
        print(f"❌ Log file not found: {log_path}")
        return []
    except Exception as e:
        print(f"❌ Error reading log file: {str(e)}")
        return []
    
    # Handle final potential failure at end of file
    if current_extraction.get("potential_failure"):
        failures.append(current_extraction)
    
    return failures

def categorize_failures(failures: List[Dict]) -> Dict[str, List[Dict]]:
    """Categorize failures by type for easier analysis."""
    
    categories = {
        "bot_detection": [],
        "page_errors": [],
        "variant_selection": [],
        "price_not_found": [],
        "validation_failed": [],
        "unknown": []
    }
    
    for failure in failures:
        categorized = False
        
        # Check for bot detection
        if failure.get("bot_indicators"):
            categories["bot_detection"].append(failure)
            categorized = True
        
        # Check for page errors (404, etc)
        elif failure.get("error_indicators"):
            categories["page_errors"].append(failure)
            categorized = True
        
        # Check for variant selection issues (ComMarker, etc)
        elif ("commarker" in failure.get("url", "").lower() or 
              "variant" in str(failure.get("failed_methods", [])).lower()):
            categories["variant_selection"].append(failure)
            categorized = True
        
        # Check for validation failures
        elif any("VALIDATION FAILED" in str(method) for method in failure.get("failed_methods", [])):
            categories["validation_failed"].append(failure)
            categorized = True
        
        # Check if all methods failed to find price
        elif failure.get("failed_methods") and len(failure.get("failed_methods", [])) >= 4:
            categories["price_not_found"].append(failure)
            categorized = True
        
        if not categorized:
            categories["unknown"].append(failure)
    
    return categories

def generate_analysis_report(failures: List[Dict]) -> str:
    """Generate a comprehensive analysis report."""
    
    if not failures:
        return "✅ No failures found in the log file!"
    
    categories = categorize_failures(failures)
    
    report = f"""
=== BATCH FAILURE ANALYSIS REPORT ===
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Total Failures: {len(failures)}

"""
    
    # Summary by category
    for category, items in categories.items():
        if items:
            report += f"{category.upper().replace('_', ' ')}: {len(items)} failures\n"
    
    report += "\n"
    
    # Detailed analysis for each category
    for category, items in categories.items():
        if not items:
            continue
            
        report += f"\n=== {category.upper().replace('_', ' ')} FAILURES ({len(items)}) ===\n"
        
        for i, failure in enumerate(items, 1):
            report += f"\n{i}. {failure.get('machine_name', 'Unknown Machine')}\n"
            report += f"   URL: {failure.get('url', 'N/A')}\n"
            report += f"   Old Price: ${failure.get('old_price', 'N/A')}\n"
            
            if failure.get("page_title"):
                report += f"   Page Title: {failure.get('page_title')}\n"
            
            if failure.get("error_indicators"):
                report += f"   ⚠️  Page Errors: {failure.get('error_indicators')}\n"
            
            if failure.get("bot_indicators"):
                report += f"   🤖 Bot Detection: {failure.get('bot_indicators')}\n"
            
            if failure.get("failed_methods"):
                report += f"   Failed Methods: {len(failure.get('failed_methods'))} methods tried\n"
                for method in failure.get("failed_methods", [])[:3]:  # Show first 3
                    report += f"     - {method.get('description', 'N/A')}\n"
            
            # Suggest MCP analysis for certain types
            if category in ["variant_selection", "price_not_found"]:
                report += f"   💡 Suggestion: Use MCP browser automation to investigate\n"
    
    # Recommendations
    report += f"\n=== RECOMMENDATIONS ===\n"
    
    if categories["bot_detection"]:
        report += f"🤖 Bot Detection Issues ({len(categories['bot_detection'])}): Consider rotating user agents or adding delays\n"
    
    if categories["variant_selection"]:
        report += f"🎯 Variant Selection Issues ({len(categories['variant_selection'])}): Use MCP tools to discover correct variant selection logic\n"
    
    if categories["price_not_found"]:
        report += f"🔍 Price Not Found ({len(categories['price_not_found'])}): Use MCP browser automation to investigate page structure\n"
    
    if categories["validation_failed"]:
        report += f"⚖️  Validation Failures ({len(categories['validation_failed'])}): Check if validation thresholds are too strict\n"
    
    report += f"\n=== NEXT STEPS ===\n"
    report += f"1. Review failures in each category\n"
    report += f"2. Use MCP browser tools to investigate variant selection and price location issues\n"
    report += f"3. Update site-specific extraction rules based on findings\n"
    report += f"4. Re-run failed machines after fixes\n"
    
    return report

def generate_mcp_investigation_script(failures: List[Dict]) -> str:
    """Generate a script to investigate failures using MCP tools."""
    
    # Focus on failures that could benefit from MCP investigation
    categories = categorize_failures(failures)
    investigable = categories["variant_selection"] + categories["price_not_found"]
    
    if not investigable:
        return "No failures require MCP investigation."
    
    script = '''# MCP Investigation Script
# Copy and paste these commands into Claude Code to investigate failures

'''
    
    for i, failure in enumerate(investigable[:5], 1):  # Limit to 5 investigations
        machine_name = failure.get("machine_name", "Unknown")
        url = failure.get("url", "")
        
        script += f'''
## Investigation {i}: {machine_name}
# Navigate to the page and investigate
mcp__puppeteer__puppeteer_navigate("{url}")
mcp__puppeteer__puppeteer_screenshot("investigation_{i}_initial")

# Look for price elements and variant selection
mcp__puppeteer__puppeteer_evaluate("""(() => {{
  // Find all price-like elements
  const priceElements = document.querySelectorAll('[class*="price"], [data-price], .amount, .cost');
  
  // Find all button/select elements for variants
  const variantElements = document.querySelectorAll('button, select, [data-variant]');
  
  return {{
    prices: Array.from(priceElements).map(el => ({{
      text: el.textContent.trim(),
      selector: el.tagName + (el.className ? '.' + el.className.split(' ')[0] : ''),
      visible: el.offsetParent !== null
    }})).slice(0, 10),
    variants: Array.from(variantElements).filter(el => 
      el.textContent && (el.textContent.includes('W') || el.textContent.includes('power'))
    ).map(el => ({{
      text: el.textContent.trim(),
      tag: el.tagName,
      type: el.type || 'N/A'
    }})).slice(0, 10)
  }};
}})()""")

# Take another screenshot to see current state
mcp__puppeteer__puppeteer_screenshot("investigation_{i}_analysis")

'''
    
    return script

def main():
    """Main function to run the analysis."""
    import sys
    
    # Get log file path
    if len(sys.argv) > 1:
        log_file = sys.argv[1]
    else:
        # Look for the most recent log file
        log_dir = Path("logs")
        if log_dir.exists():
            log_files = list(log_dir.glob("price_extractor_*.log"))
            if log_files:
                log_file = str(max(log_files, key=lambda f: f.stat().st_mtime))
                print(f"Using most recent log file: {log_file}")
            else:
                print("No log files found. Please specify a log file path.")
                return
        else:
            print("No logs directory found. Please specify a log file path.")
            return
    
    print(f"Analyzing log file: {log_file}")
    print("=" * 50)
    
    # Analyze failures
    failures = analyze_log_file(log_file)
    
    # Generate and display report
    report = generate_analysis_report(failures)
    print(report)
    
    # Generate MCP investigation script
    if "--interactive" in sys.argv:
        try:
            generate_script = input("\nGenerate MCP investigation script? (y/n): ").lower() == 'y'
        except EOFError:
            generate_script = False
    else:
        generate_script = False
    
    if generate_script:
        script = generate_mcp_investigation_script(failures)
        script_file = f"mcp_investigation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        
        with open(script_file, 'w') as f:
            f.write(script)
        
        print(f"\n✅ MCP investigation script saved to: {script_file}")
        print("\nCopy the commands from this file and paste them into Claude Code")
        print("to investigate the failures using MCP browser automation tools.")

if __name__ == "__main__":
    main()