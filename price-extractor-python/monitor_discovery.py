#!/usr/bin/env python3
"""
Discovery System Monitoring Dashboard

Provides comprehensive monitoring of the discovery system's performance,
data quality, and credit usage. Displays statistics, identifies issues,
and provides actionable insights.
"""
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
from collections import defaultdict
import json
from tabulate import tabulate
from loguru import logger

from services.database import DatabaseService


class DiscoveryMonitor:
    """Monitor and analyze discovery system performance"""
    
    def __init__(self):
        self.db = DatabaseService()
        
    async def get_discovery_statistics(self) -> Dict:
        """Get overall discovery statistics"""
        try:
            # Get all discovered machines with their scan logs
            response = self.db.supabase.table("discovered_machines") \
                .select("*, site_scan_logs!inner(*)") \
                .execute()
            
            machines = response.data or []
            
            # Process status breakdown
            status_counts = defaultdict(int)
            site_breakdown = defaultdict(lambda: {
                'machine_count': 0,
                'pending_count': 0,
                'approved_count': 0,
                'rejected_count': 0
            })
            unknown_machines = []
            
            for machine in machines:
                status = machine.get('status', 'unknown')
                status_counts[status] += 1
                
                # Get site info from scan log
                scan_log = machine.get('site_scan_logs', {})
                site_name = scan_log.get('scan_metadata', {}).get('site_name', 'Unknown')
                
                # Update site breakdown
                site_breakdown[site_name]['machine_count'] += 1
                if status == 'pending':
                    site_breakdown[site_name]['pending_count'] += 1
                elif status == 'approved':
                    site_breakdown[site_name]['approved_count'] += 1
                elif status == 'rejected':
                    site_breakdown[site_name]['rejected_count'] += 1
                
                # Check for unknown names
                normalized_data = machine.get('normalized_data', {})
                machine_name = normalized_data.get('name', '')
                if not machine_name or machine_name == 'Unknown':
                    unknown_machines.append({
                        'id': machine.get('id'),
                        'source_url': machine.get('source_url', ''),
                        'site_name': site_name,
                        'machine_name': machine_name,
                        'created_at': machine.get('created_at', '')
                    })
            
            # Get recent scans
            scan_response = self.db.supabase.table("site_scan_logs") \
                .select("*") \
                .eq("scan_type", "discovery") \
                .order("started_at", desc=True) \
                .limit(10) \
                .execute()
            
            recent_scans = []
            for scan in scan_response.data or []:
                # Calculate duration
                duration_seconds = None
                if scan.get('completed_at') and scan.get('started_at'):
                    try:
                        start = datetime.fromisoformat(scan['started_at'].replace('Z', '+00:00'))
                        end = datetime.fromisoformat(scan['completed_at'].replace('Z', '+00:00'))
                        duration_seconds = (end - start).total_seconds()
                    except:
                        pass
                
                recent_scans.append({
                    'id': scan.get('id'),
                    'site_name': scan.get('scan_metadata', {}).get('site_name', 'Unknown'),
                    'status': scan.get('status'),
                    'products_found': scan.get('products_found', 0),
                    'products_processed': scan.get('products_processed', 0),
                    'products_imported': scan.get('products_imported', 0),
                    'ai_cost_usd': scan.get('ai_cost_usd'),
                    'started_at': scan.get('started_at'),
                    'completed_at': scan.get('completed_at'),
                    'duration_seconds': duration_seconds
                })
            
            # Convert to lists for display
            status_results = [{'status': status, 'count': count} 
                            for status, count in sorted(status_counts.items(), 
                                                       key=lambda x: x[1], reverse=True)]
            
            site_results = [
                {
                    'site_name': site,
                    'machine_count': data['machine_count'],
                    'pending_count': data['pending_count'],
                    'approved_count': data['approved_count'],
                    'rejected_count': data['rejected_count']
                }
                for site, data in sorted(site_breakdown.items(), 
                                       key=lambda x: x[1]['machine_count'], 
                                       reverse=True)
            ]
            
            # Sort unknown machines by date
            unknown_machines.sort(key=lambda x: x['created_at'], reverse=True)
            
            return {
                'status_breakdown': status_results,
                'site_breakdown': site_results,
                'unknown_machines': unknown_machines[:20],  # Limit to 20 most recent
                'recent_scans': recent_scans
            }
            
        except Exception as e:
            logger.error(f"Error getting discovery statistics: {str(e)}")
            return {
                'status_breakdown': [],
                'site_breakdown': [],
                'unknown_machines': [],
                'recent_scans': []
            }
    
    async def get_data_quality_metrics(self) -> Dict:
        """Get data quality metrics"""
        try:
            # Get all discovered machines
            response = self.db.supabase.table("discovered_machines") \
                .select("*") \
                .execute()
            
            machines = response.data or []
            
            # Calculate metrics
            total_machines = len(machines)
            valid_names = 0
            has_price = 0
            has_image = 0
            has_errors = 0
            has_warnings = 0
            
            validation_errors = defaultdict(int)
            validation_warnings = defaultdict(int)
            price_distribution = defaultdict(int)
            
            for machine in machines:
                normalized = machine.get('normalized_data', {})
                
                # Check name
                name = normalized.get('name', '')
                if name and name != 'Unknown':
                    valid_names += 1
                
                # Check price
                try:
                    price = float(normalized.get('price', 0))
                    if price > 0:
                        has_price += 1
                        # Categorize price
                        if price < 100:
                            price_distribution['< $100'] += 1
                        elif price < 500:
                            price_distribution['$100-$500'] += 1
                        elif price < 1000:
                            price_distribution['$500-$1000'] += 1
                        elif price < 5000:
                            price_distribution['$1000-$5000'] += 1
                        elif price < 10000:
                            price_distribution['$5000-$10000'] += 1
                        else:
                            price_distribution['> $10000'] += 1
                except:
                    pass
                
                # Check image
                if normalized.get('image_url'):
                    has_image += 1
                
                # Check errors and warnings
                errors = machine.get('validation_errors', [])
                warnings = machine.get('validation_warnings', [])
                
                if errors:
                    has_errors += 1
                    for error in errors:
                        validation_errors[error] += 1
                
                if warnings:
                    has_warnings += 1
                    for warning in warnings:
                        validation_warnings[warning] += 1
            
            # Convert to sorted lists
            error_results = [{'error_type': error, 'error_count': count}
                           for error, count in sorted(validation_errors.items(),
                                                     key=lambda x: x[1], reverse=True)]
            
            warning_results = [{'warning_type': warning, 'warning_count': count}
                             for warning, count in sorted(validation_warnings.items(),
                                                        key=lambda x: x[1], reverse=True)]
            
            # Sort price distribution
            price_order = ['< $100', '$100-$500', '$500-$1000', '$1000-$5000', '$5000-$10000', '> $10000']
            price_dist = [{'price_range': range_name, 'count': price_distribution.get(range_name, 0)}
                         for range_name in price_order if range_name in price_distribution]
            
            return {
                'overall_metrics': {
                    'total_machines': total_machines,
                    'valid_names': valid_names,
                    'has_price': has_price,
                    'has_image': has_image,
                    'has_errors': has_errors,
                    'has_warnings': has_warnings
                } if total_machines > 0 else {},
                'validation_errors': error_results[:20],
                'validation_warnings': warning_results[:20],
                'price_distribution': price_dist
            }
            
        except Exception as e:
            logger.error(f"Error getting data quality metrics: {str(e)}")
            return {
                'overall_metrics': {},
                'validation_errors': [],
                'validation_warnings': [],
                'price_distribution': []
            }
    
    async def get_credit_usage(self) -> Dict:
        """Get credit usage statistics"""
        try:
            # Get all scans with AI costs
            response = self.db.supabase.table("site_scan_logs") \
                .select("*") \
                .eq("scan_type", "discovery") \
                .not_.is_("ai_cost_usd", "null") \
                .order("started_at", desc=True) \
                .execute()
            
            scans = response.data or []
            
            # Process scan credits
            scan_credits = []
            site_credits = defaultdict(lambda: {
                'scan_count': 0,
                'total_cost': 0,
                'total_products': 0,
                'costs': []
            })
            daily_credits = defaultdict(lambda: {
                'scan_count': 0,
                'daily_cost': 0,
                'products_processed': 0
            })
            
            monthly_total = 0
            total_scans = 0
            total_products = 0
            current_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            
            for scan in scans[:20]:  # Last 20 for scan_credits
                site_name = scan.get('scan_metadata', {}).get('site_name', 'Unknown')
                ai_cost = scan.get('ai_cost_usd', 0)
                products_processed = scan.get('products_processed', 0)
                
                # Calculate cost per product
                cost_per_product = ai_cost / products_processed if products_processed > 0 else 0
                
                scan_credits.append({
                    'id': scan.get('id'),
                    'site_name': site_name,
                    'ai_cost_usd': ai_cost,
                    'products_found': scan.get('products_found', 0),
                    'products_processed': products_processed,
                    'cost_per_product': cost_per_product,
                    'started_at': scan.get('started_at')
                })
            
            # Process all scans for aggregates
            for scan in scans:
                site_name = scan.get('scan_metadata', {}).get('site_name', 'Unknown')
                ai_cost = scan.get('ai_cost_usd', 0)
                products_processed = scan.get('products_processed', 0)
                started_at = scan.get('started_at')
                
                # Site credits
                site_credits[site_name]['scan_count'] += 1
                site_credits[site_name]['total_cost'] += ai_cost
                site_credits[site_name]['total_products'] += products_processed
                site_credits[site_name]['costs'].append(ai_cost)
                
                # Daily credits
                if started_at:
                    try:
                        scan_date = datetime.fromisoformat(started_at.replace('Z', '+00:00'))
                        date_key = scan_date.date().isoformat()
                        daily_credits[date_key]['scan_count'] += 1
                        daily_credits[date_key]['daily_cost'] += ai_cost
                        daily_credits[date_key]['products_processed'] += products_processed
                        
                        # Monthly total
                        if scan_date >= current_month:
                            monthly_total += ai_cost
                            total_scans += 1
                            total_products += products_processed
                    except:
                        pass
            
            # Convert site credits to list
            site_credits_list = []
            for site, data in site_credits.items():
                avg_cost_per_scan = data['total_cost'] / data['scan_count'] if data['scan_count'] > 0 else 0
                avg_cost_per_product = data['total_cost'] / data['total_products'] if data['total_products'] > 0 else 0
                
                site_credits_list.append({
                    'site_name': site,
                    'scan_count': data['scan_count'],
                    'total_cost': data['total_cost'],
                    'avg_cost_per_scan': avg_cost_per_scan,
                    'avg_cost_per_product': avg_cost_per_product,
                    'total_products': data['total_products']
                })
            
            # Sort by total cost
            site_credits_list.sort(key=lambda x: x['total_cost'], reverse=True)
            
            # Convert daily credits to list
            daily_credits_list = []
            for date_str, data in sorted(daily_credits.items(), reverse=True)[:30]:  # Last 30 days
                daily_credits_list.append({
                    'scan_date': date_str,
                    'scan_count': data['scan_count'],
                    'daily_cost': data['daily_cost'],
                    'products_processed': data['products_processed']
                })
            
            return {
                'scan_credits': scan_credits,
                'site_credits': site_credits_list,
                'daily_credits': daily_credits_list,
                'monthly_total': {
                    'monthly_total': monthly_total,
                    'total_scans': total_scans,
                    'total_products': total_products
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting credit usage: {str(e)}")
            return {
                'scan_credits': [],
                'site_credits': [],
                'daily_credits': [],
                'monthly_total': {}
            }
    
    async def get_actionable_insights(self) -> Dict:
        """Get actionable insights and recommendations"""
        insights = []
        
        try:
            # Get all the necessary data
            stats = await self.get_discovery_statistics()
            quality = await self.get_data_quality_metrics()
            credits = await self.get_credit_usage()
            
            # 1. Sites with high unknown rates
            site_unknowns = defaultdict(lambda: {'total': 0, 'unknown': 0})
            for machine in stats.get('unknown_machines', []):
                site_name = machine.get('site_name', 'Unknown')
                site_unknowns[site_name]['unknown'] += 1
            
            for site_data in stats.get('site_breakdown', []):
                site_name = site_data.get('site_name', 'Unknown')
                site_unknowns[site_name]['total'] = site_data.get('machine_count', 0)
            
            unknown_sites = []
            for site, data in site_unknowns.items():
                if data['total'] > 0 and data['unknown'] > 5:
                    percentage = (data['unknown'] / data['total']) * 100
                    unknown_sites.append({
                        'site_name': site,
                        'unknown_count': data['unknown'],
                        'unknown_percentage': round(percentage, 2)
                    })
            
            unknown_sites.sort(key=lambda x: x['unknown_count'], reverse=True)
            
            if unknown_sites:
                insights.append({
                    'type': 'data_quality',
                    'severity': 'high',
                    'title': 'Sites with High Unknown Product Rates',
                    'description': f"The following sites have many products with 'Unknown' names:",
                    'data': unknown_sites[:5],
                    'recommendation': 'Review extraction logic for these sites or manually update product names'
                })
            
            # 2. Most common validation errors
            if quality.get('validation_errors'):
                insights.append({
                    'type': 'validation',
                    'severity': 'medium',
                    'title': 'Most Common Validation Errors',
                    'description': 'These validation errors occur most frequently:',
                    'data': quality['validation_errors'][:5],
                    'recommendation': 'Update extraction logic to handle these specific cases'
                })
            
            # 3. High cost per product sites
            high_cost_sites = []
            for site in credits.get('site_credits', []):
                if site['avg_cost_per_product'] > 0.05 and site['total_products'] > 10:
                    high_cost_sites.append({
                        'site_name': site['site_name'],
                        'avg_cost_per_product': site['avg_cost_per_product'],
                        'total_products': site['total_products']
                    })
            
            if high_cost_sites:
                insights.append({
                    'type': 'cost_optimization',
                    'severity': 'medium',
                    'title': 'High Cost Per Product Sites',
                    'description': 'These sites have higher than average extraction costs:',
                    'data': high_cost_sites[:5],
                    'recommendation': 'Consider optimizing extraction for these sites or using simpler methods'
                })
            
            # 4. Data completeness issues
            if quality.get('overall_metrics'):
                metrics = quality['overall_metrics']
                total = metrics.get('total_machines', 0)
                if total > 0:
                    price_missing_pct = ((total - metrics.get('has_price', 0)) / total) * 100
                    if price_missing_pct > 20:
                        insights.append({
                            'type': 'data_quality',
                            'severity': 'medium',
                            'title': 'High Rate of Missing Prices',
                            'description': f'{price_missing_pct:.1f}% of discovered products are missing price information',
                            'data': [],
                            'recommendation': 'Review price extraction logic and ensure selectors are up to date'
                        })
            
            return {'insights': insights}
            
        except Exception as e:
            logger.error(f"Error getting actionable insights: {str(e)}")
            return {'insights': []}
    
    def format_currency(self, value: Optional[float]) -> str:
        """Format currency values"""
        if value is None:
            return '$0.00'
        return f'${value:.4f}' if value < 1 else f'${value:.2f}'
    
    def format_percentage(self, value: Optional[float]) -> str:
        """Format percentage values"""
        if value is None:
            return '0%'
        return f'{value:.1f}%'
    
    def format_duration(self, seconds: Optional[float]) -> str:
        """Format duration in seconds to human readable"""
        if seconds is None:
            return 'N/A'
        
        if seconds < 60:
            return f'{int(seconds)}s'
        elif seconds < 3600:
            return f'{int(seconds/60)}m {int(seconds%60)}s'
        else:
            hours = int(seconds / 3600)
            minutes = int((seconds % 3600) / 60)
            return f'{hours}h {minutes}m'
    
    async def display_report(self):
        """Display the complete monitoring report"""
        print("\n" + "="*80)
        print("DISCOVERY SYSTEM MONITORING DASHBOARD")
        print("="*80)
        print(f"Report generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Get all data
        discovery_stats = await self.get_discovery_statistics()
        quality_metrics = await self.get_data_quality_metrics()
        credit_usage = await self.get_credit_usage()
        insights = await self.get_actionable_insights()
        
        # 1. Discovery Statistics
        print("\n\n📊 DISCOVERY STATISTICS")
        print("-" * 40)
        
        if discovery_stats['status_breakdown']:
            print("\nMachines by Status:")
            status_table = [[row['status'] or 'Unknown', row['count']] 
                           for row in discovery_stats['status_breakdown']]
            print(tabulate(status_table, headers=['Status', 'Count'], tablefmt='grid'))
        
        if discovery_stats['site_breakdown']:
            print("\nMachines by Site:")
            site_table = [[
                row['site_name'] or 'Unknown',
                row['machine_count'],
                row['pending_count'],
                row['approved_count'],
                row['rejected_count']
            ] for row in discovery_stats['site_breakdown']]
            print(tabulate(site_table, 
                         headers=['Site', 'Total', 'Pending', 'Approved', 'Rejected'], 
                         tablefmt='grid'))
        
        if discovery_stats['recent_scans']:
            print("\nRecent Discovery Scans:")
            scan_table = []
            for scan in discovery_stats['recent_scans']:
                scan_table.append([
                    scan['site_name'] or 'Unknown',
                    scan['status'],
                    scan['products_found'],
                    scan['products_processed'],
                    scan['products_imported'],
                    self.format_currency(scan['ai_cost_usd']),
                    self.format_duration(scan['duration_seconds'])
                ])
            print(tabulate(scan_table,
                         headers=['Site', 'Status', 'Found', 'Processed', 'Imported', 'Cost', 'Duration'],
                         tablefmt='grid'))
        
        # 2. Data Quality Metrics
        print("\n\n📈 DATA QUALITY METRICS")
        print("-" * 40)
        
        if quality_metrics['overall_metrics']:
            metrics = quality_metrics['overall_metrics']
            total = metrics.get('total_machines', 0)
            
            if total > 0:
                quality_data = [
                    ['Total Machines', total],
                    ['Valid Names', f"{metrics.get('valid_names', 0)} ({self.format_percentage(metrics.get('valid_names', 0) * 100 / total)})"],
                    ['Has Price', f"{metrics.get('has_price', 0)} ({self.format_percentage(metrics.get('has_price', 0) * 100 / total)})"],
                    ['Has Image', f"{metrics.get('has_image', 0)} ({self.format_percentage(metrics.get('has_image', 0) * 100 / total)})"],
                    ['Has Errors', f"{metrics.get('has_errors', 0)} ({self.format_percentage(metrics.get('has_errors', 0) * 100 / total)})"],
                    ['Has Warnings', f"{metrics.get('has_warnings', 0)} ({self.format_percentage(metrics.get('has_warnings', 0) * 100 / total)})"]
                ]
                print(tabulate(quality_data, headers=['Metric', 'Value'], tablefmt='grid'))
        
        if quality_metrics['validation_errors']:
            print("\nTop Validation Errors:")
            error_table = [[error['error_type'], error['error_count']] 
                          for error in quality_metrics['validation_errors'][:10]]
            print(tabulate(error_table, headers=['Error Type', 'Count'], tablefmt='grid'))
        
        if quality_metrics['price_distribution']:
            print("\nPrice Distribution:")
            price_table = [[dist['price_range'], dist['count']] 
                          for dist in quality_metrics['price_distribution']]
            print(tabulate(price_table, headers=['Price Range', 'Count'], tablefmt='grid'))
        
        # 3. Credit Usage
        print("\n\n💰 CREDIT USAGE")
        print("-" * 40)
        
        if credit_usage['monthly_total']:
            monthly = credit_usage['monthly_total']
            print(f"\nThis Month: {self.format_currency(monthly.get('monthly_total', 0))} "
                  f"({monthly.get('total_scans', 0)} scans, "
                  f"{monthly.get('total_products', 0)} products)")
        
        if credit_usage['site_credits']:
            print("\nCredits by Site:")
            credit_table = []
            for site in credit_usage['site_credits'][:10]:
                credit_table.append([
                    site['site_name'] or 'Unknown',
                    site['scan_count'],
                    self.format_currency(site['total_cost']),
                    self.format_currency(site['avg_cost_per_scan']),
                    self.format_currency(site['avg_cost_per_product'])
                ])
            print(tabulate(credit_table,
                         headers=['Site', 'Scans', 'Total Cost', 'Avg/Scan', 'Avg/Product'],
                         tablefmt='grid'))
        
        # 4. Actionable Insights
        if insights['insights']:
            print("\n\n💡 ACTIONABLE INSIGHTS")
            print("-" * 40)
            
            for i, insight in enumerate(insights['insights'], 1):
                severity_icon = {
                    'high': '🔴',
                    'medium': '🟡',
                    'low': '🟢'
                }.get(insight['severity'], '⚪')
                
                print(f"\n{i}. {severity_icon} {insight['title']}")
                print(f"   {insight['description']}")
                
                if insight['data']:
                    # Format data based on insight type
                    if insight['type'] == 'data_quality' and 'unknown_percentage' in insight['data'][0]:
                        table_data = [[row['site_name'], row['unknown_count'], 
                                     f"{row['unknown_percentage']}%"] 
                                     for row in insight['data'][:5]]
                        print(tabulate(table_data, 
                                     headers=['Site', 'Unknown Count', 'Percentage'],
                                     tablefmt='simple'))
                    elif insight['type'] == 'validation':
                        table_data = [[row['error_type'], row['error_count']] 
                                     for row in insight['data']]
                        print(tabulate(table_data,
                                     headers=['Error Type', 'Count'],
                                     tablefmt='simple'))
                    elif insight['type'] == 'cost_optimization':
                        table_data = [[row['site_name'], 
                                     self.format_currency(row['avg_cost_per_product']),
                                     row['total_products']]
                                     for row in insight['data']]
                        print(tabulate(table_data,
                                     headers=['Site', 'Avg Cost/Product', 'Total Products'],
                                     tablefmt='simple'))
                
                print(f"\n   📌 Recommendation: {insight['recommendation']}")
        
        # 5. Unknown Machines Detail
        if discovery_stats['unknown_machines']:
            print("\n\n🔍 RECENT UNKNOWN MACHINES")
            print("-" * 40)
            print("These machines need manual review to update their names:")
            
            unknown_table = []
            for machine in discovery_stats['unknown_machines'][:10]:
                unknown_table.append([
                    machine['site_name'] or 'Unknown',
                    machine['source_url'][:50] + '...' if len(machine['source_url']) > 50 else machine['source_url'],
                    machine['created_at'][:10] if machine['created_at'] else 'N/A'
                ])
            print(tabulate(unknown_table,
                         headers=['Site', 'URL', 'Discovered'],
                         tablefmt='grid'))
        
        print("\n" + "="*80)
        print("END OF REPORT")
        print("="*80)


async def main():
    """Main entry point"""
    monitor = DiscoveryMonitor()
    
    try:
        await monitor.display_report()
    except Exception as e:
        logger.error(f"Error generating report: {str(e)}")
        print(f"\n❌ Error generating report: {str(e)}")
    finally:
        await monitor.db.close()


if __name__ == "__main__":
    asyncio.run(main())