#!/usr/bin/env python3
"""
Analyze batch results following PRICE_EXTRACTOR_GUIDELINES.md methodology
"""
import json
import sys
from collections import defaultdict

def analyze_batch(batch_file):
    with open(batch_file, 'r') as f:
        data = json.load(f)
    
    if not data.get('success'):
        print("Error: Failed to load batch data")
        return
    
    batch_data = data.get('batch_data', {})
    stats = batch_data.get('stats', {})
    entries_dict = batch_data.get('entries', {})
    
    # Convert entries dict to list
    entries = list(entries_dict.values()) if isinstance(entries_dict, dict) else entries_dict
    
    print('=== BATCH ANALYSIS SUMMARY ===')
    print(f'Batch ID: {batch_data.get("batch_id", "Unknown")}')
    print(f'Total Machines: {len(entries)}')
    print()
    
    # Count different statuses
    status_counts = defaultdict(int)
    method_counts = defaultdict(int)
    failed_machines = []
    approval_needed = []
    manual_corrections = []
    successful_extractions = []
    
    for entry in entries:
        # Determine status from the entry data
        success = entry.get('success', False)
        error = entry.get('error')
        needs_review = entry.get('needs_review', False)
        
        # Determine status based on success/error fields
        if not success and error:
            status = 'FAILED'
            status_counts[status] += 1
            failed_machines.append({
                'machine_id': entry.get('machine_id'),
                'machine_name': entry.get('machine_name'),
                'error': error
            })
        elif success and needs_review:
            status = 'PENDING_REVIEW'
            status_counts[status] += 1
            approval_needed.append({
                'machine_id': entry.get('machine_id'),
                'machine_name': entry.get('machine_name'),
                'old_price': entry.get('old_price'),
                'new_price': entry.get('new_price'),
                'reason': entry.get('review_reason', '')
            })
        elif success:
            status = 'SUCCESS'
            status_counts[status] += 1
            successful_extractions.append({
                'machine_id': entry.get('machine_id'),
                'machine_name': entry.get('machine_name'),
                'price': entry.get('new_price'),
                'method': entry.get('extraction_method')
            })
        else:
            status = 'UNKNOWN'
            status_counts[status] += 1
        
        method = entry.get('extraction_method')
        if method:
            method_counts[method] += 1
    
    print('=== STATUS BREAKDOWN ===')
    for status, count in sorted(status_counts.items()):
        percentage = (count / len(entries)) * 100 if entries else 0
        print(f'{status}: {count} ({percentage:.1f}%)')
    
    print()
    print('=== EXTRACTION METHOD BREAKDOWN ===')
    for method, count in sorted(method_counts.items()):
        percentage = (count / len(entries)) * 100 if entries else 0
        print(f'{method}: {count} ({percentage:.1f}%)')
    
    print()
    print(f'=== FAILED EXTRACTIONS: {len(failed_machines)} ===')
    for fail in failed_machines[:10]:  # Show first 10
        print(f'- {fail["machine_name"]} ({fail["machine_id"][:8]}...): {fail["error"]}')
    if len(failed_machines) > 10:
        print(f'... and {len(failed_machines) - 10} more')
    
    print()
    print(f'=== PENDING APPROVALS: {len(approval_needed)} ===')
    for approval in approval_needed[:5]:  # Show first 5
        old_price = approval["old_price"] if approval["old_price"] is not None else "None"
        new_price = approval["new_price"] if approval["new_price"] is not None else "None"
        print(f'- {approval["machine_id"]}: ${old_price} -> ${new_price}')
        print(f'  Reason: {approval["reason"]}')
    if len(approval_needed) > 5:
        print(f'... and {len(approval_needed) - 5} more')
    
    print()
    print(f'=== MANUAL CORRECTIONS: {len(manual_corrections)} ===')
    for correction in manual_corrections:
        print(f'- {correction["machine_id"]}: Corrected to ${correction["corrected_price"]}')
    
    # Calculate success metrics
    total_attempted = len(entries)
    actual_failures = len(failed_machines)
    approvals = len(approval_needed)
    corrections = len(manual_corrections)
    successes = len(successful_extractions)
    
    extraction_success_rate = ((successes + approvals) / total_attempted) * 100 if total_attempted > 0 else 0
    auto_apply_rate = (successes / total_attempted) * 100 if total_attempted > 0 else 0
    
    print()
    print('=== KEY METRICS ===')
    print(f'Extraction Success Rate: {extraction_success_rate:.1f}% (extracted price successfully)')
    print(f'Auto-Apply Rate: {auto_apply_rate:.1f}% (no approval needed)')
    print(f'Approval Rate: {(approvals/total_attempted)*100:.1f}% (large price changes)')
    print(f'Failure Rate: {(actual_failures/total_attempted)*100:.1f}% (couldn\'t extract price)')
    
    # Identify patterns in failures
    print()
    print('=== FAILURE ANALYSIS ===')
    error_patterns = defaultdict(int)
    for fail in failed_machines:
        error = fail['error']
        if 'Thunder Laser' in error:
            error_patterns['Thunder Laser excluded'] += 1
        elif '404' in error or 'not found' in error.lower():
            error_patterns['404 Not Found'] += 1
        elif 'Failed to extract price' in error:
            error_patterns['Extraction failed'] += 1
        else:
            error_patterns['Other'] += 1
    
    for pattern, count in sorted(error_patterns.items(), key=lambda x: x[1], reverse=True):
        print(f'{pattern}: {count}')

if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1:
        analyze_batch(sys.argv[1])
    else:
        analyze_batch('latest_batch_results.json')