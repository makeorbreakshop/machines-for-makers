// Create site_settings table script
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

// Check for required environment variables
const { 
  NEXT_PUBLIC_SUPABASE_URL, 
  SUPABASE_SERVICE_ROLE_KEY 
} = process.env;

if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables. Please check your .env.local file.');
  process.exit(1);
}

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

async function createSiteSettingsTable() {
  try {
    console.log('Creating site_settings table...');
    
    // Create site_settings table if it doesn't exist
    const { error: createTableError } = await supabase.rpc('create_site_settings_table_js', {
      create_table_sql: `
        CREATE TABLE IF NOT EXISTS site_settings (
          id SERIAL PRIMARY KEY,
          key TEXT NOT NULL UNIQUE,
          value TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
        );
      `
    });
    
    if (createTableError) {
      // Table might not exist yet or the function doesn't exist
      console.log('Using direct SQL execution to create table...');
      
      // Attempt direct table creation
      const { error: directCreateError } = await supabase.rpc('exec_sql', {
        sql: `
          -- Create the table if it doesn't exist
          CREATE TABLE IF NOT EXISTS site_settings (
            id SERIAL PRIMARY KEY,
            key TEXT NOT NULL UNIQUE,
            value TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
          );
          
          -- Enable RLS
          ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
          
          -- Add policies
          DO $$
          BEGIN
            -- Drop policies if they exist to avoid errors
            BEGIN
              DROP POLICY IF EXISTS "Allow authenticated read" ON site_settings;
            EXCEPTION WHEN OTHERS THEN
              -- Policy doesn't exist, ignore error
            END;
            
            BEGIN
              DROP POLICY IF EXISTS "Allow service role all" ON site_settings;
            EXCEPTION WHEN OTHERS THEN
              -- Policy doesn't exist, ignore error
            END;
            
            -- Create policies
            CREATE POLICY "Allow authenticated read" 
              ON site_settings 
              FOR SELECT 
              TO authenticated 
              USING (true);
              
            CREATE POLICY "Allow service role all" 
              ON site_settings 
              FOR ALL 
              TO service_role 
              USING (true)
              WITH CHECK (true);
          END
          $$;
        `
      });
      
      if (directCreateError) {
        throw new Error(`Failed to create table directly: ${directCreateError.message}`);
      }
    }
    
    // Verify table was created
    const { data, error: checkError } = await supabase
      .from('site_settings')
      .select('count(*)', { count: 'exact', head: true });
    
    if (checkError) {
      throw new Error(`Failed to verify table: ${checkError.message}`);
    }
    
    console.log('✅ site_settings table created successfully');
    
    // Add a test logo record
    const { error: insertError } = await supabase
      .from('site_settings')
      .upsert([
        { 
          key: 'logo_url', 
          value: null 
        }
      ], { 
        onConflict: 'key',
        ignoreDuplicates: false
      });
    
    if (insertError) {
      console.error('Warning: Failed to insert initial logo record:', insertError.message);
    } else {
      console.log('✅ Initial logo_url record created');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

// Run the function
createSiteSettingsTable()
  .then(() => {
    console.log('Script completed');
  })
  .catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  }); 