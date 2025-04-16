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

## Database Optimization

To minimize CPU usage and improve query performance, we recommend adding indexes to your database. The provided `create_indexes.sql` file contains SQL commands to create the necessary indexes:

```sql
-- Run these commands in the Supabase SQL Editor
CREATE INDEX IF NOT EXISTS idx_batch_results_batch_id ON batch_results (batch_id);
CREATE INDEX IF NOT EXISTS idx_machines_html_timestamp ON machines (html_timestamp);
CREATE INDEX IF NOT EXISTS idx_machines_product_link ON machines (product_link) WHERE product_link IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_price_history_machine_id ON price_history (machine_id);
CREATE INDEX IF NOT EXISTS idx_price_history_date ON price_history (date);
CREATE INDEX IF NOT EXISTS idx_batches_id ON batches (id);
```

After creating the indexes, run `ANALYZE` on each table to update the query planner statistics:

```sql
ANALYZE batch_results;
ANALYZE machines;
ANALYZE price_history;
ANALYZE batches;
```

### Performance Considerations

- The batch results page does not auto-refresh to prevent excessive CPU usage. Users must manually refresh to see updates.
- Long-running queries should be optimized or moved to background tasks when possible.
- Consider adding additional indexes if you notice slow performance on specific queries.

## Troubleshooting

### Incorrect Prices (e.g., $2,599.00 parsed as 259900.0)

- **Issue**: Sometimes, prices containing thousands separators (like commas) might be parsed incorrectly, leading to highly inflated values.
- **Cause**: The initial price parsing logic might misinterpret the comma or period depending on the site's formatting.
- **Fix (Implemented)**: The `_parse_price` function in `scrapers/price_extractor.py` has been updated (as of [Date/Commit ID]) to more robustly handle different decimal/thousands separator conventions. It now attempts to intelligently determine the correct decimal separator based on the position of the last comma and period.

### Truncated Prices in JSON-LD Data

- **Issue**: Some websites may provide incorrectly formatted or truncated prices in JSON-LD structured data (e.g., $1,199.00 appearing as 119.0).
- **Cause**: This often occurs when the site's JSON data has improperly formatted or truncated numeric values.
- **Fix (Implemented)**: Enhanced price validation in JSON-LD extraction now detects suspiciously small prices with specific patterns that may indicate truncation. The system now includes detailed logging and handling for numeric types that might be incorrectly formatted.

### Machine ID Not Found in Database

- **Issue**: Valid machine IDs failing to match in the database.
- **Cause**: Case sensitivity or unexpected whitespace in machine IDs.
- **Fix (Implemented)**: The database service now implements a stepped fallback process that tries:
  1. Exact ID match (original case)
  2. Lowercase ID match
  3. Whitespace-removed ID match
  This ensures robust machine lookups even when IDs have slight format differences between systems.

### Claude AI Fallback Not Working

- **Issue**: The fallback price extraction using Claude AI might fail or not trigger as expected.
- **Cause**: The Anthropic API requires a specific `anthropic-version` header for requests. If this header is missing or outdated, the API call might fail.
- **Fix (Implemented)**: The Anthropic client initialization in `scrapers/price_extractor.py` now explicitly includes the `anthropic-version: 2023-06-01` header (as of [Date/Commit ID]), ensuring compatibility with the API.

## License

[MIT License](LICENSE) 