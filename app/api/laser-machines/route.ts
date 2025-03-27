import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Helper function to parse power string to number
const parsePower = (powerString: string | null): number => {
  if (!powerString) return 0;
  
  // Extract numeric value from string (e.g., "40W" -> 40)
  const match = powerString.match(/(\d+)/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return 0;
};

export async function GET() {
  try {
    // Create Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Supabase credentials not configured" }, 
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch laser machines
    const { data, error } = await supabase
      .from("machines")
      .select(`
        id,
        "Machine Name",
        "Laser Type A",
        "Laser Power A",
        "Company",
        "Image"
      `)
      .or('Hidden.is.null,Hidden.eq.false,Hidden.neq.true')  // Only visible machines
      .order("Machine Name", { ascending: true });

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: error.message }, 
        { status: 500 }
      );
    }

    // Transform data to a more usable format
    const machines = data.map(machine => ({
      id: machine.id,
      name: machine["Machine Name"] || "Unknown Machine",
      wattage: parsePower(machine["Laser Power A"]),
      type: machine["Laser Type A"] || "unknown",
      company: machine["Company"] || "Unknown",
      image: machine["Image"] || null
    }));

    return NextResponse.json({ machines });
  } catch (error: any) {
    console.error("Error fetching machines:", error?.message || error);
    return NextResponse.json(
      { error: "Failed to fetch machines" }, 
      { status: 500 }
    );
  }
} 