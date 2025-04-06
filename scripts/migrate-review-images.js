/**
 * Review Images Migration Script
 * 
 * This script migrates images from Webflow CDN to Supabase storage for reviews.
 * It finds machines with reviews containing <img> tags, downloads the images,
 * optimizes them, uploads to Supabase, and updates the database references.
 */

// Required dependencies
const { createClient } = require('@supabase/supabase-js');
const cheerio = require('cheerio');
const sharp = require('sharp');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Parse command line arguments
const args = process.argv.slice(2);
const TEST_MODE = args.includes('--test');
const TEST_MACHINE_ID = args[args.indexOf('--machine-id') + 1] || null;
const VERBOSE = args.includes('--verbose');

// Constants
const MAX_WIDTH = 1200; // Maximum width for images
const TEMP_DIR = path.join(__dirname, 'temp_images');
const BUCKET_NAME = 'images';
// Webflow CDN domains
const WEBFLOW_DOMAINS = [
  'webflow.com',
  'cdn.prod.website-files.com',
  'uploads-ssl.webflow.com',
  'assets.website-files.com',
  'global-uploads.webflow.com'
];

// Create Supabase client with service role key (admin access)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Ensure temp directory exists
async function ensureTempDir() {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true });
    console.log(`Created temporary directory: ${TEMP_DIR}`);
  } catch (error) {
    console.error('Error creating temp directory:', error);
    throw error;
  }
}

// Check if URL is from Webflow CDN
function isWebflowUrl(url) {
  if (!url) return false;
  return WEBFLOW_DOMAINS.some(domain => url.includes(domain));
}

// Download image from URL
async function downloadImage(url, filePath) {
  try {
    console.log(`Downloading image from: ${url}`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }
    
    const buffer = await response.arrayBuffer();
    await fs.writeFile(filePath, Buffer.from(buffer));
    console.log(`Image saved to: ${filePath}`);
    return buffer;
  } catch (error) {
    console.error(`Error downloading image from ${url}:`, error);
    throw error;
  }
}

// Optimize image (resize if needed and convert to WebP)
async function optimizeImage(inputPath, outputPath) {
  try {
    console.log(`Optimizing image: ${inputPath}`);
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    
    let pipeline = image;
    
    // Resize if width is greater than MAX_WIDTH
    if (metadata.width > MAX_WIDTH) {
      console.log(`Resizing image from ${metadata.width}px to ${MAX_WIDTH}px width`);
      pipeline = pipeline.resize(MAX_WIDTH);
    }
    
    // Convert to WebP format with good quality
    await pipeline.webp({ quality: 85 }).toFile(outputPath);
    console.log(`Optimized image saved to: ${outputPath}`);
    
    return { 
      originalWidth: metadata.width,
      originalHeight: metadata.height,
      originalFormat: metadata.format,
      originalSize: metadata.size
    };
  } catch (error) {
    console.error(`Error optimizing image ${inputPath}:`, error);
    throw error;
  }
}

// Upload image to Supabase storage
async function uploadImageToSupabase(filePath, fileName) {
  try {
    console.log(`Uploading image to Supabase: ${fileName}`);
    const fileBuffer = await fs.readFile(filePath);
    
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(`reviews/${fileName}`, fileBuffer, {
        contentType: 'image/webp',
        upsert: true
      });
    
    if (error) {
      throw error;
    }
    
    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(`reviews/${fileName}`);
    
    console.log(`Image uploaded successfully: ${publicUrlData.publicUrl}`);
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error(`Error uploading image to Supabase: ${fileName}`, error);
    throw error;
  }
}

// Insert record into images table
async function createImageRecord(machineId, url, altText, sourceType, sourceId, sortOrder) {
  try {
    console.log(`Creating image record for machine ${machineId} (${sourceType})`);
    const imageId = uuidv4();
    
    const { data, error } = await supabase
      .from('images')
      .insert({
        id: imageId,
        machine_id: machineId,
        url: url,
        alt_text: altText || '',
        source_type: sourceType,
        source_id: sourceId,
        sort_order: sortOrder,
        created_at: new Date().toISOString()
      })
      .select();
    
    if (error) {
      throw error;
    }
    
    console.log(`Created image record with ID: ${imageId}`);
    return data[0];
  } catch (error) {
    console.error(`Error creating image record for machine ${machineId}:`, error);
    throw error;
  }
}

