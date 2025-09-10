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

    // Get the Business Calculator lead magnet configuration
    const { data: leadMagnet } = await supabase
      .from('lead_magnets')
      .select('id, convertkit_form_id, convertkit_form_name')
      .eq('slug', 'business-calculator')
      .single();

    if (!leadMagnet || !leadMagnet.convertkit_form_id) {
      console.error('Business Calculator lead magnet not configured or missing ConvertKit form ID');
      // Fall back to environment variable if lead magnet not configured
      const fallbackFormId = process.env.CONVERTKIT_CALCULATOR_FORM_ID || '7708845';
      leadMagnet.convertkit_form_id = fallbackFormId;
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
          lead_magnet_id: leadMagnet?.id || null,
          created_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('Error creating subscriber:', insertError);
        return NextResponse.json({ error: 'Failed to save email' }, { status: 500 });
      }

      // Send to ConvertKit
      try {
        const CONVERTKIT_API_KEY = process.env.CONVERTKIT_API_KEY;
        const CONVERTKIT_FORM_ID = leadMagnet.convertkit_form_id;
        
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