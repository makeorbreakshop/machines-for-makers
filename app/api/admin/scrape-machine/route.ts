import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { processMachineData, getLastRawResponse } from '@/lib/services/claude-service';

// Use edge runtime for better performance
export const runtime = 'edge';

// Export environment variables needed for the Edge runtime
export const config = {
  runtime: 'edge',
  regions: ['iad1'],  // Optional: specify AWS regions if needed
  env: ['ANTHROPIC_API_KEY', 'VERCEL_URL', 'NODE_ENV'],  // Expose environment variables to the Edge runtime
};

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const { url, debug = false } = await request.json();
    
    if (!url) {
      return NextResponse.json(
        { message: 'URL is required' },
        { status: 400 }
      );
    }

    // Fetch the HTML content from the URL
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { message: `Failed to fetch URL: ${response.statusText}` },
        { status: 500 }
      );
    }

    const html = await response.text();
    
    // Extract data using web scraper
    const scrapedData = extractBasicData(html, url);
    
    // Extract clean content from the HTML for Claude
    const cleanContent = extractCleanContent(html);
    
    let claudeData = null;
    let claudeError = null;
    let rawClaudeResponse = null;
    
    // Process with Claude if API key is available
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        // Process with Claude API
        claudeData = await processMachineData(cleanContent, url);
        
        // Get the raw Claude response for debugging
        rawClaudeResponse = getLastRawResponse();
        
      } catch (error) {
        console.error("Claude API processing failed:", error);
        claudeError = error instanceof Error ? error.message : String(error);
      }
    } else {
      console.warn("ANTHROPIC_API_KEY not set, using only basic extraction");
    }
    
    // Merge the data, with priority for certain fields
    const mergedData = mergeExtractionData(scrapedData, claudeData);
    
    // Include debug information if requested
    if (debug) {
      return NextResponse.json({
        data: mergedData,
        debug: {
          claude: {
            data: claudeData,
            error: claudeError,
            rawResponse: rawClaudeResponse
          },
          webScraper: scrapedData
        }
      });
    }
    
    return NextResponse.json(mergedData);
  } catch (error) {
    console.error('Error scraping machine data:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
}

// Function to extract clean content from HTML
function extractCleanContent(html: string): string {
  const $ = cheerio.load(html);
  
  // Remove unwanted elements
  $('script, style, nav, footer, header, iframe, noscript').remove();
  
  // Extract text from the body
  const bodyText = $('body').text();
  
  // Clean up the text
  return bodyText
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract multiple images - try multiple common selectors for product images
function extractProductImages(html: string, url: string): string[] {
  const $ = cheerio.load(html);
  
  // Store found image URLs with potential high-res versions
  interface ImageCandidate {
    url: string;
    isHighRes: boolean;
    estimatedQuality: number; // 0-100 quality score based on resolution indicators
  }
  
  const imageCandidates: ImageCandidate[] = [];
  
  // Process an image element to extract all potential URLs
  function processImageElement(img: any) {
    const src = $(img).attr('src') || '';
    const srcset = $(img).attr('srcset') || '';
    const dataSrc = $(img).attr('data-src') || '';
    const dataZoom = $(img).attr('data-zoom-image') || $(img).attr('data-zoom') || '';
    const dataLarge = $(img).attr('data-large-image') || $(img).attr('data-full-image') || '';
    const dataOriginal = $(img).attr('data-original') || '';
    const dataHighRes = $(img).attr('data-high-res') || '';
    
    // Filter out logos and icons
    if (src && (!src.includes('logo') && !src.includes('icon'))) {
      const fullSrcUrl = src.startsWith('http') ? src : new URL(src, url).toString();
      
      // Estimate quality based on URL patterns
      let qualityScore = 50; // Default score
      
      if (src.includes('thumb') || src.includes('small') || src.includes('tiny')) {
        qualityScore = 30;
      } else if (src.includes('large') || src.includes('full') || src.includes('big')) {
        qualityScore = 70;
      }
      
      // Check for resolution in filename (e.g., image-800x600.jpg)
      const resMatch = src.match(/[_-](\d+)x(\d+)/);
      if (resMatch && resMatch[1] && resMatch[2]) {
        const width = parseInt(resMatch[1]);
        const height = parseInt(resMatch[2]);
        
        if (width > 800 || height > 800) {
          qualityScore = 90;
        } else if (width > 400 || height > 400) {
          qualityScore = 70;
        } else {
          qualityScore = 40;
        }
      }
      
      imageCandidates.push({
        url: fullSrcUrl,
        isHighRes: qualityScore >= 70,
        estimatedQuality: qualityScore
      });
      
      // Try platform-specific URL transformations
      const transformedUrl = transformImageUrl(fullSrcUrl);
      if (transformedUrl !== fullSrcUrl) {
        imageCandidates.push({
          url: transformedUrl,
          isHighRes: true,
          estimatedQuality: 95 // Assume platform-specific transformations produce high-quality images
        });
      }
    }
    
    // Process srcset to find highest resolution version
    if (srcset) {
      // Parse srcset format: "url1 1x, url2 2x, url3 768w, ..."
      const srcSetEntries = srcset.split(',').map(entry => entry.trim());
      
      let highestDensity = 0;
      let highestWidth = 0;
      let bestSrcSetUrl = '';
      
      for (const entry of srcSetEntries) {
        const [entryUrl, descriptor] = entry.split(/\s+/);
        
        if (descriptor && descriptor.endsWith('x')) {
          // Density descriptor (e.g., 2x)
          const density = parseFloat(descriptor.replace('x', ''));
          if (density > highestDensity) {
            highestDensity = density;
            bestSrcSetUrl = entryUrl;
          }
        } else if (descriptor && descriptor.endsWith('w')) {
          // Width descriptor (e.g., 800w)
          const width = parseInt(descriptor.replace('w', ''));
          if (width > highestWidth) {
            highestWidth = width;
            bestSrcSetUrl = entryUrl;
          }
        }
      }
      
      if (bestSrcSetUrl) {
        const fullSrcSetUrl = bestSrcSetUrl.startsWith('http') ? bestSrcSetUrl : new URL(bestSrcSetUrl, url).toString();
        imageCandidates.push({
          url: fullSrcSetUrl,
          isHighRes: true,
          estimatedQuality: 85
        });
      }
    }
    
    // Process data-* attributes that often contain high-res versions
    [dataSrc, dataOriginal, dataZoom, dataLarge, dataHighRes].forEach(attrUrl => {
      if (attrUrl && (!attrUrl.includes('logo') && !attrUrl.includes('icon'))) {
        const fullAttrUrl = attrUrl.startsWith('http') ? attrUrl : new URL(attrUrl, url).toString();
        
        // Data attributes usually contain high-res images, particularly zoom/large ones
        const isHighResAttr = dataZoom === attrUrl || dataLarge === attrUrl;
        const qualityScore = isHighResAttr ? 95 : 75;
        
        imageCandidates.push({
          url: fullAttrUrl,
          isHighRes: true,
          estimatedQuality: qualityScore
        });
        
        // Also try platform-specific transformations on data-* URLs
        const transformedDataUrl = transformImageUrl(fullAttrUrl);
        if (transformedDataUrl !== fullAttrUrl) {
          imageCandidates.push({
            url: transformedDataUrl,
            isHighRes: true,
            estimatedQuality: 98 // Highest priority - transformed from already high-res
          });
        }
      }
    });
  }
  
  // Transform image URLs based on common e-commerce platform patterns
  function transformImageUrl(imageUrl: string): string {
    try {
      const parsedUrl = new URL(imageUrl);
      const hostname = parsedUrl.hostname.toLowerCase();
      const path = parsedUrl.pathname;
      
      // Shopify: Remove size parameters
      if (hostname.includes('shopify.com') || hostname.includes('cdn.shopify.com')) {
        // Transform product_100x100.jpg to product.jpg
        return imageUrl.replace(/_((?:\d+x\d+)|(?:\d+))\./i, '.');
      }
      
      // WooCommerce/WordPress: Remove size suffixes
      if (path.match(/\-\d+x\d+\.(jpe?g|png|gif|webp)/i)) {
        return imageUrl.replace(/\-\d+x\d+\.(jpe?g|png|gif|webp)/i, '.$1');
      }
      
      // Amazon: Use highest resolution
      if (hostname.includes('amazon.com') || hostname.includes('amazon.') || hostname.includes('amzn')) {
        return imageUrl
          .replace(/\._SX\d+_/i, '._SX1500_')
          .replace(/\._SY\d+_/i, '._SY1500_')
          .replace(/\._SL\d+_/i, '._SL1500_');
      }
      
      // eBay: Use highest resolution
      if (hostname.includes('ebay.com') || hostname.includes('ebayimg.com')) {
        return imageUrl.replace(/s\-l\d+\./i, 's-l1600.');
      }
      
      // General size indicators in filenames
      return imageUrl
        .replace(/small/i, 'large')
        .replace(/thumb/i, 'full')
        .replace(/tiny/i, 'large')
        .replace(/mini/i, 'full');
      
    } catch (e) {
      // If URL parsing fails, return the original
      return imageUrl;
    }
  }
  
  // Common selectors for product images - same as before
  const imageSelectors = [
    // Product gallery selectors
    '.product-gallery img', 
    '.gallery img',
    '.carousel img',
    '.slider img',
    '.product-images img',
    // Product main image selectors
    'img.product-image', 
    'img.main-image',
    'img#product-image',
    'img#main-image',
    '.product-image img',
    '.main-image img',
    // Fallbacks to try
    '.product img',
    '#product img',
    '.product-media img',
    // Very broad fallbacks
    'img[src*="product"]',
    'img[src*="large"]',
    'img[alt*="product"]',
    // Last resort - just get images above a certain size
    'img[width][height]'
  ];
  
  // Try each selector
  for (const selector of imageSelectors) {
    const images = $(selector);
    if (images.length) {
      images.each((_, img) => processImageElement(img));
      
      // If we found enough high-res candidates, stop looking
      const highResCandidates = imageCandidates.filter(c => c.isHighRes);
      if (highResCandidates.length >= 3 && selector !== 'img[width][height]') {
        break;
      }
    }
  }
  
  // If we still don't have enough images, try the last resort selector
  if (imageCandidates.length < 3) {
    $('img').each((_, img) => {
      const width = parseInt($(img).attr('width') || '0', 10);
      const height = parseInt($(img).attr('height') || '0', 10);
      
      // Only include reasonably sized images
      if (width > 200 && height > 200) {
        processImageElement(img);
      }
    });
  }
  
  // Remove duplicates, prefer high-res versions, and sort by quality
  const uniqueUrls = new Map<string, ImageCandidate>();
  
  // First pass: Group by URL's path and filename (ignoring size parameters)
  const urlGroups = new Map<string, ImageCandidate[]>();
  
  imageCandidates.forEach(candidate => {
    try {
      const parsedUrl = new URL(candidate.url);
      // Get the path and filename without query params
      const urlPath = parsedUrl.pathname;
      // Create a simple key by removing common size indicators
      const baseKey = urlPath.replace(/[_-]\d+x\d+/, '');
      
      if (!urlGroups.has(baseKey)) {
        urlGroups.set(baseKey, []);
      }
      urlGroups.get(baseKey)!.push(candidate);
    } catch (e) {
      // If URL parsing fails, treat as unique
      uniqueUrls.set(candidate.url, candidate);
    }
  });
  
  // For each group, select the highest quality candidate
  urlGroups.forEach((candidates, key) => {
    if (candidates.length > 0) {
      // Sort by quality and pick the best
      candidates.sort((a, b) => b.estimatedQuality - a.estimatedQuality);
      uniqueUrls.set(key, candidates[0]);
    }
  });
  
  // Return the final list of URLs, sorted by quality
  return Array.from(uniqueUrls.values())
    .sort((a, b) => b.estimatedQuality - a.estimatedQuality)
    .map(candidate => candidate.url);
}

// Function to extract basic data from HTML
function extractBasicData(html: string, url: string) {
  const $ = cheerio.load(html);
  
  // Basic extraction logic
  const title = $('title').text().trim();
  const h1 = $('h1').first().text().trim();
  const metaDescription = $('meta[name="description"]').attr('content') || '';
  
  // Extract images
  const images = extractProductImages(html, url);
  
  // Try to extract price - look for common price selectors
  const priceSelectors = [
    '.price', 
    '[class*="price"]', 
    '[id*="price"]',
    'span:contains("$")',
    'div:contains("$")',
    'p:contains("$")'
  ];
  
  let priceText = '';
  
  for (const selector of priceSelectors) {
    const element = $(selector).first();
    if (element.length) {
      priceText = element.text().trim();
      break;
    }
  }
  
  const price = parsePrice(priceText);
  
  // Extract machine name and company
  const machineName = h1 || title.split('|')[0].trim();
  const company = extractCompanyName(title, url);
  
  return {
    machine_name: machineName,
    company: company,
    price: price,
    image_url: images[0] || '', // Main image (first one)
    images: images, // All images
    description: metaDescription,
    product_link: url,
    // Set defaults for required fields
    hidden: true,
  };
}

// Helper function to parse price from text
function parsePrice(text: string): number | null {
  if (!text) return null;
  
  // Extract number that looks like a price
  const priceMatch = text.match(/\$?(\d{1,3}(,\d{3})*(\.\d{1,2})?)/);
  if (priceMatch) {
    // Remove commas and convert to number
    return parseFloat(priceMatch[1].replace(/,/g, ''));
  }
  
  return null;
}

// Helper function to extract company name
function extractCompanyName(title: string, url: string): string {
  // Try to extract from title
  const titleParts = title.split(/[|\-–—]/);
  if (titleParts.length > 1) {
    return titleParts[titleParts.length - 1].trim();
  }
  
  // Try to extract from URL
  try {
    const hostname = new URL(url).hostname;
    const domainParts = hostname.split('.');
    if (domainParts.length > 1) {
      // Use the domain name without the TLD
      return domainParts[domainParts.length - 2].charAt(0).toUpperCase() + 
             domainParts[domainParts.length - 2].slice(1);
    }
  } catch (e) {
    // URL parsing failed, ignore
  }
  
  return '';
}

// Function to merge data from web scraper and Claude
function mergeExtractionData(scrapedData: any, claudeData: any): any {
  // If Claude data is not available, just return scraped data
  if (!claudeData) return scrapedData;
  
  // Start with Claude data as the base
  const mergedData = { ...claudeData };
  
  // Web scraper data takes precedence for these fields
  if (scrapedData.image_url) mergedData.image_url = scrapedData.image_url;
  if (scrapedData.images && scrapedData.images.length > 0) {
    mergedData.images = scrapedData.images;
  } else {
    mergedData.images = mergedData.image_url ? [mergedData.image_url] : [];
  }
  
  // Ensure the product link is set
  if (!mergedData.product_link) {
    mergedData.product_link = scrapedData.product_link;
  }
  
  // Set hidden by default for safety
  mergedData.hidden = true;
  
  return mergedData;
} 