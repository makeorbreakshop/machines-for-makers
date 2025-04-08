require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

// Path to the Learn Lightburn folder on desktop
const sourceFolder = path.join(process.env.HOME, 'Desktop/Learn Lightburn');

// Map of image files to their target subfolder in Supabase
const imageMap = {
  // Guarantee images
  '0fcdb0b-018d-11f-477a-3334e03e6f_30-day.webp': 'guarantee',
  
  // Process/Triple Beam images
  '2a78750-4353-da37-13dc-ccf751e6a75_Screenshot_2025-02-25_at_2.49.40_PM-1.jpg': 'process',
  'ee4cb6-bbfc-268e-03e8-825d730d480_Screenshot_2025-02-25_at_2.49.55_PM-1.jpg': 'process',
  'a26832e-38e6-cae3-8aea-b132b662ee8_Build11.jpg': 'process',
  
  // Project examples
  'c7b2ce-825-5c3-c676-4f2ace10426_DSC00625.jpg': 'projects',
  'f6dcaed-2c33-c8e3-5308-60f0defb1568_DSC09210.jpg': 'projects',
  'a247661-725c-277c-fea7-a247a3a74567_Screenshot_2025-02-25_at_2.21.49_PM-1.jpg': 'projects',
  '73dd13-d55e-a8ea-d32c-b5c881e1741_DSC08516.jpg': 'projects',
  'f67f81b-4447-e26-ded0-35ae00f427ad_DSC05073-1.jpg': 'projects',
  '02db36-54-2a7-8874-2a7dc70b6402_Screenshot_2025-02-25_at_2.31.22_PM.jpg': 'projects',
  
  // Instructor image
  'brandon.jpg': 'instructor',
  
  // Hero/Logo
  '7a2ca51-8fe4-4ccc-cdd2-7c8fea70d8ae_Learn-Lightburn-Logo-1.jpg': 'hero',
  
  // Story image
  'ac7aded-178c-d125-77bc-ac5a8435dc5_Screenshot_2025-02-25_at_8.20.21_AM.jpg': 'story',

  // Comments
  '2f4a655-f7e5-5b1f-86f-32ad2de3f40c_Screenshot_2025-02-25_at_12.webp': 'comments',
  '4b746fb-bea-5f84-b6e4-a87225ec2811_Screenshot_2025-02-25_at_12.webp': 'comments',
  '5d7bdb0-bddf-ee4b-236e-5a88efbf12d_Screenshot_2025-02-25_at_12.webp': 'comments',
  'cc23fee-cbb0-36e1-547-d72baaf4383_Screenshot_2025-02-25_at_12.webp': 'comments',
  '670e0fe-5b1a-f836-dd5b-b4dafe803bc_Screenshot_2025-02-24_at_1.webp': 'comments',
  'f1bc77c-0be-82e1-ee6a-f4c81eac7662_Screenshot_2025-02-24_at_1.webp': 'comments',
  '60cf0b-6e76-058-6820-5dd1f74c223_Screenshot_2025-02-24_at_1.webp': 'comments',
  'ff6f25-77c1-7fec-2e1c-238b5000f80_Screenshot_2025-02-24_at_1.webp': 'comments',
  'b7cb28-ffa-fa2e-0d72-306cd0ff0c0_Screenshot_2025-02-25_at_12.webp': 'comments',
  
  // Partners
  'b0b3be5-3e10-daac-2741-f441345f3c3_57d925ee-92cd-4c88-a98a-ee780147a8dd.webp': 'partners',
  '56a880a-655-ed0b-54f0-28e61d051eb_Screenshot_2025-02-24_at_3.webp': 'partners',
  'cb08701-a54-e663-fd0f-1274057035b8_Screenshot_2025-02-24_at_3.webp': 'partners'
};

// Upload a single file to Supabase through the API endpoint
async function uploadFile(filePath, subfolder) {
  try {
    const filename = path.basename(filePath);
    console.log(`Uploading ${filename} to subfolder ${subfolder}...`);
    
    const formData = new FormData();
    const fileStream = fs.createReadStream(filePath);
    
    // Set appropriate content type based on file extension
    let contentType;
    if (filename.toLowerCase().endsWith('.jpg') || filename.toLowerCase().endsWith('.jpeg')) {
      contentType = 'image/jpeg';
    } else if (filename.toLowerCase().endsWith('.png')) {
      contentType = 'image/png';
    } else if (filename.toLowerCase().endsWith('.webp')) {
      contentType = 'image/webp';
    } else if (filename.toLowerCase().endsWith('.gif')) {
      contentType = 'image/gif';
    } else {
      contentType = 'application/octet-stream';
    }
    
    formData.append('file', fileStream, {
      filename,
      contentType
    });
    formData.append('subfolder', subfolder);
    formData.append('contentType', contentType);
    
    const response = await axios.post('http://localhost:3000/api/learn-lightburn/upload-image', formData, {
      headers: {
        ...formData.getHeaders()
      }
    });
    
    console.log(`Successfully uploaded: ${filename}`);
    console.log(`Public URL: ${response.data.url}`);
    return response.data;
  } catch (error) {
    console.error(`Error uploading ${path.basename(filePath)}:`, error.response?.data || error.message);
    return null;
  }
}

// Process all files in the source folder
async function processAllFiles() {
  console.log(`Processing files from: ${sourceFolder}`);
  
  const files = fs.readdirSync(sourceFolder);
  const results = {
    success: 0,
    failed: 0,
    skipped: 0
  };
  
  for (const file of files) {
    if (imageMap[file]) {
      const filePath = path.join(sourceFolder, file);
      const subfolder = imageMap[file];
      
      const result = await uploadFile(filePath, subfolder);
      if (result) {
        results.success++;
      } else {
        results.failed++;
      }
    } else {
      console.log(`Skipping unmapped file: ${file}`);
      results.skipped++;
    }
  }
  
  console.log('\nUpload Summary:');
  console.log(`Total files processed: ${files.length}`);
  console.log(`Successfully uploaded: ${results.success}`);
  console.log(`Failed uploads: ${results.failed}`);
  console.log(`Skipped files: ${results.skipped}`);
}

// Execute the script
processAllFiles().catch(console.error); 