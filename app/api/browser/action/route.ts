import { NextRequest, NextResponse } from 'next/server';
import puppeteer, { Page, ElementHandle } from 'puppeteer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';

// Define the directory where screenshots will be stored
const SCREENSHOT_DIR = path.join(process.cwd(), 'public', 'screenshots');

// Create the directory if it doesn't exist
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Define the types for the API
interface Coordinate {
  x: number;
  y: number;
}

interface ScreenshotAction {
  type: 'screenshot';
  name?: string;
}

interface ExtractByCoordinateAction {
  type: 'extract-by-coordinate';
  coordinate: Coordinate;
  selector?: string;
}

type Action = ScreenshotAction | ExtractByCoordinateAction;

interface ActionRequest {
  url: string;
  actions: Action[];
}

export async function POST(request: NextRequest) {
  try {
    const body: ActionRequest = await request.json();
    const { url, actions } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      return NextResponse.json(
        { error: 'At least one action is required' },
        { status: 400 }
      );
    }

    // Launch a headless browser
    const browser = await puppeteer.launch({
      headless: true,
    });

    try {
      const page = await browser.newPage();
      
      // Set viewport to a reasonable size
      await page.setViewport({ width: 1280, height: 800 });
      
      // Navigate to the URL
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      
      // Wait for the page to be fully loaded
      await page.waitForNetworkIdle();

      const results = [];

      // Process each action
      for (const action of actions) {
        if (action.type === 'screenshot') {
          const screenshotResult = await handleScreenshot(page, action);
          results.push(screenshotResult);
        } else if (action.type === 'extract-by-coordinate') {
          const extractionResult = await handleExtractByCoordinate(page, action);
          results.push(extractionResult);
        }
      }

      return NextResponse.json({ data: results });
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error('Error processing browser action:', error);
    return NextResponse.json(
      { error: `An error occurred: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

async function handleScreenshot(page: Page, action: ScreenshotAction): Promise<string> {
  const fileName = `${action.name || uuidv4()}-${Date.now()}.png`;
  const filePath = path.join(SCREENSHOT_DIR, fileName);
  
  await page.screenshot({ path: filePath, fullPage: true });
  
  // Return the URL to access the screenshot
  return `/screenshots/${fileName}`;
}

async function handleExtractByCoordinate(page: Page, action: ExtractByCoordinateAction): Promise<string> {
  const { coordinate, selector } = action;
  const { x, y } = coordinate;
  
  // Wait for network idle to ensure the page has loaded
  await page.waitForNetworkIdle();
  
  // Use page.evaluate to extract text from the element at the specified coordinates
  const extractedText = await page.evaluate(
    ({ x, y, selector }) => {
      // Find all elements on the page
      const elements = document.elementsFromPoint(x, y);
      
      if (elements.length === 0) {
        return { error: `No element found at coordinates (${x}, ${y})` };
      }
      
      const element = elements[0];
      
      // If a selector is provided, find the closest matching parent
      const elementInfo = {
        text: element.textContent || '',
        tag: element.tagName,
        className: element.className,
        rect: element.getBoundingClientRect()
      };
      
      return elementInfo;
    },
    { x, y, selector }
  );
  
  return JSON.stringify(extractedText, null, 2);
}

// The GET method is used for health check
export async function GET() {
  return NextResponse.json({ status: 'Browser Action API is running' });
} 