# Price Extractor Python

A Python tool for extracting product prices from e-commerce websites and updating a Supabase database. This tool is designed to integrate with the Machines for Makers admin interface.

## Features

- **Web Scraping**: Reliably scrape product pages from various e-commerce sites
- **Price Extraction**: Extract prices using multiple methods:
  - Structured data (JSON-LD, microdata, etc.)
  - Common CSS selectors
  - Claude AI fallback for complex pages
- **Database Integration**: Update machine prices and maintain price history
- **Admin Interface**: Simple API integration with admin "update price" button
- **Robust Error Handling**: Comprehensive logging and error management

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

## Admin Interface Integration

The "update price" button in the admin interface should make a POST request to the `/api/v1/update-price` endpoint with the machine ID in the request body.

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