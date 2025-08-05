# CLAUDE.md - Price Extractor Python Service

This file provides guidance to Claude Code when working with the Python price extraction service.

## Service Overview

The Price Extractor is a FastAPI microservice that handles web scraping, price extraction, and machine data management for the Machines for Makers platform. It runs independently on port 8000 and communicates with the Next.js application via HTTP APIs.

## Essential Commands

### Development
```bash
cd price-extractor-python
pip install -r requirements.txt
python main.py  # Run FastAPI server on port 8000
```

### Testing
```bash
python test_api.py              # Basic API endpoint tests
python test_scraping.py         # Scraping functionality tests
python test_end_to_end.py       # Full pipeline tests
```

## Critical Development Rules

### 1. Dual-Service Architecture
- **Never stop the FastAPI server** - it runs independently from Next.js
- The Next.js app (port 3000) and Python service (port 8000) run concurrently
- Both services share the same Supabase database
- API communication via HTTP requests between services

### 2. Scrapfly Integration (Production-Ready)
- **Always use Scrapfly for production scraping** - it's optimized and cost-efficient
- Tier learning system is fully operational (98.8% success rate at scale)
- Use `use_scrapfly=True` parameter for all batch operations
- Standard scraper is backup only - not for production use

### 3. Database Operations
- Uses direct Supabase client operations (not raw SQL)
- All database changes go through `services/database.py`
- Price history requires non-null prices - use fallback for failed extractions
- Foreign key relationships are enforced - check constraints before inserts

### 4. Error Handling and Logging
- Uses `loguru` for all logging (not Python's `logging` module)
- All async operations must handle exceptions gracefully
- Database constraint violations should use fallback values
- Failed extractions should still create audit trail entries

## Architecture Overview

### Core Services (`/services/`)
- `price_service.py` - Main orchestration and batch processing
- `database.py` - All Supabase database operations
- `variant_verification.py` - Price validation and variant detection

### Scrapers (`/scrapers/`)
- `scrapfly_web_scraper.py` - **PRIMARY**: Production Scrapfly integration with tier learning
- `web_scraper.py` - Backup: Puppeteer-based scraper (not for production)
- `price_extractor.py` - Multi-method price extraction logic
- `site_specific_extractors.py` - Site-specific extraction rules

### API Layer (`/api/`)
- `routes.py` - FastAPI endpoints for Next.js integration
- RESTful endpoints for batch operations, machine updates, discovery

## Key Features

### Scrapfly Tier Learning System
- **Tier 1**: 1 credit (basic fetch) - preferred for known-good sites
- **Tier 2**: 5 credits (JavaScript rendering)
- **Tier 3**: 25+ credits (anti-bot protection)
- System learns optimal tier per domain and starts there
- 80% credit savings through intelligent tier selection

### Price Extraction Pipeline
1. **Dynamic Method**: Puppeteer interaction (if needed)
2. **Site-Specific**: Custom rules and learned selectors  
3. **Structured Data**: JSON-LD, OpenGraph, meta tags
4. **Common Selectors**: Fallback CSS selector patterns

### Batch Processing
- Concurrent processing with configurable workers (default: 8 for Scrapfly)
- Real-time logging with unique batch IDs
- Comprehensive error handling and retry logic
- Variant verification system prevents bad data

## Database Schema Considerations

### Key Tables
- `machines` - Core machine data with `product_link` URLs
- `price_history` - All price changes and extraction attempts
- `scrapfly_tier_history` - Domain-based tier learning data
- `scrapfly_credit_log` - Credit usage tracking
- `batch_operations` - Batch processing audit trail

### Important Patterns
- Use machine.id (UUID) for all relationships
- Price history requires non-null price (use old_price as fallback)
- Batch operations create audit trail for all changes
- Foreign key constraints are enforced

## Common Implementation Patterns

### Async Service Method
```python
async def update_machine_price(self, machine_id: str, use_scrapfly: bool = True):
    try:
        # Get Scrapfly scraper (preferred)
        if use_scrapfly:
            scraper = self._get_scrapfly_scraper()
        
        # Extract price with error handling
        price = await scraper.extract_price(url, machine_name)
        
        # Update database with fallback handling
        await self.db_service.add_price_history(
            machine_id=machine_id,
            new_price=price,  # Can be None
            old_price=current_price,
            success=price is not None
        )
        
    except Exception as e:
        logger.error(f"Failed to update machine {machine_id}: {e}")
        raise
```

### Scrapfly Integration
```python
from scrapers.scrapfly_web_scraper import ScrapflyWebScraper

# Always use with database service for tier learning
scraper = ScrapflyWebScraper(database_service=self.db_service)

# Tier learning happens automatically
html, soup = await scraper.get_page_content(url)

# Credit logging with batch tracking
await scraper.log_credit_usage(batch_id, machine_id, url)
```

### Database Operations
```python
# Direct Supabase operations (not raw SQL)
result = self.supabase.table('machines') \
    .select('product_link, "Machine Name"') \
    .eq('id', machine_id) \
    .execute()

# Handle constraints gracefully
if new_price is not None:
    entry_data["price"] = new_price
else:
    entry_data["price"] = old_price or 0.0  # Fallback for constraint
```

## Testing Approach

### Unit Tests
- Test individual scrapers with known URLs
- Validate price extraction methods
- Check database operations

### Integration Tests  
- End-to-end batch processing
- Scrapfly tier learning validation
- API endpoint functionality

### Production Validation
- Small batch tests (10 machines) before large runs
- Monitor tier learning progression
- Validate credit usage efficiency

## Performance Guidelines

### Scrapfly Optimization
- Use 8 workers for optimal Scrapfly concurrency
- Tier learning reduces credit usage by ~80%
- Monitor credit consumption vs success rates
- Prefer Tier 1 operations when possible

### Database Efficiency
- Batch database operations when possible
- Use proper indexing on frequently queried fields
- Avoid raw SQL - use Supabase client methods
- Handle foreign key relationships properly

## Deployment Considerations

- Service runs independently on port 8000
- Requires SCRAPFLY_API_KEY environment variable
- Supabase credentials shared with Next.js application
- Logging files stored in `/logs/` directory
- No build step required - direct Python execution

## Common Issues and Solutions

### Database Constraint Violations
- **Issue**: `null value in column "price"` 
- **Solution**: Use old_price as fallback when extraction fails

### Scrapfly Credit Optimization
- **Issue**: High credit usage
- **Solution**: Let tier learning system optimize automatically

### URL Health Issues
- **Issue**: 404 errors on product URLs
- **Solution**: Update URLs in database, don't modify scraper

### Logging Integration
- **Issue**: Missing log entries
- **Solution**: Use `from loguru import logger` (not Python logging)

## Important Files

- `/services/price_service.py` - Main service orchestration
- `/scrapers/scrapfly_web_scraper.py` - Production scraper
- `/services/database.py` - All database operations  
- `/api/routes.py` - FastAPI endpoints
- `/main.py` - Service entry point
- `/requirements.txt` - Python dependencies

Remember: This service is production-ready with 98.8% success rate. The Scrapfly integration with tier learning is the preferred scraping method for all operations.