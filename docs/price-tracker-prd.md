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
- ☐ Store price selector data in machine table for optimized scraping

### Data Collection
- ✅ Implement Vercel cron job to run daily price checks
- ✅ Leverage existing web scraping functionality to extract prices
- ✅ Batch processing to handle hundreds of machines efficiently
- ✅ Skip entries when scraping fails
- ✅ Add robust error handling and debugging tools for failed scrapes
- ☐ Implement intelligent price extraction with Claude LLM
- ☐ Store and reuse successful price selectors

### Price History Chart
- ☐ Interactive chart similar to CamelCamelCamel style
- ☐ Match site branding colors
- ☐ Show all-time high and low price markers
- ☐ Include seasonal indicators (Black Friday, holidays)
- ☐ Hover functionality to see exact price/date
- ☐ Calculate and display percentage discount from historical average
- ☐ Responsive design for mobile viewing

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
- ☐ Add manual verification workflow for price extraction
- ☐ Create selector pattern management interface

## Database Schema

### Price History Table
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

## Implementation Roadmap

The following roadmap provides a structured approach to implementing the remaining features, with clear dependencies and sequencing.

### Current Status
- Phase 1 (Database Setup): ✅ COMPLETED
- Phase 2 (Basic Backend): ✅ COMPLETED
- Phase 3 (Basic Frontend): 50% COMPLETED
- Phase 4 (Testing): Not Started
- Phase 5 (Expansion): Not Started

### LLM Integration Roadmap

| ID | Task | Prerequisites | Priority | Effort | Status |
|----|------|--------------|----------|--------|--------|
| L1 | Database schema update for price selector storage | None | HIGH | 0.5 day | TODO |
| L2 | Claude API integration setup | None | HIGH | 1 day | TODO |
| L3 | Implement `extractPriceWithClaude` utility | L2 | HIGH | 1 day | TODO |
| L4 | Create selector storage/retrieval functions | L1 | HIGH | 0.5 day | TODO |
| L5 | Update price scraper to use saved selectors | L1, L4 | HIGH | 1 day | TODO |
| L6 | Implement fallback to Claude when selectors fail | L3, L5 | HIGH | 0.5 day | TODO |
| L7 | Add selector pattern update mechanism | L4, L6 | MEDIUM | 0.5 day | TODO |
| L8 | Create manual verification admin UI | L5 | MEDIUM | 1 day | TODO |
| L9 | Implement selector visualization tools | L7, L8 | LOW | 1 day | TODO |
| L10 | Add configuration variant handling | L6 | MEDIUM | 1 day | TODO |
| L11 | Performance testing and optimization | All above | MEDIUM | 1 day | TODO |

### Chart Implementation Roadmap

| ID | Task | Prerequisites | Priority | Effort | Status |
|----|------|--------------|----------|--------|--------|
| C1 | Research and select chart library | None | MEDIUM | 0.5 day | TODO |
| C2 | Implement basic price history chart | C1 | MEDIUM | 1 day | TODO |
| C3 | Add visual indicators for price extremes | C2 | MEDIUM | 0.5 day | TODO |
| C4 | Style chart to match site branding | C2 | MEDIUM | 0.5 day | TODO |
| C5 | Implement hover/touch interactions | C4 | MEDIUM | 1 day | TODO |
| C6 | Ensure responsive design for mobile | C5 | MEDIUM | 1 day | TODO |
| C7 | Add seasonal indicators | C5 | LOW | 0.5 day | TODO |

### Integration Testing Roadmap

| ID | Task | Prerequisites | Priority | Effort | Status |
|----|------|--------------|----------|--------|--------|
| T1 | Test LLM price extraction with sample products | L6 | HIGH | 0.5 day | TODO |
| T2 | Validate selector storage and retrieval | L5, L7 | HIGH | 0.5 day | TODO |
| T3 | Test chart display on various screen sizes | C6 | MEDIUM | 0.5 day | TODO |
| T4 | End-to-end testing with real products | All LLM & Chart tasks | HIGH | 1 day | TODO |
| T5 | Performance benchmarking | T4 | MEDIUM | 0.5 day | TODO |

## Next Steps

