# Manual Test Script: UTM Builder Short Link Enhancement

## Test Setup
1. Start the development server: `npm run dev`
2. Login to admin panel at `/admin`
3. Navigate to Analytics → UTM Builder tab

## Test Cases

### 1. UI Components Display
- [ ] UTM Builder tab is visible in Analytics page
- [ ] Lead Magnet dropdown shows database values (not hardcoded)
- [ ] "Create short link" checkbox appears below Lead Magnet selection
- [ ] Checkbox is unchecked by default

### 2. Short Link Preview
- [ ] Check "Create short link" checkbox
- [ ] Verify slug preview field appears with `/go/` prefix
- [ ] Verify auto-generated slug appears based on campaign type

### 3. YouTube Campaign Slug Generation
- [ ] Select YouTube tab
- [ ] Select a video (e.g., "How to Laser Cut")
- [ ] Select placement (e.g., "Description - First Link")
- [ ] Select Lead Magnet (e.g., "Material Library")
- [ ] Check "Create short link"
- [ ] Verify slug format: `yt-{videoId}-material`

### 4. Email Campaign Slug Generation
- [ ] Select Email tab
- [ ] Enter date and campaign name (e.g., "black-friday")
- [ ] Select placement (e.g., "Header CTA")
- [ ] Select Lead Magnet (e.g., "Deal Alerts")
- [ ] Check "Create short link"
- [ ] Verify slug format: `email-{YYMMDD}-{name}-deals`

### 5. Slug Validation
- [ ] With short link enabled, edit the slug manually
- [ ] Verify "Checking..." appears during validation
- [ ] Try a slug that already exists (e.g., "yt-abc123-material")
- [ ] Verify error message: "This slug is already in use"
- [ ] Change to unique slug
- [ ] Verify success message: "Slug is available"

### 6. Link Generation with Short Links
- [ ] Fill in all required fields
- [ ] Enable "Create short link"
- [ ] Click "Generate Links"
- [ ] Verify success toast: "Short link created: /go/{slug}"
- [ ] Verify generated links display shows:
  - [ ] Lead magnet name in badge
  - [ ] Short link section with green background
  - [ ] Copy button for short link
  - [ ] Full UTM URL section below
  - [ ] Copy button for full URL
  - [ ] "View Analytics" link (if short link created)

### 7. Copy Functionality
- [ ] Click copy button for short link
- [ ] Verify "Copied!" feedback appears
- [ ] Paste to verify correct URL copied
- [ ] Click copy button for full UTM URL
- [ ] Verify "Copied!" feedback appears
- [ ] Paste to verify correct URL copied

### 8. Multiple Lead Magnets
- [ ] Select "Generate Both" in Lead Magnet dropdown
- [ ] Enable "Create short link"
- [ ] Generate links
- [ ] Verify two short links created:
  - [ ] One ending in `-material`
  - [ ] One ending in `-deals`

### 9. Error Handling
- [ ] Try to generate with existing slug
- [ ] Verify error toast appears
- [ ] Verify UTM URL is still generated even if short link fails
- [ ] Disable internet connection
- [ ] Try to generate short link
- [ ] Verify error handling and user feedback

### 10. Analytics Integration
- [ ] After creating short link, click "View Analytics"
- [ ] Verify redirects to `/admin/links/{id}`
- [ ] Navigate to Links page (`/admin/links`)
- [ ] Verify new short link appears in list
- [ ] Verify metadata shows "created_from: utm-builder"

## Expected Results
- All checkboxes above should be checked ✓
- No console errors during testing
- Short links are created successfully
- User experience is smooth and intuitive

## Bug Report Template
If any test fails, document:
1. Test case number and description
2. Expected behavior
3. Actual behavior
4. Steps to reproduce
5. Console errors (if any)
6. Screenshots (if helpful)