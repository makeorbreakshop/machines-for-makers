#!/usr/bin/env python3
"""
Extract legitimate business and organization emails from subscriber list
Filters out personal email providers and known fake addresses
"""

import csv
from collections import defaultdict
import re

def is_personal_email_provider(domain):
    """Check if domain is a personal email provider"""
    personal_providers = [
        # Major providers
        'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co', 'yahoo.fr', 'yahoo.de',
        'hotmail.com', 'hotmail.co', 'hotmail.fr', 'outlook.com', 'live.com', 'live.co.uk',
        'live.nl', 'live.fr', 'live.de', 'live.it', 'live.ca',
        'aol.com', 'aim.com', 'icloud.com', 'me.com', 'mac.com',
        'msn.com', 'ymail.com', 'rocketmail.com',
        
        # ISPs
        'comcast.net', 'att.net', 'verizon.net', 'cox.net', 'charter.net',
        'sbcglobal.net', 'bellsouth.net', 'frontier.com', 'windstream.net',
        'earthlink.net', 'juno.com', 'netzero.net', 'optonline.net',
        'roadrunner.com', 'twc.com', 'brighthouse.com', 'rcn.com',
        'mediacom.net', 'suddenlink.net', 'cableone.net', 'optimum.net',
        
        # International ISPs
        'btinternet.com', 'virginmedia.com', 'sky.com', 'talktalk.net',
        'plusnet.com', 'orange.fr', 'free.fr', 'sfr.fr', 'wanadoo.fr',
        'laposte.net', 't-online.de', 'arcor.de', 'freenet.de', 'web.de',
        'gmx.de', 'gmx.net', 'gmx.at', 'gmx.com', 'gmx.fr',
        'rogers.com', 'shaw.ca', 'telus.net', 'sympatico.ca', 'videotron.ca',
        'bell.net', 'sasktel.net', 'mts.net',
        'bigpond.com', 'optusnet.com.au', 'telstra.com', 'iinet.net.au',
        'tpg.com.au', 'internode.on.net', 'adam.com.au',
        'xtra.co.nz', 'spark.co.nz', 'vodafone.co.nz', 'slingshot.co.nz',
        'ziggo.nl', 'kpnmail.nl', 'home.nl', 'hetnet.nl', 'chello.nl',
        'telenet.be', 'proximus.be', 'skynet.be',
        'bluewin.ch', 'sunrise.ch', 'hispeed.ch',
        'seznam.cz', 'centrum.cz', 'volny.cz', 'email.cz',
        'wp.pl', 'o2.pl', 'interia.pl', 'onet.pl', 'gazeta.pl', 'op.pl',
        'abv.bg', 'mail.bg', 'dir.bg',
        'mail.ru', 'yandex.ru', 'rambler.ru', 'list.ru',
        'qq.com', '163.com', '126.com', 'sina.com', 'sohu.com',
        'naver.com', 'daum.net', 'hanmail.net',
        
        # Privacy-focused
        'protonmail.com', 'proton.me', 'pm.me', 'tutanota.com', 'tuta.io',
        'mailbox.org', 'posteo.de', 'runbox.com', 'fastmail.com',
        'hushmail.com', 'mailfence.com', 'ctemplar.com',
        'duck.com', 'duckduckgo.com',
        
        # Temporary/Disposable
        'mailinator.com', 'guerrillamail.com', 'sharklasers.com',
        '10minutemail.com', 'tempmail.com', 'throwaway.email',
        'yopmail.com', 'trash-mail.com', 'getnada.com', 'temp-mail.org',
        'mohmal.com', 'inboxkitten.com', 'dispostable.com',
        
        # Other common personal
        'mail.com', 'email.com', 'usa.com', 'europe.com',
        'asia.com', 'africa.com', 'australia.com',
        'writeme.com', 'iname.com', 'consultant.com',
        'contractor.com', 'accountant.com', 'publicist.com',
        'rediffmail.com', 'zoho.com', 'inbox.lv', 'inbox.com',
        'pobox.com', 'mailbox.com',
        
        # Regional providers
        'libero.it', 'virgilio.it', 'alice.it', 'tin.it', 'tiscali.it',
        'sapo.pt', 'iol.pt', 'clix.pt',
        'terra.com', 'bol.com.br', 'uol.com.br', 'globo.com',
        'freemail.hu', 'citromail.hu', 'indamail.hu',
        'azet.sk', 'zoznam.sk', 'post.sk'
    ]
    
    # Check if domain matches any personal provider
    domain_lower = domain.lower()
    for provider in personal_providers:
        if provider in domain_lower or domain_lower == provider:
            return True
    
    # Check patterns
    if re.match(r'^(mail|email|post|inbox|message|contact)\d*\.', domain_lower):
        return True
    
    return False

