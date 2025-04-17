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
- Enhanced admin dashboard notifications and error handling
- Price history backfill script implementation
  - Successfully populated historical price data for 149 machines
  - Automatic detection and skipping of machines without price data
  - 30-day backdating for initial price records
- Advanced batch operations in admin interface
  - Bulk price update functionality
  - Progress tracking for batch operations
  - Detailed success/failure reporting
  - Configurable machine limits (10, 25, 50, 100, or All machines)
  - Preview count of affected machines before update
  - Added Batch Jobs tab to view and manage batch operations
  - Links to detailed batch results pages
- Added `/api/v1/batch-configure` endpoint for previewing batch operations
- Added `/api/v1/batches` endpoint for listing batch jobs
- Performance optimization strategy with 80/20 approach
  - Added database indexes for commonly queried fields (`Hidden`, `Laser Category`, `Price`)
  - Added HTTP caching headers with appropriate TTL values
  - Implemented client-side caching with React Query (5-minute stale time)
  - Added server timing headers for better performance monitoring
  - Added pagination implementation to prevent large result sets
  - Simplified API query structure and filter conditions
- Variant-aware price extraction in Python extractor
  - Support for products with different power/wattage options
  - Automatic matching of machine specs to correct product variant
  - Specialized handling for ComMarker and similar e-commerce sites
  - Improved extraction accuracy for machines with multiple variants

### Improved
- Database query performance by 50-80% through targeted indexes
- API response times with optimized query structure
- Client-side data management with React Query
- Response payload optimization with field selection
- Enhanced database referential integrity
  - Added CASCADE delete behavior to price_history foreign key constraint
  - Machine deletions now automatically remove associated price history records
  - Simplified process for removing discontinued machines

### Fixed
- Fixed significant performance issues on Compare page
  - Optimized database queries to exclude large HTML content (reduced payload from ~5MB to ~50KB per machine)
  - Fixed event handling in ViewToggle component by replacing custom events with prop-based callbacks
  - Resolved infinite loop in sorting logic by properly separating sorting from state updates
  - Fixed debug status endpoint to avoid query size limitations
  - Improved overall page load time and responsiveness
- Implemented redirects to handle incorrect URL patterns
  - Added specific redirects from `/lasers/:slug` to `/products/:slug` for product pages
  - Preserved access to legitimate category pages (desktop-diode-laser, desktop-galvo, etc.)
  - Fixed "No products found for category" errors appearing in logs
- Fixed database schema mismatch in batch_results table
  - Removed invalid reference to 'created_at' column
  - Updated code to use proper 'start_time' and 'end_time' fields
  - Resolved "Could not find the 'created_at' column" error
- Fixed incorrect use of await with Supabase client in batch operations
  - Removed invalid await usage causing "can't be used in 'await' expression" errors
  - Improved error handling and logging for batch operations
  - Fixed batch jobs not appearing in the admin interface
- Fixed unsupported group() method in batch results stats
  - Replaced group() with separate count queries for successful and failed operations
  - Added manual calculation for price change statistics
  - Fixed "object has no attribute 'group'" error when viewing batch results
- Fixed excessive CPU usage issue caused by continuous polling on batch results page
  - Removed auto-refresh functionality to prevent repeated API calls
  - Added manual refresh button with user guidance
  - Improved UI to indicate refresh behavior
- Batch update datetime comparison error in database service
- Removed 7-day threshold requirement for batch updates
  - All machines will now be processed by default, regardless of when they were last updated
  - Fixed "can't subtract offset-naive and offset-aware datetimes" error
  - Fixed days_threshold=0 to properly return all machines
- Fixed price history recording issues:
  - Resolved database schema mismatch in price history table
  - Fixed column name discrepancies between code and actual database schema (last_updated → html_timestamp)
  - Enhanced error handling and logging for database operations
  - Improved URL field discovery for product links
- Fixed async/await implementation issues in Python API
  - Made all database methods properly async
  - Added missing await statements for database calls
- Fixed batch update race condition causing empty batch updates
  - Modified batch_configure endpoint to return machine IDs
  - Updated batch_update to use provided machine IDs
  - Ensured consistent machine selection between preview and execution
- Fixed Supabase PostgREST filter syntax
  - Replaced unsupported filter combinations with separate queries
  - Improved machine selection logic for updates
- Fixed datetime module reference errors
  - Corrected improper import and usage patterns
  - Updated all references to use proper datetime.now() format
- Fixed error checking for Supabase responses
  - Removed checks for non-existent .error attribute
  - Updated response handling to match current Supabase Python client
- Fixed database schema mismatch in batches table
  - Removed references to non-existent completed_at column
  - Updated batch creation to match database schema
- Fixed price extraction issues with truncated JSON-LD data
  - Added validation for numeric price values extracted from structured data
  - Implemented detection of suspiciously small prices that might be truncated
  - Enhanced logging for price validation to help diagnose extraction issues
  - Added reasonable price range validation (between $10 and $100,000)
- Improved machine ID lookup robustness in database service
  - Added case-insensitive matching for machine IDs
  - Implemented whitespace removal for IDs with unexpected spaces
  - Enhanced error reporting for machine lookup failures
  - Added stepped fallback approach to try multiple formats of the same ID
- Fixed React Query initialization error
  - Added QueryClientProvider to site layout
  - Implemented proper client-side data fetching

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