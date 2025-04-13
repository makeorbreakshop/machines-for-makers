# Price Tracker Feature - Product Requirements Document

## Overview
Implement price history tracking for products on Machines for Makers, displaying historical price trends on product pages and highlighting discounts from average prices.

## Goals
- Track daily price changes for featured products
- Display interactive price history charts on product pages
- Highlight good deals and all-time lows
- Allow for future expansion into price drop alerts

## Technical Requirements

### Data Storage
- ✅ Create new `price_history` table in Supabase
- ✅ Store machine ID, price, date, source URL, and currency
- ✅ Retention policy: Full daily data for 6 months, then weekly averages
- ✅ Always preserve all-time high and low price points regardless of age

### Data Collection
- ✅ Implement Vercel cron job to run daily price checks
- ✅ Leverage existing web scraping functionality to extract prices
- ✅ Batch processing to handle hundreds of machines efficiently
- ✅ Skip entries when scraping fails
- ✅ Add robust error handling and debugging tools for failed scrapes

### Price History Chart
- Interactive chart similar to CamelCamelCamel style
- Match site branding colors
- Show all-time high and low price markers
- Include seasonal indicators (Black Friday, holidays)
- Hover functionality to see exact price/date
- Calculate and display percentage discount from historical average
- Responsive design for mobile viewing

### Price Formatting
- ✅ Implement standardized price formatting utility across application
- ✅ Support currency symbols, thousand separators, and decimal points
- ✅ Handle null/undefined price values gracefully 
- ✅ Support international currency formatting

### Admin Interface
- ✅ Create admin page for managing price history data
- ✅ Enable manual price updates for individual products
- ✅ Display price history with all-time highs and lows
- ✅ Support filtering and searching for machines
- ✅ Allow deletion of price history records
- ✅ Implement data cleanup tools for invalid price records
- ✅ Add comprehensive debugging tools for troubleshooting scraper issues

### Deployment Strategy
- Gradual rollout starting with most popular products
- Expand to all products after validation
- Initially focused on manufacturers' websites (not Amazon)

### Future Extensions (Not in initial scope)
- User subscription to price alerts
- Email notifications for price drops
- Admin dashboard for price trend analysis

## Technical Implementation

### Database Schema
```sql
CREATE TABLE price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id UUID REFERENCES machines(id),
  price NUMERIC,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  source TEXT,
  currency TEXT DEFAULT 'USD',
  scraped_from_url TEXT,
  is_all_time_low BOOLEAN DEFAULT FALSE,
  is_all_time_high BOOLEAN DEFAULT FALSE
);

-- Indexes for efficient querying
CREATE INDEX idx_price_history_machine_id ON price_history(machine_id);
CREATE INDEX idx_price_history_date ON price_history(date);
```

### Machine Table Enhancements
```sql
-- Add these fields to the existing machines table
ALTER TABLE machines ADD COLUMN price_selector_data JSONB;
ALTER TABLE machines ADD COLUMN price_selector_last_used TIMESTAMP WITH TIME ZONE;
ALTER TABLE machines ADD COLUMN price_selector_url_pattern TEXT;
ALTER TABLE machines ADD COLUMN price_configuration_identifier TEXT;
```

The `price_selector_data` JSON structure will contain:
```json
{
  "selector": "div.product-price span.current-price", 
  "xpath": "//*[@id='product-price']/span[1]",
  "context_pattern": "surrounding HTML snippet",
  "data_location_type": "text|attribute|innerText",
  "attribute_name": "data-price"
}
```

### Backend Components
- ✅ Scheduled API endpoint (/api/cron/update-prices)
- ✅ Manual price update API endpoint (/api/cron/update-prices/manual)
- ✅ Price history record deletion API endpoint (/api/price-history/delete)
- ✅ Invalid price record cleanup API endpoint (/api/price-history/clean)
- ✅ Price processing logic to calculate averages and extremes
- ✅ Batching mechanism to handle many products efficiently
- ✅ Advanced error handling and debugging for price scraping
- ☐ Enhance price scraper with selector pattern storage and retrieval
- ☐ Implement Claude API integration for intelligent price extraction
- ☐ Add manual price verification workflow

