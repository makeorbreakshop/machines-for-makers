import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  // Extract machine ID from query params
  const searchParams = request.nextUrl.searchParams;
  const machineId = searchParams.get('machineId');
  const debug = searchParams.get('debug') === 'true';
  
  if (!machineId) {
    return NextResponse.json({ error: 'machineId is required' }, { status: 400 });
  }
  
  console.log(`Starting manual price update for machine ID: ${machineId}`);
  
  try {
    // Get machine details
    const { data: machine, error: machineError } = await supabase
      .from('machines')
      .select('id, "Machine Name", "Company", "Affiliate Link", product_link, Price')
      .eq('id', machineId)
      .single();
    
    if (machineError || !machine) {
      console.error('Error fetching machine:', machineError);
      return NextResponse.json({ 
        error: 'Failed to fetch machine details',
        details: machineError || 'No machine found with this ID'
      }, { status: 500 });
    }
    
    console.log(`Found machine: ${machine["Machine Name"]} (${machine["Company"]})`);
    
    // Check if product has a URL to scrape
    const sourceUrl = machine.product_link || machine["Affiliate Link"];
    
    if (!sourceUrl) {
      return NextResponse.json({ 
        error: 'Machine does not have a product URL to scrape',
        machine: {
          id: machine.id,
          name: machine["Machine Name"],
          company: machine["Company"]
        }
      }, { status: 400 });
    }
    
    console.log(`Will scrape URL: ${sourceUrl}`);
    
    // Launch browser for scraping
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
      headless: true as any,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      defaultViewport: { width: 1280, height: 800 }
    });
    
    try {
      // Scrape price from source URL
      console.log('Starting price scraping...');
      const { price: scrapedPrice, debugInfo } = await scrapePrice(browser, sourceUrl, debug);
      
      if (scrapedPrice === null) {
        return NextResponse.json({ 
          error: 'Failed to extract price from URL',
          url: sourceUrl,
          debug: debugInfo
        }, { status: 400 });
      }
      
      console.log(`Successfully scraped price: $${scrapedPrice}`);
      
      // Insert new price record
      const { error: insertError } = await supabase
        .from('price_history')
        .insert({
          machine_id: machine.id,
          price: scrapedPrice,
          scraped_from_url: sourceUrl,
          source: machine["Company"] || 'Unknown'
        });
      
      if (insertError) {
        console.error(`Error inserting price for ${machine["Machine Name"]}:`, insertError);
        return NextResponse.json({ 
          error: 'Failed to save price record',
          details: insertError 
        }, { status: 500 });
      }
      
      // Check if this is an all-time high or low
      await updatePriceExtremes(machine.id);
      
      return NextResponse.json({ 
        success: true, 
        machine: {
          id: machine.id,
          name: machine["Machine Name"],
          company: machine["Company"]
        },
        price: scrapedPrice,
        source: sourceUrl,
        debug: debug ? debugInfo : undefined
      });
    } finally {
      // Always close the browser
      await browser.close();
      console.log('Browser closed');
    }
  } catch (error) {
    console.error('Error in manual update:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update price',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// Function to scrape price from a URL
async function scrapePrice(browser: any, url: string, debug = false): Promise<{ price: number | null, debugInfo: any }> {
  const debugInfo: any = {
    steps: [],
    selectors: [],
    finalUrl: '',
    pageTitle: '',
    priceText: '',
    parsedPrice: null,
    error: null
  };
  
  let page = null;
  let priceText = '';
  
  try {
    page = await browser.newPage();
    debugInfo.steps.push('Browser page created');
    
    // Set a reasonable timeout and user agent
    await page.setDefaultNavigationTimeout(60000);
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36');
    
    // Add request interception for better network handling
    await page.setRequestInterception(true);
    
    // Skip non-essential resources to speed up loading
    page.on('request', (request: any) => {
      const resourceType = request.resourceType();
      if (resourceType === 'image' || resourceType === 'stylesheet' || resourceType === 'font') {
        request.abort();
      } else {
        request.continue();
      }
    });
    
    // Listen for network responses to identify redirects
    const responses: any[] = [];
    page.on('response', (response: any) => {
      const status = response.status();
      if (status >= 300 && status <= 399) {
        responses.push({
          url: response.url(),
          status,
          location: response.headers().location
        });
        debugInfo.steps.push(`Redirect detected: ${status} from ${response.url()} to ${response.headers().location || 'unknown'}`);
      }
    });
    
    debugInfo.steps.push('Set timeout and user agent');
    
    // If we have a geni.us URL, handle it specially
    if (url.includes('geni.us')) {
      debugInfo.steps.push('Detected geni.us link, handling special case');
      
      // Navigate to the URL and wait for redirects
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      debugInfo.steps.push('Initial navigation to geni.us complete');
      
      // Wait for any JavaScript redirects to complete
      await page.waitForTimeout(3000);
      
      // Check if we've been redirected to Amazon or another site
      const currentUrl = page.url();
      debugInfo.finalUrl = currentUrl;
      debugInfo.steps.push(`After geni.us navigation, final URL: ${currentUrl}`);
      
      // If we're on Amazon, extract the ASIN and use the Amazon API
      if (currentUrl.includes('amazon.com')) {
        const asinMatch = currentUrl.match(/\/([A-Z0-9]{10})(\/|\?|$)/);
        if (asinMatch && asinMatch[1]) {
          const asin = asinMatch[1];
          debugInfo.steps.push(`Extracted Amazon ASIN: ${asin}`);
          
          // Get price using Amazon product API (implement this)
          // const amazonPrice = await getAmazonPrice(asin);
          // if (amazonPrice) {
          //   debugInfo.steps.push(`Found Amazon price via API: ${amazonPrice}`);
          //   await page.close();
          //   return { price: amazonPrice, debugInfo };
          // }
        }
      }
      
      // If Amazon API failed or we're on another site, navigate to the final URL
      await page.goto(currentUrl, { 
        waitUntil: 'networkidle0',
        timeout: 30000
      });
      debugInfo.steps.push('Navigation to final URL complete');
    } else {
      // Direct navigation for non-geni.us URLs
      debugInfo.steps.push(`Navigating to: ${url}`);
      await page.goto(url, { 
        waitUntil: 'networkidle0',
        timeout: 30000
      });
      debugInfo.steps.push('Navigation complete');
    }
    
    // Store final URL and page title for debugging
    debugInfo.finalUrl = page.url();
    debugInfo.pageTitle = await page.title();
    debugInfo.steps.push(`Final URL: ${debugInfo.finalUrl}`);
    debugInfo.steps.push(`Page title: ${debugInfo.pageTitle}`);
    
    // Extract HTML content
    const content = await page.content();
    debugInfo.steps.push('Extracted page content');
    
    // Try to extract price using page.evaluate first (more reliable)
    try {
      debugInfo.steps.push('Attempting to extract price using browser JavaScript...');
      const evaluateResult = await page.evaluate(() => {
        // Common ways prices are represented in the DOM
        const priceSelectors = [
          '.price', 
          '[class*="price"]', 
          '[id*="price"]',
          '.product-price',
          '.regular-price',
          '.sale-price',
          '.current-price',
          '[data-price]',
          '[data-product-price]',
          '[itemprop="price"]'
        ];
        
        // Function to extract price from text
        const extractPrice = (text: string) => {
          if (!text) return null;
          const match = text.match(/\$?(\d{1,3}(,\d{3})*(\.\d{1,2})?)/);
          return match ? match[0] : null;
        };
        
        // Try each selector
        for (const selector of priceSelectors) {
          const elements = document.querySelectorAll(selector);
          for (let i = 0; i < Math.min(elements.length, 5); i++) {
            const element = elements[i];
            // Try getting price from content
            const elementText = element.textContent || '';
            const priceText = elementText.trim();
            if (priceText && (priceText.includes('$') || /\d+(\.\d{2})?/.test(priceText))) {
              const price = extractPrice(priceText);
              if (price) return { source: 'element', selector, text: priceText, price };
            }
            
            // Try getting from data attributes
            const dataPrice = element.getAttribute('data-price') || element.getAttribute('content');
            if (dataPrice) {
              return { source: 'attribute', selector, text: dataPrice, price: dataPrice };
            }
          }
        }
        
        // Try structured data
        const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
        for (let i = 0; i < jsonLdScripts.length; i++) {
          try {
            const scriptContent = jsonLdScripts[i].textContent || '';
            const data = JSON.parse(scriptContent);
            if (data.offers?.price) {
              return { source: 'jsonld', text: data.offers.price.toString(), price: data.offers.price.toString() };
            } else if (data.price) {
              return { source: 'jsonld', text: data.price.toString(), price: data.price.toString() };
            }
          } catch (e) {
            // Ignore JSON parse errors
          }
        }
        
        // Try meta tags
        const metaPrices = document.querySelectorAll('meta[property="product:price:amount"], meta[property="og:price:amount"], meta[name="price"], meta[itemprop="price"]');
        if (metaPrices.length > 0) {
          const metaPrice = metaPrices[0].getAttribute('content');
          if (metaPrice) {
            return { source: 'meta', text: metaPrice, price: metaPrice };
          }
        }
        
        return null;
      });
      
      if (evaluateResult) {
        debugInfo.steps.push(`Found price via browser JavaScript: ${evaluateResult.price} (source: ${evaluateResult.source}, selector: ${evaluateResult.selector || 'N/A'})`);
        priceText = evaluateResult.text;
      } else {
        debugInfo.steps.push('No price found via browser JavaScript, falling back to Cheerio');
      }
    } catch (evalError: any) {
      debugInfo.steps.push(`Error during browser JavaScript evaluation: ${evalError.message}`);
      debugInfo.steps.push('Falling back to Cheerio parsing');
    }
    
    // Take screenshot if debugging
    if (debug) {
      try {
        const screenshotBuffer = await page.screenshot({ fullPage: true });
        debugInfo.screenshot = `data:image/png;base64,${screenshotBuffer.toString('base64')}`;
        debugInfo.steps.push('Captured screenshot');
      } catch (error: any) {
        debugInfo.steps.push(`Error capturing screenshot: ${error.message}`);
      }
    }
    
    // If we didn't get a price from page.evaluate, use Cheerio as fallback
    if (!priceText) {
      // Get the page content for Cheerio
      const content = await page.content();
      const $ = cheerio.load(content);
      debugInfo.steps.push('Parsing HTML with Cheerio');
      
      // Define common price selector patterns
      const selectors = [
        '.price',
        '.product-price',
        '.regular-price',
        '.sale-price',
        '.current-price',
        '[class*="price"]',
        '[id*="price"]',
        '[data-price]',
        '[data-product-price]',
        '[itemprop="price"]'
      ];
      
      // Try each selector
      for (const selector of selectors) {
        if (priceText) break; // Stop if we already found a price
        
        const elements = $(selector);
        debugInfo.selectors.push({
          selector,
          count: elements.length
        });
        
        elements.each((i, el) => {
          if (priceText) return false; // Stop if we already found a price
          if (i > 4) return false; // Only check first 5 elements of each selector
          
          const text = $(el).text().trim();
          if (text && (text.includes('$') || /\d+(\.\d{2})?/.test(text))) {
            priceText = text;
            debugInfo.steps.push(`Found price text via Cheerio selector "${selector}": ${priceText}`);
            return false; // Break each loop
          }
          
          // Try data attributes
          const dataPrice = $(el).attr('data-price') || $(el).attr('content');
          if (dataPrice) {
            priceText = dataPrice;
            debugInfo.steps.push(`Found price in data attribute via selector "${selector}": ${priceText}`);
            return false; // Break each loop
          }
        });
      }
      
      // Try looking for structured data
      if (!priceText) {
        $('script[type="application/ld+json"]').each((i, el) => {
          try {
            const content = $(el).html();
            if (content) {
              const data = JSON.parse(content);
              if (data.offers?.price) {
                priceText = data.offers.price.toString();
                debugInfo.steps.push(`Found price via JSON-LD: ${priceText}`);
                return false;
              } else if (data.price) {
                priceText = data.price.toString();
                debugInfo.steps.push(`Found price via JSON-LD: ${priceText}`);
                return false;
              }
            }
          } catch (e) {
            // Ignore JSON parse errors
          }
        });
      }
      
      // Try meta tags
      if (!priceText) {
        const metaPrices = $('meta[property="product:price:amount"], meta[property="og:price:amount"], meta[name="price"], meta[itemprop="price"]');
        if (metaPrices.length > 0) {
          const metaPrice = $(metaPrices[0]).attr('content');
          if (metaPrice) {
            priceText = metaPrice;
            debugInfo.steps.push(`Found price via meta tag: ${priceText}`);
          }
        }
      }
    }
    
    debugInfo.priceText = priceText;
    debugInfo.steps.push(`Final price text: ${priceText || 'Not found'}`);
    
    // Parse the price string into a number
    if (priceText) {
      // Extract numeric value from the price string
      const priceMatch = priceText.match(/\$?(\d{1,3}(,\d{3})*(\.\d{1,2})?)/);
      if (priceMatch) {
        const numericPrice = priceMatch[0].replace(/[$,]/g, '');
        const price = parseFloat(numericPrice);
        
        if (!isNaN(price) && price > 0) {
          debugInfo.parsedPrice = price;
          debugInfo.steps.push(`Successfully parsed price: ${price}`);
          await page.close();
          return { price, debugInfo };
        } else {
          debugInfo.error = 'Price parsing resulted in NaN or zero';
          debugInfo.steps.push('Price parsing failed: resulted in NaN or zero');
        }
      } else {
        debugInfo.error = 'Failed to extract numeric value from price text';
        debugInfo.steps.push('Failed to extract numeric value from price text');
      }
    } else {
      debugInfo.error = 'No price text found';
      debugInfo.steps.push('No price text found on page');
    }
    
    // If we get here, we couldn't find a valid price
    await page.close();
    return { price: null, debugInfo };
  } catch (error: any) {
    debugInfo.error = error.message || String(error);
    debugInfo.steps.push(`Error during scraping: ${debugInfo.error}`);
    
    // Always make sure to close the page to prevent memory leaks
    if (page) {
      try {
        await page.close();
      } catch (closeError) {
        debugInfo.steps.push('Error closing page');
      }
    }
    
    return { price: null, debugInfo };
  }
}

// Function to update if this price is an all-time high or low
async function updatePriceExtremes(machineId: string): Promise<void> {
  try {
    // Get historical price data
    const { data: priceHistory, error: historyError } = await supabase
      .from('price_history')
      .select('id, price')
      .eq('machine_id', machineId)
      .order('price', { ascending: true });
    
    if (historyError || !priceHistory) {
      console.error('Error fetching price history:', historyError);
      return;
    }
    
    // Skip if we don't have enough history
    if (priceHistory.length <= 1) return;
    
    // Filter out any prices that are unrealistically low (likely scraping errors)
    const validPrices = priceHistory.filter(record => record.price >= 10);
    
    // If we filtered everything out, log a warning and return
    if (validPrices.length === 0) {
      console.warn(`All prices for machine ${machineId} appear to be invalid (< $10)`);
      return;
    }
    
    // Reset all flags first
    await supabase
      .from('price_history')
      .update({ 
        is_all_time_low: false,
        is_all_time_high: false
      })
      .eq('machine_id', machineId);
    
    // Set the new extremes
    const lowest = validPrices[0];
    const highest = validPrices[validPrices.length - 1];
    
    console.log(`Setting extremes for ${machineId}: low=$${lowest.price}, high=$${highest.price}`);
    
    if (lowest) {
      await supabase
        .from('price_history')
        .update({ is_all_time_low: true })
        .eq('id', lowest.id);
    }
    
    if (highest) {
      await supabase
        .from('price_history')
        .update({ is_all_time_high: true })
        .eq('id', highest.id);
    }
  } catch (error) {
    console.error('Error updating price extremes:', error);
  }
} 