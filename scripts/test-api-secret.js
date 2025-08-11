const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const convertKitApiKey = process.env.CONVERTKIT_API_KEY;
const convertKitApiSecret = process.env.CONVERTKIT_API_SECRET; // Add this to your .env.local

console.log('Testing both API Key and API Secret...\n');

async function testAPIKey() {
  console.log('1. Testing with API Key...');
  try {
    const response = await fetch(`https://api.convertkit.com/v3/subscribers?api_key=${convertKitApiKey}`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✓ API Key works for subscribers');
      console.log(`  Found ${data.subscribers?.length || 0} subscribers`);
    } else {
      console.log('✗ API Key failed:', data);
    }
  } catch (error) {
    console.log('✗ API Key error:', error.message);
  }
}

async function testAPISecret() {
  console.log('\n2. Testing with API Secret...');
  try {
    const response = await fetch(`https://api.convertkit.com/v3/subscribers?api_secret=${convertKitApiSecret}`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✓ API Secret works for subscribers');
      console.log(`  Found ${data.subscribers?.length || 0} subscribers`);
    } else {
      console.log('✗ API Secret failed:', data);
    }
  } catch (error) {
    console.log('✗ API Secret error:', error.message);
  }
}

async function runTests() {
  if (!convertKitApiKey) {
    console.log('❌ CONVERTKIT_API_KEY not found');
  }
  
  if (!convertKitApiSecret) {
    console.log('❌ CONVERTKIT_API_SECRET not found - you need to add this to your .env.local file');
    console.log('Get it from the Kit Developer page under "API Secret"');
    return;
  }
  
  await testAPIKey();
  await testAPISecret();
}

runTests();