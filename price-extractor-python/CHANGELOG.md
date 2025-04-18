# Changelog

All notable changes to the Machines for Makers project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Version Numbering Convention

This project follows Semantic Versioning (SemVer):
- **MAJOR.MINOR.PATCH** (e.g., 1.2.3)
- **MAJOR**: Incremented for incompatible API changes
- **MINOR**: Incremented for new functionality in a backwards-compatible manner
- **PATCH**: Incremented for backwards-compatible bug fixes

The "Unreleased" section tracks changes not yet assigned to a version number. When ready 
for release, the "Unreleased" heading will be replaced with the appropriate version number
based on the nature of the changes (1.1.0 for new features, 1.0.1 for bug fixes only, etc.).

## [Unreleased]

### Added
- Implemented enhanced web scraper with comprehensive error handling and retry logic
  - Added 5-retry strategy with increasing backoff for failed requests
  - Implemented random delay between retries (1-5 seconds)
  - Added URL validation and response status code handling
  - Enhanced error logging for all HTTP request failures
- Implemented multi-tier price extraction pipeline
  - Completed Static Parse tier for structured data extraction
  - Developed Slice Check Fast tier using Claude Haiku
  - Created foundation for Slice Check Balanced tier
  - Added preliminary support for Full HTML tier with GPT-4o
- Enhanced price extraction methods
  - Added support for various price formats and patterns
  - Implemented domain-specific selector patterns
  - Added structured data extraction via JSON-LD and microdata
  - Improved currency detection and formatting
- Added cost tracking for LLM usage
  - Implemented token counting for Claude API calls
  - Added estimated cost calculation based on token usage
  - Created structured response format with confidence scores
- Enhanced admin dashboard notifications and error handling
- Price history backfill script implementation
  - Successfully populated historical price data for 149 machines
  - Automatic detection and skipping of machines without price data
  - 30-day backdating for initial price records
- Advanced batch operations in admin interface
  - Bulk price update functionality
  - Progress tracking for batch operations
  - Detailed success/failure reporting
- Implemented Next.js batch results page with real-time updates
  - Shows detailed batch operation statistics and progress
  - Interactive filtering of results by status
  - Export functionality (JSON and CSV formats)
  - Detailed error reporting for failed extractions
- Added sale price detection to price extractor
  - Improved parsing for multiple prices in a single string
  - Automatically selects the lower price when both regular and sale prices are present
  - Enhanced price detection for common discount formats
- Added Claude price verification system for significant price changes
  - Automatically detects price changes over 15% and routes them for verification
  - Specialized verification prompt for Claude with enhanced price change context
  - Intelligent selection between previous, new, or alternative prices based on Claude's analysis
  - Falls back to previous price when verification fails to prevent incorrect updates
  - Improves accuracy for sale prices and special discounts

### Fixed
- Enhanced price parsing for multiple international formats
  - Fixed issues with decimal vs thousands separators (US and EU formats)
  - Added support for multiple price formats in the same text (e.g., "$1,499.00 $1,219.00")
  - Improved handling of currency symbols and HTML entities
  - Enhanced validation for suspiciously low or high prices
- Fixed incorrect price extraction on merchant websites 
  - Added merchant-specific CSS selectors for ComMarker, Atomstack, and Aeon sites
  - Implemented specialized ComMarker extractor for WooCommerce discount formats
  - Added intelligent price validation against merchant price ranges
  - Enhanced detection of sale prices vs regular prices
- Added smart price correction for missing digits
  - Automatic detection and correction of missing leading digits (e.g., $600 → $6,000)
  - Fixed missing trailing digit issues (e.g., $184 → $1,840)
  - Added decimal point error correction (e.g., 1.839 → 1,839.00)
  - Improved validation against previous price for large changes
- Enhanced anti-scraping measures
  - Added rotating user agents to avoid bot detection
  - Implemented proxy support for problematic merchants
  - Added customizable retry logic with increased backoff
  - Enhanced request headers to mimic real browsers
- Improved Claude AI integration
  - Added merchant-specific prompt enhancements
  - Improved HTML preprocessing with intelligent truncation
  - Better preservation of price-related sections in truncated HTML
  - Added structured response format with confidence scoring
- Batch update datetime comparison error in database service
- Removed 7-day threshold requirement for batch updates
  - All machines will now be processed by default, regardless of when they were last updated
  - Fixed "can't subtract offset-naive and offset-aware datetimes" error
- Fixed missing batch results page in admin interface
  - Added proper Next.js route for accessing batch update results
  - Implemented robust error handling for batch result display
- Corrected HTML timestamp field handling in the machines table
  - Added utility script to update machine timestamps to match history dates
  - Improved timestamp parsing for different datetime formats
- Fixed UUID format handling in Python price extractor service
  - Resolved issue where machine IDs couldn't be found despite existing in database
  - Added multiple fallback methods for machine ID lookup and price updates
  - Improved database service to handle different UUID formats with standardization
  - Added fallback to ensure price history is recorded even if main update fails
  - Implemented comprehensive test script for verifying database connectivity
- Fixed Claude AI price extraction issues with missing leading digits
  - Added smart price correction using previous price as reference point
  - Improved Claude prompting to emphasize capturing complete prices
  - Implemented automatic detection and correction of truncated prices
  - Added fallback mechanisms for common price misreading patterns
- Fixed duplicate price history entries in database
  - Eliminated double posting of price history records
  - Added proper flagging system to track when history records are already added
  - Improved coordination between price service and database service
- Fixed numeric type handling in database updates
  - Fixed database update failures due to incorrect data type handling
  - Updated SQL queries to use proper numeric formatting
  - Eliminated "update query returned no results" errors
- Implemented direct REST API approach for database updates
  - Bypassed ORM limitations by using direct HTTP PATCH requests to Supabase
  - Improved reliability of price updates with proper headers and authentication
  - Added timezone awareness to all timestamps to ensure consistent date handling
  - Fixed date discrepancies in price history records and machine timestamps

## [1.0.0] - 2025-04-16

### Added
- Python-based Price Extractor integration with Next.js admin interface
  - Automated price extraction from e-commerce websites
  - Price history tracking and visualization
  - Support for individual and batch price updates
  - Detailed debug information with extraction methods used
  - Seamless fallback when Python API is unavailable
  - Enhanced Recent Updates tab showing price changes and trends
  - Performance metrics for API response times

### Improved
- Admin interface UI with enhanced debugging tools
- Price history display now shows price changes with visual indicators
- Improved error handling in admin tools

### Fixed
- Historical price comparison in Recent Updates tab now correctly shows previous prices
- Price extraction reliability improvements


### Added
- Initial public release
- Machine catalog with detailed specifications
- Brand and category filtering
- Search functionality
- Responsive design for all devices 