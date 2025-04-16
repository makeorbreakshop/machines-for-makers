# Price Extractor Python - Product Requirements Document

## Overview

The Price Extractor Python tool is designed to automate the extraction of product prices from e-commerce websites and update a Supabase database with this information. This tool integrates with the Machines for Makers admin interface, allowing admins to trigger price updates with a single button click.

## Goals

- Reliably extract prices from various e-commerce sites
- Maintain price history for trend analysis
- Integrate seamlessly with the admin interface
- Use cost-effective AI solutions when needed

## Use Cases

1. **Admin Triggered Update**: Admin clicks the "Update Price" button in the admin interface, triggering an update for a specific machine
2. **Batch Updates**: System automatically updates prices for machines not updated in the last X days
3. **Price History Tracking**: System maintains a history of price changes for trend analysis

## Technical Requirements

### Web Scraping

- **Requirement**: Extract product prices from e-commerce websites
- **Implementation**: 
  - Use BeautifulSoup for HTML parsing
  - Support multiple extraction methods (structured data, CSS selectors)
  - Fall back to Claude AI for complex pages
  - ✅ Implemented in `scrapers/web_scraper.py` and `scrapers/price_extractor.py`

### Database Integration

- **Requirement**: Store and update price information in Supabase
- **Implementation**:
  - Fetch machine data including URLs
  - Update price and last updated timestamp
  - Store price history entries
  - ✅ Implemented in `services/database.py`

### API Endpoints

- **Requirement**: Provide endpoints for the admin interface to trigger updates
- **Implementation**:
  - Single machine update endpoint
  - Batch update endpoint
  - Health check endpoint for connectivity verification
  - ✅ Implemented in `api/routes.py`

### Admin Interface Integration

- **Requirement**: Seamless integration with Next.js admin interface
- **Implementation**:
  - Client-side JavaScript API client
  - Real-time debug information
  - Enhanced error handling
  - Performance metrics
  - ✅ Implemented in `admin-integration.js` and Next.js admin page

### AI Integration

- **Requirement**: Use Claude AI as a fallback for complex price extraction
- **Implementation**:
  - Use the cheaper Claude 3 Haiku model for cost efficiency
  - Optimize prompts for price extraction
  - ✅ Implemented in `scrapers/price_extractor.py`

### Logging and Error Handling

- **Requirement**: Comprehensive logging and error handling
- **Implementation**:
  - Detailed logs with rotation
  - Error tracking and reporting
  - Client-side error reporting
  - ✅ Implemented throughout the codebase

## Features

### Price Extraction Methods

- [x] Structured data extraction (JSON-LD, microdata)
- [x] Common CSS selectors
- [x] Claude AI fallback integration

### Database Operations

- [x] Update machine prices
- [x] Track price history
- [x] Store HTML content for debugging

### API Integration

- [x] Single machine update API endpoint
- [x] Batch update API endpoint
- [x] Background task processing
- [x] Health check endpoint

### Admin Interface

- [x] Next.js integration with JavaScript API client
- [x] Detailed debug information display
- [x] Visual price change indicators (increase/decrease)
- [x] Connection status verification
- [x] Performance metrics

### Utilities

- [x] Command-line tools for testing and manual updates
- [x] Debugging and testing utilities
- [x] API connectivity testing

## Success Criteria

- [x] Successfully extract prices from various e-commerce sites
- [x] Update the database with new prices when changes are detected
- [x] Maintain accurate price history
- [x] Seamless integration with the admin interface
- [x] Detailed debug information for troubleshooting

## Future Enhancements

- [ ] Add support for more structured data formats
- [ ] Implement site-specific extractors for popular e-commerce sites
- [ ] Create a dashboard for price trend visualization
- [ ] Add notification system for significant price changes
- [ ] Implement automatic retry for failed extractions

## Implementation Status

- [x] Initial project setup
- [x] Configuration module
- [x] Web scraping functionality
- [x] Price extraction methods
- [x] Supabase database integration
- [x] API endpoints
- [x] Next.js admin interface integration
- [x] Command-line tools
- [x] Testing utilities 