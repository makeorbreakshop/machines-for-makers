# CrewAI Price Extractor

A multi-agent AI system for extracting product prices from manufacturer websites, built using CrewAI and FastAPI.

## Overview

This service uses specialized AI agents to extract, validate, and store price information for maker equipment from manufacturer websites. It complements the existing Machines for Makers application by providing more robust and accurate price extraction capabilities.

## Architecture

- **FastAPI Application**: RESTful API endpoints for triggering price updates
- **CrewAI Framework**: Coordinates multiple specialized AI agents
- **Supabase Integration**: Stores price history and HTML data
- **Claude AI**: Advanced price extraction for complex cases

## Agents

1. **Batch Optimizer Agent**: Groups machines by manufacturer for efficient processing
2. **Web Scraper Agent**: Extracts HTML from product pages
3. **Price Extractor Agent**: Analyzes HTML structure to find price information
4. **Validator Agent**: Verifies extracted prices and updates the database

## API Endpoints

- `GET /update-all-prices`: Update prices for all machines
- `GET /update-machine-price/{machine_id}`: Update price for a specific machine
- `GET /debug/{machine_id}`: Detailed debugging for a specific machine's price extraction

## Setup and Deployment

### Prerequisites

- Python 3.10+
- Supabase account and API keys
- Claude API key (Anthropic)

### Local Development

1. Clone the repository
2. Create a virtual environment: `python -m venv venv`
3. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - macOS/Linux: `source venv/bin/activate`
4. Install dependencies: `pip install -r requirements.txt`
5. Install Playwright browsers: `playwright install`
6. Copy `.env.example` to `.env` and add your API keys
7. Run the application: `uvicorn app.main:app --reload`

### Docker Deployment

1. Build the Docker image: `docker build -t crewai-price-extractor .`
2. Run the container: `docker run -p 8000:8000 --env-file .env crewai-price-extractor`

### Hosting Platforms

The service can be deployed to:
- Render
- Heroku
- DigitalOcean
- Any other platform supporting Docker containers

## Integration with Machines for Makers

Add the following endpoints to the Next.js application:

```typescript
// app/api/crewai/update-prices/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const secret = searchParams.get('secret');
  
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Call the CrewAI service
    const response = await fetch(`${process.env.CREWAI_SERVICE_URL}/update-all-prices`, {
      headers: {
        'api-key': process.env.CREWAI_API_KEY
      }
    });
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

## License

MIT 