export const runtime = 'nodejs'; // Changed to nodejs for Supabase access

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { email, firstName, source, referrer } = await request.json();

    // Validate inputs
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Get ConvertKit configuration for Comparison Chart lead magnet
    const CONVERTKIT_API_KEY = process.env.CONVERTKIT_API_KEY;
    const CONVERTKIT_FORM_ID = '7708844'; // Comparison Chart form ID from database

    if (!CONVERTKIT_API_KEY) {
      console.error('ConvertKit API key not configured');
      return NextResponse.json(
        { error: 'Email service configuration missing' },
        { status: 500 }
      );
    }

    // Build tags for tracking
    const tags = ['comparison-chart', `source:${source || 'laser-comparison-landing'}`];
    
    // Parse UTM parameters from the referrer URL if available
    let utmParams: any = {};
    try {
      if (referrer) {
        const url = new URL(referrer);
        utmParams = {
          utm_source: url.searchParams.get('utm_source'),
          utm_medium: url.searchParams.get('utm_medium'),
          utm_campaign: url.searchParams.get('utm_campaign'),
          utm_content: url.searchParams.get('utm_content'),
          utm_term: url.searchParams.get('utm_term'),
        };
        
        // Add UTM-based tags
        if (utmParams.utm_source) tags.push(`utm_source:${utmParams.utm_source}`);
        if (utmParams.utm_campaign) tags.push(`utm_campaign:${utmParams.utm_campaign}`);
      }
    } catch (e) {
      // Ignore URL parsing errors
    }

    // Subscribe to ConvertKit
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
          first_name: firstName || '',
          tags,
          source: 'laser-comparison-chart',
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

    // Store in our database for tracking
    const supabase = createServiceClient();
    
    // Get the Comparison Chart lead magnet ID
    const { data: leadMagnet } = await supabase
      .from('lead_magnets')
      .select('id')
      .eq('landing_page_url', '/laser-comparison')
      .eq('active', true)
      .single();
    
    try {
      const { error: dbError } = await supabase
        .from('email_subscribers')
        .insert({
          email: email.toLowerCase(),
          first_name: firstName || '',
          convertkit_subscriber_id: convertkitData.subscription?.subscriber?.id || null,
          tags,
          status: 'active',
          source: 'comparison-chart',
          referrer: referrer || 'direct',
          form_id: CONVERTKIT_FORM_ID,
          form_name: 'Comparison Chart',
          lead_magnet_id: leadMagnet?.id || null, // Add the lead magnet ID
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

    // Set a cookie to remember this user
    const response = NextResponse.json(
      { 
        success: true,
        message: 'Successfully subscribed! Redirecting to comparison chart...',
        data: convertkitData,
      },
      { status: 200 }
    );

    // Set cookie to skip form on return visits
    response.cookies.set('laser_comparison_accessed', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Lead capture error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}