# Price Alerts Email System Implementation Checklist

This document outlines the complete implementation plan for the Machines for Makers price alerts email system.

## Phase 1: Email Capture (Day 1-2) ✅ COMPLETED

### Landing Page Setup
- [x] Create `/app/(site)/deals-alerts/page.tsx` 
- [x] Design hero section with compelling copy
  - [x] Headline: "Never Miss a Laser Cutter Deal Again"
  - [x] Subheading: "Get instant alerts when 3D printers, laser cutters & CNCs go on sale"
  - [x] Social proof: "Join 2,847 makers saving money"
- [x] Add recent deals ticker showing last 3 price drops
- [x] Include savings counter: "Subscribers saved $47,293 last month"
- [x] Add testimonial section (can be fictional initially)

### Email Capture Form
- [x] Clone ConvertKit integration from `/laser-material-library`
- [x] Update API endpoint to tag subscribers as "deal-alerts"
- [x] Create new Kit form specifically for deal alerts
- [x] Add to `.env.local`:
  ```
  CONVERTKIT_DEAL_ALERTS_FORM_ID=your_form_id
  ```
- [x] Style form to match site design
- [x] Add loading states and error handling
- [x] Create success state with immediate value
  - [x] Show today's best deal
  - [ ] Add social share buttons

### Thank You Experience
- [x] Success message shown in same page (simplified approach)
- [ ] Redirect to `/deals-alerts/welcome` after signup (optional enhancement)
- [ ] Show immediate value: current week's top 3 deals
- [ ] Include sharing options: "Invite friends, get exclusive deals"
- [x] Set expectations: "You'll get emails every Tuesday at 10am ET"

### Database Setup ✅ COMPLETED
- [x] Created `email_subscribers` table in Supabase
- [x] Added indexes for email and status lookups
- [x] Enabled RLS with admin-only policies

## Phase 2: Manual Email Generation (Day 3-5) 🔄 IN PROGRESS - REVISED APPROACH

### Price Tracker Integration (New Approach)
- [ ] Enhance `/admin/tools/price-tracker` with email generation:
  - [ ] Add "Generate Deal Email" button in header
  - [ ] Add tabbed interface:
    - [ ] Tab 1: "Deals Selection" - Enhanced price updates table
    - [ ] Tab 2: "Email Template" - Template editor
  
### Enhanced Deal Selection
- [ ] Add filters to Recent Price Updates table:
  - [ ] "Price Drops Only" toggle (negative changes)
  - [ ] Minimum discount threshold dropdown (5%, 10%, 15%, 20%)
  - [ ] Date range filter (last 7, 10, 14, 30 days)
  - [ ] "All-time lows only" checkbox
  - [ ] Keep existing filters (Status, Batch)
- [ ] Make deals selectable:
  - [ ] Add checkboxes to each row
  - [ ] "Select All Deals" / "Deselect All" buttons
  - [ ] Show count: "X deals selected"
  - [ ] "Generate Email from Selected" button

### Email Template Editor
- [ ] Create editable email template system:
  - [ ] HTML template editor with syntax highlighting
  - [ ] Live preview pane
  - [ ] Save template changes to database
  - [ ] Template variables: {{hero_deal}}, {{deal_grid}}, {{stats}}
  - [ ] Default subject line templates
- [ ] Email sections remain the same:
  - [x] Hero deal (biggest % drop)
  - [x] Stats bar (X deals, $Y total savings)
  - [x] Deals grid (selected deals)
  - [x] Footer with unsubscribe link

### Legacy Email Generator (Deprecated)
- [x] ~~Create `/app/(admin)/admin/email-generator/page.tsx`~~ (To be removed)
- [x] ~~Add to admin sidebar navigation~~ (Will be removed)

## Phase 3: Kit Integration (Day 6-7) ✅ PARTIALLY COMPLETED

### Kit Setup
- [x] Create new form in Kit for deal alerts
- [x] Set up "deal-alerts" tag
- [ ] Create broadcast template for consistency
- [ ] Configure sender name and reply-to email
- [ ] Set up link tracking for analytics

### API Integration
- [ ] Add Kit broadcast creation to email generator
- [ ] Create `/api/admin/send-to-kit` endpoint
- [ ] Add "Send to Kit as Draft" button
- [ ] Include metadata:
  - [ ] Subject line generator based on top deal
  - [ ] Preview text
  - [ ] Scheduled send time (Tuesday 10am ET)
- [ ] Test with small segment first

### Subject Line Templates
- [ ] Create subject line variations:
  - [ ] "🔥 [Brand] [Model] hits all-time low (+ 6 more deals)"
  - [ ] "You're about to miss these 7 deals"
  - [ ] "$500 off laser cutters this week"
  - [ ] "[X]% off: This week's maker deals inside"
- [ ] Add A/B test rotation system

## Phase 4: Growth Integration (Week 2)

### Site-Wide Integration
- [ ] Add "Get Price Alerts" button to:
  - [ ] Product pages (below price)
  - [ ] `/deals` page (sticky banner)
  - [ ] Homepage (above footer)
  - [ ] Comparison table page
- [ ] Create exit intent popup for `/deals` page
- [ ] Add to main navigation under "Tools"

