#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Configuration
const SOURCE_DIR = path.resolve(process.env.HOME, 'Desktop', 'Learn Lightburn');
const API_ENDPOINT = 'http://localhost:3000/api/learn-lightburn/upload-image';

// Image mappings (filename pattern -> subfolder)
const mappings = [
  // Hero section - main Learn Lightburn logo
  { pattern: 'Learn-Lightburn-Logo', target: 'hero' },
  
  // Partner logos 
  { pattern: '57d925ee-92cd-4c88-a98a-ee780147a8dd', target: 'partners' },
  { pattern: '56a880a-655-ed0b-54f0-28e61d051eb', target: 'partners' },
  
  // Instructor profile image (Brandon)
  { pattern: 'DSC08516', target: 'instructor' },
  
  // Project examples (laser-cut/engraved items)
  { pattern: 'Build11', target: 'projects' },
  { pattern: 'DSC00625', target: 'projects' },
  { pattern: 'DSC05073', target: 'projects' },
  { pattern: 'DSC09210', target: 'projects' },
  { pattern: '02db36-54-2a7-8874-2a7dc70b6402', target: 'projects' },
  { pattern: 'a247661-725c-277c-fea7-a247a3a74567', target: 'projects' },
  
  // Footer logo
  { pattern: 'Screenshot_2025-02-25_at_2.49', target: 'misc' }
];

function uploadImage(filePath, subfolder) {
  console.log(`Uploading ${filePath} to ${subfolder}...`);
  
  try {
    // Execute curl command to upload the file
    const curlCommand = `curl -X POST ${API_ENDPOINT} -F "file=@${filePath}" -F "subfolder=${subfolder}"`;
    console.log(`Executing: ${curlCommand}`);
    
    const result = execSync(curlCommand, { encoding: 'utf-8' });
    const data = JSON.parse(result);
    
    console.log(`✅ Uploaded successfully: ${data.url}`);
    return data;
  } catch (error) {
    console.error(`❌ Error uploading ${filePath}:`, error.message);
    return null;
  }
}

function processFiles() {
  const files = fs.readdirSync(SOURCE_DIR);
  
  console.log(`Found ${files.length} files in ${SOURCE_DIR}`);
  
  for (const mapping of mappings) {
    // Find a file that matches this pattern
    const matchingFile = files.find(file => file.includes(mapping.pattern));
    
    if (matchingFile) {
      const filePath = path.join(SOURCE_DIR, matchingFile);
      uploadImage(filePath, mapping.target);
    } else {
      console.warn(`⚠️ No file found matching pattern: ${mapping.pattern}`);
    }
  }
  
  console.log('Done processing all files!');
}

// Execute
processFiles(); 