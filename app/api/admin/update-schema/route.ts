import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdminAuth } from "@/lib/auth-utils";

export async function POST(request: Request) {
  try {
    // Ensure only admin can perform this operation
    await requireAdminAuth();
    
    // Get service client with full privileges
    const supabase = await createServiceClient();
    
    // Parse request body
    const body = await request.json();
    const { table, column, type } = body;
    
    if (!table || !column || !type) {
      return NextResponse.json({ 
        error: "Missing required fields: table, column, type" 
      }, { status: 400 });
    }
    
    // Check if column exists
    const { data: columnExists, error: checkError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', table)
      .eq('column_name', column)
      .single();
      
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "Did not return any rows"
      console.error("Error checking column existence:", checkError);
    }
    
    // If column doesn't exist, add it
    if (!columnExists) {
      // Use Supabase's PostgreSQL function to execute alter table
      const { error: alterError } = await supabase.rpc(
        'execute_sql',
        { 
          sql_statement: `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${type};` 
        }
      );
      
      if (alterError) {
        console.error("Error adding column:", alterError);
        
        // If the RPC function doesn't exist, let the admin know they need to create it
        if (alterError.code === 'PGRST301') {
          return NextResponse.json({ 
            error: "Please create the 'execute_sql' function in your Supabase database with: CREATE OR REPLACE FUNCTION execute_sql(sql_statement text) RETURNS void AS $$ BEGIN EXECUTE sql_statement; END; $$ LANGUAGE plpgsql SECURITY DEFINER;" 
          }, { status: 500 });
        }
        
        return NextResponse.json({ 
          error: "Failed to update schema: " + alterError.message 
        }, { status: 500 });
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Column ${column} added to table ${table}` 
    });
    
  } catch (error: any) {
    console.error("Admin API error:", error);
    return NextResponse.json({ 
      error: error.message || "Unauthorized" 
    }, { status: 401 });
  }
} 