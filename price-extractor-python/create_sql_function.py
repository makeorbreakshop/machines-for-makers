import os
from dotenv import load_dotenv
from supabase import create_client, Client
import requests
import json

# Load environment variables
load_dotenv()

# Initialize Supabase client
supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_KEY')
supabase = create_client(supabase_url, supabase_key)

# Define the SQL function
sql_function = '''
CREATE OR REPLACE FUNCTION execute_sql_query(query_text TEXT, params JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
    param_key TEXT;
    param_value TEXT;
BEGIN
    -- Prepare the query with parameters
    FOR param_key, param_value IN SELECT * FROM jsonb_each_text(params)
    LOOP
        query_text := REPLACE(query_text, ':' || param_key, param_value);
    END LOOP;

    -- Execute the query and get result as JSON
    EXECUTE 'SELECT COALESCE(json_agg(q), '[]'::json)::jsonb FROM (' || query_text || ') q' INTO result;
    
    RETURN result;
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM, 'detail', SQLSTATE);
END;
$$;
'''

# Execute the SQL using Supabase REST API directly
try:
    # Get the service role key from environment if available, otherwise use anon key
    service_role_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY', supabase_key)
    
    headers = {
        'apikey': supabase_key,
        'Authorization': f'Bearer {service_role_key}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }
    
    response = requests.post(
        f'{supabase_url}/rest/v1/rpc/exec_sql',
        headers=headers,
        json={'query': sql_function}
    )
    
    response.raise_for_status()
    print('SQL function created successfully!')
    print(response.text)
except Exception as e:
    print(f'Error creating SQL function: {str(e)}')
    print('You may need to create the function manually in the Supabase SQL editor.')
    print(f'SQL function definition:\n{sql_function}') 