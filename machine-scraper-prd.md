# Product Requirements Document: Machine Product Scraper Tool

## Overview
A tool integrated into the Machines for Makers admin panel that allows administrators to enter a product URL, scrape the product information using web scraping, process it with Claude AI, and populate the machine creation/edit form with the structured data.

## Goals
- Reduce manual data entry time for adding new machines
- Improve data consistency and completeness
- Simplify the product addition workflow
- Extract key specifications and features from manufacturer websites
- Provide a unified workflow for creating machines manually or from URLs
- Support multiple product images with primary image selection
- Maximize data extraction using hybrid scraping approach
- Ensure user control when updating existing machines

## User Flows

### Primary Flow - Integrated Approach
1. Admin navigates to the "Add New Machine" page in the admin panel
2. Admin can either fill in form fields manually OR click an "Import from URL" button
3. If importing from URL, a modal opens allowing admin to enter product URL and initiate scrape
4. System scrapes the page and processes content with Claude
5. Form fields are populated with the structured data from the scrape
6. Admin reviews, makes any necessary edits, and saves to database
7. System confirms successful addition to the database

### Secondary Flow - Update Existing Machine
1. Admin navigates to an existing machine's edit page
2. Admin clicks "Refresh from URL" button
3. System retrieves the saved product URL or prompts for one if not available
4. System scrapes updated information using hybrid approach
5. System presents a detailed comparison between existing and scraped data
6. Admin reviews changes, selects which updates to apply, and rejects others
7. Admin saves approved updates to database

### Multiple Images Flow
1. When scraping a product URL, the system identifies and extracts multiple product images
2. Images are displayed in a gallery component with thumbnails
3. Admin can select which images to keep and designate a primary image
4. Admin can reorder images via drag-and-drop
5. Admin can add additional images manually
6. When saving, the system stores all selected images with proper relationships to the machine

## Features Checklist

### 1. Admin Interface Integration
- [ ] Add "Import from URL" button to the "Add New Machine" form
- [ ] Create modal for URL input with scrape button
- [ ] Implement loading/progress indicator for scrape process
- [ ] Populate form fields with scraped data
- [ ] Add "Refresh from URL" option to machine edit page
- [x] Add debug toggle option for viewing raw Claude response
- [x] ~~Create new admin tool page at `/app/(admin)/admin/tools/machine-scraper/page.tsx`~~
- [x] ~~Add navigation link in admin sidebar~~
- [x] ~~Implement URL input form with scrape button~~
- [x] ~~Create loading/progress indicator for scrape process~~
- [x] ~~Design data preview component with editable fields~~
- [x] ~~Add save to database button~~
- [x] ~~Add debug view to show raw Claude response and extraction data~~
- [ ] Convert Machine Category to dropdown field with valid options
- [ ] Convert Laser Category to dropdown field with valid options
- [ ] Convert Laser Type A/B to dropdown fields with valid options
- [ ] Add company matching with option to create new
- [ ] Convert boolean fields to proper checkboxes
- [ ] Add multiple image selection gallery

### 2. Multiple Images Management
- [x] Create image gallery component for displaying multiple images
- [ ] Implement drag-and-drop reordering functionality
- [ ] Add primary image selection capability
- [ ] Implement thumbnail generation for image previews
- [ ] Create image deletion functionality
- [ ] Add manual image upload option to complement scraped images
- [ ] Implement pagination or scrolling for large numbers of images
- [ ] Add image editing capabilities (crop, resize, etc.)

### 3. Web Scraping Functionality
- [x] Create scraper API endpoint at `/app/api/admin/scrape-machine/route.ts`
- [ ] Implement headless browser functionality (Puppeteer/Playwright)
- [x] Extract main product content, removing navigation/footers
- [x] Handle product images extraction
- [ ] Enhance image extraction to detect and extract multiple images
- [ ] Add image quality/resolution filtering for scraped images
- [ ] Implement image deduplication for similar product images
- [x] Implement error handling for failed scrapes
- [ ] Add timeout and retry logic
- [x] Implement hybrid extraction approach (web scraper + Claude)
- [ ] Enhance hybrid approach to maximize data extraction by combining structured HTML parsing and AI processing
- [ ] Implement fallback mechanisms when one extraction method fails

### 4. Claude Integration
- [x] Create Claude processing function
- [x] Design effective prompt to extract machine specifications
- [x] Map Claude's output to database schema
- [x] Handle edge cases and missing information
- [x] Implement error handling for Claude API failures
- [x] Update to Claude 3.7 API format and authentication
- [x] Enhance Claude prompt with existing category lists

