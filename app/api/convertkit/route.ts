export const runtime = 'nodejs'; // Changed to nodejs for Supabase access

import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    const referrer = request.headers.get('referer') || 'direct';

    if (!email || !validateEmail(email)) {
      return new Response(JSON.stringify({ error: "Valid email is required" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const CONVERTKIT_API_KEY = process.env.CONVERTKIT_API_KEY;
    const CONVERTKIT_FORM_ID = process.env.CONVERTKIT_FORM_ID; // Form ID for the laser material library

    if (!CONVERTKIT_API_KEY || !CONVERTKIT_FORM_ID) {
      return new Response(JSON.stringify({ error: "ConvertKit configuration missing" }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Subscribe the user to the form
    const response = await fetch(
      `https://api.convertkit.com/v3/forms/${CONVERTKIT_FORM_ID}/subscribe`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: CONVERTKIT_API_KEY,
          email,
          tags: ['laser-material-library'], // Optional tags to apply
          first_name: '', // Optional: Add this if you want to collect first names
          source: 'machines-for-makers-website', // Identify your source
          referrer, // Add the referrer information
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("ConvertKit API error:", data);
      return new Response(JSON.stringify({ error: "Failed to subscribe" }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log("ConvertKit subscription success:", data);

    // Store in our database for tracking
    const supabase = createServiceClient();
    
    try {
      const { error: dbError } = await supabase
        .from('email_subscribers')
        .insert({
          email: email.toLowerCase(),
          first_name: null, // Material library doesn't collect first name
          convertkit_subscriber_id: data.subscription?.subscriber?.id || null,
          tags: ['laser-material-library'],
          status: 'active',
          source: 'material-library',
          referrer: referrer,
          form_id: process.env.CONVERTKIT_FORM_ID || null,
          form_name: 'Laser Material Library',
        });
      
      if (dbError) {
        console.error("Failed to save subscriber to database:", dbError);
        // Don't fail the request if database save fails
      }
    } catch (dbError) {
      console.error("Database save error:", dbError);
      // Don't fail the request if database save fails
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("ConvertKit subscription error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Email validation helper
function validateEmail(email: string) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
} 