import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get target URL from query parameter
    const searchParams = request.nextUrl.searchParams;
    const targetUrl = searchParams.get('url');
    
    if (!targetUrl) {
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    console.log(`Proxying request to: ${targetUrl}`);
    
    // Fetch the target URL
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
      },
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch URL: ${response.statusText}, status: ${response.status}`);
      return NextResponse.json(
        { error: `Failed to fetch URL: ${response.statusText}` },
        { status: response.status }
      );
    }
    
    const contentType = response.headers.get('content-type') || '';
    console.log(`Content-Type of response: ${contentType}`);
    
    // Only process HTML content
    if (!contentType.includes('text/html')) {
      console.log('Response is not HTML, returning as-is');
      return new NextResponse(await response.blob(), {
        headers: {
          'Content-Type': contentType,
        },
      });
    }
    
    // Get HTML content
    const html = await response.text();
    console.log(`Retrieved HTML content of length: ${html.length}`);
    
    // Parse HTML with Cheerio
    const $ = cheerio.load(html);
    
    // Inject recording script to the head
    const recorderScript = `
      window.isRecording = true;
      
      // Create recording UI overlay
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.bottom = '10px';
      overlay.style.right = '10px';
      overlay.style.backgroundColor = 'rgba(0,0,0,0.7)';
      overlay.style.color = 'white';
      overlay.style.padding = '10px';
      overlay.style.borderRadius = '5px';
      overlay.style.zIndex = '99999';
      overlay.style.fontSize = '14px';
      overlay.innerHTML = '<div>Recording Mode</div><div id="selector-info" style="font-size:12px; max-width:300px; word-break:break-all;"></div>';
      document.body.appendChild(overlay);
      
      // Notify parent that script is loaded
      window.parent.postMessage({ type: 'SCRIPT_LOADED' }, '*');
      console.log('Recording script injected and running');
      
      // Handle click events
      document.addEventListener('click', function(event) {
        event.preventDefault();
        event.stopPropagation();
        
        // Get the clicked element
        const element = event.target;
        
        // Highlight the element temporarily
        const originalBackground = element.style.backgroundColor;
        const originalOutline = element.style.outline;
        element.style.backgroundColor = 'rgba(255, 255, 0, 0.3)';
        element.style.outline = '2px solid red';
        
        // Generate a simple selector
        let selector = '';
        
        // Try id first
        if (element.id) {
          selector = '#' + element.id;
        } 
        // Try classes next
        else if (element.classList.length > 0) {
          selector = '.' + Array.from(element.classList).join('.');
        }
        // Try tag with some text content as a last resort
        else {
          const text = element.textContent?.trim();
          if (text && text.length < 50) {
            selector = element.tagName.toLowerCase() + ':contains("' + text + '")';
          } else {
            selector = element.tagName.toLowerCase();
          }
        }
        
        // Update overlay with selector
        document.getElementById('selector-info').innerText = 'Recorded: ' + selector;
        
        // Send the selector to parent window
        window.parent.postMessage({ 
          type: 'ELEMENT_CLICKED', 
          selector: selector
        }, '*');
        
        // Reset the element style after a short delay
        setTimeout(() => {
          element.style.backgroundColor = originalBackground;
          element.style.outline = originalOutline;
        }, 2000);
        
        return false;
      }, true);
      
      // Prevent form submissions
      document.addEventListener('submit', function(event) {
        event.preventDefault();
        return false;
      }, true);
      
      // Add a DOMContentLoaded event to ensure overlay is added
      document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM fully loaded');
        document.body.appendChild(overlay);
      });
    `;
    
    // Add base tag to handle relative URLs
    if (!$('base').length) {
      $('head').prepend(`<base href="${targetUrl}">`);
    }
    
    // Add script to head
    $('head').append(`<script>${recorderScript}</script>`);
    
    // Convert all relative URLs to absolute URLs
    $('a').each((i, el) => {
      const href = $(el).attr('href');
      if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('javascript:')) {
        try {
          const absoluteUrl = new URL(href, targetUrl).href;
          $(el).attr('href', absoluteUrl);
        } catch (e) {
          // Ignore invalid URLs
        }
      }
    });
    
    // Stop forms from submitting
    $('form').attr('onsubmit', 'return false;');
    
    // Return the modified HTML with headers that allow framing
    return new NextResponse($.html(), {
      headers: {
        'Content-Type': 'text/html',
        'Content-Security-Policy': 'frame-ancestors *',
        'X-Frame-Options': 'ALLOWALL'
      },
    });
    
  } catch (error) {
    console.error('Error in proxy route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 