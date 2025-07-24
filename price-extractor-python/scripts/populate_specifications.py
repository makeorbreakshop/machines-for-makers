"""
Script to populate machine_type_specifications table with discovered specifications
Analyzes existing machine data to discover common specifications for each machine type
"""
import asyncio
import sys
import os
import json
import logging
from typing import Dict, Any, List

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from discovery.specification_discovery import SpecificationDiscovery
from services.database import DatabaseService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SpecificationPopulator:
    """Populates machine type specifications from existing data"""
    
    def __init__(self):
        self.db_service = DatabaseService()
        self.discovery = SpecificationDiscovery()
        
    async def analyze_and_populate_all_types(self):
        """Analyze all machine types and populate specifications"""
        
        # Get existing machines grouped by category
        machine_categories = await self._get_machine_categories()
        
        for category in machine_categories:
            logger.info(f"Processing category: {category}")
            await self._process_category(category)
    
    async def _get_machine_categories(self) -> List[str]:
        """Get all unique machine categories from database"""
        
        categories = await self.db_service.get_machine_categories()
        return categories or []
    
    async def _process_category(self, category: str):
        """Process a specific machine category"""
        
        # Get machines for this category
        machines = await self._get_machines_by_category(category)
        
        if len(machines) < 5:  # Skip categories with too few machines
            logger.info(f"Skipping {category} - only {len(machines)} machines")
            return
        
        # Convert machines to format expected by SpecificationDiscovery
        machine_data = []
        for machine in machines:
            # Convert database format to discovery format
            raw_data = {}
            normalized_data = {}
            
            # Extract all non-null fields
            for field, value in machine.items():
                if value is not None and value != '':
                    if field in ['id', 'created_at', 'updated_at']:
                        continue
                    
                    # Store both as raw and normalized
                    raw_data[field] = value
                    normalized_data[field] = value
            
            machine_data.append({
                'raw_data': raw_data,
                'normalized_data': normalized_data
            })
        
        # Discover patterns
        logger.info(f"Analyzing {len(machine_data)} machines for {category}")
        patterns = self.discovery.analyze_dataset(machine_data, category)
        
        # Convert to database format
        db_specs = self.discovery.export_specifications_for_database(category)
        
        # Clear existing specifications for this type
        await self._clear_existing_specifications(category)
        
        # Insert new specifications
        await self._insert_specifications(db_specs)
        
        logger.info(f"Inserted {len(db_specs)} specifications for {category}")
        
        # Print summary
        self._print_category_summary(category, patterns)
    
    async def _get_machines_by_category(self, category: str) -> List[Dict[str, Any]]:
        """Get all machines for a specific category"""
        
        return await self.db_service.get_machines_by_category(category)
    
    async def _clear_existing_specifications(self, machine_type: str):
        """Clear existing specifications for a machine type"""
        
        try:
            response = self.db_service.supabase.table("machine_type_specifications") \
                .delete() \
                .eq("machine_type", machine_type) \
                .execute()
            logger.info(f"Cleared existing specifications for {machine_type}")
        except Exception as e:
            logger.error(f"Error clearing specifications for {machine_type}: {e}")
    
    async def _insert_specifications(self, specifications: List[Dict[str, Any]]):
        """Insert specifications into database"""
        
        if not specifications:
            return
        
        try:
            # Convert validation_rules to JSON strings
            for spec in specifications:
                if 'validation_rules' in spec:
                    spec['validation_rules'] = json.dumps(spec['validation_rules'])
            
            response = self.db_service.supabase.table("machine_type_specifications") \
                .insert(specifications) \
                .execute()
            
            logger.info(f"Inserted {len(specifications)} specifications")
        except Exception as e:
            logger.error(f"Error inserting specifications: {e}")
    
    def _print_category_summary(self, category: str, patterns: Dict[str, Any]):
        """Print summary of discovered patterns for a category"""
        
        print(f"\n=== {category.upper()} SPECIFICATIONS ===")
        print(f"Discovered {len(patterns)} specification patterns:")
        
        # Sort by frequency
        sorted_patterns = sorted(patterns.items(), 
                               key=lambda x: x[1].frequency, 
                               reverse=True)
        
        for field_name, pattern in sorted_patterns[:15]:  # Top 15
            units_str = f" ({', '.join(pattern.units)})" if pattern.units else ""
            print(f"  • {pattern.display_name}: {pattern.field_type}{units_str} "
                  f"[{pattern.frequency} occurrences]")
        
        if len(sorted_patterns) > 15:
            print(f"  ... and {len(sorted_patterns) - 15} more")
        
        print()
    
    async def get_specification_summary(self) -> Dict[str, Any]:
        """Get overall summary of all specifications"""
        
        try:
            response = self.db_service.supabase.table("machine_type_specifications") \
                .select("machine_type, is_required") \
                .execute()
            
            if not response.data:
                return {'by_machine_type': [], 'total_types': 0, 'total_specifications': 0}
            
            # Group by machine type
            type_counts = {}
            for spec in response.data:
                machine_type = spec['machine_type']
                if machine_type not in type_counts:
                    type_counts[machine_type] = {'spec_count': 0, 'required_count': 0}
                
                type_counts[machine_type]['spec_count'] += 1
                if spec.get('is_required'):
                    type_counts[machine_type]['required_count'] += 1
            
            # Convert to list format
            by_type = []
            for machine_type, counts in type_counts.items():
                by_type.append({
                    'machine_type': machine_type,
                    'spec_count': counts['spec_count'],
                    'required_count': counts['required_count']
                })
            
            return {
                'by_machine_type': by_type,
                'total_types': len(by_type),
                'total_specifications': sum(t['spec_count'] for t in by_type)
            }
            
        except Exception as e:
            logger.error(f"Error getting specification summary: {e}")
            return {'by_machine_type': [], 'total_types': 0, 'total_specifications': 0}


async def main():
    """Main execution function"""
    
    populator = SpecificationPopulator()
    
    try:
        logger.info("Starting specification discovery and population...")
        await populator.analyze_and_populate_all_types()
        
        # Print final summary
        summary = await populator.get_specification_summary()
        
        print("\n" + "="*50)
        print("FINAL SUMMARY")
        print("="*50)
        print(f"Total machine types processed: {summary['total_types']}")
        print(f"Total specifications discovered: {summary['total_specifications']}")
        print("\nBy machine type:")
        
        for type_info in summary['by_machine_type']:
            print(f"  • {type_info['machine_type']}: "
                  f"{type_info['spec_count']} specs "
                  f"({type_info['required_count']} required)")
        
        logger.info("Specification population completed successfully!")
        
    except Exception as e:
        logger.error(f"Error during specification population: {e}")
        raise
    
    finally:
        await populator.db_service.close()


if __name__ == "__main__":
    asyncio.run(main())