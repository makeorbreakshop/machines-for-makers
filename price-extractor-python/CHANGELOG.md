# Changelog

All notable changes to the Price Extractor Python project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project directory structure
- Basic module setup
- CHANGELOG and PRD documents

## [0.1.0] - 2023-08-21
### Added
- Initial project setup
- Configuration module with environment variables loading
- Web scraping functionality with BeautifulSoup
- Price extraction methods:
  - Structured data (JSON-LD, microdata)
  - Common CSS selectors
  - Claude AI fallback integration (using cheaper Claude 3 Haiku model)
- Supabase database integration for:
  - Fetching machine data
  - Updating prices in machines table
  - Storing price history entries
  - Saving HTML content
- FastAPI endpoints for:
  - Single machine price updates (triggered by admin interface)
  - Batch updating multiple machines
- Background task processing for batch updates
- Comprehensive error handling and logging
- Utility functions for price formatting and calculations 