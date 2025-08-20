#!/usr/bin/env python3
"""
Email List Analysis Tool for Social Proof Extraction
Systematically analyzes subscriber list to identify valuable social proof elements
"""

import csv
import re
from collections import defaultdict, Counter
from typing import Dict, List, Set, Tuple
import json

class EmailAnalyzer:
    def __init__(self, csv_path: str):
        self.csv_path = csv_path
        self.data = []
        self.domains = defaultdict(list)
        self.company_patterns = {}
        self.results = {
            'stats': {},
            'companies': {},
            'creators': [],
            'education': [],
            'government': [],
            'industry': defaultdict(list),
            'geographic': defaultdict(int),
            'referrers': defaultdict(int)
        }
        
        # Industry keywords for categorization
        self.industry_keywords = {
            'laser_brands': [
                'glowforge', 'epilog', 'trotec', 'universal', 'boss', 'thunder', 
                'omtech', 'xtool', 'atomstack', 'ortur', 'sculpfun', 'laguna',
                'full.?spectrum', 'kern', 'rayjet', 'speedy', 'helix', 'fusion',
                'muse', 'mira', 'nova', 'beamo', 'beambox', 'flux', 'makeblock',
                'snapmaker', 'lightburn', 'rdworks', 'lasergrbl', 'ruida'
            ],
            '3d_printer_brands': [
                'prusa', 'bambu', 'creality', 'anycubic', 'elegoo', 'ender',
                'makerbot', 'ultimaker', 'formlabs', 'markforged', 'stratasys',
                'raise3d', 'flashforge', 'qidi', 'sovol', 'voron', 'klipper'
            ],
            'cnc_brands': [
                'shapeoko', 'x.?carve', 'inventables', 'carbide', 'onefinity',
                'avid', 'openbuilds', 'bantam', 'nomad', 'carvera', 'millright',
                'sainsmart', 'genmitsu', 'longmill', 'printNC', 'maslow'
            ],
            'marketplace': [
                'etsy', 'shopify', 'amazon', 'ebay', 'alibaba', 'kickstarter',
                'indiegogo', 'patreon', 'gumroad', 'printful', 'printify',
                'redbubble', 'teespring', 'society6', 'zazzle', 'ponoko',
                'shapeways', 'xometry', 'protolabs', 'pcbway'
            ],
            'tech_giants': [
                'apple', 'google', 'microsoft', 'amazon', 'meta', 'facebook',
                'tesla', 'nvidia', 'intel', 'amd', 'autodesk', 'adobe',
                'solidworks', 'siemens', 'dassault', 'ptc'
            ],
            'aerospace': [
                'nasa', 'spacex', 'boeing', 'lockheed', 'northrop', 'raytheon',
                'airbus', 'blue.?origin', 'virgin.?galactic', 'rocket.?lab'
            ],
            'maker_keywords': [
                'maker', 'craft', 'create', 'design', 'studio', 'workshop',
                'forge', 'fab', 'woodwork', 'metalwork', 'leather', 'jewelry',
                'custom', 'handmade', 'artisan', 'boutique', 'creative'
            ]
        }
        
        # Major company domains to flag
        self.notable_companies = {
            'apple.com': 'Apple',
            'google.com': 'Google',
            'microsoft.com': 'Microsoft',
            'amazon.com': 'Amazon',
            'tesla.com': 'Tesla',
            'nasa.gov': 'NASA',
            'mit.edu': 'MIT',
            'stanford.edu': 'Stanford',
            'harvard.edu': 'Harvard',
            'yale.edu': 'Yale',
            'berkeley.edu': 'UC Berkeley',
            'cornell.edu': 'Cornell'
        }
    
    def load_data(self):
        """Load CSV data"""
        with open(self.csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                self.data.append(row)
                email = row.get('email', '').lower()
                if '@' in email:
                    domain = email.split('@')[1]
                    self.domains[domain].append(row)
    
    def analyze_domains(self):
        """Categorize and analyze email domains"""
        print(f"Analyzing {len(self.data)} subscribers...")
        
        # Basic stats
        self.results['stats'] = {
            'total_subscribers': len(self.data),
            'unique_domains': len(self.domains),
            'active_subscribers': sum(1 for d in self.data if d.get('status') == 'active')
        }
        
        # Process each domain
        for domain, subscribers in self.domains.items():
            # Skip generic email providers
            if self._is_generic_email(domain):
                continue
            
            # Categorize domain
            category = self._categorize_domain(domain, subscribers)
            if category:
                self.results['industry'][category].append({
                    'domain': domain,
                    'count': len(subscribers),
                    'emails': [s['email'] for s in subscribers[:5]]  # Sample
                })
    
    def _is_generic_email(self, domain: str) -> bool:
        """Check if domain is a generic email provider"""
        generic = [
            'gmail', 'yahoo', 'hotmail', 'outlook', 'aol', 'icloud',
            'protonmail', 'mail.com', 'ymail', 'msn', 'live.com',
            'comcast', 'att.net', 'verizon', 'cox.net', 'charter',
            'sharklasers', 'mailinator', 'yopmail', 'guerrillamail',
            'temp-mail', 'trash-mail', '10minutemail', 'simplelogin'
        ]
        return any(g in domain.lower() for g in generic)
    
    def _categorize_domain(self, domain: str, subscribers: List[Dict]) -> str:
        """Categorize a domain based on patterns"""
        domain_lower = domain.lower()
        
        # Check education
        if domain.endswith('.edu') or '.edu.' in domain:
            self.results['education'].append({
                'institution': domain,
                'count': len(subscribers),
                'prestige': self._check_prestige(domain)
            })
            return 'education'
        
        # Check government
        if domain.endswith('.gov'):
            self.results['government'].append({
                'agency': domain,
                'count': len(subscribers)
            })
            return 'government'
        
        # Check against industry keywords
        for category, keywords in self.industry_keywords.items():
            for keyword in keywords:
                if re.search(keyword, domain_lower):
                    return category
                # Also check email prefixes
                for sub in subscribers:
                    email = sub.get('email', '').lower()
                    if re.search(keyword, email.split('@')[0]):
                        return category
        
        # Check if it's a business domain
        if self._looks_like_business(domain):
            return 'small_business'
        
        return None
    
    def _check_prestige(self, domain: str) -> str:
        """Check if educational institution is prestigious"""
        prestigious = [
            'mit', 'stanford', 'harvard', 'yale', 'princeton',
            'columbia', 'cornell', 'berkeley', 'caltech', 'oxford',
            'cambridge', 'imperial', 'eth', 'epfl', 'toronto'
        ]
        for p in prestigious:
            if p in domain.lower():
                return 'elite'
        return 'standard'
    
    def _looks_like_business(self, domain: str) -> bool:
        """Heuristic to determine if domain looks like a business"""
        business_tlds = ['.com', '.io', '.co', '.ai', '.app', '.net', '.org', '.biz']
        business_keywords = [
            'shop', 'store', 'studio', 'design', 'craft', 'make', 'build',
            'custom', 'wood', 'laser', 'cnc', '3d', 'print', 'fab', 'forge'
        ]
        
        has_business_tld = any(domain.endswith(tld) for tld in business_tlds)
        has_business_keyword = any(kw in domain.lower() for kw in business_keywords)
        
        return has_business_tld and (has_business_keyword or len(domain.split('.')[0]) > 4)
    
    def find_youtube_creators(self):
        """Identify potential YouTube creators"""
        youtube_referrers = [
            d for d in self.data 
            if 'youtube' in d.get('referrer', '').lower()
        ]
        
        print(f"Found {len(youtube_referrers)} YouTube referrals")
        
        # Group by potential channel patterns
        for sub in youtube_referrers:
            email = sub.get('email', '')
            name = sub.get('first_name', '')
            
            # Look for channel-like email patterns
            if any(kw in email.lower() for kw in ['channel', 'studio', 'media', 'creative', 'official']):
                self.results['creators'].append({
                    'email': email,
                    'name': name,
                    'type': 'likely_creator'
                })
            elif name and len(name) > 0:
                self.results['creators'].append({
                    'email': email,
                    'name': name,
                    'type': 'potential_creator'
                })
    
    def analyze_geography(self):
        """Analyze geographic distribution"""
        for sub in self.data:
            country = sub.get('country', 'Unknown')
            state = sub.get('state', '')
            if country:
                self.results['geographic'][country] += 1
    
    def find_high_value_accounts(self):
        """Identify particularly valuable accounts for social proof"""
        high_value = []
        
        for domain, subscribers in self.domains.items():
            # Check if it's a notable company
            if domain in self.notable_companies:
                high_value.append({
                    'company': self.notable_companies[domain],
                    'domain': domain,
                    'employees': len(subscribers),
                    'emails': [s['email'] for s in subscribers]
                })
            
            # Check for multiple employees from same company
            elif len(subscribers) >= 3 and not self._is_generic_email(domain):
                high_value.append({
                    'company': domain.split('.')[0].title(),
                    'domain': domain,
                    'employees': len(subscribers),
                    'emails': [s['email'] for s in subscribers[:5]]
                })
        
        self.results['companies']['high_value'] = sorted(
            high_value, 
            key=lambda x: x['employees'], 
            reverse=True
        )[:50]
    
    def generate_report(self):
        """Generate comprehensive analysis report"""
        self.load_data()
        self.analyze_domains()
        self.find_youtube_creators()
        self.analyze_geography()
        self.find_high_value_accounts()
        
        # Create summary
        summary = {
            'total_analyzed': self.results['stats']['total_subscribers'],
            'companies_found': sum(len(v) for v in self.results['industry'].values()),
            'education_institutions': len(self.results['education']),
            'government_agencies': len(self.results['government']),
            'youtube_creators': len(self.results['creators']),
            'countries_represented': len(self.results['geographic']),
            'high_value_companies': len(self.results['companies'].get('high_value', []))
        }
        
        return {
            'summary': summary,
            'details': self.results
        }
    
    def export_actionable_insights(self):
        """Export specific actionable social proof elements"""
        insights = {
            'taglines': [],
            'logo_wall': [],
            'testimonial_targets': [],
            'case_study_candidates': []
        }
        
        # Generate taglines based on findings
        if self.results['companies'].get('high_value'):
            top_companies = [c['company'] for c in self.results['companies']['high_value'][:10]]
            insights['taglines'].append(f"Trusted by makers at {', '.join(top_companies[:3])}")
        
        if self.results['education']:
            elite_schools = [e['institution'] for e in self.results['education'] if e['prestige'] == 'elite']
            if elite_schools:
                insights['taglines'].append(f"Used by students and faculty at {len(elite_schools)} top universities")
        
        industry_counts = {k: len(v) for k, v in self.results['industry'].items()}
        if industry_counts.get('laser_brands', 0) > 0:
            insights['taglines'].append("Recommended by professionals in the laser industry")
        
        # Identify logo wall candidates
        for company in self.results['companies'].get('high_value', [])[:20]:
            if company['employees'] >= 2:
                insights['logo_wall'].append(company['company'])
        
        # Find testimonial targets (engaged small businesses)
        for domain_data in self.results['industry'].get('small_business', []):
            if domain_data['count'] == 1:  # Likely owner
                insights['testimonial_targets'].append({
                    'email': domain_data['emails'][0],
                    'domain': domain_data['domain'],
                    'business': domain_data['domain'].split('.')[0].replace('-', ' ').title()
                })
        
        # Case study candidates (multiple employees or industry companies)
        for category in ['laser_brands', '3d_printer_brands', 'cnc_brands']:
            for company in self.results['industry'].get(category, []):
                insights['case_study_candidates'].append({
                    'category': category,
                    'domain': company['domain'],
                    'contacts': company['count']
                })
        
        return insights

if __name__ == "__main__":
    analyzer = EmailAnalyzer('/Users/brandoncullum/machines-for-makers/.claude/context/2025-08-20-5452736.csv')
    
    print("Starting comprehensive email analysis...")
    report = analyzer.generate_report()
    insights = analyzer.export_actionable_insights()
    
    # Save full report
    with open('/Users/brandoncullum/machines-for-makers/email_analysis_report.json', 'w') as f:
        json.dump(report, f, indent=2)
    
    # Save actionable insights
    with open('/Users/brandoncullum/machines-for-makers/social_proof_insights.json', 'w') as f:
        json.dump(insights, f, indent=2)
    
    # Print summary
    print("\n=== ANALYSIS COMPLETE ===")
    print(f"Total Subscribers: {report['summary']['total_analyzed']:,}")
    print(f"Companies Found: {report['summary']['companies_found']}")
    print(f"Educational Institutions: {report['summary']['education_institutions']}")
    print(f"Government Agencies: {report['summary']['government_agencies']}")
    print(f"YouTube Creators: {report['summary']['youtube_creators']}")
    print(f"Countries: {report['summary']['countries_represented']}")
    print(f"High-Value Companies: {report['summary']['high_value_companies']}")
    
    print("\n=== TOP INSIGHTS ===")
    for tagline in insights['taglines'][:5]:
        print(f"• {tagline}")
    
    print("\n=== TOP COMPANIES FOR LOGO WALL ===")
    for company in insights['logo_wall'][:10]:
        print(f"• {company}")
    
    print("\nFull reports saved to:")
    print("• email_analysis_report.json")
    print("• social_proof_insights.json")