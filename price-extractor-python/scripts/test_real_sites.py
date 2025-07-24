"""
Test discovery system with real manufacturer sites
Tests the complete flow from URL discovery to product normalization
"""
import asyncio
import sys
import os
import logging
from typing import Dict, List, Any
import json

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from crawlers.site_crawler import SiteCrawler, CrawlConfig
from scrapers.dynamic_scraper import DynamicScraper
from normalizers.machine_data_normalizer import MachineDataNormalizer
from services.database import DatabaseService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class RealSiteTester:
    """Tests discovery system with real manufacturer websites"""
    
    def __init__(self):
        self.normalizer = MachineDataNormalizer()
        self.db_service = DatabaseService()
        self.test_sites = {
            'laser-cutter': [
                {
                    'name': 'ComMarker',
                    'base_url': 'https://commarker.com',
                    'product_patterns': ['/products/*'],
                    'test_urls': [
                        'https://commarker.com/products/commarker-b4-mopa-100w',
                        'https://commarker.com/products/commarker-b6-mopa-60w'
                    ]
                },
                {
                    'name': 'xTool',
                    'base_url': 'https://www.xtool.com',
                    'product_patterns': ['/products/*'],
                    'test_urls': [
                        'https://www.xtool.com/products/xtool-s1-40w',
                        'https://www.xtool.com/products/xtool-d1-pro-20w'
                    ]
                }
            ],
            '3d-printer': [
                {
                    'name': 'Bambu Lab',
                    'base_url': 'https://bambulab.com',
                    'product_patterns': ['/en/products/*'],
                    'test_urls': [
                        'https://bambulab.com/en/x1-carbon',
                        'https://bambulab.com/en/a1-mini'
                    ]
                },
                {
                    'name': 'Prusa',
                    'base_url': 'https://www.prusa3d.com',
                    'product_patterns': ['/product/*'],
                    'test_urls': [
                        'https://www.prusa3d.com/product/original-prusa-mk4-kit-2/',
                        'https://www.prusa3d.com/product/original-prusa-xl-single-tool/'
                    ]
                }
            ],
            'cnc-machine': [
                {
                    'name': 'Shapeoko',
                    'base_url': 'https://shop.carbide3d.com',
                    'product_patterns': ['/products/*'],
                    'test_urls': [
                        'https://shop.carbide3d.com/products/shapeoko-5-pro',
                        'https://shop.carbide3d.com/products/nomad-3'
                    ]
                }
            ]
        }
    
    async def test_all_machine_types(self):
        """Test discovery for all machine types"""
        
        results = {}
        
        for machine_type, sites in self.test_sites.items():
            logger.info(f"\n🔧 Testing {machine_type.upper()} sites...")
            results[machine_type] = []
            
            for site in sites:
                logger.info(f"Testing {site['name']}...")
                site_results = await self._test_site(site, machine_type)
                results[machine_type].append({
                    'site': site['name'],
                    'results': site_results
                })
        
        return results
    
    async def _test_site(self, site_config: Dict[str, Any], machine_type: str) -> List[Dict[str, Any]]:
        """Test a specific site"""
        
        results = []
        
        for test_url in site_config['test_urls']:
            logger.info(f"  Testing URL: {test_url}")
            
            try:
                # Test product extraction
                result = await self._test_product_extraction(test_url, machine_type)
                results.append(result)
                
                # Small delay to be respectful
                await asyncio.sleep(2)
                
            except Exception as e:
                logger.error(f"  Error testing {test_url}: {e}")
                results.append({
                    'url': test_url,
                    'success': False,
                    'error': str(e)
                })
        
        return results
    
    async def _test_product_extraction(self, url: str, machine_type: str) -> Dict[str, Any]:
        """Test product data extraction from a URL"""
        
        scraper = None
        try:
            # Initialize scraper
            scraper = DynamicScraper()
            
            # Extract product data
            raw_data = await scraper.extract_full_product_data(url)
            
            if not raw_data:
                return {
                    'url': url,
                    'success': False,
                    'error': 'No data extracted'
                }
            
            # Normalize the data
            normalized_data, validation = self.normalizer.normalize(raw_data, machine_type)
            
            # Calculate success metrics
            required_fields = ['name', 'price']  # Basic required fields
            has_required = all(field in raw_data for field in required_fields)
            
            return {
                'url': url,
                'success': True,
                'raw_data': raw_data,
                'normalized_data': normalized_data,
                'validation': {
                    'is_valid': validation.is_valid,
                    'errors': validation.errors,
                    'warnings': validation.warnings
                },
                'metrics': {
                    'fields_extracted': len(raw_data),
                    'has_required_fields': has_required,
                    'validation_score': 1.0 if validation.is_valid else 0.5
                }
            }
            
        except Exception as e:
            logger.error(f"Error extracting from {url}: {e}")
            return {
                'url': url,
                'success': False,
                'error': str(e)
            }
        
        finally:
            if scraper:
                await scraper.close_browser()
    
    def _print_results(self, results: Dict[str, Any]):
        """Print test results summary"""
        
        print("\n" + "="*60)
        print("REAL SITE TESTING RESULTS")
        print("="*60)
        
        overall_stats = {
            'total_sites': 0,
            'total_urls': 0,
            'successful_extractions': 0,
            'valid_normalizations': 0
        }
        
        for machine_type, type_results in results.items():
            print(f"\n📋 {machine_type.upper()} RESULTS:")
            
            for site_result in type_results:
                site_name = site_result['site']
                site_results = site_result['results']
                
                successful = sum(1 for r in site_results if r.get('success'))
                valid = sum(1 for r in site_results if r.get('validation', {}).get('is_valid'))
                
                print(f"  🏭 {site_name}:")
                print(f"    • URLs tested: {len(site_results)}")
                print(f"    • Successful extractions: {successful}/{len(site_results)}")
                print(f"    • Valid normalizations: {valid}/{len(site_results)}")
                
                # Show individual URL results
                for result in site_results:
                    status = "✅" if result.get('success') else "❌"
                    url_short = result['url'].split('/')[-1][:30]
                    print(f"      {status} {url_short}")
                    
                    if result.get('success') and result.get('raw_data'):
                        fields = len(result['raw_data'])
                        print(f"         ({fields} fields extracted)")
                
                overall_stats['total_sites'] += 1
                overall_stats['total_urls'] += len(site_results)
                overall_stats['successful_extractions'] += successful
                overall_stats['valid_normalizations'] += valid
        
        # Overall summary
        print(f"\n📊 OVERALL SUMMARY:")
        print(f"  • Sites tested: {overall_stats['total_sites']}")
        print(f"  • URLs tested: {overall_stats['total_urls']}")
        print(f"  • Success rate: {overall_stats['successful_extractions']}/{overall_stats['total_urls']} "
              f"({100 * overall_stats['successful_extractions'] / max(1, overall_stats['total_urls']):.1f}%)")
        print(f"  • Validation rate: {overall_stats['valid_normalizations']}/{overall_stats['total_urls']} "
              f"({100 * overall_stats['valid_normalizations'] / max(1, overall_stats['total_urls']):.1f}%)")
    
    async def test_url_discovery(self, base_url: str, patterns: List[str]) -> List[str]:
        """Test URL discovery for a site"""
        
        config = CrawlConfig(
            crawl_delay=2.0,
            user_agent="Mozilla/5.0 (compatible; MachinesForMakers/1.0)",
            product_url_patterns=patterns,
            max_pages=5  # Limit for testing
        )
        
        try:
            async with SiteCrawler(base_url, config) as crawler:
                discovered_urls, stats = await crawler.discover_product_urls()
                
                logger.info(f"Discovered {len(discovered_urls)} URLs from {base_url}")
                logger.info(f"Stats: {stats}")
                
                return discovered_urls[:10]  # Return first 10 for testing
                
        except Exception as e:
            logger.error(f"Error discovering URLs from {base_url}: {e}")
            return []
    
    async def close(self):
        """Clean up resources"""
        await self.db_service.close()


async def main():
    """Main test execution"""
    
    tester = RealSiteTester()
    
    try:
        logger.info("🚀 Starting real site testing...")
        
        # Test individual product extractions
        results = await tester.test_all_machine_types()
        
        # Print results
        tester._print_results(results)
        
        logger.info("✅ Real site testing completed!")
        
    except Exception as e:
        logger.error(f"Error during testing: {e}")
        raise
    
    finally:
        await tester.close()


if __name__ == "__main__":
    asyncio.run(main())