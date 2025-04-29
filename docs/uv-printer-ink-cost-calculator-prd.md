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
- ✅ Image upload via drag-and-drop or file picker (PNG/JPEG ≤ 20 MB)
- ✅ Width & height inputs with unit toggle (inches/millimeters)
- ✅ Ink package price input with persistence (default: $300 USD)
- ✅ Ink mode selector for different print configurations
- ✅ Print quality selector (Draft, Standard, High)
- ✅ Manual mL entry fields for UVMake preview values

### Image Processing
- ✅ Convert uploaded image to CMYK using Canvas + color-convert
- ✅ Sample pixels to compute average ink coverage per channel (C, M, Y, K)
- ✅ Process transparent areas in PNGs as non-printing areas
- ✅ Calculate estimated ink usage based on pixel-specific color data
- ✅ Support manual override with actual mL values

### Calculation Engine
- ✅ Formula implementation: costPerPrint = Σ(channel_mL × pricePerML)
- ✅ Formula implementation: printsPerSet = totalSetML / Σ(channel_mL)
- ✅ Support for different ink configurations and print qualities
- ✅ Static calculation model based on test print data
- ✅ Client-side processing for instant results

### User Interface
- ✅ Single-page layout with inputs and live results sections
- ✅ Responsive design for mobile and desktop use
- ✅ Results panel with cost/print and prints/ink-set values
- ✅ Bar chart visualization for per-channel mL usage
- ✅ "Advanced" accordion for manual mL entry
- ✅ Copy/save results sharing options

### API Endpoint
- ✅ `/api/ink-cost` endpoint for programmatic access
- ✅ Support for both image+metadata and direct channel mL inputs
- ✅ Structured JSON response with cost and usage data
- ✅ Integration potential for order forms and other tools

### Admin Interface
- ✅ Integration with existing admin interface for test data input
- ✅ Simple form for entering and managing test data
- ✅ Basic tools for validating the calculation model

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

### Backend Implementation

#### Database Schema
For the test data collection, we'll use a simple table structure in Supabase:

```typescript
type InkTestData = {
  id: string                    // Unique identifier
  ink_mode: string              // Reference to INK_MODES
  quality: PrintQuality         // 'draft', 'standard', or 'high'
  dimensions: {                 // Print dimensions
    width: number,
    height: number,
    unit: 'in' | 'mm'
  }
  image_type: string            // 'solid', 'gradient', 'photo', 'line_art'
  image_url: string             // Reference to storage bucket
  channel_ml: ChannelMlValues   // Actual mL values from UVMake
  created_at: Date              // When the test data was added
}
```

#### Test Data Admin API Endpoints
The API for managing test data will be available only to admin users:

```typescript
// /api/admin/ink-test-data route
export async function POST(request: Request) {
  // Add new test data with image upload
  // Store image in storage bucket
  // Save test data in Supabase
}

export async function GET(request: Request) {
  // Return all test data for admin interface
  // Support filtering by ink mode, quality, etc.
}

export async function DELETE(request: Request) {
  // Delete test data entry
  // Clean up associated image from storage
}
```

#### Enhanced Color Analysis Implementation
We'll implement channel-specific color analysis using proper RGB to CMYK conversion:

```typescript
function enhancedColorAnalysis(imageData: ImageData): ChannelCoverageValues {
  // Convert RGB to CMYK for each sampled pixel
  // Track coverage per color channel
  // Consider pixel distribution and sampling patterns
  // Return channel-specific coverage values
}
```

#### API Response Structure
The `/api/ink-cost` endpoint will return structured data:

```typescript
type InkCostResponse = {
  costPerPrint: number
  printsPerSet: number
  channelBreakdown: ChannelMlValues
  coverage: number
  channelCoverage: ChannelCoverageValues
  totalMl: number
}
```

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

### Data Storage and Organization
- Original test images will be stored in a storage bucket with references in the database
- Raw mL values from UVMake will be stored directly in the database
- Test data will be organized by ink mode, quality setting, and print size categories
- Each test case will include full metadata for reproducibility

### Test Data Format
For each test print, collect and store:
- Original image file (.png or .jpg)
- UVMake preview mL values for each channel
- Print dimensions and unit
- Ink mode used
- Quality setting
- Calculated coverage percentages

## Implementation Roadmap

### Phase 1: Core Functionality
1. ✅ Image upload and preview component
2. ✅ Basic dimension and ink price inputs
3. ✅ Simple ink usage calculation (flat estimates)
4. ✅ Basic cost formula implementation
5. ✅ Initial results display

