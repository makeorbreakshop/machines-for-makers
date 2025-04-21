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

## Project Status

### Current Status

As of the latest update, we have:

- ✅ Implemented the full extraction pipeline
- ✅ Created the database schema
- ✅ Developed the admin interface
- ✅ Completed unit tests for all extraction methods:
  - Static Parser
  - Slice Check Fast (Claude Haiku)
  - Slice Check Balanced (Claude Sonnet)
  - JS Interaction Check (Playwright)
  - Full HTML Check (GPT-4o)
  - Price Validator
- ❌ Removed coordinate-based extractor functionality (deprecated in favor of more reliable methods)

### Known Issues and Troubleshooting

We've identified several issues with the price extraction system, particularly around:
- Incorrect price parsing on specific merchant sites
- Page fetch failures for certain domains
- Validation issues with large price changes
- Structured data handling inconsistencies

For detailed analysis and proposed solutions, see the [TROUBLESHOOTING.md](TROUBLESHOOTING.md) guide.

### Next Steps

Our current focus is on:

1. Implementing the Cost Tracking Dashboard
2. Finalizing end-to-end tests
3. Completing documentation and guides
4. Performance optimization
5. Fixing identified price extraction issues

### Documentation

The full Product Requirements Document (PRD) for this project can be found at:

- [LASER-PRICE-TRACKER-V3-PRD.md](docs/LASER-PRICE-TRACKER-V3-PRD.md)

## Multi-Tier Price Extraction System

The price extractor implements a sophisticated multi-tier approach to extract prices from e-commerce websites, prioritizing accuracy, efficiency, and cost management:

### Extraction Tiers

Five distinct extraction tiers, ordered by cost/complexity:

1. **STATIC**: Simple HTML/regex parsing (no AI cost)
   - Uses structured data, CSS selectors and common patterns
   - No API costs involved
   - Fast but limited to well-structured pages

2. **SLICE_FAST**: Claude Haiku on HTML snippets
   - Uses Claude 3 Haiku model (fast, lower cost)
   - Sends only price-relevant HTML snippets to reduce token usage
   - Balances speed and accuracy for moderately complex pages

3. **SLICE_BALANCED**: Claude Sonnet on HTML snippets
   - Uses Claude 3 Sonnet model (better accuracy, higher cost)
   - Provides more context and snippets for complex layouts
   - Better handling of discount formatting and variant prices

4. **JS_INTERACTION**: Playwright browser automation
   - For JavaScript-driven sites that require browser interaction
   - Handles dynamic content, API requests, and interactive elements
   - Can execute custom click sequences for variant selection

5. **FULL_HTML**: GPT-4o with complete HTML
   - Uses OpenAI's GPT-4o model for the most complex pages
   - Processes the complete HTML with preprocessing to reduce tokens
   - Highest cost, used only as a last resort

> **Note:** The previous coordinate-based extractor approach has been deprecated as of May 2025. This experimental feature has been removed in favor of the more reliable extraction methods listed above.

### Confidence Thresholds

The system uses configurable confidence thresholds:
- Default extraction confidence: 0.85 (85%)
- Default validation confidence: 0.90 (90%)
- Sanity check threshold: 0.25 (25%) - For price change validation

### Cost Optimization

The system minimizes AI costs through:
1. Starting with non-AI methods and only escalating when needed
2. Using cheaper models first (Claude Haiku before Sonnet)
3. Preprocessing HTML to reduce token usage
4. Targeting specific HTML snippets instead of full pages
5. Using cached API endpoints for repeat extractions
6. Tracking all token usage and model costs

### Price Validation

After extraction, prices are validated by:
1. Comparing to previous price (with percentage change thresholds)
2. Checking against category-specific price ranges
3. Validating against machine name/description
4. Flagging suspicious changes for manual review

### Environment Configuration

The system requires the following environment variables:
- `ANTHROPIC_API_KEY`: Required for Claude models (tiers 2-3)
- `OPENAI_API_KEY`: Required for GPT-4o model (tier 5)
- `CLAUDE_HAIKU_MODEL`: Claude 3 Haiku model ID (default: "claude-3-haiku-20240307")
- `CLAUDE_SONNET_MODEL`: Claude 3 Sonnet model ID (default: "claude-3-sonnet-20240229")
- `GPT4O_MODEL`: GPT-4o model ID (default: "gpt-4o")

### Note on Legacy Two-Stage Approach

The multi-tier system described above replaces the older two-stage approach (previously documented below). Key improvements include:

- More granular extraction tiers with clear progression from simple to complex methods
- Better cost optimization with multiple AI model options
- Enhanced JavaScript handling for dynamic sites
- More sophisticated validation and confidence scoring
- Comprehensive token usage tracking and cost management

While some code and documentation may still reference the two-stage approach, the current implementation uses the multi-tier system described above.

## Merchant-Specific Optimizations

The system includes site-specific optimizations for certain e-commerce platforms:

