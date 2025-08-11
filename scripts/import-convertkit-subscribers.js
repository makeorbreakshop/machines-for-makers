const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const convertKitApiKey = process.env.CONVERTKIT_API_KEY;
const convertKitFormId = process.env.CONVERTKIT_FORM_ID;
const convertKitDealAlertsFormId = process.env.CONVERTKIT_DEAL_ALERTS_FORM_ID;

console.log('Environment check:');
console.log('- Supabase URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
console.log('- Supabase Service Key:', supabaseServiceKey ? '✓ Set' : '✗ Missing');
console.log('- ConvertKit API Key:', convertKitApiKey ? `✓ Set (${convertKitApiKey.substring(0, 10)}...)` : '✗ Missing');
console.log('- Material Library Form ID:', convertKitFormId || 'Not set');
console.log('- Deal Alerts Form ID:', convertKitDealAlertsFormId || 'Not set');
console.log('');

if (!supabaseUrl || !supabaseServiceKey || !convertKitApiKey) {
  console.error('Missing required environment variables!');
  console.error('Make sure you have set:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  console.error('- CONVERTKIT_API_KEY');
  process.exit(1);
}

// Initialize Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fetchConvertKitSubscribers(formId, formName) {
  if (!formId) {
    console.log(`⚠️  Skipping ${formName} - no form ID configured`);
    return [];
  }
  
  console.log(`\nFetching subscribers for form: ${formName} (${formId})`);
  
  let allSubscribers = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    try {
      const response = await fetch(
        `https://api.convertkit.com/v3/subscribers?api_key=${convertKitApiKey}&page=${page}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        console.error(`Failed to fetch subscribers for form ${formId}:`, await response.text());
        return [];
      }
      
      const data = await response.json();
      const subscribers = data.subscribers || [];
      
      // Extract subscriber info
      for (const sub of subscribers) {
        allSubscribers.push({
          id: sub.id,
          email_address: sub.email_address,
          first_name: sub.first_name,
          state: sub.state,
          created_at: sub.created_at,
        });
      }
      
      // ConvertKit returns 50 per page by default
      hasMore = subscribers.length === 50;
      page++;
      
      console.log(`Fetched ${subscribers.length} subscribers from page ${page - 1}`);
    } catch (error) {
      console.error(`Error fetching page ${page}:`, error);
      hasMore = false;
    }
  }
  
  return allSubscribers;
}

async function importSubscribers() {
  console.log('Starting ConvertKit subscriber import...\n');
  
  let totalImported = 0;
  let totalErrors = 0;
  
  // Fetch and import Material Library subscribers
  if (convertKitFormId) {
    const materialLibrarySubscribers = await fetchConvertKitSubscribers(
      convertKitFormId,
      'Laser Material Library'
    );
    
    console.log(`\nImporting ${materialLibrarySubscribers.length} Material Library subscribers...`);
    
    for (const subscriber of materialLibrarySubscribers) {
      const { error } = await supabase
        .from('email_subscribers')
        .upsert({
          email: subscriber.email_address.toLowerCase(),
          first_name: subscriber.first_name,
          convertkit_subscriber_id: subscriber.id.toString(),
          tags: ['laser-material-library'],
          status: subscriber.state === 'active' ? 'active' : 'inactive',
          source: 'material-library',
          form_id: convertKitFormId,
          form_name: 'Laser Material Library',
          created_at: subscriber.created_at,
        }, {
          onConflict: 'email',
        });
      
      if (error) {
        console.error(`❌ Failed to import ${subscriber.email_address}:`, error.message);
        totalErrors++;
      } else {
        console.log(`✓ Imported ${subscriber.email_address}`);
        totalImported++;
      }
    }
  }
  
  // Fetch and import Deal Alerts subscribers
  if (convertKitDealAlertsFormId) {
    const dealAlertsSubscribers = await fetchConvertKitSubscribers(
      convertKitDealAlertsFormId,
      'Deal Alerts'
    );
    
    console.log(`\nImporting ${dealAlertsSubscribers.length} Deal Alerts subscribers...`);
    
    for (const subscriber of dealAlertsSubscribers) {
      const { error } = await supabase
        .from('email_subscribers')
        .upsert({
          email: subscriber.email_address.toLowerCase(),
          first_name: subscriber.first_name,
          convertkit_subscriber_id: subscriber.id.toString(),
          tags: ['deal-alerts'],
          status: subscriber.state === 'active' ? 'active' : 'inactive',
          source: 'deals-page',
          form_id: convertKitDealAlertsFormId,
          form_name: 'Deal Alerts',
          created_at: subscriber.created_at,
        }, {
          onConflict: 'email',
        });
      
      if (error) {
        console.error(`❌ Failed to import ${subscriber.email_address}:`, error.message);
        totalErrors++;
      } else {
        console.log(`✓ Imported ${subscriber.email_address}`);
        totalImported++;
      }
    }
  }
  
  // Get final count
  const { count } = await supabase
    .from('email_subscribers')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n✅ Import complete!`);
  console.log(`   Total imported: ${totalImported}`);
  console.log(`   Total errors: ${totalErrors}`);
  console.log(`   Total subscribers in database: ${count}`);
}

// Run the import
importSubscribers().catch(console.error);