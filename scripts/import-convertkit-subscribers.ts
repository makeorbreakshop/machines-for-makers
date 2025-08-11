import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const convertKitApiKey = process.env.CONVERTKIT_API_KEY!;
const convertKitFormId = process.env.CONVERTKIT_FORM_ID!;
const convertKitDealAlertsFormId = process.env.CONVERTKIT_DEAL_ALERTS_FORM_ID!;

// Initialize Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ConvertKitSubscriber {
  id: number;
  email_address: string;
  first_name: string | null;
  state: string;
  created_at: string;
  tags: Array<{ id: number; name: string }>;
}

async function fetchConvertKitSubscribers(formId: string, formName: string) {
  console.log(`\nFetching subscribers for form: ${formName} (${formId})`);
  
  let allSubscribers: ConvertKitSubscriber[] = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const response = await fetch(
      `https://api.convertkit.com/v3/forms/${formId}/subscriptions?api_key=${convertKitApiKey}&page=${page}`,
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
    const subscribers = data.subscriptions || [];
    
    // Fetch detailed subscriber info including tags
    for (const sub of subscribers) {
      const subscriberResponse = await fetch(
        `https://api.convertkit.com/v3/subscribers/${sub.subscriber.id}?api_key=${convertKitApiKey}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (subscriberResponse.ok) {
        const subscriberData = await response.json();
        allSubscribers.push({
          id: sub.subscriber.id,
          email_address: sub.subscriber.email_address,
          first_name: sub.subscriber.first_name,
          state: sub.subscriber.state,
          created_at: sub.created_at,
          tags: subscriberData.subscriber?.tags || [],
        });
      }
    }
    
    // ConvertKit returns 50 per page by default
    hasMore = subscribers.length === 50;
    page++;
    
    console.log(`Fetched ${subscribers.length} subscribers from page ${page - 1}`);
  }
  
  return allSubscribers;
}

async function importSubscribers() {
  console.log('Starting ConvertKit subscriber import...\n');
  
  // Fetch subscribers from both forms
  const materialLibrarySubscribers = await fetchConvertKitSubscribers(
    convertKitFormId,
    'Laser Material Library'
  );
  
  const dealAlertsSubscribers = await fetchConvertKitSubscribers(
    convertKitDealAlertsFormId,
    'Deal Alerts'
  );
  
  // Process Material Library subscribers
  console.log(`\nImporting ${materialLibrarySubscribers.length} Material Library subscribers...`);
  
  for (const subscriber of materialLibrarySubscribers) {
    const tags = subscriber.tags.map(tag => tag.name);
    
    const { error } = await supabase
      .from('email_subscribers')
      .upsert({
        email: subscriber.email_address.toLowerCase(),
        first_name: subscriber.first_name,
        convertkit_subscriber_id: subscriber.id.toString(),
        tags: tags.length > 0 ? tags : ['laser-material-library'],
        status: subscriber.state === 'active' ? 'active' : 'inactive',
        source: 'material-library',
        form_id: convertKitFormId,
        form_name: 'Laser Material Library',
        created_at: subscriber.created_at,
      }, {
        onConflict: 'email',
      });
    
    if (error) {
      console.error(`Failed to import ${subscriber.email_address}:`, error);
    } else {
      console.log(`✓ Imported ${subscriber.email_address}`);
    }
  }
  
  // Process Deal Alerts subscribers
  console.log(`\nImporting ${dealAlertsSubscribers.length} Deal Alerts subscribers...`);
  
  for (const subscriber of dealAlertsSubscribers) {
    const tags = subscriber.tags.map(tag => tag.name);
    
    const { error } = await supabase
      .from('email_subscribers')
      .upsert({
        email: subscriber.email_address.toLowerCase(),
        first_name: subscriber.first_name,
        convertkit_subscriber_id: subscriber.id.toString(),
        tags: tags.length > 0 ? tags : ['deal-alerts'],
        status: subscriber.state === 'active' ? 'active' : 'inactive',
        source: 'deals-page',
        form_id: convertKitDealAlertsFormId,
        form_name: 'Deal Alerts',
        created_at: subscriber.created_at,
      }, {
        onConflict: 'email',
      });
    
    if (error) {
      console.error(`Failed to import ${subscriber.email_address}:`, error);
    } else {
      console.log(`✓ Imported ${subscriber.email_address}`);
    }
  }
  
  // Get final count
  const { count } = await supabase
    .from('email_subscribers')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n✅ Import complete! Total subscribers in database: ${count}`);
}

// Run the import
importSubscribers().catch(console.error);