### ComMarker Optimizations
- Custom CSS selectors for ComMarker's unique HTML structure
- Special regex patterns to detect ComMarker's discount format (~~$2,299~~ $1,839)
- Enhanced Claude AI prompting with ComMarker-specific guidance
- Added to problematic merchants list for guaranteed accurate extraction

## Testing the Price Extractor

You can test the extraction system on any product URL with:

```
python test_extraction.py <url> [--category CATEGORY] [--previous-price PRICE] [--machine-id MACHINE_ID] [--tier TIER] [--debug]
```

Example:
```
python test_extraction.py https://commarker.com/product/commarker-b6 --category laser_cutter --machine-id abc123 --debug
```

Options:
- `--category`: Specify the product category for validation (e.g., "3d_printer", "laser_cutter")
- `--previous-price`: Provide a previous price for change validation
- `--machine-id`: Provide a machine ID to lookup product specs from the database (for specific configuration matching)
- `--tier`: Force a specific extraction tier (e.g., "STATIC", "SLICE_FAST", "FULL_HTML")
- `--debug`: Enable detailed debug output

## Feedback Loop System

The system records successful extraction methods by domain and builds a knowledge base over time:
- Automatically tracks which extraction methods work for different merchants
- Flags problematic merchants that require more sophisticated extraction methods
- Records confidence scores for different extraction methods

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

## Running Tests

To run the tests:

```bash
# Run all tests
pytest

# Run specific test suite
pytest tests/unit/test_static_parser.py
pytest tests/unit/test_slice_parser.py
pytest tests/unit/test_slice_balanced_parser.py
pytest tests/unit/test_js_parser.py
pytest tests/unit/test_full_html_parser.py
pytest tests/unit/test_price_validator.py

# Run with coverage report
pytest --cov=services tests/
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

### Missing Leading Digits in Claude Price Extraction

- **Issue**: Claude AI sometimes returns truncated prices (e.g., $839 instead of $1,839).
- **Cause**: Claude may misinterpret strikethrough formatting or complex price displays, especially on sites with discount formatting.
- **Fix (Implemented)**: Enhanced price correction using previous price as reference:
  1. Automatically detects when a price is suspiciously low compared to previous price
  2. Adds appropriate leading digit(s) if doing so makes the price closer to historical value
  3. Improved Claude prompting to emphasize capturing complete prices including all digits
  4. Added fallback for common price misreading patterns

### Truncated Prices in JSON-LD Data

- **Issue**: Some websites may provide incorrectly formatted or truncated prices in JSON-LD structured data (e.g., $1,199.00 appearing as 119.0).
- **Cause**: This often occurs when the site's JSON data has improperly formatted or truncated numeric values.
- **Fix (Implemented)**: Enhanced price validation in JSON-LD extraction now detects suspiciously small prices with specific patterns that may indicate truncation. The system now includes detailed logging and handling for numeric types that might be incorrectly formatted.

### Missing or Ignored Sale Prices

- **Issue**: The extractor sometimes ignores sale prices, returning the regular price instead.
- **Cause**: Multiple price formats present in the same text (e.g., "$1,499.00 $1,219.00 SAVE 19%").
- **Fix (Implemented)**: Enhanced price parsing to detect multiple prices within a string:
  1. When multiple price patterns are detected in a string, all are parsed and validated
  2. The system automatically selects the lowest price (typically the sale price)
  3. Special handling for common discount formats used by popular e-commerce platforms
  4. Comprehensive logging to track which price was selected and why
  5. **Price Change Verification System**: When a significant price change is detected (over 15%):
     - New verification layer using Claude AI examines the page specifically for sales evidence
     - Specialized prompt highlights the potential price change and asks for confirmation
     - Provides explicit instructions to look for sale indicators and price formatting patterns
     - Prevents incorrect updates by requiring verification for all significant price changes
     - Capable of suggesting alternative prices if both detected prices appear incorrect

### Duplicate Price History Entries

- **Issue**: Multiple price history entries created for a single price update operation.
- **Cause**: Both the main price update function and the fallback mechanism were adding history entries independently.
- **Fix (Implemented)**: Coordinated price history tracking between services:
  1. Added a flagging system to track when a history record has already been added
  2. Modified price service to check this flag before adding duplicate entries
  3. Improved communication between database service and price service
  4. Enhanced logging to detect and prevent duplicate operations

### Database Update Failures with "No Results" Error

- **Issue**: Price updates fail with "Update query returned no results with ID" error.
- **Cause**: Mismatched data types between the application code and database schema (using string for numeric fields).
- **Fix (Implemented)**: Fixed data type handling in database operations:
  1. Modified database service to use proper numeric types for price values
  2. Updated raw SQL queries to format numeric values correctly
  3. Added comprehensive logging for update operations to track response data
  4. Implemented multiple fallback approaches to handle edge cases
  5. **Direct REST API Solution**: After continued issues with the ORM:
     - Implemented direct HTTP PATCH requests to Supabase REST API
     - Bypassed ORM limitations by setting proper headers and authentication
     - Improved update reliability with explicit content-type and prefer headers
     - Fixed timezone handling for all timestamps to prevent date discrepancies

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