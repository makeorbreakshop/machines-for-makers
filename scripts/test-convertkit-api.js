const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const convertKitApiKey = process.env.CONVERTKIT_API_KEY;

async function testAPI() {
  console.log('Testing ConvertKit API...\n');
  
  // Test 1: Get account info
  console.log('1. Testing account access...');
  try {
    const response = await fetch(`https://api.convertkit.com/v3/account?api_key=${convertKitApiKey}`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✓ Account access successful');
      console.log('  Account:', data.name);
      console.log('  Plan:', data.plan_type);
    } else {
      console.log('✗ Account access failed:', data);
    }
  } catch (error) {
    console.log('✗ Account access error:', error.message);
  }
  
  console.log('');
  
  // Test 2: List all forms
  console.log('2. Testing forms access...');
  try {
    const response = await fetch(`https://api.convertkit.com/v3/forms?api_key=${convertKitApiKey}`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✓ Forms access successful');
      console.log('  Total forms:', data.forms?.length || 0);
      
      if (data.forms) {
        data.forms.forEach(form => {
          console.log(`  - ${form.name} (ID: ${form.id})`);
        });
      }
    } else {
      console.log('✗ Forms access failed:', data);
    }
  } catch (error) {
    console.log('✗ Forms access error:', error.message);
  }
}

testAPI();