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
- Create new `price_history` table in Supabase
- Store machine ID, price, date, source URL, and currency
- Retention policy: Full daily data for 6 months, then weekly averages
- Always preserve all-time high and low price points regardless of age

### Data Collection
- Implement Vercel cron job to run daily price checks
- Leverage existing web scraping functionality to extract prices
- Batch processing to handle hundreds of machines efficiently
- Skip entries when scraping fails

### Price History Chart
- Interactive chart similar to CamelCamelCamel style
- Match site branding colors
- Show all-time high and low price markers
- Include seasonal indicators (Black Friday, holidays)
- Hover functionality to see exact price/date
- Calculate and display percentage discount from historical average
- Responsive design for mobile viewing

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

### Backend Components
- Scheduled API endpoint (/api/cron/update-prices)
- Price processing logic to calculate averages and extremes
- Batching mechanism to handle many products efficiently

### Frontend Components
- Interactive price history chart component
- Mobile-responsive design considerations
- Visual indicators for good deals

## Mobile Considerations
- Use responsive chart libraries that work well on mobile
- Simplify hover interactions to touch events
- Ensure readable text size for price/date information
- Consider collapsible chart option for smaller screens

## Implementation Tasks

### Phase 1: Database Setup
- [ ] Create `price_history` table in Supabase
- [ ] Set up indexes for efficient querying
- [ ] Create test data to validate schema

### Phase 2: Backend Implementation
- [ ] Create `/api/cron/update-prices.ts` endpoint
- [ ] Implement price scraping using existing scraper functionality
- [ ] Add logic to calculate historical averages and identify extreme prices
- [ ] Set up batching mechanism for processing multiple products
- [ ] Create `vercel.json` with cron job configuration

### Phase 3: Frontend Implementation
- [ ] Select and implement chart library compatible with our stack
- [ ] Create `PriceHistoryChart` component
- [ ] Style chart to match site branding
- [ ] Implement hover/touch interactions for price display
- [ ] Add visual indicators for all-time highs/lows and good deals
- [ ] Ensure responsive design for mobile viewing

### Phase 4: Testing and Deployment
- [ ] Test price scraping with a subset of popular products
- [ ] Validate price history data accuracy
- [ ] Test chart display on various screen sizes
- [ ] Deploy to production for selected products
- [ ] Monitor for any issues with daily data collection

### Phase 5: Expansion
- [ ] Roll out to all products
- [ ] Add seasonal indicators to chart
- [ ] Implement performance optimizations if needed

## Timeline
- Phase 1: 1-2 days
- Phase 2: 3-5 days
- Phase 3: 3-5 days
- Phase 4: 2-3 days
- Phase 5: 1-2 days

Total estimated time: 10-17 days 