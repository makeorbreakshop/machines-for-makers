export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const { email, firstName } = await request.json();
    const referrer = request.headers.get('referer') || 'direct';

    if (!email || !validateEmail(email)) {
      return new Response(JSON.stringify({ error: "Valid email is required" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const CONVERTKIT_API_KEY = process.env.CONVERTKIT_API_KEY;
    const CONVERTKIT_DEAL_ALERTS_FORM_ID = process.env.CONVERTKIT_DEAL_ALERTS_FORM_ID;

    if (!CONVERTKIT_API_KEY || !CONVERTKIT_DEAL_ALERTS_FORM_ID) {
      return new Response(JSON.stringify({ error: "ConvertKit configuration missing" }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Subscribe the user to the deal alerts form
    const response = await fetch(
      `https://api.convertkit.com/v3/forms/${CONVERTKIT_DEAL_ALERTS_FORM_ID}/subscribe`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: CONVERTKIT_API_KEY,
          email,
          first_name: firstName,
          tags: ['deal-alerts'], // Tag for deal alerts subscribers
          source: 'machines-for-makers-deals', 
          referrer,
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

    console.log("ConvertKit deal alerts subscription success:", data);

    // Store in our database for tracking
    // We'll do this after you create the table
    
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