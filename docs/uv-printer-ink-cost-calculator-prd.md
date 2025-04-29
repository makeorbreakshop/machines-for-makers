# UV Printer Ink Cost Calculator - Product Requirements Document

## Overview
A lightweight, web-based calculator for UV printer ink cost estimation, integrated into the Machines for Makers platform. Users upload an image, specify physical print dimensions, select ink mode, and provide ink pricing to receive accurate cost per print estimates and prints per ink set calculations.

## Goals
- Provide fast and accurate UV printer ink cost estimation
- Allow makers and small print shops to quickly generate quotes
- Offer both estimation and exact cost calculation options
- Build an extendable foundation for future print cost tools

## Technical Requirements

### Data Input
- ☐ Image upload via drag-and-drop or file picker (PNG/JPEG ≤ 20 MB)
- ☐ Width & height inputs with unit toggle (inches/millimeters)
- ☐ Ink package price input with persistence (default: $300 USD)
- ☐ Ink mode selector for different print configurations
- ☐ Print quality selector (Draft, Standard, High)
- ☐ Manual mL entry fields for UVMake preview values

### Image Processing
- ☐ Convert uploaded image to CMYK using Canvas + color-convert
- ☐ Sample pixels to compute average ink coverage
- ☐ Process transparent areas in PNGs as non-printing areas
- ☐ Calculate estimated ink usage based on pixel data
- ☐ Support manual override with actual mL values

### Calculation Engine
- ☐ Formula implementation: costPerPrint = Σ(channel_mL × pricePerML)
- ☐ Formula implementation: printsPerSet = totalSetML / Σ(channel_mL)
- ☐ Support for different ink configurations and print qualities
- ☐ Static calculation model based on test print data
- ☐ Client-side processing for instant results

### User Interface
- ☐ Single-page layout with inputs and live results sections
- ☐ Responsive design for mobile and desktop use
- ☐ Results panel with cost/print and prints/ink-set values
- ☐ Bar chart visualization for per-channel mL usage
- ☐ "Advanced" accordion for manual mL entry
- ☐ Copy/save results sharing options

### API Endpoint
- ☐ `/api/ink-cost` endpoint for programmatic access
- ☐ Support for both image+metadata and direct channel mL inputs
- ☐ Structured JSON response with cost and usage data
- ☐ Integration potential for order forms and other tools

### Admin Interface
- ☐ Integration with existing admin interface for test data input
- ☐ Simple form for entering and managing test print data
- ☐ Basic tools for validating the calculation model

## Database Schema

No new database tables are required for the core calculator functionality. The tool will operate primarily client-side with static calculation models based on one-time test data collection.

### Test Data Collection

The following test data will be collected once to build the static calculation model:

#### Ink Mode Test Matrix
For each ink mode configuration, collect:
- Test images of varying coverage levels (solid, gradient, photo, line art)
- Print sizes standardized at 5" × 5" 
- Standard quality (720×720 dpi) as baseline
- Per-channel mL values from UVMake preview

#### Quality Setting Test Matrix
For a standard CMYK test image:
- Draft (360×360 dpi) measurements
- Standard (720×720 dpi) measurements
- High (1440×720 dpi) measurements

#### Size Scaling Test Matrix 
For a standard image and quality:
- 2" × 2" measurements
- 5" × 5" measurements
- 8" × 8" measurements

## Implementation Details

### Core Components

#### Image Upload and Processing
```typescript
function processImage(file: File): Promise<ImageData> {
  // Convert to canvas, extract pixel data
  // Sample pixels for coverage estimation
  // Return processed data for calculator
}
```

#### Calculation Engine
```typescript
function calculateInkUsage(
  imageData: ImageData,
  dimensions: { width: number, height: number, unit: 'in' | 'mm' },
  inkMode: InkMode,
  quality: PrintQuality,
  manualValues?: ChannelMlValues
): InkUsageResult {
  // Calculate based on image data or use manual values
  // Apply scaling factors based on test data
  // Return calculated values
}

function calculateCost(
  inkUsage: InkUsageResult,
  inkPackagePrice: number,
  totalMlPerSet: number = 600
): CostResult {
  // Calculate cost per print
  // Calculate prints per ink set
  // Return full cost breakdown
}
```

#### API Endpoint
```typescript
// /api/ink-cost route
export async function POST(request: Request) {
  // Accept image upload or direct mL values
  // Return JSON with calculated values
}
```

### Client-Side Implementation

#### UI Components
- Image upload dropzone with preview
- Dimension inputs with unit toggle
- Ink mode selector dropdown
- Quality selector (radio or segmented control)
- Ink price input with save option
- Advanced section with manual mL inputs
- Results panel with visualizations

#### State Management
- Local storage for user preferences (last used values)
- React state for calculation inputs and results
- Debounced calculations for performance

#### Ink Mode Configuration
Store ink mode definitions as a static configuration object:

