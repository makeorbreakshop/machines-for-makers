import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@supabase/supabase-js";

// Force nodejs runtime
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    // Get headers and cookies
    const headers = Object.fromEntries(
      Array.from(request.headers.entries())
    );
    
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    // Get first and last characters of the service key for debugging
    // This shows enough to verify the key without exposing the full key
    const serviceKeyFirstChars = serviceKey?.substring(0, 4) || "";
    const serviceKeyLastChars = serviceKey?.length ? serviceKey.substring(serviceKey.length - 4) : "";
    
    // IMPORTANT: Add detailed key examination
    const keyDetails = {
      exactValue: serviceKey, // SECURITY: Remove this in production after debugging!
      length: serviceKey?.length || 0,
      startsWithDollarBrace: serviceKey?.startsWith('${') || false,
      endsWithBrace: serviceKey?.endsWith('}') || false,
      containsTemplateVar: serviceKey?.includes('SUPABASE_SERVICE_ROLE_KEY') || false,
      charCodes: serviceKey?.split('').map(c => c.charCodeAt(0)),
      base64Encoded: serviceKey ? Buffer.from(serviceKey).toString('base64') : '',
    };
    
    // Test if key has whitespace issues
    const hasLeadingSpace = serviceKey?.startsWith(" ") || false;
    const hasTrailingSpace = serviceKey?.endsWith(" ") || false;
    const containsNewline = serviceKey?.includes("\n") || false;
    const containsCarriageReturn = serviceKey?.includes("\r") || false;
    
    // Try with a manually hard-coded key for testing
    // IMPORTANT: DO NOT USE IN PRODUCTION - FOR DEBUGGING ONLY
    // Replace this with your actual service role key temporarily for testing
    const hardcodedKey = "YOUR_ACTUAL_SERVICE_ROLE_KEY_HERE"; // Replace this!
    let hardcodedTest: { success: boolean, error: string | null, keyWorks?: boolean } = { 
      success: false, 
      error: null 
    };
    
    try {
      if (supabaseUrl && hardcodedKey !== "YOUR_ACTUAL_SERVICE_ROLE_KEY_HERE") {
        const manualClient = createClient(supabaseUrl, hardcodedKey);
        const { data, error } = await manualClient.from("machines").select("id").limit(1);
        
        hardcodedTest = {
          success: !error,
          error: error ? error.message : null,
          keyWorks: !error
        };
      } else {
        hardcodedTest = {
          success: false,
          error: "Hardcoded key not replaced or URL missing"
        };
      }
    } catch (e: any) {
      hardcodedTest.error = e.message;
    }
    
    // Try a direct client creation with trimmed values
    let directClientTest: { success: boolean, error: string | null, urlTrimmed?: boolean, keyTrimmed?: boolean } = { 
      success: false, 
      error: null 
    };
    
    try {
      if (supabaseUrl && serviceKey) {
        // Try to create a client with trimmed values
        const trimmedUrl = supabaseUrl.trim();
        const trimmedKey = serviceKey.trim();
        
        const directClient = createClient(trimmedUrl, trimmedKey);
        const { data, error } = await directClient.from("machines").select("id").limit(1);
        
        directClientTest = {
          success: !error,
          error: error ? error.message : null,
          urlTrimmed: trimmedUrl !== supabaseUrl,
          keyTrimmed: trimmedKey !== serviceKey
        };
      }
    } catch (e: any) {
      directClientTest.error = e.message;
    }
    
    // Try using the createAdminClient utility
    let adminClientTest: { success: boolean, error: string | null } = { 
      success: false, 
      error: null 
    };
    
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase.from("machines").select("id").limit(1);
      
      adminClientTest = {
        success: !error,
        error: error ? error.message : null
      };
    } catch (e: any) {
      adminClientTest.error = e.message;
    }
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV,
        supabaseUrlExists: !!supabaseUrl,
        serviceKeyExists: !!serviceKey,
        supabaseUrlFirstChars: supabaseUrl ? supabaseUrl.substring(0, 10) : null,
        serviceKeyPattern: serviceKey ? `${serviceKeyFirstChars}...${serviceKeyLastChars}` : null,
        serviceKeyLength: serviceKey?.length || 0,
        hostname: request.headers.get('host'),
        origin: request.headers.get('origin'),
      },
      keyFormatIssues: {
        hasLeadingSpace,
        hasTrailingSpace,
        containsNewline,
        containsCarriageReturn
      },
      keyDetails, // IMPORTANT: Remove in production after debugging!
      directClientTest,
      adminClientTest,
      hardcodedTest
    });
  } catch (error: any) {
    console.error("Auth test error:", error);
    return NextResponse.json({
      success: false,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      }
    }, { status: 500 });
  }
} 