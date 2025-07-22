#!/usr/bin/env python3
"""
Quick check of ComMarker page structure to see what's happening with variant selection.
"""
import asyncio
from playwright.async_api import async_playwright
from loguru import logger

async def check_page():
    """Check ComMarker page structure."""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        url = "https://commarker.com/product/commarker-b6-jpt-mopa/"
        logger.info(f"Navigating to {url}")
        await page.goto(url, wait_until='domcontentloaded')
        await page.wait_for_timeout(3000)  # Wait for page to fully load
        
        # Check for dropdown selects
        logger.info("\n=== CHECKING FOR DROPDOWN SELECTS ===")
        selects = await page.query_selector_all('select')
        logger.info(f"Found {len(selects)} <select> elements")
        
        for i, select in enumerate(selects):
            name = await select.get_attribute('name')
            id_attr = await select.get_attribute('id')
            visible = await select.is_visible()
            logger.info(f"Select {i}: name='{name}', id='{id_attr}', visible={visible}")
            
            # Get options
            options = await select.query_selector_all('option')
            logger.info(f"  Options ({len(options)}):")
            for j, option in enumerate(options[:5]):  # Show first 5 options
                value = await option.get_attribute('value')
                text = await option.text_content()
                logger.info(f"    - value='{value}' text='{text}'")
        
        # Check for button swatches
        logger.info("\n=== CHECKING FOR BUTTON SWATCHES ===")
        swatches = await page.query_selector_all('.wd-swatch, .swatch, [data-attribute_name]')
        logger.info(f"Found {len(swatches)} swatch elements")
        
        for i, swatch in enumerate(swatches[:5]):  # Show first 5
            data_value = await swatch.get_attribute('data-value')
            text = await swatch.text_content()
            visible = await swatch.is_visible()
            logger.info(f"Swatch {i}: data-value='{data_value}', text='{text.strip() if text else ''}', visible={visible}")
        
        # Check for visible form elements
        logger.info("\n=== CHECKING VISIBLE FORM ELEMENTS ===")
        form = await page.query_selector('form.cart')
        if form:
            logger.info("Found form.cart")
            
            # Check for any visible select or input elements
            visible_selects = await form.query_selector_all('select:visible')
            logger.info(f"Visible selects in form: {len(visible_selects)}")
            
            visible_inputs = await form.query_selector_all('input[type="radio"]:visible, input[type="checkbox"]:visible')
            logger.info(f"Visible radio/checkbox inputs: {len(visible_inputs)}")
        
        # Take a screenshot for debugging
        await page.screenshot(path='commarker_debug.png')
        logger.info("\nScreenshot saved as commarker_debug.png")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(check_page())