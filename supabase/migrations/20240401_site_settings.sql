-- Create site_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS site_settings (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', now()) NOT NULL
);

-- Function to create site_settings table programmatically
CREATE OR REPLACE FUNCTION create_site_settings_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the table already exists
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'site_settings'
  ) THEN
    -- Create the table
    EXECUTE '
      CREATE TABLE public.site_settings (
        id SERIAL PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        value TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE(''utc'', now()) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE(''utc'', now()) NOT NULL
      )
    ';
    
    -- Set RLS policies
    EXECUTE 'ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY';
    
    -- Grant access to authenticated users for read
    EXECUTE '
      CREATE POLICY "Allow authenticated users to read site_settings" 
      ON public.site_settings 
      FOR SELECT 
      TO authenticated 
      USING (true)
    ';
    
    -- Grant access to service role for all operations
    EXECUTE '
      CREATE POLICY "Allow service role to manage site_settings" 
      ON public.site_settings 
      FOR ALL 
      TO service_role 
      USING (true)
      WITH CHECK (true)
    ';
  END IF;
END;
$$; 