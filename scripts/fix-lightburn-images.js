// Script to check and fix Learn Lightburn images
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Base URL for images
const supabaseImageUrlBase = `${supabaseUrl}/storage/v1/object/public/images/learn-lightburn`;

// Function to check if an image exists
async function checkImageExists(imageUrl) {
  try {
    const response = await axios.head(imageUrl);
    return response.status === 200;
  } catch (error) {
    console.error(`Image does not exist: ${imageUrl}`);
    return false;
  }
}

// Extract image paths from the page file
async function extractImagePaths() {
  const filePath = path.join(__dirname, '../app/(site)/learn-lightburn-for-lasers/page.tsx');
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Find all image references with the pattern: ${supabaseImageUrlBase}/subfolder/ID_filename
  const regex = /\${supabaseImageUrlBase}\/([a-zA-Z0-9-_/]+\.(?:webp|jpg|jpeg|png))/g;
  let match;
  const imagePaths = [];
  
  while ((match = regex.exec(content)) !== null) {
    imagePaths.push(match[1]);
  }
  
  return imagePaths;
}

// Check all images and report status
async function checkAllImages() {
  const imagePaths = await extractImagePaths();
  console.log(`Found ${imagePaths.length} image references in the page`);
  
  const results = {
    total: imagePaths.length,
    existing: 0,
    missing: 0,
    missingPaths: []
  };
  
  for (const path of imagePaths) {
    const imageUrl = `${supabaseImageUrlBase}/${path}`;
    const exists = await checkImageExists(imageUrl);
    
    if (exists) {
      results.existing++;
    } else {
      results.missing++;
      results.missingPaths.push(path);
    }
  }
  
  console.log('=== Image Check Results ===');
  console.log(`Total images: ${results.total}`);
  console.log(`Existing images: ${results.existing}`);
  console.log(`Missing images: ${results.missing}`);
  
  if (results.missing > 0) {
    console.log('\nMissing images:');
    results.missingPaths.forEach(path => console.log(`- ${path}`));
  }
  
  return results;
}

// Main function
async function main() {
  console.log('Starting Learn Lightburn image check...');
  const results = await checkAllImages();
  
  // Provide guidance on next steps
  if (results.missing > 0) {
    console.log('\n=== Next Steps ===');
    console.log('1. Upload the missing images using the /api/learn-lightburn/upload-image endpoint');
    console.log('2. If original images are not available, update the page code with correct image paths');
    console.log('\nExample upload command:');
    console.log('curl -X POST http://localhost:3000/api/learn-lightburn/upload-image \\');
    console.log('  -F "file=@/path/to/image.jpg" \\');
    console.log('  -F "subfolder=comments"');
  } else {
    console.log('\nAll images are accounted for!');
  }
}

// Run the script
main().catch(console.error); 