```typescript
const INK_MODES = {
  "CMYK": {
    channels: ["cyan", "magenta", "yellow", "black"],
    passes: 1,
    label: "CMYK",
    group: "Single-Pass"
  },
  "WHITE_CMYK": {
    channels: ["white", "cyan", "magenta", "yellow", "black"],
    passes: 2,
    label: "White > CMYK",
    group: "Multi-Pass"
  },
  // Additional modes with their channel configurations
}
```

This configuration will define:
- Which channels are active in each mode
- Number of passes required
- Display label for the UI
- Grouping for the dropdown menu

### Technical Constraints

#### Performance
- JS bundle size < 150 kB
- Calculation time < 2s for 5 MP image
- Responsive UI performance on mobile devices

#### Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader compatibility

#### Browser Compatibility
- Chrome, Edge, Firefox, Safari 15+
- Mobile Safari/Chrome support

## Test Data Collection Plan

### Required Test Data

#### For Each Ink Mode
Collect the following test prints with associated metadata and mL values:

1. Solid color (100% coverage)
2. Gradient (50% avg coverage)
3. Photo (mixed coverage)
4. Line art (<10% coverage)

#### For Each Quality Setting
Using a consistent test image:

1. Draft (360×360 dpi)
2. Standard (720×720 dpi)
3. High (1440×720 dpi)

#### For Size Scaling
Using a consistent image and quality:

1. 2" × 2" print
2. 5" × 5" print
3. 8" × 8" print

### Recommended Test Images
- Solid colors (C, M, Y, K, W)
- Linear gradients for each channel
- Rainbow gradient
- Portrait photo (skin tones)
- Landscape photo (blues, greens)
- Product photo (mixed colors)
- Black text on white background
- Outlined drawings
- Technical diagrams

### Data Format
For each test print, collect:
- Original image file (.png or .jpg)
- UVMake preview screenshot showing mL per channel
- Print dimensions
- Ink mode used
- Quality setting
- Total printing cost (if available)

## Implementation Roadmap

The following tasks should be completed in sequence:

### Phase 1: Core Functionality
1. Image upload and preview component
2. Basic dimension and ink price inputs
3. Simple ink usage calculation (flat estimates)
4. Basic cost formula implementation
5. Initial results display

### Phase 2: Advanced Features
1. Add ink mode selector with configurations
2. Implement quality selector
3. Create advanced panel for manual mL inputs
4. Add pixel sampling and coverage calculation
5. Enhance results visualization with bar charts

### Phase 3: Refinement
1. Collect test print data through admin interface
2. Build static calculation model
3. Implement localStorage persistence
4. Add sharing options
5. Polish UI and responsiveness

### Phase 4: API and Integration
1. Implement /api/ink-cost endpoint
2. Create documentation for API usage
3. Add integration with order forms (if applicable)
4. Final optimization

## Technical Notes

### Ink Usage Estimation Methodology
The calculator will use a combination of:
1. Pixel sampling to determine coverage percentage
2. Static multipliers based on test print data
3. Manual override capability for exact values

### Limitations
- Estimates are advisory only (disclaimer required)
- Initial version limited to one-time test data model
- No dynamic adjustment based on substrate or printer-specific settings

## Mobile Considerations
- Ensure responsive design for all viewport sizes
- Optimize image upload for mobile browsers
- Simplify UI on smaller screens
- Maintain essential functionality across devices

## Deployment Strategy
- Initial rollout as standalone page in the tools section (`/tools/ink-calculator`)
- Simple launch without complex analytics or tracking
- Focus on core functionality over metrics
- Create basic UI using Shadcn UI components and Tailwind CSS for consistency

## Success Criteria
- Estimation accuracy: ≤ ±7% mean error vs UVMake preview
- Performance: ≤ 2s calculation time for 5 MP images
- Adoption: ≥ 50 unique users on launch day
- Engagement: ≥ 30% of users running 3+ quotes
- Conversion: +10% email sign-ups via quote page

## Future Enhancements (Out of Scope)
- Automatic parsing of UVMake job logs
- Per-substrate ink profiles
- Profit calculator
- Batch upload capability for multiple images

## Technical Notes

### Ink Usage Estimation Methodology
The calculator will use a combination of:
1. Pixel sampling to determine coverage percentage
2. Static multipliers based on test print data
3. Manual override capability for exact values

### Limitations
- Estimates are advisory only (disclaimer required)
- Initial version limited to one-time test data model
- No dynamic adjustment based on substrate or printer-specific settings

## Mobile Considerations
- Ensure responsive design for all viewport sizes
- Optimize image upload for mobile browsers
- Simplify UI on smaller screens
- Maintain essential functionality across devices

## Deployment Strategy
- Initial rollout as standalone page in the tools section (`/tools/ink-calculator`)
- Simple launch without complex analytics or tracking
- Focus on core functionality over metrics
- Create basic UI using Shadcn UI components and Tailwind CSS for consistency 