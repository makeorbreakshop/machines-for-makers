require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Upload a single file from temp-upload folder
async function uploadBrandonImage() {
  try {
    const filePath = path.join(__dirname, '../public/temp-upload/brandon.jpg');
    const fileName = 'brandon.jpg';
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`File ${filePath} does not exist`);
      return false;
    }
    
    const fileBuffer = fs.readFileSync(filePath);
    
    // Upload file to Supabase
    const { data, error } = await supabase.storage
      .from('images')
      .upload(`learn-lightburn/instructor/${fileName}`, fileBuffer, {
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=31536000',
        upsert: true
      });
    
    if (error) {
      console.error(`Error uploading ${fileName}:`, error);
      return false;
    }
    
    console.log(`Successfully uploaded ${fileName} to instructor folder`);
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('images')
      .getPublicUrl(`learn-lightburn/instructor/${fileName}`);
      
    console.log(`Public URL: ${urlData.publicUrl}`);
    
    return true;
  } catch (error) {
    console.error(`Error processing file:`, error);
    return false;
  }
}

// Execute the upload
uploadBrandonImage(); 