### Phase 2: Advanced Features
1. ✅ Add ink mode selector with configurations
2. ✅ Implement quality selector
3. ✅ Create advanced panel for manual mL inputs
4. ✅ Add pixel sampling and coverage calculation
5. ✅ Enhance results visualization with bar charts

### Phase 3: Refinement
1. ✅ Implement accurate per-channel color analysis (HIGH PRIORITY)
2. ✅ Create admin interface for test data collection
3. ✅ Build backend API endpoints for test data management
4. ✅ Build static calculation model
5. ✅ Implement localStorage persistence
6. ✅ Add sharing options
7. ✅ Polish UI and responsiveness

### Phase 4: API and Integration
1. ✅ Implement /api/ink-cost endpoint
2. ☐ Create backend processing for image analysis
3. ☐ Integrate test data with calculation engine
4. ☐ Create documentation for API usage
5. ☐ Add integration with order forms (if applicable)
6. ☐ Final optimization

## Backend Implementation Plan

### 1. Database Setup
- [x] Create `ink_test_data` table in Supabase
- [x] Set up storage bucket for test images
- [x] Configure access permissions

### 2. Admin Interface for Test Data
- [x] Add test data collection section to existing admin interface
- [x] Create form for uploading test images and entering mL values
- [x] Implement test data management (view, edit, delete)

### 3. API Endpoints Implementation
- [x] Create `/api/ink-cost` route handler
- [x] Support both image+metadata and direct channel inputs
- [x] Create admin API endpoints for test data management
- [x] Add proper error handling and validation

### 4. Enhanced Color Analysis
- [x] Implement proper RGB to CMYK conversion
- [x] Add channel-specific coverage analysis
- [x] Optimize sampling algorithm for performance
- [x] Validate against test data for accuracy

### 5. Test Data Validation
- [ ] Implement comparison between calculated and actual values
- [ ] Create dashboard for monitoring accuracy metrics
- [ ] Set up feedback loop for algorithm improvements

### 6. Documentation and Testing
- [ ] Document API endpoints and response formats
- [ ] Create internal documentation for the calculation model
- [ ] Test across different image types and configurations
- [ ] Performance testing and optimization

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
- ✅ Ensure responsive design for all viewport sizes
- ✅ Optimize image upload for mobile browsers
- ✅ Simplify UI on smaller screens
- ✅ Maintain essential functionality across devices

## Deployment Strategy
- ✅ Initial rollout as standalone page in the tools section (`/tools/ink-calculator`)
- ☐ Simple launch without complex analytics or tracking
- ✅ Focus on core functionality over metrics
- ✅ Create basic UI using Shadcn UI components and Tailwind CSS for consistency

## Success Criteria
- Estimation accuracy: ≤ ±7% mean error vs UVMake preview
  - *Note: This requires implementation of proper channel-specific color analysis*
- Color accuracy: Each CMYK channel estimate to be within ±10% of actual UVMake preview values
- Performance: ≤ 2s calculation time for 5 MP images
- Adoption: ≥ 50 unique users on launch day
- Engagement: ≥ 30% of users running 3+ quotes
- Conversion: +10% email sign-ups via quote page

## Future Enhancements (Out of Scope)
- Automatic parsing of UVMake job logs
- Per-substrate ink profiles
- Profit calculator
- Batch upload capability for multiple images

## Improvements Needed
### Color Analysis Enhancement
The current implementation uses a simplified approach that calculates a single overall coverage value based on pixel brightness rather than true color analysis. This needs to be improved with:

1. Proper RGB to CMYK conversion for each sampled pixel using the color-convert library
2. Channel-specific coverage analysis (tracking C, M, Y, K values separately)
3. Advanced sampling algorithm that considers color distribution
4. Implementation of industry-standard color conversion formulas
5. Support for different color profiles (e.g., standard CMYK, expanded gamut)

These improvements are critical for achieving the PRD's stated accuracy goal of ≤ ±7% mean error vs UVMake preview.

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
- ✅ Ensure responsive design for all viewport sizes
- ✅ Optimize image upload for mobile browsers
- ✅ Simplify UI on smaller screens
- ✅ Maintain essential functionality across devices

## Deployment Strategy
- ✅ Initial rollout as standalone page in the tools section (`/tools/ink-calculator`)
- ☐ Simple launch without complex analytics or tracking
- ✅ Focus on core functionality over metrics
- ✅ Create basic UI using Shadcn UI components and Tailwind CSS for consistency