### 5. Data Processing & Validation
- [x] Create validation for required fields
- [ ] Implement data normalization (units, formatting)
- [ ] Create image processing and storage functionality
- [x] Implement multiple image storage and retrieval
- [x] Display validation warnings for missing required data
- [x] Format data according to database requirements
- [x] Match extracted categories to existing database categories
- [ ] Add company name matching and creation logic
- [ ] Implement side-by-side comparison UI for existing vs scraped data
- [ ] Add selective update capabilities for individual fields when updating existing machines

### 6. Database Integration
- [x] Create save API endpoint at `/app/api/admin/save-scraped-machine/route.ts`
- [ ] Modify save endpoint to work with the existing machine form
- [x] Update database schema to optimize multiple image relationships
- [x] Create API endpoints for image CRUD operations
- [x] Implement transaction handling for saving machine with multiple images
- [x] Implement database insertion logic
- [x] Add error handling for database operations
- [x] Create confirmation messaging
- [x] Create API endpoint to fetch valid categories for matching
- [ ] Enhance API endpoint to return companies and laser types
- [x] Implement database storage for multiple machine images

#### Stored Procedure Implementation
The system uses a PostgreSQL stored procedure `update_machine_with_images` for handling machine updates with multiple images. This procedure:

1. Accepts parameters:
   - `p_machine_id` (UUID): The ID of the machine to update
   - `p_machine_data` (JSONB): Machine data fields
   - `p_images` (JSONB): Array of image objects

2. Transaction Handling:
   - Updates machine data in the `machines` table
   - Deletes existing images for the machine
   - Inserts new images with proper ordering
   - Rolls back all changes if any operation fails

3. Security:
   - Uses `SECURITY DEFINER` to run with elevated privileges
   - Grants execute permission to authenticated and service roles

4. Type Handling:
   - Properly casts numeric fields (price, sort_order)
   - Handles timestamp fields with `NOW()`
   - Maintains data type integrity for all fields

Usage Example:
```sql
SELECT update_machine_with_images(
  'machine-uuid',
  '{"Machine Name": "Example Machine", ...}'::jsonb,
  '[{"url": "image1.jpg", "sort_order": 1}, ...]'::jsonb
);
```

#### Image Storage (Hybrid System)
We currently use a hybrid approach for storing machine images:

1. Primary Images (Legacy System):
```sql
-- machines table
CREATE TABLE machines (
  -- other fields...
  "Image" TEXT,  -- Stores the primary image URL
  -- other fields...
);
```

2. Additional Images (New System):
```sql
-- images table
CREATE TABLE images (
  id UUID PRIMARY KEY,
  machine_id UUID NOT NULL REFERENCES machines(id),
  url TEXT NOT NULL,
  alt_text TEXT,
  sort_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  source_type TEXT,
  source_id UUID,
  timestamp TEXT,
  is_primary BOOLEAN DEFAULT false,
  display_location TEXT[] DEFAULT ARRAY['hero']
);

-- Index for efficient location queries
CREATE INDEX idx_images_location ON images USING GIN (display_location);
```

Key Features:
- Hybrid storage approach:
  - Primary images stored in machines table "Image" column
  - Additional images stored in images table with rich metadata
- UUID primary keys for scalability
- Foreign key relationship to machines table
- Support for alt text and metadata
- Timestamp tracking for image uploads
- Source tracking for different image types (product, review, etc.)
- Ordering support through sort_order field
- Primary image designation through is_primary flag
- Flexible display location support (hero, review, etc.)
- GIN index for efficient location queries

Image Display Locations:
- 'hero': Main product carousel/hero section
- 'review': Review section images
- Additional locations can be added as needed

Each machine can have:
- One primary image in the machines table
- Multiple additional images in the images table
- One or more display locations per additional image
- Proper sort_order within each display context

Frontend Implementation:
- Uses machines."Image" for primary image display
- Pulls additional images from images table when needed
- Handles both systems seamlessly in the UI
- Maintains backward compatibility

## Technical Requirements

### Frontend
- [x] React components for URL scraper UI
- [ ] Integration with existing machine form components
- [x] Image gallery component with thumbnail generation
- [ ] Drag-and-drop functionality for image reordering
- [ ] Image selection and primary designation UI
- [x] Form handling and validation
- [x] Data preview with editing capability
- [x] Loading states and error handling
- [x] Add debug panel for viewing raw extraction data
- [x] Create image gallery component for multiple images
- [ ] Implement diff/comparison UI for existing vs scraped machine data
- [ ] Add field-by-field approval controls for updating existing machines

### Backend
- [x] Serverless function for scraping (with increased timeout)
- [x] Claude API integration
- [x] Supabase database operations
- [ ] Image processing and storage
- [ ] Image optimization and resizing service
- [x] Multi-image transaction handling
- [x] Category mapping and validation
- [ ] Multiple image extraction and processing