// Process a single image in a review
async function processImage(imgElement, machineId, $, sourceType, sourceId, sortOrder) {
  try {
    const originalSrc = $(imgElement).attr('src');
    const altText = $(imgElement).attr('alt') || '';
    
    if (!originalSrc || !isWebflowUrl(originalSrc)) {
      console.log(`Skipping non-Webflow image: ${originalSrc}`);
      // Add lazy loading attribute even to non-migrated images
      $(imgElement).attr('loading', 'lazy');
      $(imgElement).attr('decoding', 'async');
      return null;
    }
    
    console.log(`Processing image: ${originalSrc} (${sourceType}, order: ${sortOrder})`);
    
    // Generate unique filename
    const fileId = uuidv4();
    const tempFilePath = path.join(TEMP_DIR, `${fileId}_original`);
    const optimizedFilePath = path.join(TEMP_DIR, `${fileId}.webp`);
    
    // Download image
    await downloadImage(originalSrc, tempFilePath);
    
    // Optimize image
    const imageMetadata = await optimizeImage(tempFilePath, optimizedFilePath);
    
    // Upload to Supabase
    const publicUrl = await uploadImageToSupabase(optimizedFilePath, `${fileId}.webp`);
    
    // Create database record
    const imageRecord = await createImageRecord(machineId, publicUrl, altText, sourceType, sourceId, sortOrder);
    
    // Update the src attribute in HTML
    $(imgElement).attr('src', publicUrl);
    
    // Add lazy loading and other performance attributes
    $(imgElement).attr('loading', 'lazy');
    $(imgElement).attr('decoding', 'async');
    
    // If width/height information is available, add it to prevent layout shifts
    if (imageMetadata.originalWidth && imageMetadata.originalHeight) {
      $(imgElement).attr('width', imageMetadata.originalWidth > MAX_WIDTH ? MAX_WIDTH : imageMetadata.originalWidth);
      $(imgElement).attr('height', Math.round((imageMetadata.originalHeight / imageMetadata.originalWidth) * 
        (imageMetadata.originalWidth > MAX_WIDTH ? MAX_WIDTH : imageMetadata.originalWidth)));
    }
    
    // Clean up temp files
    await fs.unlink(tempFilePath);
    await fs.unlink(optimizedFilePath);
    
    return {
      originalSrc,
      newSrc: publicUrl,
      altText,
      id: imageRecord.id,
      metadata: imageMetadata,
      sourceType,
      sortOrder
    };
  } catch (error) {
    console.error('Error processing image:', error);
    return null;
  }
}

// Process a machine's review
async function processMachineReview(machine) {
  try {
    console.log(`\nProcessing machine: ${machine['Machine Name']} (${machine.id})`);
    
    let reviewContent = machine.Review;
    let brandonsContent = machine["Brandon's Take"];
    let reviewUpdated = false;
    let brandonsUpdated = false;
    
    // Process review content
    if (reviewContent && reviewContent.includes('<img')) {
      console.log('Processing full review content');
      const $ = cheerio.load(reviewContent);
      const imgElements = $('img').toArray();
      console.log(`Found ${imgElements.length} images in review`);
      
      if (imgElements.length > 0) {
        // Process each image, tracking its order
        for (let i = 0; i < imgElements.length; i++) {
          const sourceType = 'review';
          const sourceId = machine.id; // Using machine ID as source ID for main review
          const sortOrder = i + 1; // 1-based sort order
          
          await processImage(imgElements[i], machine.id, $, sourceType, sourceId, sortOrder);
        }
        
        // Get updated HTML
        reviewContent = $.html();
        reviewUpdated = true;
      }
    }
    
    // Process Brandon's Take content
    if (brandonsContent && brandonsContent.includes('<img')) {
      console.log("Processing Brandon's Take content");
      const $ = cheerio.load(brandonsContent);
      const imgElements = $('img').toArray();
      console.log(`Found ${imgElements.length} images in Brandon's Take`);
      
      if (imgElements.length > 0) {
        // Process each image, tracking its order
        for (let i = 0; i < imgElements.length; i++) {
          const sourceType = 'brandons-take';
          const sourceId = uuidv4(); // Generate a unique ID for Brandon's Take source
          const sortOrder = i + 1; // 1-based sort order
          
          await processImage(imgElements[i], machine.id, $, sourceType, sourceId, sortOrder);
        }
        
        // Get updated HTML
        brandonsContent = $.html();
        brandonsUpdated = true;
      }
    }
    
    // Update machine record if needed
    if (reviewUpdated || brandonsUpdated) {
      const updateData = {};
      
      if (reviewUpdated) {
        updateData.Review = reviewContent;
      }
      
      if (brandonsUpdated) {
        updateData["Brandon's Take"] = brandonsContent;
      }
      
      console.log('Updating machine record with new HTML content');
      
      if (!TEST_MODE) {
        const { error } = await supabase
          .from('machines')
          .update(updateData)
          .eq('id', machine.id);
        
        if (error) {
          throw error;
        }
        
        console.log(`Updated machine record: ${machine.id}`);
      } else {
        console.log(`TEST MODE: Would update machine record: ${machine.id}`);
      }
    } else {
      console.log('No updates needed for this machine');
    }
    
    return { reviewUpdated, brandonsUpdated };
  } catch (error) {
    console.error(`Error processing machine ${machine.id}:`, error);
    return { reviewUpdated: false, brandonsUpdated: false, error };
  }
}

