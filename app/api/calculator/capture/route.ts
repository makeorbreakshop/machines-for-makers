export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parse } from 'url';

// Create Supabase client with service role for edge runtime
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { email, source, referrer } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Extract UTM parameters from the referrer URL
    let utmParams = {};
    if (referrer) {
      try {
        const parsedUrl = parse(referrer, true);
        const { utm_source, utm_medium, utm_campaign, utm_content, utm_term } = parsedUrl.query;
        
        utmParams = {
          utm_source: utm_source || null,
          utm_medium: utm_medium || null,
          utm_campaign: utm_campaign || null,
          utm_content: utm_content || null,
          utm_term: utm_term || null,
        };
      } catch (err) {
        console.error('Error parsing referrer URL:', err);
      }
    }

    // Check if email already exists
    const { data: existingSubscriber } = await supabase
      .from('email_subscribers')
      .select('id')
      .eq('email', email)
      .single();

    if (!existingSubscriber) {
      // Create new subscriber with UTM parameters
      const { error: insertError } = await supabase
        .from('email_subscribers')
        .insert({
          email,
          source: source || 'business-calculator',
          referrer: referrer || null,
          ...utmParams,
          tags: ['business-calculator'],
          created_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('Error creating subscriber:', insertError);
        return NextResponse.json({ error: 'Failed to save email' }, { status: 500 });
      }

      // Send to ConvertKit
      try {
        const CONVERTKIT_API_KEY = process.env.CONVERTKIT_API_KEY;
        const CONVERTKIT_FORM_ID = process.env.CONVERTKIT_CALCULATOR_FORM_ID || '7708845'; // New form ID for calculator
        
        if (CONVERTKIT_API_KEY && CONVERTKIT_FORM_ID) {
          const ckResponse = await fetch(
            `https://api.convertkit.com/v3/forms/${CONVERTKIT_FORM_ID}/subscribe`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                api_key: CONVERTKIT_API_KEY,
                email,
                tags: ['business-calculator'],
              }),
            }
          );
          
          if (!ckResponse.ok) {
            console.error('ConvertKit API error:', await ckResponse.text());
          }
        }
      } catch (ckError) {
        console.error('ConvertKit submission error:', ckError);
        // Continue even if ConvertKit fails
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Email capture error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}