def is_fake_email(email):
    """Check if email is known fake"""
    fake_emails = [
        'mickey@disney.com', 'mmouse@disney.com', 'donald@disney.com',
        'sjobs@apple.com', 'steve@apple.com', 'timcook@apple.com',
        'billgates@microsoft.com', 'bill@microsoft.com',
        'elon@tesla.com', 'elonmusk@tesla.com',
        'jeff@amazon.com', 'jeffbezos@amazon.com', 'bezos@amazon.com',
        'mark@facebook.com', 'zuck@facebook.com', 'markzuckerberg@facebook.com',
        'larry@google.com', 'sergey@google.com', 'sundar@google.com',
        'gg@gm.com', 'test@test.com', 'admin@admin.com'
    ]
    return email.lower() in fake_emails

def categorize_domain(domain, email):
    """Categorize business domain by type"""
    domain_lower = domain.lower()
    
    # Government/Military
    if domain.endswith('.gov') or domain.endswith('.mil'):
        return 'government'
    
    # Education
    if domain.endswith('.edu') or '.edu.' in domain or 'school' in domain_lower:
        return 'education'
    
    # Non-profit
    if domain.endswith('.org'):
        # Check if it's actually a maker/tech organization
        if any(word in domain_lower for word in ['maker', 'fab', 'hackerspace', 'techshop']):
            return 'makerspace'
        return 'nonprofit'
    
    # Laser/CNC/3D Industry
    industry_keywords = [
        'laser', 'cnc', '3d', 'print', 'maker', 'tool', 'machine',
        'epilog', 'trotec', 'glowforge', 'thunder', 'omtech', 'xtool',
        'makeblock', 'snapmaker', 'prusa', 'bambu', 'creality',
        'shapeoko', 'carbide', 'inventables', 'ponoko', 'lightburn'
    ]
    if any(keyword in domain_lower for keyword in industry_keywords):
        return 'industry'
    
    # Tech companies
    tech_domains = [
        'apple.com', 'google.com', 'microsoft.com', 'amazon.com', 'meta.com',
        'facebook.com', 'tesla.com', 'nvidia.com', 'intel.com', 'amd.com',
        'adobe.com', 'autodesk.com', 'salesforce.com', 'oracle.com', 'ibm.com',
        'cisco.com', 'dell.com', 'hp.com', 'lenovo.com', 'samsung.com', 'sony.com'
    ]
    if domain in tech_domains:
        return 'tech_giant'
    
    # Tech startups (modern TLDs)
    if domain.endswith(('.io', '.ai', '.app', '.dev', '.tech', '.digital')):
        return 'tech_startup'
    
    # Design/Creative
    if any(word in domain_lower for word in ['design', 'studio', 'creative', 'agency', 'media']):
        return 'creative'
    
    # Manufacturing/Engineering
    if any(word in domain_lower for word in ['manufacturing', 'engineering', 'industrial', 'automation']):
        return 'manufacturing'
    
    # Retail/Commerce
    if any(word in domain_lower for word in ['shop', 'store', 'supply', 'retail', 'wholesale']):
        return 'retail'
    
    # Default to general business
    return 'business'

def extract_business_emails(csv_path):
    """Extract and categorize all business emails"""
    
    categories = defaultdict(list)
    domain_counts = defaultdict(int)
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            email = row.get('email', '').strip()
            if not email or '@' not in email:
                continue
            
            # Skip fake emails
            if is_fake_email(email):
                continue
            
            domain = email.split('@')[1].lower()
            
            # Skip personal email providers
            if is_personal_email_provider(domain):
                continue
            
            # Categorize the domain
            category = categorize_domain(domain, email)
            
            # Store the email data
            email_data = {
                'email': email,
                'name': row.get('first_name', ''),
                'domain': domain,
                'created': row.get('created_at', ''),
                'status': row.get('status', ''),
                'city': row.get('city', ''),
                'state': row.get('state', ''),
                'country': row.get('country', '')
            }
            
            categories[category].append(email_data)
            domain_counts[domain] += 1
    
    return categories, domain_counts

