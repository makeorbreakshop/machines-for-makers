#!/usr/bin/env python3
"""
Analyze batch results following PRICE_EXTRACTOR_GUIDELINES.md methodology
"""
import json
import sys
import requests
from collections import defaultdict

def get_manual_corrections_for_batch(batch_id):
    """
    Query the database for manual corrections made to machines processed in this batch.
    """
    try:
        # Get machines processed in this batch first
        response = requests.get(f'http://localhost:8000/api/v1/batch-results/{batch_id}')
        if not response.ok:
            print(f"Warning: Could not get batch results to check for manual corrections")
            return []
        
        batch_data = response.json()
        if not batch_data.get('success'):
            return []
        
        entries = batch_data.get('batch_data', {}).get('entries', {})
        if isinstance(entries, dict):
            entries = list(entries.values())
        
        machine_ids = [entry.get('machine_id') for entry in entries if entry.get('machine_id')]
        
        if not machine_ids:
            return []
        
        # Use the existing API endpoint to get manual corrections for this batch
        corrections_response = requests.get(f'http://localhost:8000/api/v1/batch-failures-and-corrections/{batch_id}')
        if corrections_response.ok:
            corrections_data = corrections_response.json()
            manual_correction_ids = corrections_data.get('manual_corrections', [])
            
            corrections = []
            if manual_correction_ids:
                # For each machine that was manually corrected, get the details
                for machine_id in manual_correction_ids:
                    # Find the machine name from the batch entries
                    machine_name = "Unknown"
                    for entry in entries:
                        if entry.get('machine_id') == machine_id:
                            machine_name = entry.get('machine_name', 'Unknown')
                            break
                    
                    corrections.append({
                        'machine_id': machine_id,
                        'machine_name': machine_name,
                        'corrected_price': 'Unknown',  # We'd need another API call to get the exact correction
                        'date': 'Recent',
                        'reason': 'Manual correction after batch processing'
                    })
        else:
            corrections = []
        
        return corrections
        
    except Exception as e:
        print(f"Warning: Could not fetch manual corrections from database: {str(e)}")
        return []

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
    
    batch_id = batch_data.get("batch_id", "Unknown")
    
    print('=== BATCH ANALYSIS SUMMARY ===')
    print(f'Batch ID: {batch_id}')
    print(f'Total Machines: {len(entries)}')
    print()
    
    # Get manual corrections from database for this batch
    manual_corrections_from_db = get_manual_corrections_for_batch(batch_id)
    
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
    print(f'=== MANUAL CORRECTIONS: {len(manual_corrections_from_db)} ===')
    for correction in manual_corrections_from_db:
        print(f'- {correction["machine_name"]} ({correction["machine_id"][:8]}...): Corrected to ${correction["corrected_price"]}')
        print(f'  Date: {correction["date"]}')
        print(f'  Reason: {correction["reason"]}')
        print()
    
    # Show detailed extraction analysis for problematic machines
    print()
    print('=== DETAILED EXTRACTION ANALYSIS ===')
    problematic_machines = ['ComMarker', 'xTool F2']
    for machine_pattern in problematic_machines:
        print(f'\n--- {machine_pattern} Machines ---')
        for entry in entries:
            machine_name = entry.get('machine_name', '')
            if machine_pattern.lower() in machine_name.lower():
                print(f'Machine: {machine_name}')
                print(f'  Extracted Price: ${entry.get("new_price", "N/A")}')
                print(f'  Previous Price: ${entry.get("old_price", "N/A")}')
                print(f'  Method Used: {entry.get("extraction_method", "N/A")}')
                print(f'  URL: {entry.get("url", "N/A")}')
                print(f'  Success: {entry.get("success", False)}')
                if entry.get('error'):
                    print(f'  Error: {entry.get("error")}')
                print()
    
    # Calculate success metrics
    total_attempted = len(entries)
    actual_failures = len(failed_machines)
    approvals = len(approval_needed)
    corrections = len(manual_corrections_from_db)
    successes = len(successful_extractions)
    
    extraction_success_rate = ((successes + approvals) / total_attempted) * 100 if total_attempted > 0 else 0
    auto_apply_rate = (successes / total_attempted) * 100 if total_attempted > 0 else 0
    
    print()
    print('=== KEY METRICS ===')
    print(f'Extraction Success Rate: {extraction_success_rate:.1f}% (extracted price successfully)')
    print(f'Auto-Apply Rate: {auto_apply_rate:.1f}% (no approval needed)')
    print(f'Approval Rate: {(approvals/total_attempted)*100:.1f}% (large price changes)')
    print(f'Manual Correction Rate: {(corrections/total_attempted)*100:.1f}% (required manual correction)')
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