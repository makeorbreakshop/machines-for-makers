import { NextRequest, NextResponse } from 'next/server';
import { chromium, Page } from 'playwright';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Request schema validation
const extractSchema = z.object({
  url: z.string().url(),
  actions: z.array(z.object({
    type: z.enum(['click', 'wait', 'extract']),
    selector: z.string().optional(),
    position: z.object({
      x: z.number(),
      y: z.number()
    }).optional(),
    time: z.number().optional(),
  })),
  width: z.number().optional().default(1280),
  height: z.number().optional().default(1600),
  fullPage: z.boolean().optional().default(true),
});

// Direct coordinates for hard-to-automate sites
const siteCoordinates = {
  'aeonlaser.us': {
    // These are example coordinates - they will need to be adjusted based on actual page layout
    getStarted: { x: 1100, y: 580 }, // "Get Instant Pricing" button
    checkmark: { x: 917, y: 443 },   // Checkmark/confirmation button in modal
    sizeButton: { x: 1215, y: 720 },  // "SIZE" button/next step
    powerButton: { x: 1215, y: 720 }, // "POWER" button/next step
    pricePosition: { x: 720, y: 755 } // Where the final price displays
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request data
    const result = extractSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: result.error.format() },
        { status: 400 }
      );
    }
    
    const { url, actions, width, height, fullPage } = result.data;
    
    console.log(`Extracting price from: ${url}`);
    
    // Launch browser
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width, height },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
    });
    
    // Navigate to URL with longer timeout
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('Page loaded');
    
    const results = [];
    
    // Check if this is a site we have hardcoded coordinates for
    const domain = new URL(url).hostname;
    const isHardcodedSite = Object.keys(siteCoordinates).some(site => domain.includes(site));
    let siteConfig = null;
    
    if (isHardcodedSite) {
      for (const [site, config] of Object.entries(siteCoordinates)) {
        if (domain.includes(site)) {
          siteConfig = config;
          console.log(`Using hardcoded coordinates for ${site}`);
          break;
        }
      }
    }
    
    // Special handling for sites with hardcoded coordinates 
    if (isHardcodedSite && siteConfig) {
      // For Aeon specifically 
      if (domain.includes('aeonlaser.us')) {
        try {
          // Screenshot before any action
          const initialScreenshot = await page.screenshot();
          results.push({
            success: true,
            action: { type: 'screenshot', description: 'Initial state' },
            imageBase64: initialScreenshot.toString('base64')
          });
          
          // 1. Click "Get Instant Pricing" using coordinates
          console.log('Clicking "Get Instant Pricing" button at hardcoded coordinates');
          await page.mouse.click(siteConfig.getStarted.x, siteConfig.getStarted.y);
          await page.waitForTimeout(2000); // Wait for modal to appear
          
          // Screenshot after opening modal
          const modalScreenshot = await page.screenshot();
          results.push({
            success: true,
            action: { type: 'click', description: 'Get Instant Pricing clicked' },
            imageBase64: modalScreenshot.toString('base64')
          });
          
          // 2. Click the checkmark in the modal to confirm model
          console.log('Clicking checkmark button at hardcoded coordinates');
          await page.mouse.click(siteConfig.checkmark.x, siteConfig.checkmark.y);
          await page.waitForTimeout(1500);
          
          // Screenshot after clicking checkmark
          const checkmarkScreenshot = await page.screenshot();
          results.push({
            success: true,
            action: { type: 'click', description: 'Checkmark/confirm clicked' },
            imageBase64: checkmarkScreenshot.toString('base64')
          });
          
          // 3. Click next/SIZE button
          console.log('Clicking SIZE/next button at hardcoded coordinates');
          await page.mouse.click(siteConfig.sizeButton.x, siteConfig.sizeButton.y);
          await page.waitForTimeout(1500);
          
          // Handle the remaining user actions if any
          console.log('Proceeding with user-defined actions');
        } catch (error) {
          console.error('Error with hardcoded sequence:', error);
          // Continue with regular actions if hardcoded sequence fails
        }
      }
    }
    
    // Perform actions
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'click':
            if (action.selector) {
              try {
                // First check if the element exists
                const elementExists = await page.$(action.selector);
                
                if (!elementExists) {
                  console.log(`Element with selector ${action.selector} not found. Looking for modals or popups.`);
                  
                  // Try to find and click common modal triggers
                  const modalTriggers = [
                    'button:has-text("Get Instant Pricing")', 
                    'a:has-text("Get Instant Pricing")',
                    'a.btn:visible',
                    'button:has-text("Customize")',
                    'a:has-text("Customize")',
                    'button:has-text("Configure")',
                    'a:has-text("Configure")',
                    'button:has-text("See details")',
                    '.product-customize-button',
                    '.modal-trigger',
                    '.configurator-trigger'
                  ];
                  
                  // Try each potential modal trigger
                  for (const trigger of modalTriggers) {
                    const triggerExists = await page.$(trigger);
                    if (triggerExists) {
                      console.log(`Found potential modal trigger: ${trigger}`);
                      await page.click(trigger);
                      // Wait for potential modal to appear
                      await page.waitForTimeout(1000);
                      break;
                    }
                  }
                  
                  // Check again for the original selector
                  const elementExistsAfterTrigger = await page.$(action.selector);
                  if (!elementExistsAfterTrigger) {
                    throw new Error(`Element with selector ${action.selector} still not found after trying modal triggers`);
                  }
                }
                
                // Wait for element to be visible
                await page.waitForSelector(action.selector, { 
                  state: 'visible',
                  timeout: 5000
                });
                
                // Click the element
                await page.click(action.selector);
              } catch (clickError: any) {
                console.log(`Initial click failed, trying with scroll into view: ${clickError.message}`);
                
                // Second attempt: Scroll element into view first, then try clicking
                await page.evaluate((selector) => {
                  const element = document.querySelector(selector);
                  if (element) {
                    // Scroll the element into the viewport
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    // Give the page time to scroll
                    return new Promise(resolve => setTimeout(resolve, 500));
                  }
                }, action.selector);
                
                // Wait a bit for any animations to complete
                await page.waitForTimeout(1000);
                
                // Try a more aggressive approach - evaluate click in browser context
                try {
                  await page.evaluate((selector: string) => {
                    const element = document.querySelector(selector);
                    if (element) {
                      // Use MouseEvent to simulate a click instead of the click() method
                      element.dispatchEvent(new MouseEvent('click', {
                        bubbles: true,
                        cancelable: true,
                        view: window
                      }));
                    }
                  }, action.selector);
                } catch (evalClickError: unknown) {
                  console.log(`Evaluate click failed: ${evalClickError instanceof Error ? evalClickError.message : 'Unknown error'}`);
                  // Last resort - try forcing click
                  await page.click(action.selector, { force: true, timeout: 5000 });
                }
              }
              
              results.push({ success: true, action, selector: action.selector });
            } else if (action.position) {
              // Click by position
              await page.mouse.click(action.position.x, action.position.y);
              
              // Try to determine the element that was clicked
              const selector = await page.evaluate(({ x, y }) => {
                const element = document.elementFromPoint(x, y);
                if (!element) return null;
                
                // Try to generate a selector
                if (element.id) {
                  return `#${element.id}`;
                } else if (element.classList.length) {
                  return `.${Array.from(element.classList).join('.')}`;
                } else {
                  return element.tagName.toLowerCase();
                }
              }, action.position);
              
              results.push({ success: true, action, selector });
            } else {
              throw new Error('Click action requires either selector or position');
            }
            break;
            
          case 'wait':
            await page.waitForTimeout(action.time || 1000);
            results.push({ success: true, action });
            break;
            
          case 'extract':
            // Try to extract price for hardcoded sites using coordinates
            if (isHardcodedSite && siteConfig && domain.includes('aeonlaser.us')) {
              try {
                const totalPriceText = await page.evaluate(({ x, y }) => {
                  const element = document.elementFromPoint(x, y);
                  if (!element) return null;
                  
                  // Get the element and all its nearby elements to try and extract price
                  const nearbyElements = Array.from(document.querySelectorAll('.total, .total-price, .price-total, *:has-text("$")'));
                  let priceText = '';
                  
                  // Sort by proximity to our target point
                  nearbyElements.sort((a, b) => {
                    const rectA = a.getBoundingClientRect();
                    const rectB = b.getBoundingClientRect();
                    const distA = Math.sqrt(Math.pow(rectA.x - x, 2) + Math.pow(rectA.y - y, 2));
                    const distB = Math.sqrt(Math.pow(rectB.x - x, 2) + Math.pow(rectB.y - y, 2));
                    return distA - distB;
                  });
                  
                  // Look for price text in the closest elements
                  for (const el of nearbyElements) {
                    const text = el.textContent || '';
                    if (text.includes('$')) {
                      priceText = text;
                      break;
                    }
                  }
                  
                  return priceText;
                }, siteConfig.pricePosition);
                
                if (totalPriceText) {
                  const priceMatch = totalPriceText.match(/\$[\d,]+\.?\d*/);
                  if (priceMatch) {
                    const extraction = {
                      found: true,
                      price: priceMatch[0],
                      method: 'coordinate-based',
                      rawText: totalPriceText
                    };
                    
                    results.push({ 
                      success: true, 
                      action,
                      selector: `coordinates(${siteConfig.pricePosition.x},${siteConfig.pricePosition.y})`,
                      extraction
                    });
                    
                    break;
                  }
                }
              } catch (e) {
                console.error('Error extracting with coordinates:', e);
              }
            }
              
            // If hardcoded extraction failed or not applicable, use original selector
            if (!action.selector) {
              throw new Error('Extract action requires a selector');
            }
            
            const extractionResult = await extractPrice(page, action.selector);
            results.push({ 
              success: true, 
              action,
              selector: action.selector,
              extraction: extractionResult
            });
            break;
        }
      } catch (error) {
        console.error(`Action failed:`, error);
        results.push({ 
          success: false, 
          action, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
      
      // Wait a bit between actions to let page updates occur
      await page.waitForTimeout(500);
    }
    
    // Take screenshot of final state
    const screenshot = await page.screenshot({ fullPage });
    
    // See if we can find any common price selectors on the page
    let priceInfo = await extractCommonPriceSelectors(page);
    
    // Special extraction for hardcoded sites
    let hardcodedPrice = null;
    if (isHardcodedSite && siteConfig && domain.includes('aeonlaser.us')) {
      // Extract text from the price area
      try {
        const totalPriceText = await page.evaluate(({ x, y }) => {
          const element = document.elementFromPoint(x, y);
          if (!element) return null;
          
          // Get the element and all its nearby elements to try and extract price
          const nearbyElements = Array.from(document.querySelectorAll('.total, .total-price, .price-total, *:has-text("$")'));
          let priceText = '';
          
          // Sort by proximity to our target point
          nearbyElements.sort((a, b) => {
            const rectA = a.getBoundingClientRect();
            const rectB = b.getBoundingClientRect();
            const distA = Math.sqrt(Math.pow(rectA.x - x, 2) + Math.pow(rectA.y - y, 2));
            const distB = Math.sqrt(Math.pow(rectB.x - x, 2) + Math.pow(rectB.y - y, 2));
            return distA - distB;
          });
          
          // Look for price text in the closest elements
          for (const el of nearbyElements) {
            const text = el.textContent || '';
            if (text.includes('$')) {
              priceText = text;
              break;
            }
          }
          
          return priceText;
        }, siteConfig.pricePosition);
        
        if (totalPriceText) {
          const priceMatch = totalPriceText.match(/\$[\d,]+\.?\d*/);
          if (priceMatch) {
            hardcodedPrice = {
              found: true,
              method: 'coordinate-based',
              price: priceMatch[0],
              rawText: totalPriceText
            };
          }
        }
      } catch (e) {
        console.error('Error extracting price via coordinates:', e);
      }
    }
    
    // Clean up
    await browser.close();
    
    return NextResponse.json({
      results,
      imageBase64: screenshot.toString('base64'),
      priceInfo,
      hardcodedExtraction: hardcodedPrice
    });
  } catch (error) {
    console.error('Error in browser extract:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
}

interface ExtractedElementData {
  text: string;
  innerHTML: string;
  outerHTML: string;
  attributes: Record<string, string>;
}

/**
 * Extract price information from a specific selector
 */
async function extractPrice(page: Page, selector: string): Promise<any> {
  try {
    // Wait for element to be visible
    await page.waitForSelector(selector, { state: 'visible', timeout: 5000 });
    
    // Extract element data
    const extractedData = await page.evaluate((sel) => {
      const element = document.querySelector(sel);
      if (!element) return null;
      
      // Get all attributes
      const attributes: Record<string, string> = {};
      for (const attr of element.attributes) {
        attributes[attr.name] = attr.value;
      }
      
      return {
        text: element.textContent || '',
        innerHTML: element.innerHTML,
        outerHTML: element.outerHTML,
        attributes
      };
    }, selector) as ExtractedElementData | null;
    
    if (!extractedData) {
      return { found: false, error: 'Element not found' };
    }
    
    // Try to find prices in the text
    const priceRegex = /[$€£¥]?\s?\d+([.,]\d{1,3})*([.,]\d{2})?/g;
    const priceMatches = extractedData.text.match(priceRegex);
    
    if (!priceMatches || priceMatches.length === 0) {
      return { 
        found: false, 
        error: 'No price patterns found in the text', 
        element: extractedData 
      };
    }
    
    // Parse the prices
    const prices = priceMatches.map(price => {
      // Clean the price string
      const cleanPrice = price.replace(/[^\d.,]/g, '');
      const parsed = parseFloat(cleanPrice.replace(/,/g, '.'));
      return {
        raw: price,
        parsed: isNaN(parsed) ? null : parsed
      };
    }).filter(p => p.parsed !== null);
    
    return {
      found: prices.length > 0,
      prices,
      element: extractedData
    };
  } catch (error) {
    console.error('Error extracting price:', error);
    return { 
      found: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Helper function to extract common price selectors
 */
async function extractCommonPriceSelectors(page: Page) {
  try {
    // Common price selectors from e-commerce sites
    let commonSelectors = [
      '.price', 
      '[data-price]', 
      '.product-price', 
      '.product__price', 
      '.product-info__price',
      '.product-price-value',
      '.starting-at__price',
      '.js-price-value',
      '[itemprop="price"]',
      '.woocommerce-Price-amount',
      '.current-price',
      '.sale-price',
      '.regular-price',
      'span:has-text("$")',
      'div:has-text("$")',
      '.price-tag',
      '.original-price',
      '.offer-price',
      '.product-card__price',
      '.total',
      '.total-price',
      '.price-total'
    ];
    
    // Try to find and extract prices
    const priceData = await page.evaluate((selectors: string[]) => {
      const results: string[] = [];
      const foundSelectors: string[] = [];
      
      for (const selector of selectors) {
        try {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            for (const element of elements) {
              const text = element.textContent || '';
              // Look for price patterns
              const priceMatches = text.match(/[$€£¥]?\s?\d+([.,]\d{1,3})*([.,]\d{2})?/g);
              if (priceMatches && priceMatches.length > 0) {
                results.push(...priceMatches);
                foundSelectors.push(selector);
              }
            }
          }
        } catch (e) {
          // Ignore errors for individual selectors
        }
      }
      
      return {
        prices: results,
        selectors: foundSelectors
      };
    }, commonSelectors);
    
    // Parse the found prices
    const parsedPrices = priceData.prices.map((price: string) => {
      // Clean the price string
      const cleanPrice = price.replace(/[^\d.,]/g, '');
      const parsed = parseFloat(cleanPrice.replace(/,/g, '.'));
      return {
        raw: price,
        parsed: isNaN(parsed) ? null : parsed
      };
    }).filter(p => p.parsed !== null);
    
    return {
      found: parsedPrices.length > 0,
      prices: parsedPrices.map(p => p.parsed),
      rawPrices: parsedPrices.map(p => p.raw),
      commonSelectors: priceData
    };
  } catch (error) {
    console.error('Error extracting price selectors:', error);
    return { found: false };
  }
} 