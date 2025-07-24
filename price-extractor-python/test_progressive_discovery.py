#!/usr/bin/env python3
"""
Test progressive discovery - starts cheap, escalates only if needed
"""
import asyncio
import json
from services.progressive_scraper import create_progressive_scraper
from services.openai_mapper import create_openai_mapper
from services.database import DatabaseService
from loguru import logger

async def test_progressive_discovery():
    """Test progressive discovery approach"""
    
    # Test URLs - mix of easy and difficult sites
    test_urls = [
        # xTool P2S - a real product that should exist
        "https://www.xtool.com/products/xtool-p2s-co2-laser-cutter",
        # You can add more URLs here to test
    ]
    
    scraper = create_progressive_scraper()
    mapper = create_openai_mapper()
    db = DatabaseService()
    
    total_credits_all = 0
    
    for url in test_urls:
        logger.info(f"\n{'='*60}")
        logger.info(f"Testing: {url}")
        logger.info(f"{'='*60}")
        
        try:
            # Progressive extraction
            data, credits_used = await scraper.extract_product_progressive(url)
            total_credits_all += credits_used
            
            if data:
                logger.info(f"\n✅ Extraction successful!")
                logger.info(f"Product: {data.get('name', 'Unknown')}")
                logger.info(f"Price: ${data.get('price', 'N/A')}")
                logger.info(f"Credits used: {credits_used}")
                
                # Map with OpenAI
                logger.info("\nMapping with OpenAI...")
                mapped_data, warnings = mapper.map_to_database_schema(data)
                
                if mapped_data:
                    logger.info(f"✅ Mapped {len(mapped_data)} fields")
                    
                    # Save to database
                    machine_data = {
                        'manufacturer_site_id': 'progressive-test',
                        'raw_data': data,
                        'normalized_data': mapped_data,
                        'source_url': url,
                        'status': 'pending',
                        'extraction_credits': credits_used
                    }
                    
                    result = await db.save_discovered_machine(machine_data)
                    if result:
                        logger.info(f"✅ Saved to database: {result['id']}")
                else:
                    logger.error("❌ Mapping failed")
            else:
                logger.error(f"❌ Extraction failed after using {credits_used} credits")
                
        except Exception as e:
            logger.error(f"Error processing {url}: {str(e)}")
            import traceback
            traceback.print_exc()
    
    logger.info(f"\n{'='*60}")
    logger.info(f"SUMMARY")
    logger.info(f"{'='*60}")
    logger.info(f"Total URLs processed: {len(test_urls)}")
    logger.info(f"Total credits used: {total_credits_all}")
    logger.info(f"Average credits per URL: {total_credits_all / len(test_urls):.1f}")
    logger.info(f"Estimated cost: ${total_credits_all * 0.00005:.4f}")
    
    await db.close()

if __name__ == "__main__":
    print("=" * 60)
    print("Progressive Discovery Test")
    print("=" * 60)
    print("This will test the progressive scraping approach")
    print("Starting with cheap options and escalating only if needed")
    print("=" * 60)
    
    # Run automatically
    asyncio.run(test_progressive_discovery())