## Implementation Plan

### 1. Project Setup (Foundation)
- [x] Create new directory structure in `/app/tools/ink-calculator`
- [x] Set up route and page components
- [x] Configure basic layout with Shadcn UI and Tailwind CSS
- [x] Add page metadata and SEO configuration

### 2. UI Components Development
- [x] Image upload dropzone with preview
  - [x] Implement drag-and-drop functionality
  - [x] Add file size validation (≤ 20 MB)
  - [x] Create image preview component
- [x] Input form components
  - [x] Width & height inputs with unit toggle (inches/millimeters)
  - [x] Ink package price input with persistence (default: $300 USD)
  - [x] Ink mode selector dropdown with configuration groups
  - [x] Print quality selector (Draft, Standard, High)
- [x] Advanced panel with manual mL input fields
- [x] Results display panel
  - [x] Cost per print display
  - [x] Prints per ink set calculation
  - [x] Bar chart visualization for per-channel mL usage
- [x] Copy/save results functionality

### 3. Core Calculation Logic
- [x] Image processing functions
  - [x] Canvas-based image conversion and processing
  - [x] Pixel sampling implementation for coverage estimation
  - [x] Support for transparent PNG handling
- [x] Enhanced color analysis
  - [x] Implement proper RGB to CMYK conversion for each pixel
  - [x] Track coverage per individual color channel
  - [x] Apply channel-specific adjustments based on color profile
  - [x] Optimize sampling algorithm for performance
- [x] Ink usage calculation engine
  - [x] Static calculation model framework
  - [x] Ink mode configuration integration
  - [x] Quality setting multipliers
  - [x] Size scaling adjustments
- [x] Cost calculation functions
  - [x] Formula implementation for costPerPrint
  - [x] Formula implementation for printsPerSet
  - [x] Support for different ink configurations

### 4. State Management & Data Persistence
- [x] Set up React state for calculation inputs
- [x] Implement localStorage persistence for user preferences
- [x] Add debounced calculations for performance optimization
- [x] Create state validation and error handling

### 5. Test Data Collection Interface
- [ ] Simple admin interface for test data input
- [ ] Test case entry forms for different scenarios
- [ ] Data validation and storage mechanisms

### 6. API Endpoint Implementation
- [x] Create `/api/ink-cost` API route
- [x] Support both image+metadata and direct channel inputs
- [x] Implement response formatting with structured JSON
- [x] Add error handling and input validation

### 7. Testing & Validation
- [ ] Unit tests for core calculation functions
- [ ] Integration tests for UI components
- [ ] Validation against known test cases
- [ ] Performance testing with large images
- [x] Cross-browser compatibility testing
- [x] Mobile responsiveness verification

### 8. Refinement & Optimization
- [x] UI polish and animations
  - [x] Enhanced card layouts with consistent spacing
  - [x] Improved dropzone with interactive states
  - [x] Animated results display with progressive load
  - [x] Interactive form elements with proper feedback
- [x] Error message improvements
  - [x] Clear validation feedback for numerical inputs
  - [x] Visual error indicators with helpful messages
  - [x] Improved form state handling
- [ ] Performance optimizations
- [x] Accessibility enhancements
  - [x] Proper ARIA labels and keyboard navigation
  - [x] Sufficient color contrast for text elements
  - [x] Focus state management for form controls
- [ ] Final bundle size optimization

### 9. Documentation & Deployment
- [ ] Create user documentation/help text
- [ ] Add integration documentation for API
- [ ] Code comments and internal documentation
- [ ] Final review against PRD requirements
- [ ] Production deployment preparation

### 10. Launch & Monitoring
- [ ] Soft launch with beta testers
- [ ] Collect initial user feedback
- [ ] Address critical issues
- [ ] Full public launch
- [ ] Set up simple analytics to track success metrics 

## Styling Implementation
The UV Printer Ink Cost Calculator now features:

- ✅ Card-based layout using Shadcn UI components with consistent spacing and hierarchy
- ✅ Modern interface with proper heading hierarchy and typographic scale
- ✅ Interactive elements with proper hover, active, and focus states
- ✅ Responsive design that works across all device sizes
- ✅ Clear visual hierarchy with card headers and content sections
- ✅ Animated feedback for input changes and calculation updates
- ✅ Consistent color scheme using design token variables
- ✅ Form controls with clear labels and validation feedback
- ✅ Improved dropzone with visual feedback for drag states
- ✅ Results display with animated data visualization
- ✅ Sticky positioning for results on desktop for better UX 