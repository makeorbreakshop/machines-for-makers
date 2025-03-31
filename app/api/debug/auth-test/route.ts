import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
    const serviceKeyExists = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    // Create a Supabase admin client
    const supabase = createAdminClient();
    
    // Test a simple query
    const { data, error } = await supabase
      .from("machines")
      .select("id")
      .limit(1);
    
    return NextResponse.json({
      success: !error,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV,
        supabaseUrlExists: !!supabaseUrl,
        serviceKeyExists,
        supabaseUrlFirstChars: supabaseUrl ? supabaseUrl.substring(0, 10) : null,
        serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
        hostname: request.headers.get('host'),
        origin: request.headers.get('origin'),
      },
      testQuery: {
        success: !error,
        error: error ? {
          message: error.message,
          code: error.code,
          details: error.details
        } : null,
        dataCount: data?.length || 0
      }
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