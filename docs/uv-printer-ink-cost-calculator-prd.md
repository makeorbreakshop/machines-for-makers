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
- ✅ Advanced non-linear calculation model with power functions and channel-specific behavior
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

### 5. Test Data Validation & Auto-Tuning
- [ ] Implement server-side **optimization algorithm** (e.g., Nelder-Mead) to find factors that minimize overall MAE against `ink_test_data`.
- [ ] Create API endpoint (e.g., `/api/admin/ink-calculator/optimize-factors`) to trigger the optimization.
- [ ] Implement logic to **save optimized factors** to the `ink_calculator_calibration` table.
- [ ] Implement **dynamic loading and caching** of the latest factors from `ink_calculator_calibration` for use by `calculateInkUsage`.
- [ ] Update the admin validation page to:
    - [ ] Display MAE based on *loaded* factors.
    - [ ] Show the timestamp of the latest optimized factors.
    - [ ] Include a button to trigger the optimization API.
    - [ ] **Display separate MAE metrics for standard channels vs. special layers (white and gloss).**
- [ ] Ensure validation page uses stored `image_analysis.channelCoverage` where available for MAE calculation.
- [ ] **Expand** test dataset with solids, gradients, and line art to improve optimization effectiveness.
- [ ] **Add area-to-usage correlation analysis specifically for white and gloss layers.**

### 5.1 Special Layer Handling Improvement Plan
- [ ] **Modify ink-calibration.ts**:
  - [ ] Update AREA_EXPONENTS for white to 0.95 and gloss to 0.98 (closer to linear 1.0)
  - [ ] Add comprehensive mode-specific adjustments for special layers in INK_MODE_ADJUSTMENTS
  - [ ] Add a new SPECIAL_LAYER_MODES constant to identify modes using white or gloss
- [ ] **Enhance calculateSpecialLayerUsage in utils.ts**:
  - [ ] Simplify the formula to focus more directly on area with minimal complexity
  - [ ] Remove or reduce the area scaling multiplier effect for special layers
  - [ ] Implement specific handling for different print modes (WHITE_CMYK vs WHITE_CMYK_GLOSS vs CMYK_GLOSS)
  - [ ] Add direct linear calculation approach for very small prints
- [ ] **Update auto-calibration.ts**:
  - [ ] Modify estimateChannelUsage to use specialized calculation for white and gloss
  - [ ] Create separate optimization strategy for special layers focused on area correlation
  - [ ] Track and report MAE separately for color channels vs. special layers
  - [ ] Prioritize area-based calibration for special layers
- [ ] **Collect additional test data for special layers**:
  - [ ] Add white layer tests with varying print sizes but consistent coverage
  - [ ] Add gloss layer tests with varying print sizes but consistent coverage
  - [ ] Test different print modes with white and gloss layers
- [ ] **Validate improvements**:
  - [ ] Compare MAE before and after special layer enhancements
  - [ ] Verify linear relationship between area and special layer usage

### 5.2 Comprehensive Special Layer Calculation Rewrite
- [ ] **Create separate calculation pipelines**:
  - [ ] Implement dedicated calculation function for white/gloss layers using linear area-based approach
  - [ ] Maintain existing complex calculation for CMYK channels
  - [ ] Add logic to route each channel to the appropriate calculation pipeline
- [ ] **Implement two-phase calibration process**:
  - [ ] Create separate optimization function for CMYK channels only
  - [ ] Create separate optimization function for special layers only
  - [ ] Store and load calibration parameters separately for each group
- [ ] **Enhance scaling factors**:
  - [ ] Increase base scaling factors for white/gloss by at least 100× over current values
  - [ ] Implement substantially higher base consumption values (0.05-0.1 mL range)
  - [ ] Add fixed minimum usage thresholds based on printer mechanics
- [ ] **Implement size-based calculation branches**:
  - [ ] Add specific formulas for small (<50mm), medium (50-250mm), and large (>250mm) prints
  - [ ] Create tapering function for large prints to prevent extreme values
  - [ ] Add steeper scaling for small prints to prevent underestimation
- [ ] **Enhance validation system**:
  - [ ] Track and report separate metrics for CMYK vs. special layers
  - [ ] Validate against print size classes separately
  - [ ] Focus on worst-case error reduction strategies
  - [ ] Create visualization tools for error distribution analysis

### 5.3 Completely Decoupled Optimization Process

Based on May 2025 test results, we've determined that the fundamental issue with special layer (white/gloss) accuracy requires a complete separation of the optimization processes. The current approach, while using separate calculation models, still optimizes parameters together, causing interference between CMYK and special layer calibration.

