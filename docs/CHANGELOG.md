# Changelog

All notable changes to the Machines for Makers project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Token usage tracking functionality in the admin panel
  - Added `fetchTokenUsage` function to retrieve token usage data from the API
  - Created Token Usage tab with summary statistics and detailed usage table
  - Implemented filtering by model and machine ID
  - Added visual indicators for successful and failed extractions
  - Included cost and token count breakdowns for each extraction attempt

### Fixed
- Resolved linter errors in the price tracker admin interface
- Fixed scope issues with functions in useEffect hooks
- Corrected type definitions for token usage data structure to allow string error messages
- Fixed API endpoint URL mismatch for token usage data (changed from `/api/admin/token-usage` to `/api/price-tracker/token-usage`)
- Fixed query parameter name mismatch (`machineId` → `machine_id`) in token usage request

### Changed
- Improved code organization in price tracker admin panel
- Enhanced error handling in API requests

## [1.0.0] - 2024-05-01

### Added
- Initial release of Machines for Makers platform
- Machine comparison functionality
- Advanced filtering for machine specifications
- Laser cutter, 3D printer, and CNC machine categories
- Admin panel for managing machine data
- Price tracking system
- User reviews and ratings
- Responsive design for all device sizes

### Future Plans
- See [ROADMAP.md](../ROADMAP.md) for planned features and enhancements 