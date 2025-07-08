#!/usr/bin/env python3
"""
Analyze the CSS structure of Thunder Laser Chinese site to improve selectors.
"""

import asyncio
from bs4 import BeautifulSoup
from loguru import logger
from scrapers.web_scraper import WebScraper

async def analyze_thunder_css_structure():
    """Analyze the CSS structure to improve price selectors."""
    logger.info("🔍 Analyzing Thunder Laser Chinese site CSS structure...")
    
    scraper = WebScraper()
    
    test_urls = [
        "https://www.thunderlaser.cn/laser-cutter/",
        "https://www.thunderlaser.cn/aurora/"
    ]
    
    for url in test_urls:
        logger.info(f"Analyzing: {url}")
        
        html_content, soup = await scraper.get_page_content(url)
        if not html_content or not soup:
            logger.error(f"Failed to fetch {url}")
            continue
        
        logger.success(f"✅ Fetched content from {url}")
        
        # Find all elements that contain Yuan symbol or price-like numbers
        yuan_elements = soup.find_all(text=lambda text: text and '¥' in str(text))
        logger.info(f"Found {len(yuan_elements)} elements with ¥ symbol")
        
        price_elements = []
        for element in yuan_elements[:20]:  # Check first 20
            parent = element.parent
            if parent:
                # Get the element's classes and tag
                classes = parent.get('class', [])
                tag = parent.name
                text = element.strip()
                
                # Look for parent containers
                grandparent = parent.parent
                gp_classes = grandparent.get('class', []) if grandparent else []
                gp_tag = grandparent.name if grandparent else None
                
                price_elements.append({
                    'text': text,
                    'tag': tag,
                    'classes': classes,
                    'parent_tag': gp_tag,
                    'parent_classes': gp_classes
                })
        
        logger.info("🎯 Price element analysis:")
        for i, elem in enumerate(price_elements[:10]):
            logger.info(f"  {i+1}. Text: '{elem['text']}'")
            logger.info(f"     Tag: {elem['tag']}, Classes: {elem['classes']}")
            logger.info(f"     Parent: {elem['parent_tag']}, Classes: {elem['parent_classes']}")
            logger.info("     ───")
        
        # Look for common class patterns
        all_classes = []
        for elem in price_elements:
            all_classes.extend(elem['classes'])
            all_classes.extend(elem['parent_classes'])
        
        from collections import Counter
        class_counts = Counter(all_classes)
        logger.info("🏷️ Most common CSS classes:")
        for class_name, count in class_counts.most_common(10):
            if class_name and count > 1:
                logger.info(f"  .{class_name} (appears {count} times)")
        
        # Test potential selectors
        test_selectors = [
            '*[class*="price"]',
            '*[class*="money"]', 
            '*[class*="amount"]',
            '*[class*="cost"]',
            '.price',
            '.money',
            '.amount',
            'span:contains("¥")',
            'div:contains("¥")',
            '*:contains("¥")'
        ]
        
        logger.info("🧪 Testing potential CSS selectors:")
        for selector in test_selectors:
            try:
                if ':contains' in selector:
                    # BeautifulSoup doesn't support :contains, skip
                    continue
                    
                elements = soup.select(selector)
                if elements:
                    logger.info(f"  {selector}: {len(elements)} matches")
                    for elem in elements[:3]:
                        text = elem.get_text(strip=True)
                        if '¥' in text:
                            logger.info(f"    💰 {text}")
            except Exception as e:
                continue
        
        logger.info("─" * 80)

if __name__ == "__main__":
    asyncio.run(analyze_thunder_css_structure())