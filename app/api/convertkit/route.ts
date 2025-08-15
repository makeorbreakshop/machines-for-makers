export const runtime = 'nodejs'; // Changed to nodejs for Supabase access

import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { email, utmParams } = await request.json();
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
    
    // Prepare tracking data - only store if we have UTM parameters
    let trackingDataToStore: any = referrer; // Default to storing the referrer URL
    
    if (utmParams && Object.keys(utmParams).length > 0) {
      // If we have UTM params, store them as JSON
      trackingDataToStore = JSON.stringify({
        referrer: referrer,
        utm_source: utmParams.utm_source || null,
        utm_medium: utmParams.utm_medium || null,
        utm_campaign: utmParams.utm_campaign || null,
        utm_term: utmParams.utm_term || null,
        utm_content: utmParams.utm_content || null,
        landing_page: utmParams.landing_page || null,
      });
    }
    
    // Determine source based on UTM parameters or default
    let source = 'material-library';
    if (utmParams?.utm_source) {
      source = `material-library-${utmParams.utm_source}`;
    }
    
    try {
      const { error: dbError } = await supabase
        .from('email_subscribers')
        .insert({
          email: email.toLowerCase(),
          first_name: null, // Material library doesn't collect first name
          convertkit_subscriber_id: data.subscription?.subscriber?.id || null,
          tags: ['laser-material-library'],
          status: 'active',
          source: source,
          referrer: trackingDataToStore, // Store either URL or JSON depending on UTM presence
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