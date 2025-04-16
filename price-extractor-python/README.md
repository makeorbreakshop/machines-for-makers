# Price Extractor Python

A Python tool for extracting product prices from e-commerce websites and updating a Supabase database. This tool is designed to integrate with the Machines for Makers admin interface.

## Features

- **Web Scraping**: Reliably scrape product pages from various e-commerce sites
- **Price Extraction**: Extract prices using multiple methods:
  - Structured data (JSON-LD, microdata, etc.)
  - Common CSS selectors
  - Claude AI fallback for complex pages
- **Database Integration**: Update machine prices and maintain price history
- **Admin Interface**: Seamless integration with Next.js admin dashboard
- **Robust Error Handling**: Comprehensive logging and error management
- **Performance Metrics**: Track API response times and extraction efficiency

## Requirements

- Python 3.8 or higher
- Dependencies listed in `requirements.txt`
- Supabase database access
- Anthropic API key for Claude AI integration

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/price-extractor-python.git
   cd price-extractor-python
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your actual credentials
   ```

## Usage

### Starting the API Server

Run the main application:

```bash
python main.py
```

This will start the FastAPI server on the host and port specified in your `.env` file.

### API Endpoints

#### Update a Single Machine Price

```
POST /api/v1/update-price
```

Request body:
```json
{
  "machine_id": "your-machine-id"
}
```

Response:
```json
{
  "success": true,
  "message": "Price updated successfully",
  "old_price": 299.99,
  "new_price": 319.99,
  "method": "JSON-LD",
  "price_change": 20.0,
  "percentage_change": 6.67
}
```

#### Batch Update Multiple Machines

```
POST /api/v1/batch-update
```

Request body:
```json
{
  "days_threshold": 7,
  "machine_ids": ["id1", "id2"]  // Optional: if not provided, all machines needing updates are processed
}
```

Response:
```json
{
  "success": true,
  "message": "Batch update started in the background"
}
```

#### Health Check

```
GET /health
```

Response:
```json
{
  "status": "healthy"
}
```

## Admin Interface Integration

### JavaScript Integration

The admin interface uses a JavaScript client to communicate with the Python API:

1. Include the `price-tracker-api.js` file in your Next.js application
2. The script automatically tries to connect to the API on load
3. Use the exported functions to update prices:

```javascript
// Update a single machine
const result = await window.priceTrackerAPI.updateMachinePrice("machine-id");

// Batch update machines
const batchResult = await window.priceTrackerAPI.updateAllPrices(7); // 7 days threshold
```

### Debug Information

The integration provides detailed debug information:

- Extraction method used
- Old and new prices
- Price change percentage
- Response times
- Error details when extraction fails

## Error Handling

All errors are logged to `logs/price_extractor.log` and also returned in the API responses. Errors include:
- Database connection issues
- Web scraping failures
- Price extraction problems
- Invalid input data

## Logging

Logs are stored in the `logs` directory with automatic rotation when files reach 10MB.

## License

[MIT License](LICENSE) 