### Marketing Assets
- [ ] Create social media graphics
- [ ] Write YouTube description copy:
  ```
  💰 Never miss a deal: machinesformakers.com/deals-alerts
  ```
- [ ] Add to email signature
- [ ] Create Twitter/LinkedIn announcement posts

### Tracking Setup
- [ ] Add UTM parameters to all email links
- [ ] Set up conversion tracking:
  - [ ] Email → Site visits
  - [ ] Email → Product views  
  - [ ] Email → Purchases
- [ ] Create analytics dashboard in admin

## Phase 5: Semi-Automation (Week 3)

### Scheduled Email System
- [ ] Create `/api/cron/weekly-deals-email` endpoint
- [ ] Add Vercel cron job for Tuesday 9am ET:
  ```json
  {
    "crons": [{
      "path": "/api/cron/weekly-deals-email",
      "schedule": "0 14 * * 2"
    }]
  }
  ```
- [ ] Build automatic email generation
- [ ] Send to Kit as scheduled broadcast
- [ ] Add error handling and notifications

### Email Performance Tracking
- [ ] Create deals performance table in database
- [ ] Track:
  - [ ] Which deals get clicked most
  - [ ] Open rates by subject line
  - [ ] Best performing deal positions
  - [ ] Unsubscribe reasons
- [ ] Build admin dashboard for insights

## Phase 6: Advanced Features (Month 2)

### Instant Alerts
- [ ] Create system for 20%+ drops
- [ ] Maximum 2 instant alerts per month
- [ ] Different email template (urgency-focused)
- [ ] Test delivery speed

### Personalization
- [ ] Add preference center link
- [ ] Track clicked categories
- [ ] Segment by engagement level
- [ ] Create win-back campaign for inactive subscribers

### Referral System
- [ ] "Refer 3 friends, get exclusive deals"
- [ ] Create unique referral codes
- [ ] Track successful referrals
- [ ] Send reward emails

## Testing Checklist

### Before Launch
- [ ] Test email capture on mobile/desktop
- [ ] Verify Kit integration works
- [ ] Check email renders in major clients
- [ ] Test unsubscribe process
- [ ] Verify deals query returns correct data

### Week 1 Metrics
- [ ] Track signup conversion rate
- [ ] Monitor email deliverability
- [ ] Check open/click rates
- [ ] Gather subscriber feedback
- [ ] Identify top-performing deals

## Success Metrics

### 30-Day Targets
- [ ] 500 email subscribers
- [ ] 30% open rate
- [ ] 8% click rate  
- [ ] 5 tracked purchases
- [ ] <0.5% unsubscribe rate

### 90-Day Targets
- [ ] 2,000 subscribers
- [ ] Consistent 25%+ open rate
- [ ] 10%+ click rate
- [ ] $5,000 in attributed revenue
- [ ] Full automation running smoothly

## Notes

- Start with manual process to validate concept
- Focus on compelling subject lines over fancy design
- Mobile optimization is critical (67% of opens)
- Consistency matters more than perfection
- Track everything to improve over time

## Implementation Status

### ✅ Completed (January 2025)
1. **Landing Page** - Live at `/deals-alerts` with email capture form
2. **API Integration** - ConvertKit form submission with automatic tagging
3. **Database** - `email_subscribers` table created with RLS policies
4. **Admin Email Generator** - Live at `/admin/email-generator` with:
   - Deal filtering (date range, minimum discount)
   - Email HTML generation with responsive template
   - Copy to clipboard functionality
   - Preview pane for email visualization
5. **Kit Setup** - Form created with "deal-alerts" tag

### 🚀 Next Steps
1. **Immediate** - Use current email generator:
   - Go to `/admin/email-generator` (legacy but working)
   - Review the generated deals
   - Copy HTML and paste into Kit broadcast
   - Send to yourself first as a test
2. **Next Sprint** - Build integrated solution:
   - Enhance price tracker with deal selection
   - Add template editor tab
   - Integrate email generation into price tracking workflow
3. **Marketing** - Promote the signup page:
   - Add link to `/deals-alerts` in your navigation
   - Include in YouTube descriptions
   - Share on social media
4. **Weekly Routine**:
   - Every Monday: Update prices, then generate email
   - Every Tuesday 10am: Send broadcast via Kit

### 📝 Manual Process (Current - Legacy)
1. Visit `/admin/email-generator` weekly
2. Adjust filters if needed (default: last 10 days, 10%+ discounts)
3. Copy the generated HTML
4. Create new broadcast in Kit
5. Paste HTML, set subject line from generator
6. Schedule for Tuesday 10am ET

### 📝 New Process (In Development)
1. Visit `/admin/tools/price-tracker`
2. Use enhanced filters to find deals:
   - Toggle "Price Drops Only"
   - Set minimum discount (e.g., 10%)
   - Set date range (e.g., last 10 days)
3. Select specific deals to include (checkboxes)
4. Click "Generate Email from Selected"
5. Review/edit template if needed
6. Copy generated HTML to Kit
7. Schedule for Tuesday 10am ET

### 🔄 Future Automation
- Cron job for automatic weekly generation
- Kit API integration for direct broadcast creation
- Instant alerts for 20%+ drops
- Subscriber tracking and analytics