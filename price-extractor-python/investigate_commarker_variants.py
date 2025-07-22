#!/usr/bin/env python3
"""
Investigate ComMarker B6 MOPA variant selection structure
"""
import asyncio
from playwright.async_api import async_playwright
import json
from datetime import datetime

async def investigate_commarker():
    """Investigate the current ComMarker B6 MOPA page structure"""
    url = "https://commarker.com/product/commarker-b6-jpt-mopa/"
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)  # Show browser for debugging
        page = await browser.new_page()
        
        print(f"\n{'='*80}")
        print(f"ComMarker B6 MOPA Variant Investigation - {datetime.now()}")
        print(f"{'='*80}\n")
        
        await page.goto(url, timeout=60000)
        await page.wait_for_timeout(5000)  # Simple wait instead of networkidle
        
        # 1. Find all variant selection elements
        print("1. SEARCHING FOR VARIANT SELECTORS...")
        
        # Check for dropdown selects (old method)
        selects = await page.query_selector_all('select')
        print(f"\nFound {len(selects)} <select> elements:")
        for i, select in enumerate(selects):
            name = await select.get_attribute('name') or 'unknown'
            id_attr = await select.get_attribute('id') or 'none'
            print(f"  Select {i}: name='{name}', id='{id_attr}'")
            
            # Get options
            options = await select.query_selector_all('option')
            print(f"    Options ({len(options)}):")
            for opt in options[:5]:  # First 5 options
                text = await opt.inner_text()
                value = await opt.get_attribute('value') or ''
                print(f"      - value='{value}' text='{text.strip()}'")
        
        # Check for button/swatch selectors (new method)
        print("\n2. SEARCHING FOR BUTTON/SWATCH SELECTORS...")
        
        # Various swatch selector patterns
        swatch_selectors = [
            '.wd-swatch',
            '[class*="swatch"]',
            '[data-attribute_name]',
            '.variation-selector',
            '.product-variation',
            '[class*="variation"]',
            '.tawcvs-swatches',
            '.variations td.value label',
            'input[type="radio"][name*="attribute"]'
        ]
        
        for selector in swatch_selectors:
            elements = await page.query_selector_all(selector)
            if elements:
                print(f"\nFound {len(elements)} elements matching '{selector}':")
                for i, elem in enumerate(elements[:3]):  # First 3
                    # Get all attributes
                    attrs = await elem.evaluate('''(el) => {
                        const attrs = {};
                        for (let i = 0; i < el.attributes.length; i++) {
                            const attr = el.attributes[i];
                            attrs[attr.name] = attr.value;
                        }
                        return attrs;
                    }''')
                    text = await elem.inner_text() if await elem.evaluate('el => el.tagName !== "INPUT"') else ''
                    print(f"  Element {i}: {json.dumps(attrs, indent=4)}")
                    if text:
                        print(f"    Text: '{text.strip()}'")
        
        # 3. Check current price display
        print("\n3. CURRENT PRICE DISPLAY...")
        price_selectors = [
            '.price .amount',
            '.woocommerce-Price-amount',
            '.product-price',
            '.price',
            'ins .amount',
            '.woocommerce-variation-price .amount'
        ]
        
        for selector in price_selectors:
            prices = await page.query_selector_all(selector)
            if prices:
                print(f"\nPrices found with '{selector}':")
                for i, price in enumerate(prices[:3]):
                    text = await price.inner_text()
                    print(f"  {text.strip()}")
        
        # 4. Try to interact with variants
        print("\n4. ATTEMPTING VARIANT SELECTION...")
        
        # Method 1: Try clicking B6 MOPA 60W
        clicked = False
        click_attempts = [
            # Data-value based
            '[data-value="b6-mopa-60w"]',
            '[data-value="B6 MOPA 60W"]',
            # Text based
            'text="B6 MOPA 60W"',
            'text="60W"',
            # Label based
            'label:has-text("B6 MOPA 60W")',
            'label:has-text("60W")',
            # Input based
            'input[value="b6-mopa-60w"]',
            'input[value="B6 MOPA 60W"]'
        ]
        
        for selector in click_attempts:
            try:
                elem = await page.query_selector(selector)
                if elem:
                    await elem.click()
                    clicked = True
                    print(f"✓ Successfully clicked: {selector}")
                    await page.wait_for_timeout(2000)
                    break
            except Exception as e:
                continue
        
        if not clicked:
            print("✗ Could not click any 60W variant selector")
        
        # 5. Check if price changed after selection
        print("\n5. PRICE AFTER VARIANT SELECTION...")
        await page.wait_for_timeout(3000)  # Wait for AJAX
        
        # Check variation price specifically
        var_price = await page.query_selector('.woocommerce-variation-price .amount')
        if var_price:
            price_text = await var_price.inner_text()
            print(f"Variation price: {price_text}")
        
        # Get all visible prices
        all_prices = await page.evaluate('''() => {
            const prices = [];
            document.querySelectorAll('.amount').forEach(el => {
                if (el.offsetParent !== null) {  // Is visible
                    prices.push({
                        text: el.innerText,
                        selector: el.className,
                        parent: el.parentElement.className
                    });
                }
            });
            return prices;
        }''')
        
        print("\nAll visible prices on page:")
        for price in all_prices:
            print(f"  {price['text']} (parent: {price['parent']})")
        
        # 6. Inspect the variation form structure
        print("\n6. VARIATION FORM STRUCTURE...")
        form = await page.query_selector('form.variations_form')
        if form:
            form_data = await form.evaluate('''(form) => {
                const data = {
                    action: form.action,
                    method: form.method,
                    variations: []
                };
                
                // Get variation data
                const varData = form.querySelector('[data-product_variations]');
                if (varData) {
                    try {
                        const variations = JSON.parse(varData.getAttribute('data-product_variations'));
                        data.variations = variations.map(v => ({
                            variation_id: v.variation_id,
                            attributes: v.attributes,
                            price_html: v.price_html,
                            display_price: v.display_price
                        }));
                    } catch (e) {}
                }
                
                return data;
            }''')
            
            print(f"Form variations found: {len(form_data.get('variations', []))}")
            for var in form_data.get('variations', [])[:5]:
                print(f"\n  Variation ID: {var['variation_id']}")
                print(f"  Attributes: {var['attributes']}")
                print(f"  Display Price: {var.get('display_price', 'N/A')}")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(investigate_commarker())