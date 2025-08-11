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
  process.exit(1);
}

// Initialize Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getAllSubscribers() {
  console.log('\nFetching all subscribers from ConvertKit...');
  
  let allSubscribers = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    try {
      console.log(`Fetching page ${page}...`);
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
        const errorText = await response.text();
        console.error(`Failed to fetch subscribers page ${page}:`, errorText);
        break;
      }
      
      const data = await response.json();
      const subscribers = data.subscribers || [];
      
      allSubscribers = allSubscribers.concat(subscribers);
      
      // ConvertKit returns 50 per page by default
      hasMore = subscribers.length === 50;
      page++;
      
      console.log(`✓ Fetched ${subscribers.length} subscribers from page ${page - 1}`);
    } catch (error) {
      console.error(`Error fetching page ${page}:`, error);
      hasMore = false;
    }
  }
  
  console.log(`\nTotal subscribers found: ${allSubscribers.length}`);
  return allSubscribers;
}

async function getSubscriberTags(subscriberId) {
  try {
    const response = await fetch(
      `https://api.convertkit.com/v3/subscribers/${subscriberId}?api_key=${convertKitApiKey}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      return data.subscriber?.tags || [];
    }
  } catch (error) {
    console.error(`Error fetching tags for subscriber ${subscriberId}:`, error);
  }
  
  return [];
}

async function importSubscribers() {
  console.log('Starting ConvertKit subscriber import...\n');
  
  // Get all subscribers
  const allSubscribers = await getAllSubscribers();
  
  if (allSubscribers.length === 0) {
    console.log('No subscribers found. Exiting.');
    return;
  }
  
  let totalImported = 0;
  let totalErrors = 0;
  
  console.log('\nProcessing subscribers and importing to database...');
  
  for (const subscriber of allSubscribers) {
    // Get tags for this subscriber
    const tags = await getSubscriberTags(subscriber.id);
    const tagNames = tags.map(tag => tag.name);
    
    // Determine form info based on tags
    let formId = null;
    let formName = 'Unknown';
    let source = 'unknown';
    
    if (tagNames.includes('deal-alerts')) {
      formId = convertKitDealAlertsFormId;
      formName = 'Deal Alerts';
      source = 'deals-page';
    } else if (tagNames.includes('laser-material-library')) {
      formId = convertKitFormId;
      formName = 'Laser Material Library';
      source = 'material-library';
    }
    
    // Only import subscribers with known tags
    if (formId) {
      const { error } = await supabase
        .from('email_subscribers')
        .upsert({
          email: subscriber.email_address.toLowerCase(),
          first_name: subscriber.first_name,
          convertkit_subscriber_id: subscriber.id.toString(),
          tags: tagNames,
          status: subscriber.state === 'active' ? 'active' : 'inactive',
          source: source,
          form_id: formId,
          form_name: formName,
          created_at: subscriber.created_at,
        }, {
          onConflict: 'email',
        });
      
      if (error) {
        console.error(`❌ Failed to import ${subscriber.email_address}:`, error.message);
        totalErrors++;
      } else {
        console.log(`✓ Imported ${subscriber.email_address} (${formName})`);
        totalImported++;
      }
    } else {
      console.log(`⚠️  Skipping ${subscriber.email_address} - no matching tags`);
    }
    
    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Get final count
  const { count } = await supabase
    .from('email_subscribers')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n✅ Import complete!`);
  console.log(`   Total processed: ${allSubscribers.length}`);
  console.log(`   Total imported: ${totalImported}`);
  console.log(`   Total errors: ${totalErrors}`);
  console.log(`   Total subscribers in database: ${count}`);
}

// Run the import
importSubscribers().catch(console.error);