### Frontend Components
- ✅ Implement standardized currency formatting utility
- ✅ Admin page for managing price history and debugging
- ☐ Interactive price history chart component
- ☐ Mobile-responsive design considerations
- ☐ Visual indicators for good deals
- ☐ UI for manual verification of extracted prices
- ☐ Selector pattern management interface

### Utility Functions
- ✅ Create `formatPrice` function in `lib/utils.ts` to standardize price display
- ✅ Use Intl.NumberFormat for consistent global formatting
- ✅ Support custom currency parameters
- ✅ Add proper TypeScript typing and documentation
- ☐ Create `extractPriceWithClaude` utility function
- ☐ Implement `savePriceSelector` and `getPriceSelector` functions

## Mobile Considerations
- Use responsive chart libraries that work well on mobile
- Simplify hover interactions to touch events
- Ensure readable text size for price/date information
- Consider collapsible chart option for smaller screens

## Implementation Tasks

### Phase 1: Database Setup
- [x] Create `price_history` table in Supabase
- [x] Set up indexes for efficient querying
- [x] Create test data to validate schema

### Phase 2: Backend Implementation
- [x] Create `/api/cron/update-prices.ts` endpoint
- [x] Create `/api/cron/update-prices/manual.ts` endpoint
- [x] Implement price scraping using existing scraper functionality
- [x] Add logic to calculate historical averages and identify extreme prices
- [x] Set up batching mechanism for processing multiple products
- [x] Create `vercel.json` with cron job configuration
- [x] Implement safeguards for unrealistically low prices
- [x] Add detailed error handling and debugging information

### Phase 3: Frontend Implementation
- [x] Create standardized price formatting utility
- [x] Build admin interface for price management
- [x] Implement diagnostic tools for scraper debugging
- [x] Add record deletion and cleanup functionality
- [ ] Implement enhanced price scraping with Claude integration
- [ ] Create price selector storage and retrieval system
- [ ] Build manual verification workflow for price extraction
- [ ] Select and implement chart library compatible with our stack
- [ ] Create `PriceHistoryChart` component
- [ ] Style chart to match site branding
- [ ] Implement hover/touch interactions for price display
- [ ] Add visual indicators for all-time highs/lows and good deals
- [ ] Ensure responsive design for mobile viewing

### Phase 4: Testing and Deployment
- [x] Test price scraping with a subset of popular products
- [x] Validate price history data accuracy
- [ ] Test chart display on various screen sizes
- [ ] Deploy to production for selected products
- [ ] Monitor for any issues with daily data collection

### Phase 5: Expansion
- [ ] Roll out to all products
- [ ] Add seasonal indicators to chart
- [ ] Implement performance optimizations if needed

## Timeline
- Phase 1: 1-2 days ✅ COMPLETED
- Phase 2: 3-5 days ✅ COMPLETED
- Phase 3: 3-5 days (50% COMPLETED)
- Phase 4: 2-3 days
- Phase 5: 1-2 days

## Technical Notes

### Web Scraping Challenges
The price scraper has been enhanced to handle various challenges:
- Affiliate link redirects (particularly geni.us links)
- JavaScript-driven redirects requiring additional wait time
- Complex DOM structures requiring multiple selector strategies
- Structured data extraction from JSON-LD scripts when available
- Meta tag extraction as a fallback method
- Sanity checks to prevent unrealistically low prices

### Debugging Features
The admin interface includes comprehensive debugging tools:
- Visual display of the complete scraping process
- Step-by-step logging of the scraping workflow
- Screenshots of the scraped pages
- Detailed information on matched selectors and content
- Visualization of redirects and final URLs
- Browser console error reporting

### Data Management
Price history management features include:
- Manual deletion of individual price records
- Batch cleanup of invalid price records (< $10)
- Automatic recalculation of price extremes after data changes
- Price confirmation before updating records 

### Future Price Scraping Enhancements
To improve price scraping reliability and efficiency, the following enhancements will be implemented:

