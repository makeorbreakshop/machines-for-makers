export const runtime = 'nodejs'; // Changed to nodejs for Supabase server client

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { parse } from 'url';

export async function POST(request: NextRequest) {
  try {
    const { email, source, referrer } = await request.json();
    const supabase = createServiceClient();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // Get the Business Calculator lead magnet configuration
    const { data: leadMagnet } = await supabase
      .from('lead_magnets')
      .select('id, convertkit_form_id, convertkit_form_name')
      .eq('slug', 'calculator')
      .single();

    let CONVERTKIT_FORM_ID = leadMagnet?.convertkit_form_id;
    
    if (!CONVERTKIT_FORM_ID) {
      console.error('Calculator lead magnet not configured or missing ConvertKit form ID');
      // Fall back to environment variable if lead magnet not configured
      CONVERTKIT_FORM_ID = process.env.CONVERTKIT_CALCULATOR_FORM_ID || '8544398';
    }

    const CONVERTKIT_API_KEY = process.env.CONVERTKIT_API_KEY;
    
    if (!CONVERTKIT_API_KEY) {
      console.error('ConvertKit API key not configured');
      return NextResponse.json(
        { error: 'Email service configuration missing' },
        { status: 500 }
      );
    }

    // Extract UTM parameters from the referrer URL
    let utmParams: any = {};
    if (referrer) {
      try {
        const url = new URL(referrer);
        utmParams = {
          utm_source: url.searchParams.get('utm_source'),
          utm_medium: url.searchParams.get('utm_medium'),
          utm_campaign: url.searchParams.get('utm_campaign'),
          utm_content: url.searchParams.get('utm_content'),
          utm_term: url.searchParams.get('utm_term'),
        };
      } catch (err) {
        console.error('Error parsing referrer URL:', err);
      }
    }

    // Build tags for tracking
    const tags = ['calculator', `source:${source || 'calculator-landing'}`];
    if (utmParams.utm_source) tags.push(`utm_source:${utmParams.utm_source}`);
    if (utmParams.utm_campaign) tags.push(`utm_campaign:${utmParams.utm_campaign}`);

    // Send to ConvertKit FIRST (always, not just for new subscribers)
    console.log('Sending to ConvertKit with form ID:', CONVERTKIT_FORM_ID);
    
    const convertkitResponse = await fetch(
      `https://api.convertkit.com/v3/forms/${CONVERTKIT_FORM_ID}/subscribe`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: CONVERTKIT_API_KEY,
          email,
          tags,
          source: 'calculator',
          referrer: referrer || 'direct',
        }),
      }
    );

    const convertkitData = await convertkitResponse.json();

    if (!convertkitResponse.ok) {
      console.error('ConvertKit API error:', convertkitData);
      return NextResponse.json(
        { error: 'Failed to subscribe. Please try again.' },
        { status: convertkitResponse.status }
      );
    }

    console.log('ConvertKit subscription success:', convertkitData);

    // Now save to our database for tracking
    try {
      const { error: dbError } = await supabase
        .from('email_subscribers')
        .insert({
          email: email.toLowerCase(),
          convertkit_subscriber_id: convertkitData.subscription?.subscriber?.id || null,
          tags,
          status: 'active',
          source: source || 'calculator',
          referrer: referrer || 'direct',
          form_id: CONVERTKIT_FORM_ID,
          form_name: leadMagnet?.convertkit_form_name || 'Laser Budget Calculator',
          lead_magnet_id: leadMagnet?.id || null,
          // Add UTM parameters
          utm_source: utmParams.utm_source || null,
          utm_medium: utmParams.utm_medium || null,
          utm_campaign: utmParams.utm_campaign || null,
          utm_content: utmParams.utm_content || null,
          utm_term: utmParams.utm_term || null,
          // Track first touch
          first_touch_source: utmParams.utm_source || 'direct',
          first_touch_date: new Date().toISOString(),
        });
      
      if (dbError) {
        console.error('Failed to save subscriber to database:', dbError);
        // Don't fail the request if database save fails
      }
    } catch (dbError) {
      console.error('Database save error:', dbError);
      // Don't fail the request if database save fails
    }

    return NextResponse.json({ 
      success: true,
      message: 'Successfully subscribed!',
      data: convertkitData,
    });
  } catch (error) {
    console.error('Email capture error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}