Based on the roadmap above, these are the immediate next tasks to focus on:

1. **Database Schema Update (L1)**
   - Add the new columns to the machines table
   - Create migration script for existing entries
   - Estimated completion: 0.5 day

2. **Claude API Integration (L2)**
   - Set up API access with proper authentication
   - Implement basic communication with Claude API
   - Test with sample HTML snippets
   - Estimated completion: 1 day

3. **Extract Price with Claude Utility (L3)**
   - Implement the core function to extract prices using Claude
   - Create the specialized prompt template
   - Add validation and error handling
   - Estimated completion: 1 day

4. **Selector Storage Functions (L4)**
   - Implement functions to save and retrieve selector patterns
   - Add validation for selector data
   - Create utility to test selector validity
   - Estimated completion: 0.5 day

## Technical Implementation Details

### Intelligent Price Scraping

We will implement a multi-stage price extraction approach:

1. **Traditional Selectors** (existing implementation)
   - Try common DOM selectors for price elements
   - Extract structured data from JSON-LD when available
   - Use meta tags as fallback

2. **Saved Selector Patterns** (new feature)
   - Store successful selectors in the machine table
   - Prioritize using these selectors for future extractions
   - Update the timestamp when a selector is successfully used

3. **Claude LLM Integration** (new feature)
   - Use Claude 3 Haiku for cost-effective price extraction
   - Pass filtered HTML to minimize token usage
   - Specialized prompt to extract both price and selector
   - Claude helps identify which HTML element contains the price

4. **Manual Verification Process** (new feature)
   - Admin interface for confirming extracted prices
   - Visual confirmation before saving to price history
   - Interface for selecting correct price when multiple options exist
   - Capability to handle configuration variants

### Price Selector Storage Workflow

1. **Initial Machine Creation/Update:**
   - During product scraping, save successful price selector
   - Store metadata about the price location
   - Add configuration identifier if needed

2. **Daily Price Update Process:**
   - Retrieve saved selector pattern from machine entry
   - Attempt price extraction using saved pattern
   - Fall back to traditional selectors if saved pattern fails
   - Use Claude only when other methods fail
   - Update stored pattern when Claude succeeds

### Claude API Implementation

```typescript
async function extractPriceWithClaude(html: string, configId?: string): Promise<{ 
  price: number, 
  selector: string 
}> {
  // Implementation
}
```

Claude prompt template:
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

### Utility Functions

```typescript
// Store selector pattern for a machine
async function savePriceSelector(
  machineId: string, 
  selectorData: any, 
  urlPattern: string,
  configId?: string
): Promise<void> {
  // Implementation
}

// Retrieve saved selector pattern
async function getPriceSelector(machineId: string): Promise<any> {
  // Implementation
}

// Enhanced price extraction flow
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

## Completed Components

### Backend Components
- ✅ Scheduled API endpoint (/api/cron/update-prices)
- ✅ Manual price update API endpoint (/api/cron/update-prices/manual)
- ✅ Price history record deletion API endpoint (/api/price-history/delete)
- ✅ Invalid price record cleanup API endpoint (/api/price-history/clean)
- ✅ Price processing logic to calculate averages and extremes
- ✅ Batching mechanism to handle many products efficiently
- ✅ Advanced error handling and debugging for price scraping

### Frontend Components
- ✅ Standardized currency formatting utility
- ✅ Admin page for managing price history and debugging
- ✅ Diagnostic tools for scraper debugging
- ✅ Record deletion and cleanup functionality

### Utility Functions
- ✅ `formatPrice` function in `lib/utils.ts`
- ✅ Intl.NumberFormat for consistent global formatting
- ✅ Custom currency parameters
- ✅ TypeScript typing and documentation

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

## Mobile Considerations
- Use responsive chart libraries that work well on mobile
- Simplify hover interactions to touch events
- Ensure readable text size for price/date information
- Consider collapsible chart option for smaller screens

## Deployment Strategy
- Gradual rollout starting with most popular products
- Expand to all products after validation
- Initially focused on manufacturers' websites (not Amazon)

## Future Extensions (Not in initial scope)
- User subscription to price alerts
- Email notifications for price drops
- Admin dashboard for price trend analysis