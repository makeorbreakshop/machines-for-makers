# Link Tracking & Redirect System Implementation

## Overview
Server-side link tracking system with branded short URLs for lead magnets and future affiliate tracking. Provides full click analytics independent of client-side tracking limitations.

## Core Features
- Branded short URLs (`/go/[slug]`)
- Server-side click logging with bot filtering
- UTM parameter preservation and enhancement
- ConvertKit integration for source attribution
- Admin interface for link management
- Analytics dashboard integration

## Implementation Checklist

### Phase 1: Database Schema
- [ ] Create `short_links` table
  - [ ] id (UUID primary key)
  - [ ] slug (unique, indexed)
  - [ ] destination_url (text)
  - [ ] type (enum: lead-magnet, affiliate, resource)
  - [ ] campaign (optional campaign grouping)
  - [ ] utm_source (default UTM source)
  - [ ] utm_medium (default UTM medium)
  - [ ] utm_campaign (default UTM campaign)
  - [ ] append_utms (boolean, default true)
  - [ ] active (boolean, default true)
  - [ ] metadata (JSONB for future flexibility)
  - [ ] created_at, updated_at timestamps
  - [ ] created_by (admin user reference)

- [ ] Create `link_clicks` table
  - [ ] id (UUID primary key)
  - [ ] link_id (foreign key to short_links)
  - [ ] clicked_at (timestamp with timezone)
  - [ ] ip_hash (hashed IP for privacy)
  - [ ] user_agent (full user agent string)
  - [ ] device_type (mobile/desktop/tablet/bot)
  - [ ] browser (parsed from user agent)
  - [ ] os (parsed from user agent)
  - [ ] referrer_url (where click came from)
  - [ ] country_code (2-letter ISO code)
  - [ ] region (state/province)
  - [ ] city (optional)
  - [ ] query_params (JSONB - all params from URL)
  - [ ] source (from query param)
  - [ ] slot (from query param)
  - [ ] vid (video/content ID from query param)
  - [ ] campaign (from query param)
  - [ ] is_bot (boolean flag)
  - [ ] bot_reason (why flagged as bot)

- [ ] Create database indexes
  - [ ] Index on short_links.slug
  - [ ] Index on link_clicks.link_id
  - [ ] Index on link_clicks.clicked_at
  - [ ] Index on link_clicks.source
  - [ ] Composite index on (link_id, clicked_at) for analytics queries

