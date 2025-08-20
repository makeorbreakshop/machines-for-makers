#!/usr/bin/env python3
"""
Find and classify organizations from email list
"""

import csv
from collections import defaultdict
import re

def extract_organizations(csv_path):
    """Extract potential organization emails"""
    
    # Generic email providers to skip
    generic_providers = [
        'gmail', 'yahoo', 'hotmail', 'outlook', 'aol', 'icloud',
        'protonmail', 'mail.com', 'ymail', 'msn', 'live.com',
        'comcast', 'att.net', 'verizon', 'cox.net', 'charter',
        'sbcglobal', 'bellsouth', 'frontier', 'windstream',
        'sharklasers', 'mailinator', 'yopmail', 'guerrillamail',
        'temp-mail', 'trash-mail', '10minutemail', 'simplelogin',
        'duck.com', 'pm.me', 'proton.me', 'tutanota', 'fastmail',
        'zoho', 'gmx', 'web.de', 'mail.ru', 'yandex', 'qq.com',
        'naver.com', '163.com', '126.com', 'sina.com', 'rocketmail',
        'earthlink', 'juno', 'netzero', 'aim.com', 'me.com', 'mac.com',
        'googlemail', 'hotmail.co', 'hotmail.fr', 'yahoo.co', 'yahoo.fr',
        'btinternet', 'virginmedia', 'sky.com', 'talktalk', 'plusnet',
        'orange.fr', 'free.fr', 'sfr.fr', 'wanadoo', 'laposte.net',
        't-online', 'arcor.de', 'freenet.de', 'online.de',
        'rogers.com', 'shaw.ca', 'telus.net', 'sympatico.ca', 'videotron',
        'bigpond', 'optusnet', 'telstra', 'iinet', 'tpg.com',
        'xtra.co.nz', 'spark.co.nz', 'vodafone', 'ziggo.nl', 'kpnmail'
    ]
    
    organizations = defaultdict(list)
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            email = row.get('email', '').lower().strip()
            if '@' not in email:
                continue
                
            domain = email.split('@')[1]
            
            # Skip generic providers
            if any(provider in domain for provider in generic_providers):
                continue
            
            # Skip obviously personal domains
            if re.match(r'^[a-z]+\d+\.(com|net|org)$', domain):
                continue
                
            # Store organization candidate
            organizations[domain].append({
                'email': email,
                'name': row.get('first_name', ''),
                'location': f"{row.get('city', '')}, {row.get('state', '')}, {row.get('country', '')}",
                'status': row.get('status', ''),
                'created': row.get('created_at', '')
            })
    
    return organizations

def categorize_domains(organizations):
    """Categorize domains by patterns"""
    
    categories = {
        'education': [],
        'government': [],
        'nonprofit': [],
        'design_studio': [],
        'manufacturer': [],
        'retailer': [],
        'service_provider': [],
        'tech_company': [],
        'unknown_business': []
    }
    
    for domain, employees in organizations.items():
        # Education
        if '.edu' in domain:
            categories['education'].append((domain, len(employees)))
        # Government
        elif '.gov' in domain or '.mil' in domain:
            categories['government'].append((domain, len(employees)))
        # Likely nonprofit
        elif '.org' in domain:
            categories['nonprofit'].append((domain, len(employees)))
        # Design/Creative studios
        elif any(word in domain for word in ['design', 'studio', 'creative', 'media', 'digital']):
            categories['design_studio'].append((domain, len(employees)))
        # Manufacturing/Hardware
        elif any(word in domain for word in ['laser', 'cnc', '3d', 'tool', 'machine', 'mfg', 'manufacturing']):
            categories['manufacturer'].append((domain, len(employees)))
        # Retail/Shop
        elif any(word in domain for word in ['shop', 'store', 'supply', 'retail']):
            categories['retailer'].append((domain, len(employees)))
        # Service providers
        elif any(word in domain for word in ['service', 'solutions', 'consulting', 'tech']):
            categories['service_provider'].append((domain, len(employees)))
        # Tech companies (.io, .ai, .app domains)
        elif any(domain.endswith(tld) for tld in ['.io', '.ai', '.app', '.dev']):
            categories['tech_company'].append((domain, len(employees)))
        # Everything else that looks like a business
        else:
            categories['unknown_business'].append((domain, len(employees)))
    
    # Sort each category by employee count
    for cat in categories:
        categories[cat].sort(key=lambda x: x[1], reverse=True)
    
    return categories

def generate_investigation_list(organizations, categories):
    """Generate prioritized list for investigation"""
    
    investigation_priority = []
    
    # Priority 1: Multiple employees (likely real companies)
    for domain, employees in organizations.items():
        if len(employees) >= 2:
            investigation_priority.append({
                'priority': 1,
                'domain': domain,
                'employee_count': len(employees),
                'sample_emails': [e['email'] for e in employees[:3]],
                'reason': 'Multiple employees - likely legitimate organization'
            })
    
    # Priority 2: Single employee but interesting domain
    interesting_keywords = [
        'laser', 'cnc', '3d', 'maker', 'fab', 'tool', 'machine',
        'design', 'studio', 'workshop', 'craft', 'wood', 'metal',
        'robotics', 'automation', 'engineering', 'prototype'
    ]
    
    for domain, employees in organizations.items():
        if len(employees) == 1:
            if any(kw in domain.lower() for kw in interesting_keywords):
                investigation_priority.append({
                    'priority': 2,
                    'domain': domain,
                    'employee_count': 1,
                    'sample_emails': [employees[0]['email']],
                    'reason': 'Industry-relevant domain name'
                })
    
    # Sort by priority then employee count
    investigation_priority.sort(key=lambda x: (x['priority'], -x['employee_count']))
    
    return investigation_priority

if __name__ == "__main__":
    csv_path = '/Users/brandoncullum/machines-for-makers/.claude/context/2025-08-20-5452736.csv'
    
    print("Extracting organizations from email list...")
    organizations = extract_organizations(csv_path)
    
    print(f"\nFound {len(organizations)} unique domains after filtering")
    
    # Categorize domains
    categories = categorize_domains(organizations)
    
    print("\n=== DOMAIN CATEGORIES ===")
    for category, domains in categories.items():
        if domains:
            print(f"\n{category.upper()} ({len(domains)} domains)")
            for domain, count in domains[:10]:  # Show top 10
                print(f"  {domain}: {count} employee(s)")
    
    # Generate investigation list
    investigation_list = generate_investigation_list(organizations, categories)
    
    print("\n=== TOP ORGANIZATIONS TO INVESTIGATE ===")
    print("(These need web research to verify)\n")
    
    for item in investigation_list[:30]:
        print(f"Priority {item['priority']}: {item['domain']}")
        print(f"  Employees: {item['employee_count']}")
        print(f"  Emails: {', '.join(item['sample_emails'][:2])}")
        print(f"  Reason: {item['reason']}")
        print()
    
    # Save for further processing
    import json
    with open('/Users/brandoncullum/machines-for-makers/organizations_to_investigate.json', 'w') as f:
        json.dump({
            'total_domains': len(organizations),
            'categories': {k: v[:20] for k, v in categories.items()},  # Top 20 each
            'investigation_priority': investigation_list[:50]  # Top 50 to investigate
        }, f, indent=2)
    
    print(f"\nSaved detailed results to organizations_to_investigate.json")
    print(f"\nNext step: Use Claude to research top domains and classify them")