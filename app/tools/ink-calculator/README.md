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

### To Be Completed
- Test data collection interface in admin panel
- Validation against real test prints
- Unit and integration tests
- Performance optimizations
- Mobile responsive testing
- User documentation
- Final deployment

## Technical Details

### Calculation Methodology
The calculator uses a combination of:
1. Pixel sampling to determine coverage percentage
2. Static multipliers based on test print data
3. Manual override capability for exact values

### Directory Structure
- `/app/tools/ink-calculator` - Main application directory
  - `/components` - UI components
  - `types.ts` - TypeScript type definitions
  - `config.ts` - Configuration constants
  - `utils.ts` - Utility functions for calculations
- `/app/api/ink-cost` - API endpoint for programmatic access

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

## Next Steps
1. Collect test print data for calibration
2. Refine calculation model with real-world data
3. Complete admin interface for test data input
4. Run performance testing with large images
5. Verify mobile responsiveness
6. Prepare user documentation
7. Final review against PRD requirements 