- LLM-assisted price extraction:
  - Use AI to identify prices when traditional selectors fail
  - Increase navigation timeout for complex sites
  - Implement multiple fallback strategies for price detection

- Website structure caching:
  - Save successful price selector patterns to the machine table
  - Store HTML structure patterns that worked for each product
  - Reuse cached selectors for future price updates
  - Fall back to LLM approach only when cached selectors fail
  - Update the cached pattern when website structures change

- Benefits of this approach:
  - Reduced dependency on LLM for every scrape
  - Faster price updates using pre-identified selectors
  - Improved reliability for frequently checked products
  - Self-improving system that adapts to website changes
  - Lower operational costs by minimizing LLM API calls

## Intelligent Price Scraping Implementation
This section details the enhanced approach for reliable price extraction combining traditional selectors, stored patterns, and AI assistance.

### Claude Integration
- Use Claude 3 Haiku for cost-effective price extraction
- Implement API integration with appropriate error handling
- Pass filtered HTML context to minimize token usage
- Create specialized prompt template:
  ```
  Given the following HTML snippet from a product page, please:
  1. Extract the current price of the product
  2. If multiple prices exist, identify the main current price (not crossed-out or sale prices)
  3. If multiple configuration options exist, find the price for: [configuration_identifier]
  4. Provide the CSS selector or XPath that would directly target this price element
  5. Return only the price value and selector in JSON format

  HTML:
  [html_snippet]
  ```

### Price Selector Storage Workflow
1. Initial Machine Creation/Update:
   - During product scraping, save successful price selector to machine table
   - Store additional metadata about the price location
   - Add configuration identifier if multiple options exist
   - Set initial selector_last_used timestamp

2. Daily Price Update Process:
   - Retrieve saved selector pattern from machine entry
   - Attempt price extraction using saved pattern
   - If successful, update timestamp and record price
   - If failed, fall back to traditional selectors
   - If still failed, invoke Claude for intelligent extraction
   - When Claude succeeds, update stored selector pattern
   - Allow admin review of changed patterns

3. Manual Verification Process:
   - Admin interface for displaying extracted prices
   - Visual confirmation of correct price before committing
   - Interface for selecting correct price when multiple options exist
   - Option to manually adjust selectors when automatic extraction fails
   - Capability to handle configuration variants

### Technical Architecture
- Claude API implementation:
  ```typescript
  async function extractPriceWithClaude(html: string, configId?: string): Promise<{ 
    price: number, 
    selector: string 
  }> {
    // Implementation
  }
  ```

- Selector storage functions:
  ```typescript
  async function savePriceSelector(
    machineId: string, 
    selectorData: any, 
    urlPattern: string,
    configId?: string
  ): Promise<void> {
    // Implementation
  }
  
  async function getPriceSelector(machineId: string): Promise<any> {
    // Implementation
  }
  ```

- Enhanced price extraction flow:
  ```typescript
  async function extractPrice(machine: Machine, html: string): Promise<number> {
    // 1. Try saved selector
    // 2. Try traditional selectors
    // 3. Fall back to Claude
    // 4. Update saved selector
  }
  ```

### Performance Considerations
- Minimize Claude API calls by prioritizing saved selectors
- Cache Claude responses where appropriate
- Maintain statistics on selector success rates
- Implement timeout handling for all external calls
- Optimize HTML preprocessing to reduce token consumption

### Implementation Phases
1. Database Schema Update:
   - Add selector storage fields to machine table
   - Create migration script for existing entries

2. Claude Integration:
   - Set up API access with appropriate authentication
   - Implement core extraction function
   - Create specialized prompt template
   - Add error handling and validation

3. Selector Management:
   - Implement storage and retrieval functions
   - Create pattern validation logic
   - Add pattern update mechanism

4. Admin Interface Enhancement:
   - Add selector visualization tools
   - Implement manual verification workflow
   - Create interface for handling configuration variants

5. Testing and Optimization:
   - Benchmark selector success rates
   - Measure and optimize Claude usage costs
   - Fine-tune prompts for optimal performance 