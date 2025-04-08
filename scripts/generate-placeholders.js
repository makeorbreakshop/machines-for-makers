// Script to generate placeholder images
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Ensure placeholders directory exists
const placeholdersDir = path.join(__dirname, '../public/images/placeholders');
if (!fs.existsSync(placeholdersDir)) {
  fs.mkdirSync(placeholdersDir, { recursive: true });
  console.log(`Created directory: ${placeholdersDir}`);
}

// Generate placeholder images for YouTube comments
async function generateYouTubeCommentPlaceholders() {
  // Size for YouTube comment screenshots
  const width = 500;
  const height = 175;
  
  for (let i = 1; i <= 8; i++) {
    const outputPath = path.join(placeholdersDir, `youtube-comment-${i}.webp`);
    
    await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
    .composite([
      {
        input: Buffer.from(`
          <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#ffffff"/>
            <text x="50%" y="50%" font-family="Arial" font-size="16" fill="#000000" text-anchor="middle" dominant-baseline="middle">
              YouTube Comment ${i} (Placeholder)
            </text>
            <text x="50%" y="70%" font-family="Arial" font-size="14" fill="#666666" text-anchor="middle" dominant-baseline="middle">
              "Great laser cutting tutorial!"
            </text>
          </svg>
        `),
        top: 0,
        left: 0
      }
    ])
    .toFormat('webp')
    .toFile(outputPath);
    
    console.log(`Generated: ${outputPath}`);
  }
}

// Generate placeholder images for project examples
async function generateProjectPlaceholders() {
  // Square size for project examples
  const size = 400;
  
  for (let i = 1; i <= 6; i++) {
    const outputPath = path.join(placeholdersDir, `laser-project-${i}.webp`);
    
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 240, g: 240, b: 240, alpha: 1 }
      }
    })
    .composite([
      {
        input: Buffer.from(`
          <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#f0f0f0"/>
            <rect x="75" y="75" width="${size-150}" height="${size-150}" fill="#2e88c7" rx="10"/>
            <text x="50%" y="50%" font-family="Arial" font-size="24" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">
              Laser Project ${i}
            </text>
            <text x="50%" y="65%" font-family="Arial" font-size="18" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">
              Placeholder Image
            </text>
          </svg>
        `),
        top: 0,
        left: 0
      }
    ])
    .toFormat('webp')
    .toFile(outputPath);
    
    console.log(`Generated: ${outputPath}`);
  }
}

// Generate placeholder images for partner logos
async function generatePartnerLogos() {
  // Size for partner logos
  const width = 112;
  const height = 48;
  
  for (let i = 1; i <= 2; i++) {
    const outputPath = path.join(placeholdersDir, `partner-logo-${i}.webp`);
    
    await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
    .composite([
      {
        input: Buffer.from(`
          <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#ffffff"/>
            <text x="50%" y="50%" font-family="Arial" font-size="14" fill="#2e88c7" text-anchor="middle" dominant-baseline="middle">
              Partner ${i}
            </text>
          </svg>
        `),
        top: 0,
        left: 0
      }
    ])
    .toFormat('webp')
    .toFile(outputPath);
    
    console.log(`Generated: ${outputPath}`);
  }
}

// Generate placeholder images for triple beam process
async function generateTripleBeamImages() {
  // Size for process images
  const width = 400;
  const height = 250;
  
  const titles = ['Design', 'Settings', 'Machine'];
  
  for (let i = 1; i <= 3; i++) {
    const outputPath = path.join(placeholdersDir, `triple-beam-${i}.webp`);
    
    await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 46, g: 136, b: 199, alpha: 1 }
      }
    })
    .composite([
      {
        input: Buffer.from(`
          <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#2e88c7"/>
            <text x="50%" y="40%" font-family="Arial" font-size="24" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">
              Triple Beam ${i}
            </text>
            <text x="50%" y="60%" font-family="Arial" font-size="20" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">
              ${titles[i-1]}
            </text>
          </svg>
        `),
        top: 0,
        left: 0
      }
    ])
    .toFormat('webp')
    .toFile(outputPath);
    
    console.log(`Generated: ${outputPath}`);
  }
}

// Generate all placeholders
async function generateAllPlaceholders() {
  console.log('Generating placeholder images...');
  
  await generateYouTubeCommentPlaceholders();
  await generateProjectPlaceholders();
  await generatePartnerLogos();
  await generateTripleBeamImages();
  
  console.log('All placeholder images generated successfully!');
  console.log('---------------------------------------------');
  console.log('Next steps:');
  console.log('1. Upload the actual images to Supabase using the /api/learn-lightburn/upload-image endpoint');
  console.log('2. Update the page code with the correct Supabase image URLs');
}

// Run the script
generateAllPlaceholders().catch(console.error); 