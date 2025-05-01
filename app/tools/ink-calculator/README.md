# UV Printer Ink Cost Calculator

This tool helps UV printer users estimate ink costs for print jobs. It allows users to upload an image, specify print dimensions, select ink configuration, and get accurate cost estimations.

## Implementation Status

### Completed
- Basic project setup with Next.js page routes
- UI components using Shadcn UI and Tailwind CSS
- Image upload and processing for coverage estimation
- Ink usage and cost calculation engine
- Multiple ink mode configurations
- Quality setting options
- Local storage for user preferences
- Results visualization with breakdown by channel
- Copy results functionality
- API endpoint for programmatic access
- Test data collection interface in admin panel
- Validation against real test prints
- Auto-calibration system based on test data
- Channel-specific calibration factors
- Specialized handling for white and gloss layers
- Test results export functionality for analysis
- Improved data validation for dimensions and ink modes

### To Be Completed
- Unit and integration tests
- Performance optimizations
- Mobile responsive testing
- User documentation
- Final deployment
- Further refinement of special layer handling
- Separation of CMYK and special layer calibration processes
- Added test data with more print size variations

## Technical Details

### Calculation Methodology
The calculator uses the following approach:
1. Pixel sampling to determine coverage percentage by channel
2. Enhanced non-linear formula for CMYK channels: 
   mL = base_consumption + (area^area_exponent * coverage^coverage_exponent * channel_factor * quality_factor * area_scaling)
3. Specialized area-based formula for white and gloss layers:
   mL = base_consumption + (area^area_exponent * layer_factor * quality_factor * mode_factor)
4. Channel-specific calibration factors adjusted through test data
5. Separate handling for standard CMYK channels vs. special layers (white, gloss)
6. Mode-specific adjustments for different ink configurations
7. Dynamic area scaling based on continuous functions rather than discrete thresholds

### Auto-Calibration System
The system includes:
- Admin validation dashboard to compare predictions vs actual measurements
- Automatic optimization of calibration factors based on test data
- Before/after accuracy comparison metrics
- Separate error tracking for standard channels vs. special layers
- Persistent calibration storage in database and local storage
- Self-improving accuracy as more test data is added
- Export functionality for detailed analysis of validation results

### Directory Structure
- `/app/tools/ink-calculator` - Main application directory
  - `/components` - UI components
  - `/services` - Service modules
    - `auto-calibration.ts` - Calibration optimization engine
    - `calibration-loader.ts` - Loads calibration factors
    - `validation.ts` - Validates predictions against test data
  - `types.ts` - TypeScript type definitions
  - `config.ts` - Configuration constants
  - `utils.ts` - Utility functions for calculations
  - `ink-calibration.ts` - Channel-specific calibration factors
- `/app/api/ink-cost` - API endpoint for programmatic access
- `/app/api/admin/ink-calculator/calibration` - API for calibration management
- `/app/(admin)/admin/tools/ink-calculator/validation` - Admin validation dashboard

### API Usage

The API endpoint at `/api/ink-cost` accepts POST requests with the following parameters:

#### Common Parameters
- `inkMode`: Ink configuration (default: "CMYK")
- `quality`: Print quality - "draft", "standard", or "high" (default: "standard")
- `inkPrice`: Price of ink package in USD (default: 300)
- `mlPerSet`: Total mL per ink set (default: 600)

#### Image Mode Parameters
- `coverage`: Estimated ink coverage (0-1)
- `width`: Print width
- `height`: Print height
- `unit`: Dimension unit - "in" or "mm" (default: "in")

#### Manual Mode Parameters
- `manualValues`: Object with mL values for each channel (e.g., `{"cyan": 0.5, "magenta": 0.3}`)

#### Example Response
```json
{
  "inkUsage": {
    "totalMl": 2.5,
    "channelMl": {
      "cyan": 0.6,
      "magenta": 0.7,
      "yellow": 0.5,
      "black": 0.7
    },
    "coverage": 0.35
  },
  "cost": {
    "costPerPrint": 1.25,
    "printsPerSet": 240,
    "channelBreakdown": {
      "cyan": 0.3,
      "magenta": 0.35,
      "yellow": 0.25,
      "black": 0.35
    }
  }
}
```

### Special Layer Handling
The calculator implements distinct calculation paths for different ink types:

#### Standard Channels (CMYK)
- Uses image color analysis to determine coverage percentages
- Applies non-linear scaling based on coverage and area
- Factors in channel-specific behavior patterns

#### Special Layers (White/Gloss)
- Uses area-focused calculation that ignores image content
- Employs more linear area scaling (exponents closer to 1.0)
- Considers ink mode to determine appropriate coverage
- Provides special handling for very small prints

This separation improves accuracy across all ink types while respecting their fundamentally different behaviors.

## Next Steps
1. Implement fully separate optimization processes for CMYK vs. special layers
2. Address data quality issues in test dataset
3. Collect more varied test data for special layers
4. Add comprehensive validation specifically for white and gloss layers
5. Refine area scaling for extremely large and small prints
6. Complete documentation and user guidance
7. Final review against PRD requirements 