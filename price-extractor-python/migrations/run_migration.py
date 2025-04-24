#!/usr/bin/env python3
import os
import sys
import argparse
from supabase import create_client
from dotenv import load_dotenv

def main():
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Run a database migration')
    parser.add_argument('--file', default="fix_price_history_fields.sql", 
                        help='Migration file to run (default: fix_price_history_fields.sql)')
    args = parser.parse_args()
    
    # Load environment variables
    load_dotenv()
    
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    
    if not supabase_url or not supabase_key:
        print("Error: SUPABASE_URL and SUPABASE_KEY must be set in environment variables or .env file")
        sys.exit(1)
    
    print("Connecting to Supabase...")
    supabase = create_client(supabase_url, supabase_key)
    
    # Read the migration SQL file
    migration_file = os.path.join(os.path.dirname(__file__), args.file)
    
    if not os.path.exists(migration_file):
        print(f"Error: Migration file {migration_file} not found")
        sys.exit(1)
    
    with open(migration_file, "r") as f:
        sql = f.read()
    
    # Execute the migration SQL
    print(f"Running migration from file: {args.file}...")
    try:
        # Split the SQL into separate statements
        statements = sql.split(';')
        
        for statement in statements:
            statement = statement.strip()
            if statement:
                print(f"Executing SQL statement ({len(statement)} chars)...")
                response = supabase.rpc('pgrest_exec_sql', {"query": statement}).execute()
                print(f"Response: {response}")
        
        print("Migration completed successfully!")
    except Exception as e:
        print(f"Error running migration: {str(e)}")
        sys.exit(1)
    
if __name__ == "__main__":
    main() 