### Phase 2: Redirect Endpoint
- [ ] Create `/app/go/[slug]/route.ts` (or `/api/go/[slug]`)
  - [ ] Use Edge runtime for performance
  - [ ] Validate slug exists and is active
  - [ ] Extract all query parameters
  - [ ] Parse user agent for device/browser/OS
  - [ ] Get IP for geo-location (respect privacy)
  - [ ] Implement basic bot detection
    - [ ] Check user agent against bot list
    - [ ] Flag empty referrers as suspicious
    - [ ] Rate limiting per IP
  - [ ] Log click to database (async, don't block redirect)
  - [ ] Build destination URL with UTM parameters
  - [ ] Return 302 redirect
  - [ ] Handle errors gracefully (redirect to 404 page)

- [ ] Create geo-location service
  - [ ] Use edge-compatible IP lookup service
  - [ ] Cache results for performance
  - [ ] Fallback to "unknown" for failures

- [ ] Create user agent parser
  - [ ] Extract device type
  - [ ] Extract browser family
  - [ ] Extract OS
  - [ ] Identify known bots

### Phase 3: Admin Interface
- [ ] Create `/app/(admin)/admin/links/page.tsx`
  - [ ] List all short links with stats
  - [ ] Show click counts per link
  - [ ] Filter by type (lead-magnet, affiliate, resource)
  - [ ] Search by slug or destination
  - [ ] Sort by clicks, created date

- [ ] Create `/app/(admin)/admin/links/new/page.tsx`
  - [ ] Form to create new short link
  - [ ] Slug validation (unique, URL-safe)
  - [ ] Destination URL validation
  - [ ] Type selection
  - [ ] Default UTM parameters
  - [ ] Preview of final URL with UTMs

- [ ] Create `/app/(admin)/admin/links/[id]/page.tsx`
  - [ ] Edit existing link details
  - [ ] View detailed click analytics
  - [ ] Click timeline chart
  - [ ] Source breakdown (pie chart)
  - [ ] Geographic heat map
  - [ ] Device/browser stats
  - [ ] Export click data as CSV

- [ ] Create API routes for link management
  - [ ] `/api/admin/links` - CRUD operations
  - [ ] `/api/admin/links/[id]/stats` - Analytics data
  - [ ] `/api/admin/links/validate-slug` - Check availability

### Phase 4: Initial Links Setup
- [ ] Create short links for existing lead magnets
  - [ ] `/go/material-library` → `/laser-material-library`
  - [ ] `/go/deal-alerts` → `/deal-alerts`
  - [ ] Test redirects work correctly
  - [ ] Verify UTM parameters append properly

### Phase 5: ConvertKit Integration
- [ ] Update email signup forms
  - [ ] Capture source tracking from short link
  - [ ] Pass source data to ConvertKit tags
  - [ ] Format: `source:youtube`, `slot:description`, etc.
  
- [ ] Modify form submission handlers
  - [ ] `/app/api/convertkit/route.ts`
  - [ ] `/app/api/convertkit/deal-alerts/route.ts`
  - [ ] Extract tracking params from referrer or session
  - [ ] Add as ConvertKit tags during subscription

- [ ] Test end-to-end flow
  - [ ] Click short link → Land on page → Sign up → Tags in ConvertKit

### Phase 6: Analytics Dashboard Integration
- [ ] Add clicks metric to funnel views
  - [ ] New metric box showing total clicks
  - [ ] Click-through rate (clicks → page views)
  - [ ] Source attribution for clicks

- [ ] Create dedicated link analytics page
  - [ ] `/app/(admin)/admin/analytics/links/page.tsx`
  - [ ] Aggregate stats across all links
  - [ ] Time-based filtering
  - [ ] Source/campaign performance

- [ ] Update existing analytics components
  - [ ] Add click data to conversion funnels
  - [ ] Show full journey: Click → Visit → Signup

### Phase 7: UTM Builder Enhancement
- [ ] Update `/components/admin/analytics/utm-builder.tsx`
  - [ ] Add "Create Short Link" option
  - [ ] Auto-generate slug from campaign name
  - [ ] Save both UTM URL and short URL
  - [ ] Copy button for short URL

### Phase 8: Testing & Optimization
- [ ] Load testing for redirect endpoint
  - [ ] Ensure sub-50ms response times
  - [ ] Test with 1000+ concurrent requests
  
- [ ] Bot filtering accuracy
  - [ ] Test with common crawlers
  - [ ] Verify real users aren't filtered
  - [ ] Monitor false positive rate

- [ ] Analytics accuracy
  - [ ] Verify click counts match server logs
  - [ ] Test geo-location accuracy
  - [ ] Confirm UTM parameters flow through

### Phase 9: Documentation
- [ ] Create user documentation
  - [ ] How to create short links
  - [ ] Best practices for link naming
  - [ ] Understanding analytics data
  
- [ ] Technical documentation
  - [ ] API endpoint specifications
  - [ ] Database schema reference
  - [ ] Bot detection logic

### Phase 10: Future Enhancements (Not Phase 1)
- [ ] Affiliate link integration
  - [ ] SubID parameter injection
  - [ ] Conversion tracking hookup
  - [ ] Commission attribution
  
- [ ] Advanced features
  - [ ] A/B testing destinations
  - [ ] QR code generation
  - [ ] Bulk import/export
  - [ ] API for external use
  - [ ] Link grouping/folders
  - [ ] Custom domains

## Success Metrics
- All lead magnet links converted to short URLs
- Zero data loss (every click tracked)
- <100ms redirect performance
- Bot filtering accuracy >95%
- Full funnel visibility in analytics dashboard

## Technical Notes
- Use Edge runtime for redirect endpoint (performance)
- Implement caching for active links (reduce DB queries)
- Use async logging to not block redirects
- Consider queue for click processing at scale
- Respect user privacy (hash IPs, minimal PII)

## Dependencies
- Supabase for data storage
- Edge-compatible geo-IP service
- User agent parsing library
- ConvertKit API for tagging