def save_results(categories, domain_counts):
    """Save results to CSV and text files"""
    
    # Save categorized emails to CSV
    output_csv = '/Users/brandoncullum/machines-for-makers/business_emails_categorized.csv'
    with open(output_csv, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['Category', 'Email', 'Name', 'Domain', 'Created', 'Location'])
        
        for category, emails in sorted(categories.items()):
            for email_data in sorted(emails, key=lambda x: x['domain']):
                location = f"{email_data['city']}, {email_data['state']}, {email_data['country']}".strip(', ')
                writer.writerow([
                    category,
                    email_data['email'],
                    email_data['name'],
                    email_data['domain'],
                    email_data['created'],
                    location
                ])
    
    # Save summary report
    output_txt = '/Users/brandoncullum/machines-for-makers/business_emails_summary.txt'
    with open(output_txt, 'w', encoding='utf-8') as f:
        f.write("BUSINESS EMAIL EXTRACTION SUMMARY\n")
        f.write("=" * 50 + "\n\n")
        
        total_business_emails = sum(len(emails) for emails in categories.values())
        f.write(f"Total Business Emails Found: {total_business_emails}\n")
        f.write(f"Unique Business Domains: {len(domain_counts)}\n\n")
        
        f.write("BREAKDOWN BY CATEGORY:\n")
        f.write("-" * 30 + "\n")
        for category in sorted(categories.keys()):
            f.write(f"{category.replace('_', ' ').title()}: {len(categories[category])}\n")
        
        f.write("\n" + "=" * 50 + "\n")
        f.write("TOP COMPANIES (Multiple Employees):\n")
        f.write("-" * 30 + "\n")
        
        # Find companies with multiple employees
        multi_employee_companies = [(domain, count) for domain, count in domain_counts.items() if count >= 2]
        for domain, count in sorted(multi_employee_companies, key=lambda x: x[1], reverse=True)[:30]:
            # Find category for this domain
            domain_category = None
            for cat, emails in categories.items():
                if any(e['domain'] == domain for e in emails):
                    domain_category = cat
                    break
            f.write(f"{domain}: {count} employees ({domain_category})\n")
        
        f.write("\n" + "=" * 50 + "\n")
        f.write("HIGH-VALUE CONTACTS BY CATEGORY:\n")
        f.write("-" * 30 + "\n\n")
        
        # List key contacts by category
        priority_categories = ['tech_giant', 'government', 'industry', 'education', 'makerspace']
        for category in priority_categories:
            if category in categories and categories[category]:
                f.write(f"\n{category.replace('_', ' ').upper()}:\n")
                # Show first 10 from each category
                for email_data in categories[category][:10]:
                    name = f" - {email_data['name']}" if email_data['name'] else ""
                    f.write(f"  • {email_data['email']}{name}\n")
    
    return output_csv, output_txt

if __name__ == "__main__":
    csv_path = '/Users/brandoncullum/machines-for-makers/.claude/context/2025-08-20-5452736.csv'
    
    print("Extracting business emails from subscriber list...")
    categories, domain_counts = extract_business_emails(csv_path)
    
    print(f"\nFound {sum(len(emails) for emails in categories.values())} business emails")
    print(f"From {len(domain_counts)} unique business domains")
    
    print("\nCategory breakdown:")
    for category in sorted(categories.keys()):
        print(f"  {category}: {len(categories[category])}")
    
    csv_file, txt_file = save_results(categories, domain_counts)
    
    print(f"\nResults saved to:")
    print(f"  • CSV: {csv_file}")
    print(f"  • Summary: {txt_file}")
    
    print("\nTop 10 companies by employee count:")
    for domain, count in sorted(domain_counts.items(), key=lambda x: x[1], reverse=True)[:10]:
        print(f"  {domain}: {count} employees")