#!/usr/bin/env python3
"""
Verify legitimacy of corporate email addresses
"""

import csv
import re
from datetime import datetime

def assess_email_legitimacy(email, first_name, created_at):
    """
    Assess if a corporate email is likely legitimate
    Returns: (score, reasons)
    Score: 0-100 where higher = more likely to be real
    """
    score = 50  # Start neutral
    reasons = []
    
    if not email or '@' not in email:
        return 0, ["Invalid email format"]
    
    local_part, domain = email.split('@', 1)
    
    # Red flags (likely fake)
    fake_indicators = {
        'disney.com': ['mickey', 'mmouse', 'donald', 'goofy', 'walt'],
        'apple.com': ['steve', 'sjobs', 'jobs', 'tim', 'cook', 'wozniak'],
        'google.com': ['larry', 'sergey', 'page', 'brin', 'sundar', 'pichai'],
        'microsoft.com': ['bill', 'gates', 'satya', 'nadella'],
        'tesla.com': ['elon', 'musk'],
        'amazon.com': ['jeff', 'bezos', 'andy', 'jassy']
    }
    
    # Check for obvious fakes
    if domain in fake_indicators:
        for fake in fake_indicators[domain]:
            if fake in local_part.lower():
                score -= 40
                reasons.append(f"Suspicious: contains '{fake}' (likely impersonation)")
    
    # Generic test accounts
    if local_part.lower() in ['test', 'admin', 'info', 'contact', 'hello', 'support', 'sales']:
        score -= 20
        reasons.append("Generic account name")
    
    # Very short usernames at major corps are rare
    if domain in ['apple.com', 'google.com', 'microsoft.com', 'amazon.com']:
        if len(local_part) <= 3:
            score -= 30
            reasons.append("Unusually short username for major corp")
    
    # Single letter emails are suspicious
    if len(local_part) == 1 or len(local_part) == 2:
        score -= 25
        reasons.append("Very short email prefix")
    
    # Positive indicators
    
    # Professional format: firstname.lastname
    if '.' in local_part and len(local_part) > 6:
        score += 20
        reasons.append("Professional format (firstname.lastname)")
    
    # Has numbers (employee ID style)
    if re.search(r'\d{2,}', local_part):
        score += 10
        reasons.append("Contains employee ID pattern")
    
    # Industry-specific domains are more trustworthy
    maker_industry_domains = [
        'makeblock.com', 'thunderlaser.com', 'thunderlaserusa.com',
        'troteclaser.com', 'lightburnsoftware.com', 'omtechlaser.com',
        'epiloglaser.com', 'ponoko.com', 'snapmaker.com', 'glowforge.com'
    ]
    
    if domain in maker_industry_domains:
        score += 30
        reasons.append("Industry-specific domain (more likely legitimate)")
    
    # Educational domains are typically real
    if domain.endswith('.edu'):
        score += 40
        reasons.append("Educational institution (.edu)")
    
    # Government domains are verified
    if domain.endswith('.gov') or domain.endswith('.mil'):
        score += 45
        reasons.append("Government domain (verified)")
    
    # Check consistency with first name
    if first_name and len(first_name) > 1:
        if first_name.lower() in local_part.lower():
            score += 15
            reasons.append("Email matches provided first name")
    
    # Signup date analysis
    if created_at:
        try:
            # Very old signups (before 2020) less likely to be fake
            if '2019' in created_at or '2018' in created_at or '2017' in created_at:
                score += 10
                reasons.append("Long-time subscriber (pre-2020)")
        except:
            pass
    
    # Cap score between 0-100
    score = max(0, min(100, score))
    
    return score, reasons


def analyze_corporate_emails(csv_path):
    """Analyze all corporate emails and categorize by legitimacy"""
    
    results = {
        'highly_likely_real': [],     # Score 70+
        'possibly_real': [],          # Score 40-69
        'likely_fake': [],            # Score below 40
        'definitely_fake': []         # Obvious fakes
    }
    
    # Specific corporate domains to check
    corporate_domains = [
        'apple.com', 'google.com', 'microsoft.com', 'amazon.com', 'tesla.com',
        'nike.com', 'disney.com', 'gm.com', 'nasa.gov',
        'makeblock.com', 'thunderlaser.com', 'thunderlaserusa.com',
        'troteclaser.com', 'lightburnsoftware.com', 'omtechlaser.com',
        'epiloglaser.com', 'ponoko.com', 'snapmaker.com'
    ]
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            email = row.get('email', '').lower()
            first_name = row.get('first_name', '')
            created_at = row.get('created_at', '')
            
            # Check if it's a corporate email we care about
            if not any(domain in email for domain in corporate_domains):
                continue
            
            score, reasons = assess_email_legitimacy(email, first_name, created_at)
            
            entry = {
                'email': email,
                'name': first_name,
                'score': score,
                'reasons': reasons,
                'created': created_at
            }
            
            # Categorize based on score
            if score >= 70:
                results['highly_likely_real'].append(entry)
            elif score >= 40:
                results['possibly_real'].append(entry)
            elif email in ['mickey@disney.com', 'mmouse@disney.com', 'sjobs@apple.com']:
                results['definitely_fake'].append(entry)
            else:
                results['likely_fake'].append(entry)
    
    return results


if __name__ == "__main__":
    csv_path = '/Users/brandoncullum/machines-for-makers/.claude/context/2025-08-20-5452736.csv'
    
    print("Analyzing corporate email legitimacy...")
    results = analyze_corporate_emails(csv_path)
    
    print("\n=== HIGHLY LIKELY REAL (Score 70+) ===")
    for entry in sorted(results['highly_likely_real'], key=lambda x: x['score'], reverse=True):
        print(f"✓ {entry['email']} (Score: {entry['score']})")
        for reason in entry['reasons']:
            print(f"  - {reason}")
    
    print("\n=== POSSIBLY REAL (Score 40-69) ===")
    for entry in sorted(results['possibly_real'], key=lambda x: x['score'], reverse=True):
        print(f"? {entry['email']} (Score: {entry['score']})")
        print(f"  Reasons: {', '.join(entry['reasons'][:2])}")
    
    print("\n=== LIKELY FAKE (Score <40) ===")
    for entry in results['likely_fake']:
        print(f"✗ {entry['email']} (Score: {entry['score']})")
        print(f"  Red flags: {', '.join(entry['reasons'][:2])}")
    
    print("\n=== DEFINITELY FAKE ===")
    for entry in results['definitely_fake']:
        print(f"✗✗ {entry['email']}")
    
    # Summary
    print("\n=== SUMMARY ===")
    print(f"Highly Likely Real: {len(results['highly_likely_real'])}")
    print(f"Possibly Real: {len(results['possibly_real'])}")
    print(f"Likely Fake: {len(results['likely_fake'])}")
    print(f"Definitely Fake: {len(results['definitely_fake'])}")
    
    # Recommended for social proof
    print("\n=== RECOMMENDED FOR SOCIAL PROOF ===")
    print("Use these with confidence:")
    for entry in results['highly_likely_real'][:10]:
        domain = entry['email'].split('@')[1]
        print(f"  • {domain} - {entry['email']}")