#### Required Changes for Decoupled Optimization

1. **Split Calibration Storage**
   - Store CMYK and special layer calibrations as separate records in the database
   - Add a `calibrationType` field to the `ink_calculator_calibration` table
   - Update loading logic to fetch and merge both parameter sets

2. **Create Separate Optimization Pipelines**
   - Implement `optimizeCmykFactors()` - focused only on cyan, magenta, yellow, black
   - Implement `optimizeSpecialLayerFactors()` - focused only on white, gloss, etc.
   - Each function should use a filtered dataset relevant to that channel type
   - Use distinct parameter sets and optimization strategies for each

3. **Dual-Button Admin Interface**
   - Add separate "Auto-Tune CMYK Factors" and "Auto-Tune Special Layer Factors" buttons
   - Display separate MAE metrics for each channel type
   - Allow independent optimization of each calibration set

4. **API Endpoints**
   - Create `/api/admin/ink-calculator/optimize-cmyk-factors` endpoint
   - Create `/api/admin/ink-calculator/optimize-special-layer-factors` endpoint
   - Each endpoint should run its respective optimization pipeline and store results

5. **Validation System Enhancements**
   - Track and display accuracy metrics separately for each channel type
   - Show when each calibration type was last optimized
   - Provide export options for analyzing results by channel type

#### Implementation Priority

This decoupled approach should be implemented immediately, with focus on:

1. Database structure updates to support dual calibration storage
2. Splitting the optimization algorithm into two completely independent processes
3. UI enhancements to support separate optimization workflows
4. Comprehensive validation of each optimization process independently

This approach recognizes the fundamentally different nature of special layer calculations and will prevent parameter interference between channel types, significantly improving the accuracy of all calculations.

### 6. API Endpoint Implementation

## Technical Notes

### Ink Usage Estimation Methodology
The calculator uses an advanced approach combining:
1. Pixel sampling to determine coverage percentage by channel
2. Non-linear mathematical model with power functions for coverage-to-ink conversion
3. Channel-specific behavior parameters derived from empirical data
4. Continuous area scaling using logarithmic functions
5. Special handling for different ink modes and quality settings
6. Manual override capability for exact values

### Limitations
- Estimates are advisory only (disclaimer required)
- Accuracy depends on quality and coverage of test data
- Edge cases (very small/large prints, extreme coverage values) may still have higher error
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
- Estimation accuracy: Aim for Mean Absolute Error (MAE) per channel to be below a target threshold (e.g., < 0.02 mL average deviation, TBD based on initial tuning) after manual calibration against comprehensive test data. The original goal of ≤ ±7% mean *percentage* error remains a long-term aspiration for the tuned static model.
- Color accuracy: Individual channel predictions should align closely with actual values, reflected in low MAE per channel.
- Performance: ≤ 2s calculation time for 5 MP images (using stored analysis if possible).
- Adoption: ≥ 50 unique users on launch day.
- Engagement: ≥ 30% of users running 3+ quotes.
- Conversion: +10% email sign-ups via quote page.

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

## Accuracy Analysis and Improvement Recommendations

Based on analysis of the current test data in Supabase and previous attempts at auto-calibration, we are adopting a simplified approach focusing on static calibration factors and robust validation.

### Current Challenges (Historical Context)

Previous attempts faced issues, likely due to:

1.  **Flawed Error Metrics**: Using percentage error was heavily skewed by small ink volume values.
2.  **Limited/Biased Test Data**: Mainly photos, lacking diversity (solids, gradients, line art).

### Next Step: Automated Calibration Tuning

1.  **Optimization Goal**: The system will automatically find the set of calibration factors (`BASE_CONSUMPTION`, `CHANNEL_SCALING_FACTORS`, etc.) that **minimizes the overall Mean Absolute Error (MAE)** when comparing predictions against the full `ink_test_data` set.
2.  **Automated Process**: An optimization algorithm (e.g., Nelder-Mead) will run server-side, systematically testing factor combinations to find the optimal set.
3.  **Persistent Storage**: The best set of factors found by the optimizer will be stored as a JSON object in the existing `ink_calculator_calibration` Supabase table, along with a timestamp.
4.  **Dynamic Loading**: The `calculateInkUsage` function will fetch the *latest* set of optimized factors from the `ink_calculator_calibration` table (with caching) to use for its calculations. It will fall back to static defaults in `ink-calibration.ts` if loading fails.
5.  **Adaptation to New Data**: Adding new test data to `ink_test_data`