// Main function
async function main() {
  try {
    console.log('Starting review images migration...');
    
    if (TEST_MODE) {
      console.log('Running in TEST MODE');
      if (TEST_MACHINE_ID) {
        console.log(`Testing with specific machine ID: ${TEST_MACHINE_ID}`);
      } else {
        console.log('Will test with the first machine found containing images');
      }
    }
    
    // Ensure temp directory exists
    await ensureTempDir();
    
    // Build query to get machines with reviews containing images
    let query = supabase
      .from('machines')
      .select('id, "Machine Name", Review, "Brandon\'s Take"')
      .or('Review.ilike.%<img%, "Brandon\'s Take".ilike.%<img%');
    
    // If testing with a specific machine ID, use that
    if (TEST_MODE && TEST_MACHINE_ID) {
      query = query.eq('id', TEST_MACHINE_ID);
    }
    
    // If in test mode without a specific ID, limit to 1
    if (TEST_MODE && !TEST_MACHINE_ID) {
      query = query.limit(1);
    }
    
    // Execute query
    const { data: machines, error } = await query;
    
    if (error) {
      throw error;
    }
    
    console.log(`Found ${machines.length} machines with reviews containing images`);
    
    if (machines.length === 0) {
      console.log('No machines found. Exiting.');
      return;
    }
    
    // Process each machine
    const results = {
      total: machines.length,
      processed: 0,
      updated: 0,
      errors: 0,
      images: {
        processed: 0,
        skipped: 0,
        migrated: 0
      }
    };
    
    for (const machine of machines) {
      try {
        const { reviewUpdated, brandonsUpdated, error } = await processMachineReview(machine);
        
        results.processed++;
        
        if (reviewUpdated || brandonsUpdated) {
          results.updated++;
        }
        
        if (error) {
          results.errors++;
        }
        
      } catch (error) {
        console.error(`Error processing machine ${machine.id}:`, error);
        results.errors++;
      }
    }
    
    // Clean up temp directory
    await fs.rm(TEMP_DIR, { recursive: true, force: true });
    
    // Print summary
    console.log('\n----- Migration Summary -----');
    console.log(`Total machines processed: ${results.processed}/${results.total}`);
    console.log(`Machines updated: ${results.updated}`);
    console.log(`Errors encountered: ${results.errors}`);
    
    if (TEST_MODE) {
      console.log('\nThis was a TEST RUN. No changes were committed to the database.');
    } else {
      console.log('\nMigration complete!');
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Display usage information if --help is specified
if (args.includes('--help')) {
  console.log(`
Review Images Migration Script
------------------------------

Usage: node migrate-review-images.js [options]

Options:
  --test               Run in test mode without committing changes
  --machine-id <id>    Process only a specific machine ID
  --verbose            Display more detailed logs
  --help               Display this help message

Examples:
  node migrate-review-images.js                     Run the full migration
  node migrate-review-images.js --test              Test the migration with the first machine found
  node migrate-review-images.js --test --machine-id 4a59d933-86b3-474e-a05c-2445653455ac  Test with a specific machine
  `);
  process.exit(0);
}

// Run the script
main();