### Database Schema
```sql
-- images table schema
CREATE TABLE images (
  id UUID PRIMARY KEY,
  machine_id UUID NOT NULL REFERENCES machines(id),
  url TEXT NOT NULL,
  alt_text TEXT,
  sort_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  source_type TEXT,
  source_id UUID,
  timestamp TEXT,
  is_primary BOOLEAN DEFAULT false,
  display_location TEXT[] DEFAULT ARRAY['hero']
);

-- Index for efficient location queries
CREATE INDEX idx_images_location ON images USING GIN (display_location);
```

Key Features:
- UUID primary keys for scalability
- Foreign key relationship to machines table
- Support for alt text and metadata
- Timestamp tracking for image uploads
- Source tracking for different image types (product, review, etc.)
- Ordering support through sort_order field
- Primary image designation through is_primary flag
- Flexible display location support (hero, review, etc.)
- GIN index for efficient location queries

Image Display Locations:
- 'hero': Main product carousel/hero section
- 'review': Review section images
- Additional locations can be added as needed

Each machine should have:
- Exactly one primary image (is_primary = true)
- One or more display locations per image
- Proper sort_order within each display context

## Development Guidelines (Critical)

### Next.js Runtime Configuration
- Server components that use Supabase MUST declare `export const runtime = 'nodejs';`
- API routes should use `export const runtime = 'edge';` for performance
- Never use deprecated `experimental-edge` runtime

### Supabase Operations
- Server components should use the `createServerClient()` utility from `@/lib/supabase/server`
- API routes should use appropriate keys (anon key for public data, service role for admin)
- Admin operations that bypass RLS should use the service role key

### Admin Security
- Admin routes MUST be in `/app/(admin)/admin/` pattern only
- Use the `AuthProvider` component for client-side authentication
- Ensure proper authentication checking in all admin routes

### Project-Specific Guidelines
- Machine data validation should match the existing schema requirements
- Image processing should follow existing patterns in the codebase
- Use TypeScript types from `@/lib/database-types` for proper type checking
- Follow best practices for handling multiple images (consider bandwidth and loading times)

## Success Criteria
- Successfully scrape and process at least 80% of product information automatically
- Reduce time to add a new machine from ~30 minutes to ~5 minutes
- Maintain data quality standards with validation
- Support all major machine manufacturer websites
- Seamless integration with existing machine creation workflow
- Support multiple product images with proper primary image selection
- Successfully extract at least 3-5 product images from supported websites

## Limitations & Constraints
- Some websites may block scraping attempts
- Claude may not extract all information accurately
- Long page processing times may require extended API timeouts
- Image extraction may be challenging for some websites
- Large or high-resolution images may require optimization
- Handling a large number of images may impact performance

## Timeline Estimate
- Development: 2-3 weeks
- Testing: 1 week
- Refinement: 1 week

## Implementation Plan for Comparison UI and Update Approval Flow

### 1. Data Comparison Component
- Create a new React component `MachineDataComparison.tsx` for displaying differences
- Implement a table-based view that shows:
  - Field name
  - Current value
  - Scraped value
  - Visual indicator for differences (highlighted background)
  - Checkbox for selecting which updates to apply
- Group fields logically (basic info, specs, features, etc.)
- Add "Select All" and "Clear All" controls for batch selection
- Display a summary of total changes detected (e.g., "15 differences found")

### 2. Update Endpoint Modification
- Modify `/app/api/admin/save-scraped-machine/route.ts` to handle both new and existing machines
- Add PUT method for updates to existing records
- Implement field-level update logic that only changes selected fields
- Ensure transaction handling for atomic updates
- Add safeguards to prevent accidental data loss
- Return detailed response with success/failure for each field

### 3. Database Operations
- Create separate function for fetching existing machine data
- Implement database queries that support partial updates
- Add logging for all update operations
- Create fallback/rollback mechanism in case of errors
- Ensure proper handling of relationships (e.g., company, images)

### 4. User Interface Flow
1. Admin navigates to existing machine's edit page
2. Admin clicks "Refresh from URL" button
3. System retrieves the saved product URL or prompts for one
4. System shows loading indicator while scraping
5. Comparison UI appears showing differences between existing and scraped data
6. Admin selects which changes to apply (checkboxes per field)
7. Admin confirms changes by clicking "Apply Selected Updates"
8. System updates only the selected fields
9. Confirmation message shows which fields were updated
10. Admin is returned to the edit page with updated data

### 5. Error Handling
- Display detailed error messages for scraping failures
- Allow retry of failed scrapes
- Provide option to continue with partial data
- Show warnings for potential data issues (e.g., format mismatches)
- Implement validation before saving to prevent invalid data

