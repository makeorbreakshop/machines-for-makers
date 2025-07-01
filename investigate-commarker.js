const puppeteer = require('puppeteer');
const fs = require('fs');

async function investigateCommarker() {
    console.log('Starting Commarker investigation...');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: null,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    try {
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1920, height: 1080 });
        
        const url = 'https://commarker.com/product/b4-50w-fiber-laser-engraver/?ref=snlyaljc';
        
        console.log('Navigating to Commarker page...');
        await page.goto(url, { 
            waitUntil: 'domcontentloaded',
            timeout: 60000 
        });
        
        // Wait for any dynamic content
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Take screenshot
        await page.screenshot({ 
            path: './commarker-investigation.png', 
            fullPage: true 
        });
        console.log('Screenshot saved: commarker-investigation.png');
        
        // Extract price data
        const priceData = await page.evaluate(() => {
            const results = {
                jsonLD: [],
                commonSelectors: [],
                allPriceText: []
            };
            
            // JSON-LD
            const jsonLDScripts = document.querySelectorAll('script[type="application/ld+json"]');
            jsonLDScripts.forEach((script, index) => {
                try {
                    const data = JSON.parse(script.textContent);
                    results.jsonLD.push({
                        index: index,
                        data: data,
                        rawContent: script.textContent
                    });
                } catch (e) {
                    results.jsonLD.push({
                        index: index,
                        error: e.message,
                        rawContent: script.textContent?.substring(0, 500)
                    });
                }
            });
            
            // Common selectors
            const selectors = [
                '.price', '#price', '.product-price', '.offer-price', 
                '.current-price', '.sale-price', '.product__price',
                '[data-price]', '[data-product-price]', '.price-box',
                '.price__current', '.price-group', '.product-info-price',
                '.woocommerce-Price-amount', '.amount'
            ];
            
            selectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach((el, index) => {
                    const rect = el.getBoundingClientRect();
                    results.commonSelectors.push({
                        selector: selector,
                        index: index,
                        text: el.textContent?.trim(),
                        innerHTML: el.innerHTML?.trim(),
                        visible: rect.width > 0 && rect.height > 0,
                        position: { x: rect.x, y: rect.y },
                        attributes: Object.fromEntries(Array.from(el.attributes).map(attr => [attr.name, attr.value]))
                    });
                });
            });
            
            // Find all price-like text
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode: function(node) {
                        const text = node.textContent.trim();
                        if (text.match(/\$[\d,]+\.?\d*|\d+[.,]\d{2}|[\d,]+\.\d{2}|\$\d+/)) {
                            return NodeFilter.FILTER_ACCEPT;
                        }
                        return NodeFilter.FILTER_REJECT;
                    }
                }
            );
            
            let node;
            while (node = walker.nextNode()) {
                const parent = node.parentElement;
                const rect = parent.getBoundingClientRect();
                results.allPriceText.push({
                    text: node.textContent.trim(),
                    parentTag: parent.tagName.toLowerCase(),
                    parentClass: parent.className,
                    parentId: parent.id,
                    visible: rect.width > 0 && rect.height > 0
                });
            }
            
            return results;
        });
        
        console.log(`\n--- Commarker Results ---`);
        console.log(`Found ${priceData.jsonLD.length} JSON-LD scripts`);
        console.log(`Found ${priceData.commonSelectors.length} elements with common selectors`);
        console.log(`Found ${priceData.allPriceText.length} price-like text nodes`);
        
        // Show JSON-LD data
        console.log('\n--- JSON-LD Data ---');
        priceData.jsonLD.forEach((item, index) => {
            console.log(`Script ${index + 1}:`);
            if (item.data) {
                // Look for price data
                const jsonStr = JSON.stringify(item.data, null, 2);
                if (jsonStr.includes('price') || jsonStr.includes('offer')) {
                    console.log('Contains price data:');
                    console.log(jsonStr.substring(0, 1000));
                }
            } else {
                console.log(`Error: ${item.error}`);
                console.log(`Raw content: ${item.rawContent?.substring(0, 200)}...`);
            }
            console.log('');
        });
        
        // Show visible price elements
        console.log('\n--- Visible Price Elements ---');
        const visiblePrices = priceData.commonSelectors
            .filter(item => item.visible && item.text && item.text.length < 100)
            .slice(0, 10);
            
        visiblePrices.forEach((item, index) => {
            console.log(`${index + 1}. ${item.selector}: "${item.text}"`);
            if (Object.keys(item.attributes).length > 0) {
                console.log(`   Attributes:`, item.attributes);
            }
            console.log('');
        });
        
        // Show all price text
        console.log('\n--- All Price Text ---');
        const uniquePriceTexts = [...new Set(priceData.allPriceText.map(item => item.text))]
            .filter(text => text.length < 50)
            .sort();
            
        uniquePriceTexts.forEach(text => {
            console.log(`"${text}"`);
        });
        
        // Save results
        fs.writeFileSync('./commarker-results.json', JSON.stringify(priceData, null, 2));
        console.log('\nDetailed results saved: commarker-results.json');
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await page.close();
        await browser.close();
    }
}

investigateCommarker().catch(console.error);