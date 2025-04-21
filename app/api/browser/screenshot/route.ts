import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Request schema validation
const requestSchema = z.object({
  url: z.string().url(),
  width: z.number().optional().default(1280),
  height: z.number().optional().default(1600),
  fullPage: z.boolean().optional().default(true),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request data
    const result = requestSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: result.error.format() },
        { status: 400 }
      );
    }
    
    const { url, width, height, fullPage } = result.data;
    
    console.log(`Taking screenshot of: ${url} (fullPage: ${fullPage})`);
    
    // Launch browser
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width, height },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
    });
    
    // Navigate to URL with longer timeout
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('Page loaded');
    
    // Take screenshot
    const screenshot = await page.screenshot({ fullPage });
    console.log(`Screenshot taken (fullPage: ${fullPage})`);
    
    // Clean up
    await browser.close();
    
    // Return screenshot as image
    return new NextResponse(screenshot, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
    
  } catch (error) {
    console.error('Error in screenshot route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 