### 6. Testing Strategy
- Create test cases for various update scenarios:
  - Minor updates (few fields changed)
  - Major updates (many fields changed)
  - Edge cases (removing values, changing types)
- Test on multiple browser environments
- Verify database integrity after updates
- Test error recovery mechanisms

### 7. UI/UX Considerations
- Use color coding to indicate differences (green for additions, red for removals, yellow for changes)
- Provide clear, concise labeling of current vs. new values
- Add tooltips for additional context where helpful
- Ensure responsive design works on various screen sizes
- Implement keyboard shortcuts for power users (select all, deselect all)

## Implementation Plan for Enhanced Hybrid Scraping

### 1. Headless Browser Integration
- Add Playwright or Puppeteer for JavaScript-rendered page scraping
- Configure browser settings for optimal performance (memory limits, timeouts)
- Implement user-agent rotation to avoid detection
- Add support for handling cookie consent popups and interstitials
- Create wait conditions for dynamic content loading

### 2. Multi-Method Extraction Strategy
- Implement a priority-based extraction system:
  1. Try structured data extraction (JSON-LD, microdata)
  2. Use HTML semantic parsing for known patterns
  3. Use Claude AI for unstructured text and complex patterns
  4. Combine results with preference ordering
- For each field, maintain a confidence score from each method
- Select the highest confidence result or combine results when appropriate
- Store metadata about which extraction method was used for each field

### 3. Fallback Mechanisms
- Create cascading extraction patterns for critical fields
- Implement retry logic with different scraping strategies
- Add alternative selectors for common page patterns
- Create a "best guess" system for fields with low confidence
- Log extraction failures for future improvement

### 4. Data Normalization and Standardization
- Add unit conversion for measurements (inches to mm, etc.)
- Implement consistent formatting for specs (power, dimensions)
- Create pattern recognition for common value formats (e.g., "40W" → 40 watts)
- Process numerical values to remove unwanted characters
- Normalize text formatting (capitalization, spacing)

### 5. Image Processing Enhancements
- Improve image extraction with deeper DOM traversal
- Add image quality assessment (dimensions, file size)
- Implement duplicate detection based on visual similarity
- Filter out non-product images (logos, icons, banners)
- Extract and rank multiple product angles (front, side, details)

### 6. Caching and Performance Optimization
- Add result caching to prevent repeated API calls
- Implement staggered processing for heavy operations
- Add timeout handling for slow operations
- Create progress reporting for long-running processes
- Optimize memory usage for large page processing

### 7. Testing and Validation Framework
- Create a test suite with sample pages from major manufacturers
- Implement automated comparison between extraction methods
- Add metrics tracking for extraction accuracy
- Create a feedback loop for improving extraction based on results
- Build a reference dataset of known good values for calibration

## Future Enhancements (Post-MVP)
- Batch processing multiple URLs
- Scheduled scraping for price/spec updates
- Enhanced image processing
- Additional data sources integration
- Ability to scrape and compare multiple similar products
- Image annotation capabilities for highlighting machine features
- AI-powered image quality assessment

## Next Steps (Current Focus)
1. ✅ ~~Add ANTHROPIC_API_KEY to the environment variables~~
2. ✅ ~~Update Claude prompt to include valid category options from database~~
3. ✅ ~~Implement hybrid extraction approach combining web scraper and Claude results~~
4. ✅ ~~Add debugging panel to view raw Claude responses and extraction data~~
5. ✅ ~~Create category mapping to ensure scraped data matches existing categories~~
6. Next Priority: Implement comparison UI for existing vs scraped machine data
   - Create side-by-side diff view for existing vs scraped data
   - Add field-by-field approval controls for updating existing machines
   - Allow users to selectively apply changes
7. Modify save endpoint to support updating existing machines
   - Add PUT method to handle updates to existing records
   - Implement field-level update logic that only changes selected fields
8. Complete image management functionality
   - Add image processing and storage functionality
   - Enhance image extraction to detect and extract multiple images
   - Implement drag-and-drop reordering functionality
   - Add primary image selection capability
9. Integrate scraper with existing machine form
   - Add "Import from URL" button to the "Add New Machine" form
   - Create modal for URL input with scrape button
   - Implement loading/progress indicator during scrape process
10. Enhance the hybrid scraping approach
    - Add headless browser functionality for JavaScript-rendered pages
    - Implement fallback mechanisms when one extraction method fails
    - Improve data normalization for consistent formats and units
11. Improve reference data handling
    - Add company matching with option to create new companies
    - Convert boolean fields to proper checkboxes
    - Ensure all dropdown fields use valid options from database
12. Test the entire workflow with real product pages
    - Create test suite for various manufacturer websites
    - Document success rate and common extraction issues
    - Refine extraction algorithms based on test results 