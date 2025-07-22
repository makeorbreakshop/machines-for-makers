# Python Services Quick Start Guide

This directory contains two separate Python services that support the Machines for Makers application:

## 1. Price Tracker Service (Port 8000)
Handles regular price updates for existing machines in the database.

```bash
./start
```

**Features:**
- Updates prices for all tracked machines
- Runs scheduled batch updates
- Handles price change validation
- Does NOT use Scrapfly (uses regular scraping)

## 2. Discovery Service (Port 8001)
Handles discovering and importing new machines from manufacturer websites.

```bash
./start-discovery
```

**Features:**
- Crawls manufacturer websites for new products
- Extracts full product specifications
- Uses Scrapfly for difficult sites (xTool, ComMarker, etc.)
- Integrates with admin panel's manufacturer sites page

## Running Both Services

Each service runs independently. For full functionality:

1. **Terminal 1:** Start the price tracker
   ```bash
   cd price-extractor-python
   ./start
   ```

2. **Terminal 2:** Start the discovery service
   ```bash
   cd price-extractor-python
   ./start-discovery
   ```

3. **Terminal 3:** Start the Next.js app
   ```bash
   cd .. # (back to main project root)
   npm run dev
   ```

## Service URLs

- Price Tracker API: http://localhost:8000/docs
- Discovery API: http://localhost:8001/docs
- Main Application: http://localhost:3000
- Admin Panel: http://localhost:3000/admin

## Environment Variables

Both services automatically load from the `.env` file (no need to export):
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_KEY` - Service role key for database access
- `OPENAI_API_KEY` - For Claude AI price extraction
- `SCRAPFLY_API_KEY` - For Scrapfly integration (discovery only)

All API keys are stored in the `.env` file and loaded automatically when services start.

## Troubleshooting

If a service won't start:
1. Check if the port is already in use: `lsof -i :8000` or `lsof -i :8001`
2. Kill the process if needed: `kill -9 [PID]`
3. Make sure you're in the `price-extractor-python` directory
4. Check that your conda environment is activated