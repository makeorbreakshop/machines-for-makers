import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { processMachineData, getLastRawResponse } from '@/lib/services/claude-service';
import puppeteer from 'puppeteer';
import type { Browser, Page } from 'puppeteer';

// Use nodejs runtime for Puppeteer compatibility
export const runtime = 'nodejs';

// Export environment variables needed
export const config = {
  runtime: 'nodejs',
  api: {
    responseLimit: '8mb',
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
};

// Define interfaces for our data
interface ExtractedData {
  machine_name: string;
  company: string;
  price: number | null;
  description: string;
  product_link: string;
  hidden: boolean;
  image_url?: string;
  images?: string[];
  [key: string]: any; // Allow for additional fields
}

interface ImageDimensions {
  width: number;
  height: number;
}

interface ImageData {
  url: string;
  dimensions?: ImageDimensions;
  [key: string]: any;
}

export async function POST(request: NextRequest) {
  let browser: Browser | null = null;
  
  try {
    // Parse the request body
    const { url, debug = false } = await request.json();
    
    if (!url) {
      return NextResponse.json(
        { message: 'URL is required' },
        { status: 400 }
      );
    }

    // Launch Puppeteer browser
    browser = await puppeteer.launch({
      headless: true, // Use headless mode
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set viewport to a reasonable desktop size
    await page.setViewport({ width: 1280, height: 800 });
    
    // Set user agent to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Navigate to the URL with a timeout
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // First pass: extract basic page data
    const pageTitle = await page.title();
    const pageHtml = await page.content();
    
    // Extract clean content for Claude
    const cleanContent = extractCleanContent(pageHtml);
    
    // Use existing Cheerio-based extraction as a fallback
    const basicScrapedData: ExtractedData = extractBasicData(pageHtml, url);
    
    // Second pass: extract high-quality images using Puppeteer
    console.log("Extracting images with Puppeteer...");
    const extractedImages = await extractImagesWithPuppeteer(page, url);
    console.log(`Found ${extractedImages.length} images with Puppeteer`);
    
    // Merge the images with the basic data
    basicScrapedData.images = extractedImages;
    if (extractedImages.length > 0) {
      basicScrapedData.image_url = extractedImages[0]; // Set the first (best) image as main image
    }
    
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
    
    // Close the browser
    await browser.close();
    browser = null;
    
    // Merge the data, with priority for certain fields
    const mergedData = mergeExtractionData(basicScrapedData, claudeData);
    
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
          webScraper: basicScrapedData
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
  } finally {
    // Ensure browser is closed even if an error occurs
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Extract images using Puppeteer with advanced techniques
 */
async function extractImagesWithPuppeteer(page: Page, url: string): Promise<string[]> {
  try {
    // First pass: collect all visible images on the page
    const initialImages = await page.evaluate(() => {
      // Get all images on the page
      return Array.from(document.querySelectorAll('img'))
        .filter(img => {
          // Get src (or data-src for lazy-loaded images)
          const src = img.src || img.getAttribute('data-src');
          
          // Skip if no source
          if (!src) return false;
          
          // Get dimensions from different properties
          const naturalWidth = img.naturalWidth || 0;
          const naturalHeight = img.naturalHeight || 0;
          const displayWidth = img.width || 0;
          const displayHeight = img.height || 0;
          const rect = img.getBoundingClientRect();
          const rectWidth = rect.width || 0;
          const rectHeight = rect.height || 0;
          
          // Use the largest available dimensions
          const width = Math.max(naturalWidth, displayWidth, rectWidth);
          const height = Math.max(naturalHeight, displayHeight, rectHeight);
          
          // Skip tiny images (probably icons, logos, UI elements)
          if (width < 300 && height < 300) return false;
          
          // Check if image URL contains indicators of UI elements
          const srcLower = src.toLowerCase();
          if (
            srcLower.includes('banner') || 
            srcLower.includes('icon') || 
            srcLower.includes('logo') || 
            srcLower.includes('svg') || 
            srcLower.includes('button') ||
            srcLower.includes('bg-') ||
            srcLower.includes('background')
          ) {
            return false;
          }
          
          // Check visibility
          const isVisible = rect.width > 0 && rect.height > 0 &&
                           rect.top < window.innerHeight * 3 && 
                           rect.left < window.innerWidth;
          
          // Check alt text and class name for indicators of non-product images
          const altLower = (img.alt || '').toLowerCase();
          const classLower = (img.className || '').toLowerCase();
          
          const isLikelyProductImage = 
            !altLower.includes('logo') &&
            !altLower.includes('icon') &&
            !altLower.includes('banner') &&
            !classLower.includes('logo') &&
            !classLower.includes('icon') &&
            !classLower.includes('banner');
          
          // Check for class patterns that suggest product images
          const hasProductImageClass = 
            classLower.includes('product') || 
            classLower.includes('main') || 
            classLower.includes('gallery') ||
            classLower.includes('carousel') ||
            classLower.includes('slide');
          
          return isVisible && isLikelyProductImage && (width * height > 90000); // Minimum 300x300 area
        })
        .map(img => {
          // Get all possible image URLs (src, srcset, data-* attributes)
          const src = img.src || '';
          const srcset = img.srcset || '';
          
          // Get all data-* attributes that might contain image URLs
          const dataAttributes: Record<string, string> = {};
          for (const attr of img.attributes) {
            if (attr.name.startsWith('data-') && 
               (attr.name.includes('src') || 
                attr.name.includes('img') || 
                attr.name.includes('image') || 
                attr.name.includes('zoom') || 
                attr.name.includes('large') || 
                attr.name.includes('big') || 
                attr.name.includes('full') ||
                attr.name.includes('original'))) {
              dataAttributes[attr.name] = attr.value;
            }
          }
          
          // Extract highest resolution from srcset if available
          let highestResSrcsetUrl = '';
          if (srcset) {
            const srcsetParts = srcset.split(',');
            let highestDensity = 0;
            let highestWidth = 0;
            
            for (const part of srcsetParts) {
              const [url, descriptor] = part.trim().split(/\s+/);
              if (descriptor && descriptor.endsWith('x')) {
                // Handle pixel density descriptors (e.g., 2x)
                const density = parseFloat(descriptor.replace('x', ''));
                if (density > highestDensity) {
                  highestDensity = density;
                  highestResSrcsetUrl = url;
                }
              } else if (descriptor && descriptor.endsWith('w')) {
                // Handle width descriptors (e.g., 800w)
                const width = parseInt(descriptor.replace('w', ''));
                if (width > highestWidth) {
                  highestWidth = width;
                  highestResSrcsetUrl = url;
                }
              }
            }
          }
          
          return {
            url: src,
            srcsetUrl: highestResSrcsetUrl,
            dataUrls: Object.values(dataAttributes).filter(v => v && typeof v === 'string' && v.match(/\.(jpg|jpeg|png|webp|gif|avif)/i)),
            dimensions: {
              naturalWidth: img.naturalWidth || 0,
              naturalHeight: img.naturalHeight || 0,
              displayWidth: img.width,
              displayHeight: img.height,
              area: (img.naturalWidth || img.width || 0) * (img.naturalHeight || img.height || 0)
            },
            rect: {
              width: img.getBoundingClientRect().width,
              height: img.getBoundingClientRect().height
            },
            meta: {
              alt: img.alt || '',
              classes: img.className || '',
              id: img.id || ''
            }
          };
        })
        .sort((a, b) => {
          // Sort by area, largest first
          const aArea = a.dimensions.area || 0;
          const bArea = b.dimensions.area || 0;
          return bArea - aArea;
        });
    });
    
    // Second pass: try to find gallery/thumbnail elements and click them
    console.log("Looking for image galleries and thumbnails...");
    
    // Common selectors for thumbnails and galleries
    const gallerySelectors = [
      '.product-gallery', '.gallery', '.product-image-gallery',
      '[class*="product-gallery"]', '[class*="product-image"]', '[class*="thumbnail"]',
      '.thumbnails', '.product-thumbnails'
    ];
    
    let galleryImages: ImageData[] = [];
    
    for (const selector of gallerySelectors) {
      try {
        // Check if the selector exists
        const hasGallery = await page.evaluate((sel: string) => {
          return document.querySelector(sel) !== null;
        }, selector);
        
        if (hasGallery) {
          console.log(`Found gallery with selector: ${selector}`);
          
          // Find all clickable thumbnails in this gallery
          const thumbnailSelectors = [
            `${selector} img`, 
            `${selector} [role="button"]`,
            `${selector} li`, 
            `${selector} .thumbnail`,
            `${selector} [class*="thumbnail"]`
          ];
          
          for (const thumbSelector of thumbnailSelectors) {
            const thumbnailCount = await page.evaluate((sel: string) => {
              return document.querySelectorAll(sel).length;
            }, thumbSelector);
            
            if (thumbnailCount > 0 && thumbnailCount < 20) { // Don't try to click too many elements
              console.log(`Found ${thumbnailCount} thumbnails with selector: ${thumbSelector}`);
              
              // Click each thumbnail and extract images
              for (let i = 0; i < thumbnailCount; i++) {
                try {
                  // Take a screenshot before clicking (for debugging)
                  // await page.screenshot({ path: `before-click-${i}.png` });
                  
                  // Click the thumbnail
                  await page.evaluate((sel: string, index: number) => {
                    const thumbnails = document.querySelectorAll(sel);
                    if (thumbnails[index]) {
                      (thumbnails[index] as HTMLElement).click();
                    }
                  }, thumbSelector, i);
                  
                  // Wait for any new image to load
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  
                  // Extract the current main/large image
                  const newImages = await page.evaluate(() => {
                    // Look for the currently displayed large image
                    // Common patterns for main product images
                    const mainImageSelectors = [
                      '.product-image-main img', 
                      '.main-image img',
                      '.selected-image img',
                      '.active-image img',
                      '.current-image img',
                      '.product-image img',
                      // Broader selectors
                      '[class*="product-image-main"] img',
                      '[class*="main-image"] img',
                      '[class*="current"] img',
                      '[class*="selected"] img',
                      // Last resort - find the largest visible image
                      'img[src*="product"]',
                      'img'
                    ];
                    
                    for (const sel of mainImageSelectors) {
                      const imgs = document.querySelectorAll(sel);
                      
                      // Return the largest image
                      if (imgs.length > 0) {
                        return Array.from(imgs)
                          .filter(img => {
                            const imgElement = img as HTMLImageElement;
                            const rect = imgElement.getBoundingClientRect();
                            return rect.width > 200 && rect.height > 200 &&
                                   rect.top < window.innerHeight && rect.left < window.innerWidth;
                          })
                          .map(img => {
                            const imgElement = img as HTMLImageElement;
                            return {
                              url: imgElement.src,
                              dimensions: {
                                width: imgElement.naturalWidth || imgElement.width,
                                height: imgElement.naturalHeight || imgElement.height
                              }
                            };
                          })
                          .sort((a, b) => {
                            const aSize = a.dimensions.width * a.dimensions.height;
                            const bSize = b.dimensions.width * b.dimensions.height;
                            return bSize - aSize; // Sort by size, largest first
                          });
                      }
                    }
                    return [];
                  });
                  
                  if (newImages && newImages.length > 0) {
                    galleryImages.push(...newImages);
                  }
                } catch (error) {
                  console.error(`Error clicking thumbnail ${i}:`, error);
                  // Continue with next thumbnail
                }
              }
              
              // If we found images, no need to try more selectors
              if (galleryImages.length > 0) {
                break;
              }
            }
          }
          
          // If we found a working gallery with images, no need to try more gallery selectors
          if (galleryImages.length > 0) {
            break;
          }
        }
      } catch (error) {
        console.error(`Error processing gallery selector ${selector}:`, error);
        // Continue with next selector
      }
    }
    
    console.log(`Found ${galleryImages.length} images from gallery interactions`);
    
    // Third pass: Look for zoom buttons and try to access full-size images
    const zoomSelectors = [
      '[class*="zoom"]', 
      '[class*="enlarge"]',
      '[aria-label*="zoom"]',
      '[aria-label*="enlarge"]',
      '[title*="zoom"]',
      '[title*="enlarge"]'
    ];
    
    for (const selector of zoomSelectors) {
      try {
        const hasZoomButton = await page.evaluate((sel: string) => {
          return document.querySelector(sel) !== null;
        }, selector);
        
        if (hasZoomButton) {
          console.log(`Found zoom button with selector: ${selector}`);
          
          // Click the zoom button
          await page.evaluate((sel: string) => {
            const element = document.querySelector(sel);
            if (element) {
              (element as HTMLElement).click();
            }
          }, selector);
          
          // Wait for any modal or enlarged image to appear
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Extract the zoomed image
          const zoomedImages = await page.evaluate(() => {
            // Modal or lightbox selectors
            const modalSelectors = [
              '.modal img', 
              '.lightbox img',
              '.zoom-modal img',
              '[class*="modal"] img',
              '[class*="lightbox"] img',
              '[class*="zoom"] img',
              // Last resort - find the largest image currently visible
              'img'
            ];
            
            for (const sel of modalSelectors) {
              const imgs = document.querySelectorAll(sel);
              if (imgs.length > 0) {
                return Array.from(imgs)
                  .filter(img => {
                    const rect = (img as HTMLImageElement).getBoundingClientRect();
                    return rect.width > 300 && rect.height > 300;
                  })
                  .map(img => {
                    const imgElement = img as HTMLImageElement;
                    return {
                      url: imgElement.src,
                      dimensions: {
                        width: imgElement.naturalWidth || imgElement.width,
                        height: imgElement.naturalHeight || imgElement.height
                      }
                    };
                  })
                  .sort((a, b) => {
                    const aSize = a.dimensions.width * a.dimensions.height;
                    const bSize = b.dimensions.width * b.dimensions.height;
                    return bSize - aSize; // Sort by size, largest first
                  });
              }
            }
            return [];
          });
          
          if (zoomedImages && zoomedImages.length > 0) {
            galleryImages.push(...zoomedImages);
            
            // Close the modal if possible
            await page.evaluate(() => {
              const closeButtons = [
                '.modal-close', 
                '.close-button',
                '[class*="close"]',
                'button[aria-label*="close"]',
                '[role="button"][aria-label*="close"]'
              ];
              
              for (const sel of closeButtons) {
                const closeBtn = document.querySelector(sel);
                if (closeBtn) {
                  (closeBtn as HTMLElement).click();
                  return;
                }
              }
              
              // Last resort - press ESC key
              const event = new KeyboardEvent('keydown', {
                key: 'Escape',
                code: 'Escape',
                keyCode: 27,
                which: 27,
                bubbles: true
              });
              document.dispatchEvent(event);
            });
            
            // Wait for modal to close
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      } catch (error) {
        console.error(`Error processing zoom selector ${selector}:`, error);
        // Continue with next selector
      }
    }
    
    // Process all collected images
    const allImageCandidates: string[] = [];
    
    // Add initial images
    initialImages.forEach((img: any) => {
      if (img.url) allImageCandidates.push(img.url);
      if (img.srcsetUrl) allImageCandidates.push(img.srcsetUrl);
      if (img.dataUrls && img.dataUrls.length) {
        allImageCandidates.push(...img.dataUrls);
      }
    });
    
    // Add gallery images
    galleryImages.forEach(img => {
      if (img.url) allImageCandidates.push(img.url);
    });
    
    // Process, deduplicate and prioritize images
    return processImageCandidates(allImageCandidates, url);
    
  } catch (error) {
    console.error("Error in Puppeteer image extraction:", error);
    return [];
  }
}

/**
 * Process image candidates - convert relative URLs, deduplicate, etc.
 */
function processImageCandidates(imageCandidates: string[], baseUrl: string): string[] {
  // Deduplicate images
  const uniqueUrls = new Set<string>();
  const processedUrls: string[] = [];
  
  for (let imgUrl of imageCandidates) {
    try {
      // Skip invalid URLs
      if (!imgUrl || typeof imgUrl !== 'string') continue;
      
      // Handle protocol-relative URLs
      if (imgUrl.startsWith('//')) {
        imgUrl = 'https:' + imgUrl;
      }
      
      // Handle relative URLs
      if (!imgUrl.startsWith('http')) {
        try {
          imgUrl = new URL(imgUrl, baseUrl).toString();
        } catch (e) {
          console.error(`Error converting relative URL ${imgUrl}:`, e);
          continue;
        }
      }
      
      // Skip URLs that don't look like images
      if (!imgUrl.match(/\.(jpg|jpeg|png|webp|gif|avif|svg)/i) && 
          !imgUrl.includes('image') && 
          !imgUrl.includes('product')) {
        continue;
      }
      
      // Apply URL transformations to get highest quality
      const transformedUrl = transformImageUrl(imgUrl, baseUrl);
      
      // Add if it's not a duplicate
      const urlKey = transformedUrl.split('?')[0]; // Remove query parameters for deduplication
      if (!uniqueUrls.has(urlKey)) {
        uniqueUrls.add(urlKey);
        processedUrls.push(transformedUrl);
      }
    } catch (e) {
      console.error(`Error processing image URL ${imgUrl}:`, e);
    }
  }
  
  // Score and sort URLs to prioritize product images
  const scoredUrls = processedUrls.map(url => {
    const urlLower = url.toLowerCase();
    
    // Define scoring factors based on URL analysis
    let score = 0;
    
    // Filename size indicators
    if (urlLower.includes('large') || urlLower.includes('big')) score += 10;
    if (urlLower.includes('full') || urlLower.includes('original')) score += 15;
    if (urlLower.includes('zoom') || urlLower.includes('hires')) score += 20;
    if (urlLower.includes('2x') || urlLower.includes('3x')) score += 8;
    
    // Product indicators
    if (urlLower.includes('product')) score += 15;
    if (urlLower.includes('main')) score += 10;
    if (urlLower.includes('hero')) score += 5;
    if (urlLower.includes('gallery')) score += 5;
    if (urlLower.includes('detail')) score += 8;
    
    // Resolution indicators in URL
    const resolutionMatch = urlLower.match(/(\d{3,4})x(\d{3,4})/);
    if (resolutionMatch) {
      const width = parseInt(resolutionMatch[1]);
      const height = parseInt(resolutionMatch[2]);
      // Higher resolution = higher score
      if (width * height > 1000000) score += 25; // > 1 megapixel
      else if (width * height > 500000) score += 15; // > 0.5 megapixel
      else if (width * height > 250000) score += 5; // > 0.25 megapixel
    }
    
    // Negative signals (reduces score)
    if (urlLower.includes('thumb') || urlLower.includes('icon')) score -= 20;
    if (urlLower.includes('small') || urlLower.includes('mini')) score -= 15;
    if (urlLower.includes('avatar') || urlLower.includes('profile')) score -= 10;
    if (urlLower.includes('logo') || urlLower.includes('background')) score -= 10;
    if (urlLower.includes('banner') || urlLower.includes('promotion')) score -= 5;
    
    // File format score
    if (urlLower.endsWith('.webp')) score += 2; // Modern format
    if (urlLower.endsWith('.png')) score += 1; // Lossless
    
    return { url, score };
  });
  
  // Sort by score (highest first) and extract just the URLs
  return scoredUrls
    .sort((a, b) => b.score - a.score)
    .map(item => item.url)
    .slice(0, 25); // Limit to 25 images
}

/**
 * Transform image URL to attempt to get highest resolution
 */
function transformImageUrl(imageUrl: string, baseUrl: string): string {
  try {
    // Parse URL to get hostname
    const parsedUrl = new URL(imageUrl);
    const hostname = parsedUrl.hostname.toLowerCase();
    const path = parsedUrl.pathname;
    
    // Store the original URL as fallback
    let transformedUrl = imageUrl;
    
    // Fix protocol-relative URLs
    if (transformedUrl.startsWith('//')) {
      transformedUrl = 'https:' + transformedUrl;
    }
    
    // XTool specific transformations (based on your example)
    if (hostname.includes('xtool.com')) {
      // Remove version parameters (they're not for size)
      transformedUrl = transformedUrl.replace(/(\?v=\d+)/, '');
    }
    
    // Shopify: Remove size parameters to get full resolution
    if (hostname.includes('shopify.com') || hostname.includes('cdn.shopify.com')) {
      // Transform product_100x100.jpg to product.jpg
      transformedUrl = transformedUrl.replace(/_((?:\d+x\d+)|(?:\d+))\./i, '.');
      // Also handle _small, _medium, _large, _master patterns
      transformedUrl = transformedUrl.replace(/_(small|medium|large|compact|master)\./i, '.');
    }
    
    // WooCommerce/WordPress: Remove size suffixes
    if (path.match(/\-\d+x\d+\.(jpe?g|png|gif|webp)/i)) {
      transformedUrl = transformedUrl.replace(/\-\d+x\d+\.(jpe?g|png|gif|webp)/i, '.$1');
    }
    
    // Amazon: Use highest resolution
    if (hostname.includes('amazon.com') || hostname.includes('amazon.') || hostname.includes('amzn')) {
      transformedUrl = transformedUrl
        .replace(/\._SX\d+_/i, '._SX1500_')
        .replace(/\._SY\d+_/i, '._SY1500_')
        .replace(/\._SL\d+_/i, '._SL1500_');
    }
    
    // eBay: Use highest resolution
    if (hostname.includes('ebay.com') || hostname.includes('ebayimg.com')) {
      transformedUrl = transformedUrl.replace(/s\-l\d+\./i, 's-l1600.');
    }
    
    // Walmart: Get full resolution images
    if (hostname.includes('walmart.com') || hostname.includes('walmartimages.com')) {
      transformedUrl = transformedUrl.replace(/\?\w+=\w+$/, '');
    }
    
    // Aliexpress/Alibaba
    if (hostname.includes('aliexpress') || hostname.includes('alibaba') || hostname.includes('alicdn.com')) {
      // Replace sizing parameters with largest available
      transformedUrl = transformedUrl.replace(/(_\d+x\d+)?(Q\d+)?\.jpg/, '.jpg');
    }
    
    // Etsy
    if (hostname.includes('etsy.com') || hostname.includes('etsystatic.com')) {
      // Replace Etsy thumbnails with full images
      transformedUrl = transformedUrl.replace(/il_(fullxfull|300x300|340x270|570xN|75x75|570xN)/, 'il_fullxfull');
    }
    
    // Lazada/Daraz (common in Asia)
    if (hostname.includes('lazada') || hostname.includes('daraz')) {
      transformedUrl = transformedUrl.replace(/_\w+\.jpg/, '.jpg');
    }
    
    // Home Depot
    if (hostname.includes('homedepot.com') || hostname.includes('homedepotimages.com')) {
      // Replace dimensions with largest
      transformedUrl = transformedUrl.replace(/(\d+)x(\d+)/, '1000x1000');
    }
    
    // Cloudinary (used by many e-commerce sites)
    if (hostname.includes('cloudinary.com') || transformedUrl.includes('cloudinary')) {
      // Optimize for highest quality
      transformedUrl = transformedUrl
        .replace(/\/w_\d+/, '/w_1500')
        .replace(/\/h_\d+/, '/h_1500')
        .replace(/\/q_\d+/, '/q_100');
    }
    
    // General size indicators in filenames
    transformedUrl = transformedUrl
      .replace(/small/i, 'large')
      .replace(/thumb/i, 'full')
      .replace(/tiny/i, 'large')
      .replace(/mini/i, 'full');
    
    return transformedUrl;
  } catch (e) {
    console.error("Error transforming image URL:", e);
    // If URL parsing fails, return the original
    return imageUrl;
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

// Function to extract basic data from HTML
function extractBasicData(html: string, url: string): ExtractedData {
  const $ = cheerio.load(html);
  
  // Basic extraction logic
  const title = $('title').text().trim();
  const h1 = $('h1').first().text().trim();
  const metaDescription = $('meta[name="description"]').attr('content') || '';
  
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
  // Try to extract from URL
  try {
    const hostname = new URL(url).hostname;
    const parts = hostname.split('.');
    
    // Get the domain name (usually the second level domain)
    if (parts.length >= 2) {
      const domain = parts[parts.length - 2];
      // Capitalize first letter
      return domain.charAt(0).toUpperCase() + domain.slice(1);
    }
  } catch (e) {
    console.error("Error extracting company from URL:", e);
  }
  
  // Try to extract from title
  const titleParts = title.split(/[|\-–—]/);
  if (titleParts.length > 1) {
    return titleParts[titleParts.length - 1].trim();
  }
  
  return "Unknown";
}

// Function to merge data from different sources
function mergeExtractionData(scrapedData: ExtractedData, claudeData: any): ExtractedData {
  // If Claude data is not available, just return scraped data
  if (!claudeData) return scrapedData;
  
  // Create a copy of scraped data
  const result = { ...scrapedData };
  
  // Merge with Claude data with priority rules
  for (const key in claudeData) {
    // Skip empty or null values from Claude
    if (claudeData[key] === null || claudeData[key] === undefined || claudeData[key] === '') continue;
    
    // Priority fields where we prefer Claude's extraction
    const claudePriorityFields = ['machine_category', 'price', 'enclosure', 'wifi', 'camera'];
    
    // Priority fields where we prefer scraper's extraction
    const scraperPriorityFields = ['image_url', 'images'];
    
    // Apply priority rules
    if (claudePriorityFields.includes(key)) {
      // Prefer Claude data for these fields
      result[key] = claudeData[key];
    } else if (scraperPriorityFields.includes(key)) {
      // Prefer scraped data for these fields
      // Already set from scraped data
    } else {
      // For all other fields, use Claude if available, otherwise keep scraped
      if (!result[key] || result[key] === "Unknown" || result[key] === '') {
        result[key] = claudeData[key];
      }
    }
  }
  
  return result;
} 