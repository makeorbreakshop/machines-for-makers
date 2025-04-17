import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Specify nodejs runtime to ensure environment variables are properly accessible
export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Get the machine ID from the URL params
  const id = params.id;

  if (!id) {
    return NextResponse.json({ error: "Machine ID is required" }, { status: 400 });
  }

  // Create Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Supabase credentials not configured" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // Only select the HTML-related fields to minimize data transfer
    const { data, error } = await supabase
      .from("machines")
      .select("html_content, html_timestamp, html_size, html_hash, html_compressed")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Machine not found" }, { status: 404 });
    }

    // Set cache headers to cache for 1 hour
    return NextResponse.json(
      { data },
      { 
        headers: {
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
} 