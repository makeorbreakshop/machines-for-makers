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
- Implemented Next.js batch results page with real-time updates
  - Shows detailed batch operation statistics and progress
  - Interactive filtering of results by status
  - Export functionality (JSON and CSV formats)
  - Detailed error reporting for failed extractions

### Fixed
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