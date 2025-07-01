const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function investigateURL(browser, url, productName) {
    console.log(`\n=== Investigating ${productName} ===`);
    console.log(`URL: ${url}`);
    
    const page = await browser.newPage();
    
    try {
        // Set a realistic user agent
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Set viewport
        await page.setViewport({ width: 1920, height: 1080 });
        
        // Navigate to the page
        console.log('Navigating to page...');
        await page.goto(url, { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });
        
        // Wait a bit for any dynamic content to load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Take a screenshot
        const screenshotPath = `./investigation-${productName.replace(/[^a-zA-Z0-9]/g, '-')}.png`;
        await page.screenshot({ 
            path: screenshotPath, 
            fullPage: true 
        });
        console.log(`Screenshot saved: ${screenshotPath}`);
        
        // Extract all price-related elements
        console.log('\n--- Price Elements Analysis ---');
        
        const priceData = await page.evaluate(() => {
            const results = {
                commonSelectors: [],
                dataAttributes: [],
                jsonLD: [],
                microdata: [],
                allPriceText: []
            };
            
            // Common price selectors
            const selectors = [
                '.price', '#price', '.product-price', '.offer-price', 
                '.current-price', '.sale-price', '.product__price',
                '[data-price]', '[data-product-price]', '.price-box',
                '.price__current', '.price-group', '.product-info-price',
                '.woocommerce-Price-amount', '.amount', '.regular-price',
                '.sale-price', '.price-current', '.price-now', '.current',
                '.price-sale', '.product-price-value', '.price-value'
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
                        position: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
                        attributes: Object.fromEntries(Array.from(el.attributes).map(attr => [attr.name, attr.value]))
                    });
                });
            });
            
            // Elements with data-price attributes
            const dataElements = document.querySelectorAll('[data-price], [data-product-price], [data-price-value]');
            dataElements.forEach((el, index) => {
                const rect = el.getBoundingClientRect();
                results.dataAttributes.push({
                    element: el.tagName.toLowerCase(),
                    index: index,
                    text: el.textContent?.trim(),
                    visible: rect.width > 0 && rect.height > 0,
                    attributes: Object.fromEntries(Array.from(el.attributes).map(attr => [attr.name, attr.value]))
                });
            });
            
            // JSON-LD structured data
            const jsonLDScripts = document.querySelectorAll('script[type="application/ld+json"]');
            jsonLDScripts.forEach((script, index) => {
                try {
                    const data = JSON.parse(script.textContent);
                    results.jsonLD.push({
                        index: index,
                        data: data,
                        hasPrice: JSON.stringify(data).includes('price'),
                        hasOffers: JSON.stringify(data).includes('offers')
                    });
                } catch (e) {
                    results.jsonLD.push({
                        index: index,
                        error: e.message,
                        rawContent: script.textContent?.substring(0, 200)
                    });
                }
            });
            
            // Microdata
            const microdataItems = document.querySelectorAll('[itemtype*="schema.org/Product"], [itemtype*="schema.org/Offer"]');
            microdataItems.forEach((item, index) => {
                const priceProps = item.querySelectorAll('[itemprop*="price"]');
                if (priceProps.length > 0) {
                    results.microdata.push({
                        index: index,
                        itemType: item.getAttribute('itemtype'),
                        prices: Array.from(priceProps).map(prop => ({
                            property: prop.getAttribute('itemprop'),
                            content: prop.getAttribute('content'),
                            text: prop.textContent?.trim()
                        }))
                    });
                }
            });
            
            // Find all text that looks like prices (contains $ or numbers with decimals)
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode: function(node) {
                        // Look for text that contains currency symbols or price patterns
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
                    visible: rect.width > 0 && rect.height > 0,
                    position: { x: rect.x, y: rect.y }
                });
            }
            
            return results;
        });
        
        // Log findings
        console.log(`Found ${priceData.commonSelectors.length} elements with common price selectors`);
        console.log(`Found ${priceData.dataAttributes.length} elements with data-price attributes`);
        console.log(`Found ${priceData.jsonLD.length} JSON-LD scripts`);
        console.log(`Found ${priceData.microdata.length} microdata items`);
        console.log(`Found ${priceData.allPriceText.length} text nodes that look like prices`);
        
        // Show the most relevant price elements
        console.log('\n--- Most Likely Price Elements ---');
        
        // Filter to visible elements that look like main prices
        const visiblePrices = priceData.commonSelectors
            .filter(item => item.visible && item.text)
            .sort((a, b) => {
                // Prioritize elements higher on the page and with common price classes
                const aScore = (a.position.y * -1) + (a.selector.includes('current') ? 100 : 0);
                const bScore = (b.position.y * -1) + (b.selector.includes('current') ? 100 : 0);
                return bScore - aScore;
            })
            .slice(0, 10);
        
        visiblePrices.forEach((item, index) => {
            console.log(`${index + 1}. Selector: ${item.selector}`);
            console.log(`   Text: "${item.text}"`);
            console.log(`   Position: (${Math.round(item.position.x)}, ${Math.round(item.position.y)})`);
            console.log(`   Attributes:`, Object.keys(item.attributes).length > 0 ? item.attributes : 'none');
            console.log('');
        });
        
        // Show JSON-LD data with prices
        console.log('\n--- JSON-LD Price Data ---');
        priceData.jsonLD.forEach((item, index) => {
            if (item.hasPrice || item.hasOffers) {
                console.log(`JSON-LD Script ${index + 1}:`);
                if (item.data) {
                    // Extract price-related data
                    const extractPrices = (obj, path = '') => {
                        const prices = [];
                        if (typeof obj === 'object' && obj !== null) {
                            for (const [key, value] of Object.entries(obj)) {
                                const fullPath = path ? `${path}.${key}` : key;
                                if (key.toLowerCase().includes('price') && (typeof value === 'string' || typeof value === 'number')) {
                                    prices.push({ path: fullPath, value: value });
                                } else if (key === 'offers' && Array.isArray(value)) {
                                    value.forEach((offer, i) => {
                                        prices.push(...extractPrices(offer, `${fullPath}[${i}]`));
                                    });
                                } else if (typeof value === 'object') {
                                    prices.push(...extractPrices(value, fullPath));
                                }
                            }
                        }
                        return prices;
                    };
                    
                    const prices = extractPrices(item.data);
                    prices.forEach(price => {
                        console.log(`   ${price.path}: ${price.value}`);
                    });
                } else {
                    console.log(`   Error: ${item.error}`);
                }
                console.log('');
            }
        });
        
        // Show all price-like text for comprehensive analysis
        console.log('\n--- All Price-Like Text ---');
        const uniquePriceTexts = [...new Set(priceData.allPriceText.map(item => item.text))]
            .filter(text => text.length < 50) // Avoid very long text
            .sort();
        
        uniquePriceTexts.slice(0, 20).forEach(text => {
            console.log(`"${text}"`);
        });
        
        // Save detailed results to file
        const resultsPath = `./investigation-${productName.replace(/[^a-zA-Z0-9]/g, '-')}-results.json`;
        fs.writeFileSync(resultsPath, JSON.stringify(priceData, null, 2));
        console.log(`\nDetailed results saved: ${resultsPath}`);
        
        return priceData;
        
    } catch (error) {
        console.error(`Error investigating ${productName}:`, error.message);
        return null;
    } finally {
        await page.close();
    }
}

async function main() {
    console.log('Starting price extraction investigation...');
    
    const browser = await puppeteer.launch({ 
        headless: false, // Set to true for production
        defaultViewport: null,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const urlsToInvestigate = [
            {
                name: 'Commarker-B4-50W',
                url: 'https://commarker.com/product/b4-50w-fiber-laser-engraver/?ref=snlyaljc',
                expectedPrice: 2400,
                extractedPrice: 8888
            },
            {
                name: 'Cloudray-QS-30',
                url: 'https://www.cloudraylaser.com/collections/cloudray-engraver-machine/products/qs-30-litemarker-30w-split-laser-engraver-fiber-marking-machine-with-4-3-x-4-3-7-9-x-7-9-working-area',
                expectedPrice: 2590,
                extractedPrice: 259
            }
        ];
        
        for (const item of urlsToInvestigate) {
            console.log(`\n${'='.repeat(80)}`);
            console.log(`Expected: $${item.expectedPrice}, Extracted: $${item.extractedPrice}`);
            await investigateURL(browser, item.url, item.name);
            
            // Wait between requests to be respectful
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
    } catch (error) {
        console.error('Error during investigation:', error);
    } finally {
        await browser.close();
    }
}

if (require.main === module) {
    main().catch(console.error);
}