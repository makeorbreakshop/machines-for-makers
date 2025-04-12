import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Define secret key for authentication
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // Check for secret to ensure this is a valid request
  const searchParams = request.nextUrl.searchParams;
  const secret = searchParams.get('secret');
  
  if (secret !== CRON_SECRET && secret !== 'admin-panel') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Get list of machines to update prices for
    // We'll get all machines with product links for now, not just featured ones
    const { data: machines, error: machinesError } = await supabase
      .from('machines')
      .select('id, "Machine Name", "Company", "Affiliate Link", product_link, Price')
      .not('product_link', 'is', null) // Only include machines with a product link
      .limit(10); // Start with a small batch to test
    
    if (machinesError) {
      console.error('Error fetching machines:', machinesError);
      return NextResponse.json({ error: 'Failed to fetch machines' }, { status: 500 });
    }
    
    if (!machines || machines.length === 0) {
      return NextResponse.json({ message: 'No machines found to update prices for' });
    }
    
    console.log(`Found ${machines.length} machines to update prices for`);
    
    // Process in batches to avoid overwhelming resources
    const batchSize = 10;
    const results = {
      total: machines.length,
      updated: 0,
      failed: 0,
      skipped: 0,
      details: [] as any[]
    };
    
    // Launch browser once for all operations
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    // Process in batches
    for (let i = 0; i < machines.length; i += batchSize) {
      const batch = machines.slice(i, i + batchSize);
      
      // Process each machine in the batch
      const batchPromises = batch.map(async (machine) => {
        try {
          const sourceUrl = machine.product_link || machine["Affiliate Link"];
          
          if (!sourceUrl) {
            results.skipped++;
            results.details.push({
              machine_id: machine.id,
              name: machine["Machine Name"],
              status: 'skipped',
              reason: 'No URL available'
            });
            return;
          }
          
          // Scrape price from source URL
          const scrapedPrice = await scrapePrice(browser, sourceUrl);
          
          if (scrapedPrice === null) {
            results.skipped++;
            results.details.push({
              machine_id: machine.id,
              name: machine["Machine Name"],
              status: 'skipped',
              reason: 'Could not extract price'
            });
            return;
          }
          
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
            results.failed++;
            results.details.push({
              machine_id: machine.id,
              name: machine["Machine Name"],
              status: 'failed',
              reason: insertError.message
            });
            return;
          }
          
          // Check if this is an all-time high or low
          await updatePriceExtremes(machine.id, scrapedPrice);
          
          results.updated++;
          results.details.push({
            machine_id: machine.id,
            name: machine["Machine Name"],
            status: 'updated',
            price: scrapedPrice
          });
        } catch (error) {
          console.error(`Error processing ${machine["Machine Name"]}:`, error);
          results.failed++;
          results.details.push({
            machine_id: machine.id,
            name: machine["Machine Name"],
            status: 'failed',
            reason: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });
      
      await Promise.all(batchPromises);
      
      // Small delay between batches to avoid overwhelming resources
      if (i + batchSize < machines.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Close browser
    await browser.close();
    
    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Error in update-prices:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Function to scrape price from a URL
async function scrapePrice(browser: any, url: string): Promise<number | null> {
  try {
    const page = await browser.newPage();
    
    // Set a reasonable timeout and user agent
    await page.setDefaultNavigationTimeout(60000);
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36');
    
    // Special handling for geni.us links, which always redirect
    if (url.includes('geni.us')) {
      console.log(`Handling geni.us link: ${url}`);
      
      // First, just load the page - don't wait for networkidle as it redirects
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
      } catch (error: any) {
        console.log(`Initial navigation error: ${error.message}`);
      }
      
      // Wait for redirection to happen
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      // Get the final URL
      const finalUrl = page.url();
      console.log(`Redirected to: ${finalUrl}`);
      
      if (finalUrl !== url) {
        // Navigate again to the final URL to ensure complete page load
        try {
          await page.goto(finalUrl, { waitUntil: 'domcontentloaded' });
          
          // Wait for content to populate
          await new Promise(resolve => setTimeout(resolve, 5000));
        } catch (error: any) {
          console.log(`Error loading final URL: ${error.message}`);
        }
      }
    } else {
      // For regular non-geni.us URLs, navigate normally
      try {
        await page.goto(url, { waitUntil: 'networkidle0' });
      } catch (error: any) {
        // Try again with less strict wait condition
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        
        // Wait a bit for dynamic content to load
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    // Extract HTML content
    const content = await page.content();
    
    // Log the final URL and content for debugging
    console.log(`Final URL: ${page.url()}`);
    console.log(`Page title: ${await page.title()}`);
    
    // Use the existing price extraction logic
    const $ = cheerio.load(content);
    
    // Try to extract price - look for common price selectors
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
      '[itemprop="price"]',
      'span:contains("$")',
      'div:contains("$")',
      'p:contains("$")'
    ];
    
    let priceText = '';
    
    for (const selector of priceSelectors) {
      const elements = $(selector);
      if (elements.length) {
        // Try each match until we find something that looks like a price
        for (let i = 0; i < Math.min(elements.length, 5); i++) {
          const elementText = $(elements[i]).text().trim();
          if (elementText.includes('$') || /\d+(\.\d{2})?/.test(elementText)) {
            priceText = elementText;
            console.log(`Found price text: "${priceText}" using selector "${selector}"`);
            break;
          }
        }
        
        if (priceText) break;
      }
    }
    
    // Look for structured data price
    const jsonLdScripts = $('script[type="application/ld+json"]');
    if (jsonLdScripts.length && !priceText) {
      jsonLdScripts.each((i, script) => {
        try {
          const scriptContent = $(script).html() || '{}';
          const data = JSON.parse(scriptContent);
          if (data.offers?.price) {
            priceText = data.offers.price.toString();
          } else if (data.price) {
            priceText = data.price.toString();
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
      });
    }
    
    // Close the page
    await page.close();
    
    // Parse the extracted price text
    if (!priceText) return null;
    
    // Extract number that looks like a price
    const priceMatch = priceText.match(/\$?(\d{1,3}(,\d{3})*(\.\d{1,2})?)/);
    if (priceMatch) {
      // Remove commas and convert to number
      const price = parseFloat(priceMatch[1].replace(/,/g, ''));
      
      // Sanity check - prices below 10 might be errors
      if (price < 10) {
        console.log(`Price seems too low (${price}) for ${url}, might be incorrect`);
      }
      
      return price;
    }
    
    return null;
  } catch (error) {
    console.error('Error scraping price:', error);
    return null;
  }
}

// Function to update if this price is an all-time high or low
async function updatePriceExtremes(machineId: string, currentPrice: number): Promise<void> {
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